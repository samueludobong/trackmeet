import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { CommunityCard } from "../../services/communities";
import { CommunityAvatar } from "./CommunityAvatar";
import { LivePulseDot } from "./LivePulseDot";
import { styles } from "../../assets/styles/communities/DiscoverCommunityCard";

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
