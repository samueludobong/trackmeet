import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabase";
import { getActiveStories, type Story } from "../../services/stories";
import { useNowPlaying } from "../../hooks/useNowPlaying";
import { prefetchSongPreview } from "../../lib/songPreview";
import { styles } from "../../lib/feed/styles";

/**
 * Top-of-feed stories section. A small "Now playing" card sits above the
 * horizontal strip (hidden when nothing is playing). The strip itself starts
 * with a "Your story" tile (+ to add) and then one tile per author with at
 * least one live story.
 */
export function FeedStoriesStrip() {
  const router = useRouter();
  const { track } = useNowPlaying();
  const [stories, setStories] = useState<Story[]>([]);
  const [meId, setMeId]       = useState<string | null>(null);
  const [meAvatar, setMeAvatar] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setMeId(user?.id ?? null);
      if (user) {
        const { data } = await supabase.from("users").select("avatar_url").eq("id", user.id).single();
        setMeAvatar(data?.avatar_url ?? null);
      }
      setStories(await getActiveStories());
    } catch {
      // table may not exist yet — silently empty
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Group stories by author so each user shows once.
  const byAuthor = new Map<string, Story[]>();
  for (const st of stories) {
    const list = byAuthor.get(st.userId) ?? [];
    list.push(st);
    byAuthor.set(st.userId, list);
  }

  const myStories = meId ? byAuthor.get(meId) ?? [] : [];
  const others    = [...byAuthor.entries()].filter(([id]) => id !== meId);

  const openViewer = (authorId: string) => {
    // Warm the first story's preview during the open animation so audio is
    // ready by the time the viewer mounts.
    prefetchSongPreview(byAuthor.get(authorId)?.[0]?.songId);
    router.push({ pathname: "/story-viewer", params: { authorId } });
  };

  const shareCurrentSong = () => {
    if (!track) return;
    router.push({
      pathname: "/story-card-picker",
      params: {
        songId: track.id,
        songName: track.name,
        songArtist: track.artist,
        songAlbumArt: track.albumArt ?? "",
      },
    });
  };

  return (
    <View>

      {/* {track && (
        <TouchableOpacity activeOpacity={0.85} onPress={shareCurrentSong} style={s.npCard}>
          {track.albumArt ? (
            <CachedImage source={{ uri: track.albumArt }} style={s.npArt} />
          ) : (
            <View style={[s.npArt, s.npArtFallback]}>
              <FontAwesome5 name="music" size={14} color="rgba(255,255,255,0.3)" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={s.npLabel}>Now playing</Text>
            <Text style={s.npTitle} numberOfLines={1}>{track.name}</Text>
            <Text style={s.npSubtitle} numberOfLines={1}>{track.artist}</Text>
          </View>
          <View style={s.npShareBtn}>
            <Ionicons name="add" size={14} color="#0D0D0D" />
            <Text style={s.npShareTxt}>Share</Text>
          </View>
        </TouchableOpacity>
      )} */}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storiesContent}
        style={styles.storiesStrip}
      >
        {/* "Your story" — always first tile */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.nowPlayingItem}
          onPress={() => {
            if (myStories.length > 0) openViewer(meId!);
            else router.push("/story-composer");
          }}
          onLongPress={() => router.push("/story-composer")}
        >
          <View style={[styles.storyRing, { borderColor: myStories.length > 0 ? "#AB00FF" : "rgba(255,255,255,0.15)" }]}>
            {myStories.length > 0 && meAvatar ? (
              <CachedImage source={{ uri: meAvatar }} style={styles.storyAvatar} />
            ) : (
              <View style={[styles.storyAvatar, { backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" }]}>
                <Ionicons name={myStories.length > 0 ? "musical-note" : "add"} size={28} color="#fff" />
              </View>
            )}
            {/* Tiny + badge in the corner so you can always add more */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push("/story-composer")}
              style={[
                styles.nowPlayingBadge,
                { backgroundColor: "#AB00FF", width: 22, height: 22, borderRadius: 11, borderColor: "#0D0D0D" },
              ]}
            >
              <Ionicons name="add" size={13} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.storyName} numberOfLines={1}>
            {myStories.length > 0 ? "Your story" : "Add story"}
          </Text>
          <Text style={styles.storyArtistSub} numberOfLines={1}>
            {myStories.length > 0 ? `${myStories.length} live` : "Tap +"}
          </Text>
        </TouchableOpacity>

        {others.map(([authorId, list]) => {
          const head = list[0];
          const a = head.author;
          const initial = (a.display_name || a.username || "?").trim().slice(0, 1).toUpperCase();
          const subtitle = head.type === "music" && head.songName ? head.songName : `${list.length} story`;
          return (
            <TouchableOpacity key={authorId} style={styles.nowPlayingItem} activeOpacity={0.85} onPress={() => openViewer(authorId)}>
              <View style={[styles.storyRing, { borderColor: "#AB00FF" }]}>
                {a.avatar_url ? (
                  <CachedImage source={{ uri: a.avatar_url }} style={styles.storyAvatar} />
                ) : (
                  <View style={[styles.storyAvatar, { backgroundColor: "rgba(171,0,255,0.18)" }]}>
                    <Text style={[styles.storyInitials, { color: "#AB00FF" }]}>{initial}</Text>
                  </View>
                )}
                {head.type === "music" && (
                  <View style={[styles.nowPlayingBadge, { backgroundColor: "#AB00FF" }]}>
                    <Ionicons name="musical-note" size={9} color="#fff" />
                  </View>
                )}
              </View>
              <Text style={styles.storyName} numberOfLines={1}>{a.username || "anon"}</Text>
              <Text style={styles.storyArtistSub} numberOfLines={1}>{subtitle}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  npCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 14,
  },
  npArt:         { width: 44, height: 44, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.06)" },
  npArtFallback: { alignItems: "center", justifyContent: "center" },
  npLabel:       { color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
  npTitle:       { color: "#fff", fontSize: 14, fontWeight: "700", marginTop: 2 },
  npSubtitle:    { color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 1 },
  npShareBtn:    { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  npShareTxt:    { color: "#0D0D0D", fontSize: 12, fontWeight: "800" },
});
