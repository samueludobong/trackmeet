import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { CommunityCard } from "../../services/communities";
import { CommunityAvatar } from "./CommunityAvatar";

/** Horizontal row of joined communities with unread dots. */
export function JoinedCommunitiesRow({
  communities, onOpen,
}: {
  communities: CommunityCard[];
  onOpen: (c: CommunityCard) => void;
}) {
  if (!communities.length) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.header}>Your Communities</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {communities.map((c) => (
          <TouchableOpacity key={c.id} style={styles.item} activeOpacity={0.85} onPress={() => onOpen(c)}>
            <View>
              <CommunityAvatar uri={c.avatar_url} name={c.name} color={c.banner_color} size={60} radius={18} />
              {c.unread && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.name} numberOfLines={1}>{c.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 4, marginBottom: 18 },
  header: {
    fontSize: 14, fontWeight: "800", color: "#fff",
    paddingHorizontal: 20, marginBottom: 10, letterSpacing: -0.2,
  },
  row: { paddingHorizontal: 16, gap: 12 },
  item: { width: 64, alignItems: "center", gap: 6 },
  unreadDot: {
    position: "absolute", top: -2, right: -2,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: "#AB00FF",
    borderWidth: 2, borderColor: "#0D0D0D",
  },
  name: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.75)", maxWidth: 64, textAlign: "center" },
});
