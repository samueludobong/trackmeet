import React, { useState } from "react";
import { Modal, View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import type { BroadcastingMember } from "../../services/communities";
import { followUser, unfollowUser } from "../../services/follows";

/** Full-screen grid of broadcasting members with Follow buttons. */
export function NowPlayingGrid({
  members, communityName, viewerId, onClose,
}: {
  members: BroadcastingMember[];
  communityName: string;
  viewerId: string | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [follows, setFollows] = useState<Record<string, boolean>>({});

  const toggleFollow = async (id: string) => {
    if (!viewerId || id === viewerId) return;
    const next = !follows[id];
    setFollows((s) => ({ ...s, [id]: next }));
    try {
      if (next) await followUser(id);
      else await unfollowUser(id);
    } catch {
      setFollows((s) => ({ ...s, [id]: !next }));
    }
  };

  return (
    <Modal visible animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.screen}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.iconCircle} onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.topTitle} numberOfLines={1}>Now playing in {communityName}</Text>
          <View style={{ width: 38 }} />
        </View>

        <FlatList
          data={members}
          keyExtractor={(m) => m.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
          contentContainerStyle={{ gap: 12, paddingTop: 12, paddingBottom: insets.bottom + 24 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push({ pathname: "/user-profile", params: { userId: item.id } })}
              >
                {item.current_song_album_art ? (
                  <CachedImage source={{ uri: item.current_song_album_art }} style={styles.art} />
                ) : (
                  <View style={[styles.art, styles.artFallback]}>
                    <Ionicons name="musical-note" size={28} color="#AB00FF" />
                  </View>
                )}
              </TouchableOpacity>
              <View style={styles.meta}>
                {item.avatar_url ? (
                  <CachedImage source={{ uri: item.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Ionicons name="person" size={12} color="#fff" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.display_name || item.username || "User"}
                  </Text>
                  <Text style={styles.song} numberOfLines={1}>
                    {item.current_song_name}{item.current_song_artist ? ` · ${item.current_song_artist}` : ""}
                  </Text>
                </View>
              </View>
              {viewerId && item.id !== viewerId && (
                <TouchableOpacity
                  style={[styles.followBtn, follows[item.id] && styles.followBtnActive]}
                  onPress={() => toggleFollow(item.id)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.followText, follows[item.id] && styles.followTextActive]}>
                    {follows[item.id] ? "Following" : "Follow"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0D0D0D" },
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 10,
  },
  iconCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center", justifyContent: "center",
  },
  topTitle: { flex: 1, textAlign: "center", fontSize: 14, fontWeight: "700", color: "#fff" },

  card: {
    flex: 1, backgroundColor: "#1A1A1A", borderRadius: 16, padding: 10, gap: 10,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  art: { width: "100%", aspectRatio: 1, borderRadius: 10, backgroundColor: "#222" },
  artFallback: { alignItems: "center", justifyContent: "center", backgroundColor: "rgba(171,0,255,0.18)" },
  meta: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatar: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#222" },
  avatarFallback: { backgroundColor: "rgba(171,0,255,0.5)", alignItems: "center", justifyContent: "center" },
  name: { fontSize: 13, fontWeight: "700", color: "#fff" },
  song: { fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 1 },

  followBtn: {
    paddingVertical: 8, borderRadius: 12,
    backgroundColor: "#AB00FF", alignItems: "center",
  },
  followBtnActive: { backgroundColor: "rgba(255,255,255,0.08)" },
  followText: { fontSize: 12, fontWeight: "800", color: "#fff" },
  followTextActive: { color: "rgba(255,255,255,0.7)" },
});
