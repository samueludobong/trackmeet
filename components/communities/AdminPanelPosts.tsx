import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  getCommunityPosts, deleteCommunityPost, setCommunityPostPinned, setCommunityPostAnnouncement,
  type CommunityPost,
} from "../../services/communities";
import { adminStyles as a } from "./adminPanel.styles";

export function AdminPanelPosts({ communityId }: { communityId: string }) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => getCommunityPosts(communityId, 100).then(setPosts);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [communityId]);

  const remove = (p: CommunityPost) => {
    Alert.alert("Delete post?", "This permanently removes the post.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await deleteCommunityPost(p.id);
            setPosts((prev) => prev.filter((x) => x.id !== p.id));
          } catch (e: any) { Alert.alert("Couldn't delete", e?.message ?? "Try again."); }
        },
      },
    ]);
  };

  const togglePin = async (p: CommunityPost) => {
    try { await setCommunityPostPinned(p.id, !p.pinned_at); await refresh(); }
    catch (e: any) { Alert.alert("Couldn't update pin", e?.message ?? "Try again."); }
  };

  const toggleAnnouncement = async (p: CommunityPost) => {
    const next = !p.is_announcement;
    setPosts((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_announcement: next } : x)));
    try { await setCommunityPostAnnouncement(p.id, next); }
    catch { setPosts((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_announcement: !next } : x))); }
  };

  if (loading) return <ActivityIndicator color="#AB00FF" style={{ marginTop: 24 }} />;
  if (posts.length === 0) return <Text style={a.helper}>No posts yet.</Text>;

  return (
    <View style={{ gap: 10 }}>
      <Text style={a.helper}>{posts.length} post{posts.length === 1 ? "" : "s"} · pinned posts show first in the feed</Text>
      {posts.map((p) => (
        <View key={p.id} style={a.postRow}>
          <View style={{ flex: 1 }}>
            <View style={pp.metaRow}>
              <Text style={a.postAuthor} numberOfLines={1}>
                {p.author?.display_name || p.author?.username || "User"}
              </Text>
              {!!p.pinned_at && <Ionicons name="pin" size={12} color="#AB00FF" />}
              {p.is_announcement && <Ionicons name="megaphone" size={12} color="#FFD24A" />}
            </View>
            {!!p.text && <Text style={a.postText} numberOfLines={3}>{p.text}</Text>}
            {!!p.song_name && (
              <View style={a.songChip}>
                <Ionicons name="musical-notes" size={11} color="#AB00FF" />
                <Text style={a.songText} numberOfLines={1}>{p.song_name}{p.song_artist ? ` · ${p.song_artist}` : ""}</Text>
              </View>
            )}
          </View>
          <View style={pp.actions}>
            <TouchableOpacity style={pp.actionBtn} onPress={() => togglePin(p)} hitSlop={6}>
              <Ionicons name={p.pinned_at ? "pin" : "pin-outline"} size={17} color={p.pinned_at ? "#AB00FF" : "rgba(255,255,255,0.55)"} />
            </TouchableOpacity>
            <TouchableOpacity style={pp.actionBtn} onPress={() => toggleAnnouncement(p)} hitSlop={6}>
              <Ionicons name={p.is_announcement ? "megaphone" : "megaphone-outline"} size={17} color={p.is_announcement ? "#FFD24A" : "rgba(255,255,255,0.55)"} />
            </TouchableOpacity>
            <TouchableOpacity style={pp.actionBtn} onPress={() => remove(p)} hitSlop={6}>
              <Ionicons name="trash-outline" size={17} color="#FF4757" />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

const pp = StyleSheet.create({
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  actions: { gap: 10, alignItems: "center" },
  actionBtn: { padding: 2 },
});
