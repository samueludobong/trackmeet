import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated, Share, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { getActiveStories, deleteStory, type Story } from "../services/stories";
import { MusicStoryCard } from "../components/stories/MusicStoryCard";
import { AddToPlaylistSheet } from "../components/AddToPlaylistSheet";
import { SW, SH } from "../lib/feed/dimensions";

const STORY_DURATION_MS = 5000;
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

  // Animate progress + advance on completion
  useEffect(() => {
    if (!current || paused) return;
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: STORY_DURATION_MS,
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

  return (
    <View style={s.root}>
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

      {/* Progress bars */}
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

      {/* Top bar — author + close */}
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
        {isMine && (
          <TouchableOpacity onPress={onDelete} style={s.iconBtn} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={20} color="#fff" />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn} activeOpacity={0.7}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* The card itself */}
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }} pointerEvents="box-none">
        {current.type === "music" && current.songId && current.songName && current.songArtist ? (
          <MusicStoryCard
            design={current.cardDesign}
            song={{
              id: current.songId,
              name: current.songName,
              artist: current.songArtist,
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
        ) : (
          <View style={{ padding: 24 }}>
            <Text style={{ color: "rgba(255,255,255,0.5)" }}>Unsupported story type.</Text>
          </View>
        )}
      </View>

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

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000", paddingTop: 50 },

  progressRow: { flexDirection: "row", gap: 4, paddingHorizontal: 12, marginBottom: 8 },
  progressTrack: { flex: 1, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.18)", overflow: "hidden" },
  progressFill:  { height: "100%", backgroundColor: "#fff" },

  headerRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 8 },
  avatarFallback: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#AB00FF", alignItems: "center", justifyContent: "center" },
  authorName: { color: "#fff", fontSize: 14, fontWeight: "800" },
  timeTxt:    { color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 1 },
  iconBtn:    { width: 36, height: 36, alignItems: "center", justifyContent: "center" },

  tapLeft:  { position: "absolute", left: 0, top: 0, bottom: 0, width: "30%" },
  tapRight: { position: "absolute", right: 0, top: 0, bottom: 0, width: "70%" },
});
