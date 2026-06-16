import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { Ionicons } from "@expo/vector-icons";
import { pdStyles } from "../../lib/feed/localStyles";
import { type CuratedSong } from "../../lib/feed/types";

export function RealSongRow({ track, accent, onDelete }: { track: CuratedSong; accent: string; onDelete?: () => void }) {
  return (
    <TouchableOpacity style={pdStyles.songRow} activeOpacity={0.75}>
      {track.album_art
        ? <CachedImage source={{ uri: track.album_art }} style={[pdStyles.songArt, { borderRadius: 8 }]} />
        : <View style={[pdStyles.songArt, { backgroundColor: accent + '30', alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ fontSize: 13 }}>🎵</Text>
          </View>
      }
      <View style={pdStyles.songInfo}>
        <Text style={pdStyles.songTitle} numberOfLines={1}>{track.track_name}</Text>
        <Text style={pdStyles.songArtist} numberOfLines={1}>{track.track_artist}</Text>
      </View>
      {onDelete && (
        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="trash-outline" size={16} color="rgba(255,255,255,0.22)" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  )
}
