import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { pplStyles } from "../../lib/feed/localStyles";
import { type ArtistResult } from "../../types/discover";
import { useArtistProfile } from "../../hooks/useArtistProfile";

const fmtListeners = (n: number | null) => {
  if (!n) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M listeners`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K listeners`;
  return `${n} listeners`;
};

/** A search-result card for an artist in Discover. */
export function ArtistResultCard({
  artist: a,
  onPress,
}: {
  artist: ArtistResult;
  onPress: () => void;
}) {
  const { spotifyInfo } = useArtistProfile();

  const heroImageUrl =
    a.banner_image_url ?? a.avatar_url ?? spotifyInfo?.imageUrl ?? null;

    console.log("ARTIST RESULT CARD RENDER", a.name, heroImageUrl);
  return (
    <TouchableOpacity
      style={pplStyles.artistCard}
      activeOpacity={0.88}
      onPress={onPress}
    >
      <View style={pplStyles.artistBanner}>
        {a.banner_image_url ? (
          <Image
            source={{ uri: a.banner_image_url }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : a.banner_color ? (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: a.banner_color },
            ]}
          />
        ) : (
          <LinearGradient
            colors={["#3D0C00", "#CC4200", "#FF6C1A", "#CC4200", "#3D0C00"]}
            locations={[0, 0.25, 0.5, 0.75, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        <LinearGradient
          colors={["transparent", "rgba(22,22,24,0.6)"]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      </View>

      <View style={pplStyles.artistAvatarRow}>
        {heroImageUrl ? (
          <Image
            source={{ uri: heroImageUrl }}
            style={pplStyles.artistAvatar}
          />
        ) : (
          <View
            style={[pplStyles.artistAvatar, pplStyles.artistAvatarFallback]}
          >
            <FontAwesome5
              name="microphone"
              size={18}
              color="rgba(255,255,255,0.3)"
            />
          </View>
        )}
      </View>

      <View style={pplStyles.artistInfo}>
        <View style={pplStyles.nameRow}>
          <Text style={pplStyles.name} numberOfLines={1}>
            {a.name}
          </Text>
          {a.is_verified && (
            <View style={pplStyles.verifiedBadge}>
              <Text style={pplStyles.verifiedText}>✓</Text>
            </View>
          )}
          <View style={pplStyles.artistBadge}>
            <Text style={pplStyles.artistBadgeText}>Artist</Text>
          </View>
        </View>
        {!!fmtListeners(a.monthly_listeners) && (
          <Text style={pplStyles.username} numberOfLines={1}>
            {fmtListeners(a.monthly_listeners)}
          </Text>
        )}
        {!!a.bio && (
          <Text style={pplStyles.bio} numberOfLines={2}>
            {a.bio}
          </Text>
        )}
        {a.genres.length > 0 && (
          <View style={pplStyles.genreRow}>
            {a.genres.slice(0, 3).map((g) => (
              <View key={g} style={pplStyles.genreChip}>
                <Text style={pplStyles.genreText} numberOfLines={1}>
                  {g}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
