import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { CommunityCard } from "../../services/communities";
import { CommunityAvatar } from "./CommunityAvatar";
import { styles } from "../../assets/styles/communities/JoinedCommunitiesRow";

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
