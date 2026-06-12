import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator,
  Alert, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Gesture, GestureDetector,
  type PinchGesture, type RotationGesture,
} from "react-native-gesture-handler";
import Animated, {
  makeMutable, runOnJS, useAnimatedStyle, useSharedValue, withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../lib/supabase";
import { createMusicStory, type StoryCanvas } from "../services/stories";
import { useStoryAudioPool } from "../hooks/useStoryAudioPool";
import {
  MusicStoryCard, OVERLAY_FONTS, OVERLAY_COLORS, fontStyleFor,
  type MusicStoryCardSong, type MusicStoryCardAuthor,
} from "../components/stories/MusicStoryCard";
import {
  CanvasTextView, CARD_BASE, TEXT_BASE_FONT, isDarkHex,
} from "../components/stories/StoryCanvasRenderer";
import { useArtGradient } from "../hooks/albumColors";
import { SW, SH } from "../lib/feed/dimensions";

// ─── Canvas constants ─────────────────────────────────────────────────────────
const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const SNAP_PX = 10;            // distance from canvas centre that snaps + shows a guide
const ROT_SNAP_RAD = 0.06;     // snap rotation to right angles within this window
// Chrome bands excluded from "tap empty canvas to add text" (buttons live there)
const TOP_EXCLUDE = 120;
const BOTTOM_EXCLUDE = SH - 140;
// Trash drop target (bottom centre, shown while dragging a text element)
const TRASH_SIZE = 56;
const TRASH_CX = SW / 2;
const TRASH_CY = SH - 60 - TRASH_SIZE / 2;
const TRASH_HIT = 64;

const PRESET_BGS: string[][] = [
  ["#15151A", "#0D0D0D"],
  ["#2E0854", "#AB00FF"],
  ["#FF512F", "#DD2476"],
  ["#1A2980", "#26D0CE"],
  ["#F7971E", "#FF6B35"],
  ["#0F3443", "#34E89E"],
];

type ElTransforms = {
  x: SharedValue<number>;
  y: SharedValue<number>;
  scale: SharedValue<number>;
  rot: SharedValue<number>;
};

type TextPayload = { text: string; font: string; color: string; bg: boolean };
type CanvasEl =
  | { id: string; type: "card" }
  | ({ id: string; type: "text" } & TextPayload);
type EditingState = TextPayload & { id: string | null };

// Stable empty preload window so the audio pool effect doesn't churn each render.
const NO_PRELOAD: string[] = [];

export default function StoryCanvasScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    songId: string; songName: string; songArtist: string; songAlbumArt?: string;
    cardDesign?: string; durationMs?: string;
  }>();
  const design = Number(params.cardDesign ?? 0) || 0;
  const durationMs = Number(params.durationMs ?? 5000) || 5000;

  const song: MusicStoryCardSong = {
    id: String(params.songId),
    name: String(params.songName),
    artist: String(params.songArtist),
    albumArt: params.songAlbumArt ? String(params.songAlbumArt) : null,
  };

  const [me, setMe] = useState<{ id: string; username: string; display_name: string | null; avatar_url: string | null } | null>(null);
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("users")
        .select("id, username, display_name, avatar_url")
        .eq("id", user.id)
        .single();
      if (data) setMe(data as any);
    })();
  }, []);
  const author: MusicStoryCardAuthor = {
    username: me?.username ?? "you",
    display_name: me?.display_name ?? null,
    avatar_url: me?.avatar_url ?? null,
  };

  // Preview the song while arranging the canvas, so you hear what you're posting.
  // Pause when backgrounded (e.g. you go back to the card picker) to avoid
  // double audio with the other screen's player.
  const [muted, setMuted] = useState(false);
  const [focused, setFocused] = useState(true);
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false); }, []));
  useStoryAudioPool({ activeSongId: params.songId ? song.id : null, preloadSongIds: NO_PRELOAD, paused: !focused, muted });

  // ── Canvas state ────────────────────────────────────────────────────────────
  const [elements, setElements] = useState<CanvasEl[]>([{ id: "card", type: "card" }]);
  const [zOrder, setZOrder] = useState<Record<string, number>>({ card: 1 });
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [posting, setPosting] = useState(false);

  // Background: album-art-derived gradient first (like Instagram), then presets.
  const artGradient = useArtGradient(song.albumArt);
  const [bgIdx, setBgIdx] = useState(0);
  const backgrounds: string[][] = [artGradient as unknown as string[], ...PRESET_BGS];
  const bg = backgrounds[bgIdx % backgrounds.length];

  // Per-element transforms live outside React state (mutated by gestures on the
  // UI thread). Created during render so the canvas-level gesture worklets
  // below always capture a complete registry.
  const transformsRef = useRef<Record<string, ElTransforms>>({});
  const ensureTransforms = (id: string): ElTransforms => {
    let t = transformsRef.current[id];
    if (!t) {
      t = { x: makeMutable(0), y: makeMutable(0), scale: makeMutable(1), rot: makeMutable(0) };
      // Reanimated freezes objects captured by worklets (the canvas pinch /
      // rotate gestures capture this registry), so never mutate it in place —
      // replace it copy-on-write. The next render recreates the gestures with
      // the fresh registry.
      transformsRef.current = { ...transformsRef.current, [id]: t };
    }
    return t;
  };
  elements.forEach((el) => ensureTransforms(el.id));
  const transforms = transformsRef.current;

  // Unscaled layout sizes of text elements, for tap hit-testing.
  const sizesRef = useRef<Record<string, { w: number; h: number }>>({});

  // ── Gesture plumbing (shared across canvas + elements) ─────────────────────
  const activeId = useSharedValue("card");   // element receiving pinch/rotate
  const draggingId = useSharedValue("");     // element currently being panned
  const overTrash = useSharedValue(false);
  const guideV = useSharedValue(false);
  const guideH = useSharedValue(false);

  const bumpZ = (id: string) => {
    setZOrder((prev) => {
      const top = Math.max(0, ...Object.values(prev));
      if (prev[id] === top) return prev;
      return { ...prev, [id]: top + 1 };
    });
  };

  const removeElement = (id: string) => {
    setElements((prev) => prev.filter((e) => e.id !== id));
    // Copy-on-write for the same reason as ensureTransforms: the captured
    // registry object is frozen by Reanimated, so deletes must build a new one.
    const { [id]: _removed, ...rest } = transformsRef.current;
    transformsRef.current = rest;
    delete sizesRef.current[id];
    if (activeId.value === id) activeId.value = "card";
  };

  // Tap routing: topmost element under the finger wins. Text → edit it; card →
  // bring forward; empty canvas → start a new text (Instagram behavior).
  const handleCanvasTap = (px: number, py: number) => {
    if (editing) return;
    const ordered = [...elements].sort((a, b) => (zOrder[b.id] ?? 0) - (zOrder[a.id] ?? 0));
    for (const el of ordered) {
      const t = transformsRef.current[el.id];
      if (!t) continue;
      const size = el.type === "card"
        ? { w: CARD_BASE, h: CARD_BASE }
        : sizesRef.current[el.id] ?? { w: 160, h: 48 };
      // Transform the tap point into the element's local (unrotated, unscaled) space
      const dx = px - (SW / 2 + t.x.value);
      const dy = py - (SH / 2 + t.y.value);
      const cos = Math.cos(-t.rot.value);
      const sin = Math.sin(-t.rot.value);
      const lx = (dx * cos - dy * sin) / t.scale.value;
      const ly = (dx * sin + dy * cos) / t.scale.value;
      if (Math.abs(lx) <= size.w / 2 + 8 && Math.abs(ly) <= size.h / 2 + 8) {
        bumpZ(el.id);
        activeId.value = el.id;
        if (el.type === "text") {
          setEditing({ id: el.id, text: el.text, font: el.font, color: el.color, bg: el.bg });
        }
        return;
      }
    }
    if (py > TOP_EXCLUDE && py < BOTTOM_EXCLUDE) {
      setEditing({ id: null, text: "", font: "default", color: "#FFFFFF", bg: false });
    }
  };

  // Pinch + rotate work anywhere on the canvas and apply to the active element,
  // so two-finger gestures don't need to land inside a small text element.
  const pinchStart = useSharedValue(1);
  const pinch = Gesture.Pinch()
    .onStart(() => {
      const t = transforms[activeId.value];
      pinchStart.value = t ? t.scale.value : 1;
    })
    .onUpdate((e) => {
      const t = transforms[activeId.value];
      if (!t) return;
      t.scale.value = Math.min(Math.max(pinchStart.value * e.scale, MIN_SCALE), MAX_SCALE);
    });

  const rotStart = useSharedValue(0);
  const rotation = Gesture.Rotation()
    .onStart(() => {
      const t = transforms[activeId.value];
      rotStart.value = t ? t.rot.value : 0;
    })
    .onUpdate((e) => {
      const t = transforms[activeId.value];
      if (!t) return;
      let r = rotStart.value + e.rotation;
      const right = Math.round(r / (Math.PI / 2)) * (Math.PI / 2);
      if (Math.abs(r - right) < ROT_SNAP_RAD) r = right;
      t.rot.value = r;
    });

  const tap = Gesture.Tap().onEnd((e, success) => {
    if (success) runOnJS(handleCanvasTap)(e.x, e.y);
  });

  const canvasGesture = Gesture.Simultaneous(pinch, rotation, tap);

  // ── Text editing ────────────────────────────────────────────────────────────
  const commitText = (payload: TextPayload | null, id: string | null) => {
    if (!payload) {
      if (id) removeElement(id);
      setEditing(null);
      return;
    }
    if (id) {
      setElements((prev) => prev.map((e) => (e.id === id ? { ...e, ...payload } : e)));
      bumpZ(id);
      activeId.value = id;
    } else {
      const nid = `text-${Date.now()}`;
      ensureTransforms(nid);
      setElements((prev) => [...prev, { id: nid, type: "text", ...payload }]);
      bumpZ(nid);
      activeId.value = nid;
    }
    setEditing(null);
  };

  // ── Posting ────────────────────────────────────────────────────────────────
  const handlePost = async () => {
    if (!me || posting) return;
    setPosting(true);
    try {
      const ordered = [...elements].sort((a, b) => (zOrder[a.id] ?? 0) - (zOrder[b.id] ?? 0));
      const canvas: StoryCanvas = {
        v: 1,
        bg: { type: "gradient", colors: bg },
        elements: ordered.map((el) => {
          const t = transformsRef.current[el.id];
          const base = {
            x: (t?.x.value ?? 0) / SW,
            y: (t?.y.value ?? 0) / SH,
            scale: t?.scale.value ?? 1,
            rotation: t?.rot.value ?? 0,
          };
          return el.type === "card"
            ? { type: "card" as const, ...base }
            : { type: "text" as const, text: el.text, font: el.font, color: el.color, bg: el.bg, ...base };
        }),
      };
      await createMusicStory({
        userId: me.id,
        cardDesign: design,
        songId: song.id,
        songName: song.name,
        songArtist: song.artist,
        songAlbumArt: song.albumArt,
        canvas,
        durationMs,
      });
      router.dismissAll();
    } catch (e: any) {
      Alert.alert("Couldn't post story", e?.message ?? "Try again.");
      setPosting(false);
    }
  };

  // ── Chrome animations ───────────────────────────────────────────────────────
  // Hide the bars while dragging, like Instagram, and show the trash target.
  const chromeStyle = useAnimatedStyle(() => ({
    opacity: withTiming(draggingId.value === "" ? 1 : 0, { duration: 150 }),
  }));
  const trashStyle = useAnimatedStyle(() => ({
    opacity: withTiming(draggingId.value !== "" && draggingId.value !== "card" ? 1 : 0, { duration: 150 }),
    transform: [{ scale: withTiming(overTrash.value ? 1.25 : 1, { duration: 120 }) }],
  }));
  const guideVStyle = useAnimatedStyle(() => ({ opacity: guideV.value ? 1 : 0 }));
  const guideHStyle = useAnimatedStyle(() => ({ opacity: guideH.value ? 1 : 0 }));

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <GestureDetector gesture={canvasGesture}>
        <View style={StyleSheet.absoluteFillObject} collapsable={false}>
          <LinearGradient
            colors={(bg.length >= 2 ? bg : PRESET_BGS[0]) as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <Animated.View pointerEvents="none" style={[s.guideV, guideVStyle]} />
          <Animated.View pointerEvents="none" style={[s.guideH, guideHStyle]} />
          {elements.map((el) => (
            <CanvasElement
              key={el.id}
              el={el}
              t={ensureTransforms(el.id)}
              z={zOrder[el.id] ?? 0}
              hidden={editing?.id === el.id}
              design={design}
              song={song}
              author={author}
              pinchG={pinch}
              rotG={rotation}
              activeId={activeId}
              draggingId={draggingId}
              overTrash={overTrash}
              guideV={guideV}
              guideH={guideH}
              onGrab={bumpZ}
              onDropTrash={removeElement}
              onTextSize={(id, w, h) => { sizesRef.current[id] = { w, h }; }}
            />
          ))}
        </View>
      </GestureDetector>

      {/* Trash drop target */}
      <Animated.View pointerEvents="none" style={[s.trash, trashStyle]}>
        <Ionicons name="trash-outline" size={22} color="#fff" />
      </Animated.View>

      {!editing && (
        <>
          <Animated.View style={[s.topBar, chromeStyle]} pointerEvents="box-none">
            <TouchableOpacity onPress={() => router.back()} style={s.chromeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMuted((m) => !m)} style={s.chromeBtn} activeOpacity={0.7}>
              <Ionicons name={muted ? "volume-mute" : "volume-high"} size={22} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              onPress={() => setEditing({ id: null, text: "", font: "default", color: "#FFFFFF", bg: false })}
              style={s.chromeBtn}
              activeOpacity={0.7}
            >
              <Text style={s.aaTxt}>Aa</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setBgIdx((i) => (i + 1) % backgrounds.length)}
              style={s.chromeBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="color-palette-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={[s.bottomBar, chromeStyle]} pointerEvents="box-none">
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handlePost}
              disabled={posting || !me}
              style={[s.postBtn, (!me || posting) && { opacity: 0.6 }]}
            >
              {posting ? <ActivityIndicator color="#0D0D0D" /> : (
                <>
                  <Text style={s.postBtnTxt}>Share to your story</Text>
                  <Ionicons name="arrow-forward" size={16} color="#0D0D0D" />
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </>
      )}

      {editing && (
        <TextEditorOverlay
          key={editing.id ?? "new"}
          initial={editing}
          onCommit={commitText}
        />
      )}
    </View>
  );
}

