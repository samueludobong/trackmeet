import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { type SpotifyTrackResult } from "../../lib/spotify";
import { pdStyles } from "../../lib/feed/localStyles";

export function SpotifyTrackRow({ track, accent }: { track: SpotifyTrackResult; accent: string }) {
  return (
    <TouchableOpacity style={pdStyles.songRow} activeOpacity={0.75}>
      {track.albumArt
        ? <CachedImage source={{ uri: track.albumArt }} style={[pdStyles.songArt, { borderRadius: 8 }]} />
        : <View style={[pdStyles.songArt, { backgroundColor: accent + '30', alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ fontSize: 13 }}>🎵</Text>
          </View>
      }
      <View style={pdStyles.songInfo}>
        <Text style={pdStyles.songTitle} numberOfLines={1}>{track.name}</Text>
        <Text style={pdStyles.songArtist} numberOfLines={1}>{track.artist}</Text>
      </View>
    </TouchableOpacity>
  )
}

// ─── Curated playlist detail overlay ─────────────────────────────────────────
