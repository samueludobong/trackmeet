import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { openSpotifyLink } from "../../lib/spotify";

/** Compact song chip appended to non-music posts that have a song attached. */
export function AttachedSongChip({
  songId, songName, songArtist, albumArt,
}: {
  songId: string | null | undefined;
  songName: string | null | undefined;
  songArtist: string | null | undefined;
  albumArt: string | null | undefined;
}) {
  if (!songName) return null;
  const open = () => {
    if (!songId) return;
    openSpotifyLink(`spotify:track:${songId}`, `https://open.spotify.com/track/${songId}`);
  };
  return (
    <TouchableOpacity style={styles.chip} activeOpacity={0.85} onPress={open}>
      {albumArt ? (
        <Image source={{ uri: albumArt }} style={styles.art} />
      ) : (
        <View style={[styles.art, styles.artFallback]}>
          <Ionicons name="musical-note" size={14} color="#1DB954" />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>{songName}</Text>
        {songArtist && <Text style={styles.artist} numberOfLines={1}>{songArtist}</Text>}
      </View>
      <View style={styles.openBtn}>
        <FontAwesome5 name="spotify" size={14} color="#1DB954" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "rgba(29,185,84,0.08)",
    borderWidth: 1, borderColor: "rgba(29,185,84,0.25)",
    borderRadius: 14, padding: 8, marginTop: 8,
  },
  art: { width: 40, height: 40, borderRadius: 8, backgroundColor: "#1a1a1a" },
  artFallback: { backgroundColor: "rgba(29,185,84,0.18)", alignItems: "center", justifyContent: "center" },
  name: { fontSize: 13, fontWeight: "700", color: "#fff" },
  artist: { fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 1 },
  openBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
});
