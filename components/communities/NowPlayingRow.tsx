import React from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { BroadcastingMember } from "../../services/communities";

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
              <Image source={{ uri: m.current_song_album_art }} style={styles.art} />
            ) : (
              <View style={[styles.art, styles.artFallback]}>
                <Ionicons name="musical-note" size={20} color="#AB00FF" />
              </View>
            )}
            {m.avatar_url ? (
              <Image source={{ uri: m.avatar_url }} style={styles.avatar} />
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

const styles = StyleSheet.create({
  section: { marginTop: 18 },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, marginBottom: 10,
  },
  title: { fontSize: 14, fontWeight: "800", color: "#fff", letterSpacing: -0.2 },
  seeAll: { fontSize: 12, fontWeight: "700", color: "#AB00FF" },

  row: { paddingHorizontal: 16, gap: 10 },
  card: { width: 72, alignItems: "flex-start" },
  art: { width: 72, height: 72, borderRadius: 12, backgroundColor: "#1A1A1A" },
  artFallback: { alignItems: "center", justifyContent: "center", backgroundColor: "rgba(171,0,255,0.18)" },
  avatar: {
    position: "absolute", left: 4, top: 50,
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: "#0D0D0D",
    backgroundColor: "#1A1A1A",
  },
  avatarFallback: { backgroundColor: "rgba(171,0,255,0.5)", alignItems: "center", justifyContent: "center" },
  song: { width: 72, marginTop: 6, fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.75)" },

  emptyBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16, paddingVertical: 14, paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  emptyText: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.45)" },
});
