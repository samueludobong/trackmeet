import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { supabase } from "../../lib/supabase";
import { getActiveStories, type Story } from "../../services/stories";
import { prefetchSongPreview } from "../../lib/songPreview";
import { styles } from "../../assets/styles/feed/styles";

/**
 * Top-of-feed stories section. The strip starts with a "Your story" tile (+ to
 * add) and then one tile per author with at least one live story. Adding a
 * music story is done by pasting any streaming link (resolved via Odesli) in
 * the story composer — no Spotify dependency.
 */
export function FeedStoriesStrip() {
  const router = useRouter();
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

  return (
    <View>
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
