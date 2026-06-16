import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { FontAwesome5 } from "@expo/vector-icons";
import { openSpotifyLink, type SpotifyArtistInfo, type SpotifyAlbum, type SpotifyAlbumTrack } from "../../lib/spotify";
import { disc } from "../../assets/styles/app/artistProfile";
import { fmtDuration, fmtAlbumMeta, isNewRelease } from "../../lib/artistFormat";

export function DiscographyTab({
  albums, featuredTracks, loading, spotifyInfo,
}: {
  albums: SpotifyAlbum[];
  featuredTracks: SpotifyAlbumTrack[];
  loading: boolean;
  spotifyInfo: SpotifyArtistInfo | null;
}) {
  const [view, setView] = useState<"featured" | "all">("featured");

  if (loading) {
    return (
      <View style={disc.center}>
        <ActivityIndicator color="#AB00FF" />
        <Text style={disc.emptySubtext}>Loading discography…</Text>
      </View>
    );
  }

  if (albums.length === 0) {
    return (
      <View style={disc.center}>
        <FontAwesome5 name="compact-disc" size={38} color="rgba(255,255,255,0.10)" />
        <Text style={disc.emptyText}>No discography available</Text>
        <Text style={disc.emptySubtext}>Spotify data could not be loaded</Text>
      </View>
    );
  }

  const featured       = albums[0];
  const recentReleases = albums.slice(1);

  const openAlbum = (id: string) =>
    openSpotifyLink(`spotify:album:${id}`, `https://open.spotify.com/album/${id}`);

  return (
    <View style={{ paddingBottom: 50 }}>
      <View style={disc.toggleRow}>
        <TouchableOpacity
          style={[disc.toggleBtn, view === "featured" && disc.toggleBtnActive]}
          onPress={() => setView("featured")}
          activeOpacity={0.75}
        >
          <Text style={[disc.toggleLabel, view === "featured" && disc.toggleLabelActive]}>Featured</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[disc.toggleBtn, view === "all" && disc.toggleBtnActive]}
          onPress={() => setView("all")}
          activeOpacity={0.75}
        >
          <Text style={[disc.toggleLabel, view === "all" && disc.toggleLabelActive]}>
            All Releases ({albums.length})
          </Text>
        </TouchableOpacity>
      </View>

      {view === "featured" ? (
        <>
          <View style={disc.featuredCard}>
            <View style={disc.featuredArtWrap}>
              {featured.imageUrl ? (
                <CachedImage source={{ uri: featured.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              ) : (
                <View style={[StyleSheet.absoluteFill, disc.featuredArtFallback]}>
                  <FontAwesome5 name="compact-disc" size={40} color="rgba(255,255,255,0.12)" />
                </View>
              )}
              {isNewRelease(featured.releaseDate) && (
                <View style={disc.newBadge}>
                  <Text style={disc.newBadgeText}>NEW</Text>
                </View>
              )}
            </View>
            <View style={disc.featuredInfo}>
              <Text style={disc.featuredTitle} numberOfLines={2}>{featured.name}</Text>
              <Text style={disc.featuredMeta}>{fmtAlbumMeta(featured)}</Text>
              <TouchableOpacity style={disc.openBtn} onPress={() => openAlbum(featured.id)} activeOpacity={0.8}>
                <FontAwesome5 name="spotify" size={12} color="#1DB954" />
                <Text style={disc.openBtnText}>Open in Spotify</Text>
              </TouchableOpacity>
            </View>
          </View>
          {featuredTracks.length > 0 && (
            <View style={disc.trackList}>
              {featuredTracks.slice(0, 10).map((track, i) => (
                <View
                  key={track.id}
                  style={[disc.trackRow, i === Math.min(featuredTracks.length, 10) - 1 && { borderBottomWidth: 0 }]}
                >
                  <Text style={disc.trackNum}>{String(i + 1).padStart(2, "0")}</Text>
                  <Text style={disc.trackName} numberOfLines={1}>{track.name}</Text>
                  <Text style={disc.trackDur}>{fmtDuration(track.durationMs)}</Text>
                </View>
              ))}
            </View>
          )}
          {recentReleases.length > 0 && (
            <>
              <Text style={disc.sectionTitle}>Recent Releases</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={disc.recentScroll}>
                {recentReleases.slice(0, 10).map(album => (
                  <TouchableOpacity
                    key={album.id}
                    style={disc.recentCard}
                    activeOpacity={0.8}
                    onPress={() => openAlbum(album.id)}
                  >
                    {album.imageUrl ? (
                      <CachedImage source={{ uri: album.imageUrl }} style={disc.recentArt} resizeMode="cover" />
                    ) : (
                      <View style={[disc.recentArt, disc.recentArtFallback]}>
                        <FontAwesome5 name="compact-disc" size={22} color="rgba(255,255,255,0.14)" />
                      </View>
                    )}
                    <Text style={disc.recentTitle} numberOfLines={2}>{album.name}</Text>
                    <Text style={disc.recentYear}>{album.releaseDate?.split("-")[0]}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}
        </>
      ) : (
        /* ── All releases list ──────────────────────────── */
        <View style={disc.allList}>
          {albums.map((album, i) => (
            <TouchableOpacity
              key={album.id}
              style={[disc.allRow, i === albums.length - 1 && { borderBottomWidth: 0 }]}
              activeOpacity={0.8}
              onPress={() => openAlbum(album.id)}
            >
              {album.imageUrl ? (
                <CachedImage source={{ uri: album.imageUrl }} style={disc.allArt} resizeMode="cover" />
              ) : (
                <View style={[disc.allArt, disc.allArtFallback]}>
                  <FontAwesome5 name="compact-disc" size={16} color="rgba(255,255,255,0.14)" />
                </View>
              )}
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={disc.allTitle} numberOfLines={1}>{album.name}</Text>
                <Text style={disc.allMeta}>{fmtAlbumMeta(album)}</Text>
              </View>
              <View style={disc.allSpotifyBtn}>
                <FontAwesome5 name="spotify" size={13} color="#1DB954" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── COMMUNITIES TAB ──────────────────────────────────────────────────────────
