import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getCommunityPosts, deleteCommunityPost, type CommunityPost } from "../../services/communities";
import { adminStyles as a } from "./adminPanel.styles";

export function AdminPanelPosts({ communityId }: { communityId: string }) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCommunityPosts(communityId, 100).then(setPosts).finally(() => setLoading(false));
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

  if (loading) return <ActivityIndicator color="#AB00FF" style={{ marginTop: 24 }} />;
  if (posts.length === 0) return <Text style={a.helper}>No posts yet.</Text>;

  return (
    <View style={{ gap: 10 }}>
      <Text style={a.helper}>{posts.length} post{posts.length === 1 ? "" : "s"}</Text>
      {posts.map((p) => (
        <View key={p.id} style={a.postRow}>
          <View style={{ flex: 1 }}>
            <Text style={a.postAuthor} numberOfLines={1}>
              {p.author?.display_name || p.author?.username || "User"}
            </Text>
            {!!p.text && <Text style={a.postText} numberOfLines={3}>{p.text}</Text>}
            {!!p.song_name && (
              <View style={a.songChip}>
                <Ionicons name="musical-notes" size={11} color="#AB00FF" />
                <Text style={a.songText} numberOfLines={1}>{p.song_name}{p.song_artist ? ` · ${p.song_artist}` : ""}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={a.deleteIcon} onPress={() => remove(p)} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color="#FF4757" />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}
