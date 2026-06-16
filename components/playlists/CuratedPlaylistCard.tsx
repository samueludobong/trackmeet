import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { cpStyles, profileStyles } from "../../assets/styles/feed/localStyles";
import { type CuratedPlaylist } from "../../lib/feed/types";

export function CuratedPlaylistCard({ pl, onPress }: { pl: CuratedPlaylist; onPress: () => void }) {
  return (
    <TouchableOpacity style={profileStyles.playlistListItem} onPress={onPress} activeOpacity={0.82}>
      <View style={[profileStyles.playlistListArt, { backgroundColor: '#1a0030' }]}>
        {pl.image_url
          ? <CachedImage source={{ uri: pl.image_url }} style={{ width: 56, height: 56 }} resizeMode="cover" />
          : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 22 }}>🎵</Text>
            </View>
        }
      </View>
      <View style={{ flex: 1 }}>
        <Text style={profileStyles.playlistListName} numberOfLines={1}>{pl.name}</Text>
        <Text style={profileStyles.playlistListMeta}>
          {pl.tags.length > 0 ? pl.tags.slice(0, 2).join(' · ') : 'Curated'}
        </Text>
      </View>
      {pl.show_on_profile && (
        <View style={cpStyles.profileBadge}>
          <Text style={cpStyles.profileBadgeText}>On profile</Text>
        </View>
      )}
      <Text style={profileStyles.playlistChevron}>›</Text>
    </TouchableOpacity>
  );
}
