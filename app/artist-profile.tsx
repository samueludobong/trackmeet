import { type Tab } from "../types/artist";
import { DiscographyTab, CommunitiesTab, EventsTab } from "../components/artist/ArtistTabs";
import { fmtListeners } from "../lib/artistFormat";
import { s } from "../assets/styles/app/artistProfile";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from "react-native";
import { CachedImage } from "../components/ui/CachedImage";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { openSpotifyLink } from "../lib/spotify";

// ─── Mirrors the standalone `artists` table exactly ──────────────────────────
// No relation to the `users` table whatsoever.

// ─── Main screen ──────────────────────────────────────────────────────────────
import { useArtistProfile } from "../hooks/useArtistProfile";

const { width: SW, height: SH } = Dimensions.get("window");
const HERO_H = Math.round(SH * 0.50);

const TABS = ["DISCOGRAPHY", "COMMUNITIES", "EVENTS"] as const;

export default function ArtistProfileScreen() {
  const {
    router, artist, setArtist, loading, setLoading, activeTab, setActiveTab, spotifyInfo, setSpotifyInfo, albums, setAlbums, featuredTracks, setFeaturedTracks, discLoading, setDiscLoading, loadArtist, loadDiscography, handleShare
  } = useArtistProfile();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0D0D0D", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#AB00FF" size="large" />
      </View>
    );
  }

  if (!artist) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0D0D0D", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 16 }}>Artist not found</Text>
      </View>
    );
  }

  const heroImageUrl = artist.banner_image_url ?? artist.avatar_url ?? spotifyInfo?.imageUrl ?? null;
  const spotifyLink  = artist.social_links?.["spotify"] ?? null;
  const appleLink    = artist.social_links?.["apple"]   ?? null;
  const listeners    = fmtListeners(artist.monthly_listeners);

  return (
    <View style={s.screen}>
      <ScrollView showsVerticalScrollIndicator={false} >
        <View style={{ height: HERO_H }}>
          {heroImageUrl ? (
            <CachedImage source={{ uri: heroImageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <LinearGradient colors={["#3D0C00", "#CC4200", "#FF6C1A"]} style={StyleSheet.absoluteFill} />
          )}
          <LinearGradient
            colors={["rgba(0,0,0,0.45)", "transparent", "transparent", "rgba(13,13,13,0.88)", "#0D0D0D"]}
            locations={[0, 0.22, 0.52, 0.82, 1]}
            style={StyleSheet.absoluteFill}
          />

          <SafeAreaView edges={["top"]} style={s.heroTopRow}>
            <TouchableOpacity style={s.heroIconBtn} onPress={() => router.back()} activeOpacity={0.8}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={s.heroIconBtn} onPress={handleShare} activeOpacity={0.8}>
              <Ionicons name="share-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </SafeAreaView>

          <View style={s.heroBottom}>
            <View style={s.heroNameRow}>
              <Text style={s.heroName} numberOfLines={2}>{artist.name}</Text>
              {artist.is_verified && (
                <View style={s.verifiedBadge}>
                  <Ionicons name="checkmark" size={12} color="#fff" />
                </View>
              )}
            </View>
            {!!listeners && <Text style={s.heroListeners}>{listeners}</Text>}
          </View>
        </View>
        <View style={s.badgeRow}>
          <View style={s.badgeLeft}>
            {spotifyLink && (
              <TouchableOpacity
                style={s.spotifyBadge}
                activeOpacity={0.8}
                onPress={() => openSpotifyLink(
                  `spotify:artist:${artist.spotify_artist_id ?? ""}`,
                  spotifyLink,
                )}
              >
                <FontAwesome5 name="spotify" size={12} color="#1DB954" />
                <Text style={s.spotifyBadgeText}>Spotify</Text>
              </TouchableOpacity>
            )}
            {appleLink && (
              <TouchableOpacity style={s.appleBadge} activeOpacity={0.8} onPress={() => {}}>
                <FontAwesome5 name="apple" size={12} color="#fff" />
                <Text style={s.appleBadgeText}>Apple Music</Text>
              </TouchableOpacity>
            )}
            {artist.genres.slice(0, 2).map((g: string) => (
              <View key={g} style={s.genreChip}>
                <Text style={s.genreText}>{g}</Text>
              </View>
            ))}
          </View>
        </View>
        {!!artist.bio && <Text style={s.bio}>{artist.bio}</Text>}
        {!!artist.label && (
          <View style={s.labelRow}>
            <FontAwesome5 name="record-vinyl" size={11} color="rgba(255,255,255,0.3)" />
            <Text style={s.labelText}>{artist.label}</Text>
          </View>
        )}
        <View style={s.tabBar}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab} style={s.tabBtn} activeOpacity={0.7}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[s.tabLabel, activeTab === tab && s.tabLabelActive]}>{tab}</Text>
              {activeTab === tab && <View style={s.tabIndicator} />}
            </TouchableOpacity>
          ))}
        </View>
        <View style={s.tabContent}>
          {activeTab === "DISCOGRAPHY" && (
            <DiscographyTab
              albums={albums}
              featuredTracks={featuredTracks}
              loading={discLoading}
              spotifyInfo={spotifyInfo}
            />
          )}
          {activeTab === "COMMUNITIES" && <CommunitiesTab />}
          {activeTab === "EVENTS"      && <EventsTab />}
        </View>

      </ScrollView>
    </View>
  );
}

// ─── DISCOGRAPHY TAB ──────────────────────────────────────────────────────────