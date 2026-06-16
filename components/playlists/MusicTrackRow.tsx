import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { Ionicons } from "@expo/vector-icons";
import { type SpotifyTrackResult } from "../../lib/spotify";
import { ms, mlStyles } from "../../lib/feed/localStyles";

export function MusicTrackRow({
  track, playing, onPlay,
}: {
  track: SpotifyTrackResult;
  playing: boolean;
  onPlay: (t: SpotifyTrackResult) => void;
}) {
  const fmtDur = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };
  return (
    <TouchableOpacity style={mlStyles.musicRow} activeOpacity={0.75} onPress={() => onPlay(track)}>
      {track.albumArt ? (
        <CachedImage source={{ uri: track.albumArt }} style={mlStyles.musicRowArt} />
      ) : (
        <View style={[mlStyles.musicRowArt, { backgroundColor: "#2a2a2e", alignItems: "center", justifyContent: "center" }]}>
          <Ionicons name="musical-note" size={18} color="rgba(255,255,255,0.25)" />
        </View>
      )}
      <View style={{ flex: 1, marginRight: 10 }}>
        <Text style={[mlStyles.musicRowName, playing && { color: "#AB00FF" }]} numberOfLines={1}>{track.name}</Text>
        <Text style={mlStyles.musicRowSub} numberOfLines={1}>{track.artist}  ·  {fmtDur(track.durationMs)}</Text>
      </View>
      {playing
        ? <Ionicons name="musical-notes" size={17} color="#AB00FF" />
        : <Ionicons name="play-circle-outline" size={26} color="rgba(255,255,255,0.35)" />
      }
    </TouchableOpacity>
  );
}
