import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { pplStyles } from "../../lib/feed/localStyles";
import { type DiscoverUser } from "../../types/discover";
import { BannerShape } from "../profile/BannerShape";

/** A search-result card for a person in Discover. */
export function PersonResultCard({
  user: u,
  following,
  onToggleFollow,
  onPress,
}: {
  user: DiscoverUser;
  following: boolean;
  onToggleFollow: () => void;
  onPress: () => void;
}) {
  const name = u.display_name || u.username;
  const initials = name.trim().split(/\s+/).map((p: string) => p[0]?.toUpperCase() ?? "").slice(0, 2).join("");
  return (
    <TouchableOpacity style={pplStyles.card} activeOpacity={0.92} onPress={onPress}>
      <View style={pplStyles.bannerWrap}>
        {u.banner_image_url ? (
          <CachedImage source={{ uri: u.banner_image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : u.banner_color ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: u.banner_color }]} />
        ) : (
          <LinearGradient
            colors={["#3D0C00", "#CC4200", "#FF6C1A", "#CC4200", "#3D0C00"]}
            locations={[0, 0.25, 0.5, 0.75, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        {u.banner_shape && !u.banner_image_url && (
          <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
            <BannerShape shape={u.banner_shape} color={u.banner_shape_color ?? "#ffffff"} size={36} />
          </View>
        )}
        <View style={pplStyles.bannerFollowWrap}>
          <TouchableOpacity
            style={[pplStyles.followBtn, following && pplStyles.followingBtn]}
            activeOpacity={0.8}
            onPress={onToggleFollow}
          >
            <Text style={[pplStyles.followBtnText, following && pplStyles.followingBtnText]}>
              {following ? "Following" : "Follow"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={pplStyles.avatarRow}>
        {u.avatar_url ? (
          <CachedImage source={{ uri: u.avatar_url }} style={pplStyles.avatarImg} />
        ) : (
          <View style={pplStyles.avatarFallback}><Text style={pplStyles.avatarInitials}>{initials}</Text></View>
        )}
      </View>

      <View style={pplStyles.info}>
        <View style={pplStyles.nameRow}>
          <Text style={pplStyles.name} numberOfLines={1}>{name}</Text>
          {!!u.is_verified && (
            <View style={pplStyles.verifiedBadge}><Text style={pplStyles.verifiedText}>✓</Text></View>
          )}
        </View>
        <Text style={pplStyles.username} numberOfLines={1}>@{u.username}</Text>
        {!!u.bio && <Text style={pplStyles.bio} numberOfLines={2}>{u.bio}</Text>}
        <View style={pplStyles.statsRow}>
          <Text style={pplStyles.statNum}>{(u.following_count ?? 0).toLocaleString()}</Text>
          <Text style={pplStyles.statLabel}> Following  </Text>
          <Text style={pplStyles.statNum}>{(u.followers_count ?? 0).toLocaleString()}</Text>
          <Text style={pplStyles.statLabel}> {(u.followers_count ?? 0) === 1 ? "Follower" : "Followers"}</Text>
        </View>
        {!!u.pinned_song_name && (
          <View style={pplStyles.pinnedRow}>
            {u.pinned_song_album_art ? (
              <CachedImage source={{ uri: u.pinned_song_album_art }} style={pplStyles.pinnedArt} />
            ) : (
              <View style={pplStyles.pinnedArtFallback}>
                <FontAwesome5 name="music" size={9} color="rgba(255,255,255,0.3)" />
              </View>
            )}
            <Text style={pplStyles.pinnedText} numberOfLines={1}>
              {u.pinned_song_name}{u.pinned_song_artist ? ` — ${u.pinned_song_artist}` : ""}
            </Text>
          </View>
        )}
        {(u.top_genres?.length ?? 0) > 0 && (
          <View style={pplStyles.genreRow}>
            {u.top_genres!.slice(0, 3).map((g) => (
              <View key={g} style={pplStyles.genreChip}><Text style={pplStyles.genreText} numberOfLines={1}>{g}</Text></View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
