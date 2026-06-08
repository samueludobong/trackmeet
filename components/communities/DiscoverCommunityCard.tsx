import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { CommunityCard } from "../../services/communities";
import { CommunityAvatar } from "./CommunityAvatar";
import { LivePulseDot } from "./LivePulseDot";

const fmt = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`.replace(".0M", "M");
  if (n >= 1_000) return `${(n / 1_000).toFixed(n < 10_000 ? 1 : 0)}K`.replace(".0K", "K");
  return n.toLocaleString();
};

/** Compact discovery card — avatar + name + member count + description + Join. */
export function DiscoverCommunityCard({
  community, joined, onJoin, onOpen,
}: {
  community: CommunityCard;
  joined: boolean;
  onJoin: () => void;
  onOpen: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onOpen}>
      <View style={styles.head}>
        <CommunityAvatar uri={community.avatar_url} name={community.name} color={community.banner_color} size={48} />
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>{community.name}</Text>
            {community.is_live && <LivePulseDot size={6} />}
            {community.is_trending && (
              <View style={styles.trendingBadge}>
                <Ionicons name="trending-up" size={10} color="#fff" />
                <Text style={styles.trendingText}>Trending</Text>
              </View>
            )}
          </View>
          <Text style={styles.members}>{fmt(community.member_count)} members</Text>
        </View>
        <TouchableOpacity
          style={[styles.joinBtn, joined && styles.joinBtnActive]}
          activeOpacity={0.85}
          onPress={onJoin}
        >
          <Text style={[styles.joinText, joined && styles.joinTextActive]}>{joined ? "Joined" : "Join"}</Text>
        </TouchableOpacity>
      </View>
      {!!community.description && (
        <Text style={styles.description} numberOfLines={1}>{community.description}</Text>
      )}
      {community.genres?.length > 0 && (
        <View style={styles.tagRow}>
          {community.genres.slice(0, 3).map((g) => (
            <View key={g} style={styles.tag}><Text style={styles.tagText}>{g}</Text></View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1A1A1A", borderRadius: 16, padding: 14, gap: 10,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  head: { flexDirection: "row", alignItems: "center", gap: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { fontSize: 15, fontWeight: "800", color: "#fff", letterSpacing: -0.2, maxWidth: 150 },
  members: { fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2, fontWeight: "600" },
  description: { fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 17 },
  joinBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16,
    backgroundColor: "#AB00FF",
  },
  joinBtnActive: { backgroundColor: "rgba(255,255,255,0.08)" },
  joinText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  joinTextActive: { color: "rgba(255,255,255,0.7)" },
  trendingBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "#FF6C1A", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  trendingText: { color: "#fff", fontSize: 9, fontWeight: "900", letterSpacing: 0.3 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  tagText: { color: "#fff", fontSize: 10, fontWeight: "700" },
});
