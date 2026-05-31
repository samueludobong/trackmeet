import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { type SpotifyPlaylist } from "../../lib/spotify";
import { profileStyles } from "../../lib/feed/localStyles";

export function SpotifyPlaylistCard({ pl, onPress }: { pl: SpotifyPlaylist; onPress: () => void }) {
  return (
    <TouchableOpacity style={profileStyles.playlistListItem} onPress={onPress} activeOpacity={0.82}>
      <View style={[profileStyles.playlistListArt, { backgroundColor: '#0a1a0a' }]}>
        {pl.imageUrl
          ? <Image source={{ uri: pl.imageUrl }} style={{ width: 56, height: 56 }} resizeMode="cover" />
          : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 22 }}>🎵</Text>
            </View>
        }
      </View>
      <View style={{ flex: 1 }}>
        <Text style={profileStyles.playlistListName} numberOfLines={1}>{pl.name}</Text>
        <Text style={profileStyles.playlistListMeta}>{pl.trackCount} song{pl.trackCount !== 1 ? 's' : ''}</Text>
      </View>
      <Text style={profileStyles.playlistChevron}>›</Text>
    </TouchableOpacity>
  );
}
