import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated, Share, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { getActiveStories, deleteStory, type Story } from "../services/stories";
import { MusicStoryCard } from "../components/stories/MusicStoryCard";
import { StoryCanvasRenderer } from "../components/stories/StoryCanvasRenderer";
import { DeleteStoryConfirmOverlay } from "../components/stories/DeleteStoryConfirmOverlay";
import { AddToPlaylistSheet } from "../components/AddToPlaylistSheet";
import { useStoryAudioPool } from "../hooks/useStoryAudioPool";
import { useDragDownToClose } from "../hooks/useDragDownToClose";
import { SW, SH } from "../lib/feed/dimensions";
import { s } from "../assets/styles/app/story-viewer";

const DEFAULT_STORY_DURATION_MS = 5000;
const CARD_SIZE = Math.min(SW - 32, SH * 0.55);

export default function StoryViewerScreen() {
  const router = useRouter();
  const { authorId } = useLocalSearchParams<{ authorId?: string }>();

  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe]           = useState<string | null>(null);
  const [idx, setIdx]         = useState(0);
  const [paused, setPaused]   = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [muted, setMuted]     = useState(false);

  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setMe(user?.id ?? null);
      try {
        const all = await getActiveStories();
        const mine = authorId ? all.filter((s) => s.userId === authorId) : all;
        setStories(mine);
      } catch {
        setStories([]);
      }
      setLoading(false);
    })();
  }, [authorId]);

  const current = stories[idx];

  // Pooled song-preview audio, mirroring the feed: play the current story's
  // song and preload the neighbours so advancing is instant. Non-neighbour
  // sounds are evicted by the hook.
  const preloadSongIds = useMemo(() => {
    const out: string[] = [];
    for (let i = idx - 1; i <= idx + 2; i++) {
      if (i < 0 || i >= stories.length || i === idx) continue;
      const sid = stories[i]?.songId;
      if (sid && !out.includes(sid)) out.push(sid);
    }
    return out;
  }, [stories, idx]);

  useStoryAudioPool({ activeSongId: current?.songId ?? null, preloadSongIds, paused, muted });

  // Swipe down to dismiss — the screen follows the finger, fades + scales, and
  // closes past the threshold (otherwise springs back).
  const { dragY, panHandlers } = useDragDownToClose({ onClose: () => router.back(), distance: SH });
  const dragOpacity = dragY.interpolate({ inputRange: [0, SH * 0.5], outputRange: [1, 0.4], extrapolate: "clamp" });
  const dragScale   = dragY.interpolate({ inputRange: [0, SH], outputRange: [1, 0.88], extrapolate: "clamp" });
  const dragRadius  = dragY.interpolate({ inputRange: [0, 120], outputRange: [0, 24], extrapolate: "clamp" });

  // Track the live progress value so a long-press pause can resume from where
  // it stopped instead of restarting the bar.
  const progressValRef = useRef(0);
  useEffect(() => {
    const id = progress.addListener(({ value }) => { progressValRef.current = value; });
    return () => progress.removeListener(id);
  }, [progress]);

  // Animate progress + advance on completion. On a new story we start from 0;
  // on resume-after-pause (same story) we continue from the frozen position
  // over the remaining time, so the bar stays in sync with the audio.
  const lastStoryIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!current || paused) return;
    const total = current.durationMs || DEFAULT_STORY_DURATION_MS;
    const isNewStory = lastStoryIdRef.current !== current.id;
    lastStoryIdRef.current = current.id;
    const from = isNewStory ? 0 : progressValRef.current;
    if (isNewStory) progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: Math.max(0, total * (1 - from)),
      useNativeDriver: false,
    });
    anim.start(({ finished }) => {
      if (!finished) return;
      if (idx + 1 < stories.length) setIdx(idx + 1);
      else router.back();
    });
    return () => anim.stop();
  }, [idx, stories.length, paused, current?.id]);

  const goPrev = () => { if (idx > 0) setIdx(idx - 1); };
  const goNext = () => {
    if (idx + 1 < stories.length) setIdx(idx + 1);
    else router.back();
  };

  const onAddToPlaylist = () => { if (current?.songId) { setPaused(true); setPickerOpen(true); } };
  const onShare = async () => {
    if (!current) return;
    setPaused(true);
    try {
      const url = current.songId ? `https://open.spotify.com/track/${current.songId}` : "";
      await Share.share({
        message: `${current.songName} — ${current.songArtist}${url ? `\n${url}` : ""}`,
      });
    } finally {
      setPaused(false);
    }
  };
  const onDelete = async () => {
    if (!current) return;
    try {
      await deleteStory(current.id);
    } catch {}
    const next = stories.filter((_, i) => i !== idx);
    if (next.length === 0) { router.back(); return; }
    setStories(next);
    if (idx >= next.length) setIdx(next.length - 1);
  };

  if (loading) {
    return (
      <View style={[s.root, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!current) {
    return (
      <View style={[s.root, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: "rgba(255,255,255,0.5)" }}>No stories.</Text>
        <TouchableOpacity onPress={() => router.back()} style={[s.iconBtn, { marginTop: 16 }]} activeOpacity={0.7}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  const isMine = me && current.userId === me;
  const liked  = false;

  const isMusic = current.type === "music" && current.songId && current.songName && current.songArtist;
  const isText  = current.type === "text" && !!current.text;
  const hasCanvas = isMusic && current.canvas != null;

  return (
    <View style={s.root}>
     <Animated.View
       style={{
         flex: 1,
         backgroundColor: isText ? (current.bgColor ?? "#0D0D0D") : "#000",
         overflow: "hidden",
         borderRadius: dragRadius,
         opacity: dragOpacity,
         transform: [{ translateY: dragY }, { scale: dragScale }],
       }}
       {...panHandlers}
     >
      {/* Tap zones for prev/next + long-press to pause */}
      <View style={StyleSheet.absoluteFillObject}>
        <TouchableOpacity
          activeOpacity={1}
          style={s.tapLeft}
          onPress={goPrev}
          delayLongPress={180}
          onLongPress={() => setPaused(true)}
          onPressOut={() => setPaused(false)}
        />
        <TouchableOpacity
          activeOpacity={1}
          style={s.tapRight}
          onPress={goNext}
          delayLongPress={180}
          onLongPress={() => setPaused(true)}
          onPressOut={() => setPaused(false)}
        />
      </View>

      {/* Free-form canvas stories replay the author's full-screen layout. The
          renderer fills the screen so positions match the composer exactly. */}
      {hasCanvas && (
        <StoryCanvasRenderer
          canvas={current.canvas!}
          design={current.cardDesign}
          song={{
            id: current.songId!,
            name: current.songName!,
            artist: current.songArtist!,
            albumArt: current.songAlbumArt,
          }}
          author={{
            username: current.author.username,
            display_name: current.author.display_name,
            avatar_url: current.author.avatar_url,
          }}
          showActions={!isMine}
          liked={liked}
          onAddToPlaylist={onAddToPlaylist}
          onShare={onShare}
        />
      )}

      {/* Progress + author chrome floats above the canvas */}
      <View style={s.chrome} pointerEvents="box-none">
        <View style={s.progressRow} pointerEvents="none">
          {stories.map((_, i) => (
            <View key={i} style={s.progressTrack}>
              <Animated.View
                style={[
                  s.progressFill,
                  i < idx
                    ? { width: "100%" }
                    : i === idx
                      ? { width: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }
                      : { width: "0%" },
                ]}
              />
            </View>
          ))}
        </View>

        <View style={s.headerRow} pointerEvents="box-none">
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={s.avatarFallback}>
              <Text style={{ color: "#fff", fontWeight: "800" }}>
                {(current.author.display_name || current.author.username || "?").trim().slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={s.authorName} numberOfLines={1}>
                {current.author.display_name || current.author.username || "anon"}
              </Text>
              <Text style={s.timeTxt}>{relativeTime(current.createdAt)}</Text>
            </View>
          </View>
          {current.songId && (
            <TouchableOpacity onPress={() => setMuted((m) => !m)} style={s.iconBtn} activeOpacity={0.7}>
              <Ionicons name={muted ? "volume-mute" : "volume-high"} size={20} color="#fff" />
            </TouchableOpacity>
          )}
          {isMine && (
            <TouchableOpacity
              onPress={() => { setPaused(true); setConfirmDelete(true); }}
              style={s.iconBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={20} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => router.back()} style={s.iconBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Legacy stories (no canvas) keep the centered fixed-layout card */}
      {!hasCanvas && (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }} pointerEvents="box-none">
          {isMusic ? (
            <MusicStoryCard
              design={current.cardDesign}
              song={{
                id: current.songId!,
                name: current.songName!,
                artist: current.songArtist!,
                albumArt: current.songAlbumArt,
              }}
              author={{
                username: current.author.username,
                display_name: current.author.display_name,
                avatar_url: current.author.avatar_url,
              }}
              size={CARD_SIZE}
              showActions={!isMine}
              liked={liked}
              onAddToPlaylist={onAddToPlaylist}
              onShare={onShare}
              overlayText={current.overlayText}
              overlayFont={current.overlayFont}
              overlayColor={current.overlayColor}
            />
          ) : isText ? (
            <View style={{ paddingHorizontal: 32 }}>
              <Text style={{ color: current.fgColor ?? "#fff", fontSize: 26, fontWeight: "700", textAlign: "center", lineHeight: 34 }}>
                {current.text}
              </Text>
            </View>
          ) : (
            <View style={{ padding: 24 }}>
              <Text style={{ color: "rgba(255,255,255,0.5)" }}>Unsupported story type.</Text>
            </View>
          )}
        </View>
      )}

     </Animated.View>

      <AddToPlaylistSheet
        visible={pickerOpen}
        onClose={() => { setPickerOpen(false); setPaused(false); }}
        userId={me}
        track={current.songId ? {
          id: current.songId,
          name: current.songName ?? "",
          artist: current.songArtist ?? "",
          albumArt: current.songAlbumArt ?? null,
        } : null}
      />

      {confirmDelete && (
        <DeleteStoryConfirmOverlay
          onConfirm={onDelete}
          onClose={() => { setConfirmDelete(false); setPaused(false); }}
        />
      )}
    </View>
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return "just now";
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