// ─── A draggable / pinchable / rotatable canvas element ──────────────────────
function CanvasElement({
  el, t, z, hidden, design, song, author,
  pinchG, rotG, activeId, draggingId, overTrash, guideV, guideH,
  onGrab, onDropTrash, onTextSize,
}: {
  el: CanvasEl;
  t: ElTransforms;
  z: number;
  hidden: boolean;
  design: number;
  song: MusicStoryCardSong;
  author: MusicStoryCardAuthor;
  pinchG: PinchGesture;
  rotG: RotationGesture;
  activeId: SharedValue<string>;
  draggingId: SharedValue<string>;
  overTrash: SharedValue<boolean>;
  guideV: SharedValue<boolean>;
  guideH: SharedValue<boolean>;
  onGrab: (id: string) => void;
  onDropTrash: (id: string) => void;
  onTextSize: (id: string, w: number, h: number) => void;
}) {
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const canDelete = el.type !== "card"; // the song card IS the story — no trashing it

  const pan = Gesture.Pan()
    .simultaneousWithExternalGesture(pinchG, rotG)
    .onStart(() => {
      startX.value = t.x.value;
      startY.value = t.y.value;
      activeId.value = el.id;
      draggingId.value = el.id;
      runOnJS(onGrab)(el.id);
    })
    .onUpdate((e) => {
      let nx = startX.value + e.translationX;
      let ny = startY.value + e.translationY;
      if (Math.abs(nx) < SNAP_PX) { nx = 0; guideV.value = true; } else { guideV.value = false; }
      if (Math.abs(ny) < SNAP_PX) { ny = 0; guideH.value = true; } else { guideH.value = false; }
      t.x.value = nx;
      t.y.value = ny;
      if (canDelete) {
        overTrash.value =
          Math.abs(e.absoluteX - TRASH_CX) < TRASH_HIT &&
          Math.abs(e.absoluteY - TRASH_CY) < TRASH_HIT;
      }
    })
    .onEnd(() => {
      if (canDelete && overTrash.value) runOnJS(onDropTrash)(el.id);
    })
    .onFinalize(() => {
      draggingId.value = "";
      overTrash.value = false;
      guideV.value = false;
      guideH.value = false;
    });

  const transformStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: t.x.value },
      { translateY: t.y.value },
      { rotateZ: `${t.rot.value}rad` },
      { scale: t.scale.value },
    ],
  }));
  // Shrink + fade while hovering the trash, like Instagram.
  const trashHoverStyle = useAnimatedStyle(() => {
    const hovering = draggingId.value === el.id && overTrash.value;
    return {
      opacity: withTiming(hovering ? 0.5 : 1, { duration: 120 }),
      transform: [{ scale: withTiming(hovering ? 0.55 : 1, { duration: 120 }) }],
    };
  });

  return (
    <View
      pointerEvents="box-none"
      style={[s.elementLayer, { zIndex: z }, hidden && { opacity: 0 }]}
    >
      <GestureDetector gesture={pan}>
        <Animated.View style={transformStyle} collapsable={false}>
          <Animated.View
            style={trashHoverStyle}
            onLayout={
              el.type === "text"
                ? (e) => onTextSize(el.id, e.nativeEvent.layout.width, e.nativeEvent.layout.height)
                : undefined
            }
          >
            {el.type === "card" ? (
              <MusicStoryCard design={design} song={song} author={author} size={CARD_BASE} showActions={false} />
            ) : (
              <CanvasTextView text={el.text} font={el.font} color={el.color} bg={el.bg} />
            )}
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

// ─── Instagram-style full-screen text entry overlay ──────────────────────────
function TextEditorOverlay({
  initial, onCommit,
}: {
  initial: EditingState;
  onCommit: (payload: TextPayload | null, id: string | null) => void;
}) {
  const [text, setText] = useState(initial.text);
  const [font, setFont] = useState(initial.font);
  const [color, setColor] = useState(initial.color);
  const [bg, setBg] = useState(initial.bg);

  const commit = () => {
    const trimmed = text.trim();
    onCommit(trimmed ? { text: trimmed, font, color, bg } : null, initial.id);
  };

  const onPill = bg ? (isDarkHex(color) ? "#fff" : "#0D0D0D") : color;

  return (
    <View style={[StyleSheet.absoluteFillObject, { zIndex: 1000 }]}>
      {/* Tap anywhere outside the controls to commit, like Instagram */}
      <TouchableOpacity
        activeOpacity={1}
        style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.65)" }]}
        onPress={commit}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        pointerEvents="box-none"
      >
        <View style={s.editorTopBar} pointerEvents="box-none">
          <TouchableOpacity
            onPress={() => setBg((b) => !b)}
            style={[s.bgToggle, bg && { backgroundColor: "#fff" }]}
            activeOpacity={0.7}
          >
            <Text style={[s.bgToggleTxt, bg && { color: "#0D0D0D" }]}>A</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={commit} style={s.chromeBtn} activeOpacity={0.7}>
            <Text style={s.doneTxt}>Done</Text>
          </TouchableOpacity>
        </View>

        <View style={s.editorCenter} pointerEvents="box-none">
          <View style={[s.editorPill, bg && { backgroundColor: color }]}>
            <TextInput
              value={text}
              onChangeText={setText}
              multiline
              autoFocus
              maxLength={200}
              placeholder="Type something"
              placeholderTextColor="rgba(255,255,255,0.4)"
              selectionColor="#fff"
              style={[s.editorInput, fontStyleFor(font), { color: onPill }]}
            />
          </View>
        </View>

        <View pointerEvents="box-none">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            contentContainerStyle={s.fontsRow}
          >
            {OVERLAY_FONTS.map((f) => {
              const active = f === font;
              return (
                <TouchableOpacity key={f} activeOpacity={0.8} onPress={() => setFont(f)} style={[s.fontChip, active && s.fontChipActive]}>
                  <Text style={[s.fontChipTxt, active && { color: "#0D0D0D" }, fontStyleFor(f)]}>Aa</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            contentContainerStyle={s.colorsRow}
          >
            {OVERLAY_COLORS.map((c) => {
              const active = c === color;
              return (
                <TouchableOpacity
                  key={c}
                  activeOpacity={0.85}
                  onPress={() => setColor(c)}
                  style={[s.swatch, { backgroundColor: c, borderColor: active ? "#fff" : "rgba(255,255,255,0.25)", borderWidth: active ? 3 : 1 }]}
                />
              );
            })}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  elementLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },

  guideV: { position: "absolute", left: SW / 2 - 0.5, top: 0, bottom: 0, width: 1, backgroundColor: "rgba(90,200,250,0.9)" },
  guideH: { position: "absolute", top: SH / 2 - 0.5, left: 0, right: 0, height: 1, backgroundColor: "rgba(90,200,250,0.9)" },

  trash: {
    position: "absolute",
    bottom: 60,
    left: SW / 2 - TRASH_SIZE / 2,
    width: TRASH_SIZE,
    height: TRASH_SIZE,
    borderRadius: TRASH_SIZE / 2,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.8)",
    alignItems: "center",
    justifyContent: "center",
  },

  topBar: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    paddingTop: 50,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  chromeBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  aaTxt: { color: "#fff", fontSize: 18, fontWeight: "800" },

  bottomBar: { position: "absolute", left: 0, right: 0, bottom: 32 },
  postBtn: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 999,
  },
  postBtnTxt: { color: "#0D0D0D", fontSize: 14, fontWeight: "800" },

  // Text editor overlay
  editorTopBar: {
    paddingTop: 50,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  bgToggle: {
    width: 36, height: 36, borderRadius: 10,
    borderWidth: 1.5, borderColor: "#fff",
    alignItems: "center", justifyContent: "center",
    marginLeft: 4,
  },
  bgToggleTxt: { color: "#fff", fontSize: 16, fontWeight: "800" },
  doneTxt: { color: "#fff", fontSize: 16, fontWeight: "800" },

  editorCenter: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  editorPill: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, maxWidth: SW * 0.85 },
  editorInput: {
    fontSize: TEXT_BASE_FONT,
    lineHeight: TEXT_BASE_FONT * 1.22,
    textAlign: "center",
    minWidth: 60,
  },

  fontsRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 10 },
  fontChip: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  fontChipActive: { backgroundColor: "#fff" },
  fontChipTxt: { color: "#fff", fontSize: 16 },

  colorsRow: { paddingHorizontal: 16, gap: 12, alignItems: "center", paddingBottom: 16 },
  swatch: { width: 30, height: 30, borderRadius: 15 },
});
