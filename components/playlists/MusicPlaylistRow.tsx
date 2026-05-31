import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { type SpotifyPlaylist } from "../../lib/spotify";
import { mlStyles } from "../../lib/feed/localStyles";

export function MusicPlaylistRow({
  playlist, onPress,
}: {
  playlist: SpotifyPlaylist;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={mlStyles.musicRow} activeOpacity={0.75} onPress={onPress}>
      {playlist.imageUrl ? (
        <Image source={{ uri: playlist.imageUrl }} style={mlStyles.musicRowArt} />
      ) : (
        <View style={[mlStyles.musicRowArt, { backgroundColor: playlist.isLiked ? "#1c4d2e" : "#1e1e22", alignItems: "center", justifyContent: "center" }]}>
          <Ionicons name={playlist.isLiked ? "heart" : "musical-notes"} size={18} color={playlist.isLiked ? "#1DB954" : "rgba(255,255,255,0.3)"} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={mlStyles.musicRowName} numberOfLines={1}>{playlist.name}</Text>
        <Text style={mlStyles.musicRowSub} numberOfLines={1}>{playlist.trackCount} songs</Text>
      </View>
      <Ionicons name="chevron-forward" size={17} color="rgba(255,255,255,0.25)" />
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
