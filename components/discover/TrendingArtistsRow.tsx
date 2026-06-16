import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { ds } from "../../lib/feed/localStyles";
import { AVATAR_MAP } from "../../app/data/mock";

/** Horizontal "Trending Artists" row with follow toggles. */
export function TrendingArtistsRow({
  artists,
  followedArtists,
  onToggleFollow,
}: {
  artists: any[];
  followedArtists: Set<string>;
  onToggleFollow: (id: string) => void;
}) {
  return (
    <>
      <View style={ds.sectionHeader}><Text style={ds.sectionTitle}>Trending Artists</Text></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ds.artistsRow} style={{ marginBottom: 32 }}>
        {artists.map((a) => {
          const photo = AVATAR_MAP[a.user];
          const following = followedArtists.has(a.id);
          return (
            <View key={a.id} style={ds.artistCard}>
              <View style={[ds.artistAvatarRing, { borderColor: a.color }]}>
                {photo ? (
                  <CachedImage source={photo} style={ds.artistAvatar} />
                ) : (
                  <View style={[ds.artistAvatar, { backgroundColor: a.color + "25", alignItems: "center", justifyContent: "center" }]}>
                    <Text style={[ds.artistInitials, { color: a.color }]}>{a.initials}</Text>
                  </View>
                )}
              </View>
              <Text style={ds.artistName} numberOfLines={1}>{a.name}</Text>
              <Text style={ds.artistGenre}>{a.genre}</Text>
              <TouchableOpacity
                style={[ds.followBtn, following && { backgroundColor: a.color, borderColor: a.color }]}
                activeOpacity={0.8}
                onPress={() => onToggleFollow(a.id)}
              >
                <Text style={[ds.followBtnText, following && ds.followBtnTextActive]}>{following ? "Following" : "Follow"}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </>
  );
}
