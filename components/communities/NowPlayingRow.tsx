import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { BroadcastingMember } from "../../services/communities";
import { styles } from "../../assets/styles/communities/NowPlayingRow";

/** Horizontal carousel of broadcasting community members. 72x72 album-art cards. */
export function NowPlayingRow({
  members, onSeeAll,
}: {
  members: BroadcastingMember[];
  onSeeAll: () => void;
}) {
  const router = useRouter();

  if (!members.length) {
    return (
      <View style={styles.section}>
        <SectionHeader title="Now Playing" />
        <View style={styles.emptyBox}>
          <Ionicons name="musical-notes-outline" size={18} color="rgba(255,255,255,0.35)" />
          <Text style={styles.emptyText}>Be the first to broadcast</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <SectionHeader title="Now Playing" onSeeAll={onSeeAll} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {members.map((m) => (
          <TouchableOpacity
            key={m.id}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: "/user-profile", params: { userId: m.id } })}
          >
            {m.current_song_album_art ? (
              <CachedImage source={{ uri: m.current_song_album_art }} style={styles.art} />
            ) : (
              <View style={[styles.art, styles.artFallback]}>
                <Ionicons name="musical-note" size={20} color="#AB00FF" />
              </View>
            )}
            {m.avatar_url ? (
              <CachedImage source={{ uri: m.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Ionicons name="person" size={10} color="#fff" />
              </View>
            )}
            <Text style={styles.song} numberOfLines={1}>{m.current_song_name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7}>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
