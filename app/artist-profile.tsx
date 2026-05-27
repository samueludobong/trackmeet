import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Share,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import {
  searchSpotifyArtist,
  getArtistAlbums,
  getAlbumTracks,
  openSpotifyLink,
  getValidSpotifyToken,
  type SpotifyArtistInfo,
  type SpotifyAlbum,
  type SpotifyAlbumTrack,
} from "../lib/spotify";

const { width: SW, height: SH } = Dimensions.get("window");
const HERO_H = Math.round(SH * 0.50);

const TABS = ["DISCOGRAPHY", "COMMUNITIES", "EVENTS"] as const;
type Tab = (typeof TABS)[number];

const MOCK_EVENTS = [
  { id: "1", month: "JUN", day: 14, venue: "The Fillmore",   city: "San Francisco, CA" },
  { id: "2", month: "JUN", day: 22, venue: "Terminal 5",     city: "New York, NY"      },
  { id: "3", month: "JUL", day: 3,  venue: "House of Blues", city: "Chicago, IL"       },
  { id: "4", month: "JUL", day: 19, venue: "9:30 Club",      city: "Washington, DC"    },
  { id: "5", month: "AUG", day: 8,  venue: "The Paramount",  city: "Seattle, WA"       },
];

// ─── Mirrors the standalone `artists` table exactly ──────────────────────────
// No relation to the `users` table whatsoever.
type ArtistProfile = {
  id:                string;
  name:              string;
  slug:              string;
  bio:               string | null;
  is_verified:       boolean;
  spotify_artist_id: string | null;
  label:             string | null;
  booking_email:     string | null;
  avatar_url:        string | null;
  banner_image_url:  string | null;
  banner_color:      string | null;
  social_links:      Record<string, string>;
  genres:            string[];
  monthly_listeners: number | null;
  created_at:        string;
};

function fmtListeners(n: number | null): string {
  if (!n) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M monthly listeners`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K monthly listeners`;
  return `${n} monthly listeners`;
}

function fmtDuration(ms: number): string {
  const sec = Math.floor(ms / 1000);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

function fmtAlbumMeta(album: SpotifyAlbum): string {
  const year   = album.releaseDate?.split("-")[0] ?? "";
  const type   = album.albumType === "single" ? "Single"
               : album.albumType === "album"  ? "Album"
               : "EP";
  const tracks = `${album.totalTracks} ${album.totalTracks === 1 ? "track" : "tracks"}`;
  return [year, type, tracks].filter(Boolean).join(" · ");
}

function isNewRelease(releaseDate: string): boolean {
  try {
    const normalized =
      releaseDate.length === 4 ? `${releaseDate}-01-01`
      : releaseDate.length === 7 ? `${releaseDate}-01`
      : releaseDate;
    const diffDays = (Date.now() - new Date(normalized).getTime()) / 86_400_000;
    return diffDays >= 0 && diffDays <= 90;
  } catch { return false; }
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ArtistProfileScreen() {
  const router = useRouter();
  // Navigate here with: router.push({ pathname: "/artist-profile", params: { artistId: "..." } })
  const { artistId } = useLocalSearchParams<{ artistId: string }>();

  const [artist,      setArtist]      = useState<ArtistProfile | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState<Tab>("DISCOGRAPHY");

  // Spotify discography state
  const [spotifyInfo,    setSpotifyInfo]    = useState<SpotifyArtistInfo | null>(null);
  const [albums,         setAlbums]         = useState<SpotifyAlbum[]>([]);
  const [featuredTracks, setFeaturedTracks] = useState<SpotifyAlbumTrack[]>([]);
  const [discLoading,    setDiscLoading]    = useState(false);

  useEffect(() => { loadArtist(); }, [artistId]);

  const loadArtist = async () => {
    if (!artistId) return;
    try {
      // ── One query, one table — no joins ───────────────────────────────────
      const { data, error } = await supabase
        .from("artists")
        .select("*")
        .eq("id", artistId)
        .single<ArtistProfile>();

      if (error) throw error;
      setArtist(data);

      // Load discography using viewer's Spotify token
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const token = await getValidSpotifyToken(user.id);
        if (token) loadDiscography(token, data.spotify_artist_id, data.name);
      }
    } catch (err) {
      console.error("loadArtist:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadDiscography = async (
    token: string,
    storedArtistId: string | null,
    artistName: string,
  ) => {
    setDiscLoading(true);
    try {
      // Resolve the Spotify artist ID
      let resolvedId: string | null = storedArtistId;
      if (!resolvedId) {
        const info = await searchSpotifyArtist(token, artistName);
        if (!info) return;
        resolvedId = info.id;
        setSpotifyInfo(info);
      }

      // Fetch artist info + albums in parallel
      const [artistRes, albumList] = await Promise.all([
        fetch(`https://api.spotify.com/v1/artists/${resolvedId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        getArtistAlbums(token, resolvedId),
      ]);

      if (artistRes.ok) {
        const a = await artistRes.json();
        setSpotifyInfo({
          id:             a.id,
          name:           a.name,
          imageUrl:       a.images?.[0]?.url ?? null,
          genres:         a.genres ?? [],
          followersCount: a.followers?.total ?? 0,
        });
      }

      setAlbums(albumList);

      if (albumList.length > 0) {
        const tracks = await getAlbumTracks(token, albumList[0].id);
        setFeaturedTracks(tracks);
      }
    } catch (err) {
      console.error("loadDiscography:", err);
    } finally {
      setDiscLoading(false);
    }
  };

  const handleShare = async () => {
    if (!artist) return;
    try {
      await Share.share({ message: `Check out ${artist.name} on Track Meet!` });
    } catch {}
  };

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
      <ScrollView showsVerticalScrollIndicator={false} bounces>

        {/* ── Hero ──────────────────────────────────────────── */}
        <View style={{ height: HERO_H }}>
          {heroImageUrl ? (
            <Image source={{ uri: heroImageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
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

        {/* ── Platform badges ───────────────────────────────── */}
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
            {artist.genres.slice(0, 2).map(g => (
              <View key={g} style={s.genreChip}>
                <Text style={s.genreText}>{g}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Bio ───────────────────────────────────────────── */}
        {!!artist.bio && <Text style={s.bio}>{artist.bio}</Text>}

        {/* ── Label ─────────────────────────────────────────── */}
        {!!artist.label && (
          <View style={s.labelRow}>
            <FontAwesome5 name="record-vinyl" size={11} color="rgba(255,255,255,0.3)" />
            <Text style={s.labelText}>{artist.label}</Text>
          </View>
        )}

        {/* ── Tab bar ───────────────────────────────────────── */}
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

        {/* ── Tab content ───────────────────────────────────── */}
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
function DiscographyTab({
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

      {/* ── View toggle ───────────────────────────────────── */}
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
          {/* Featured album */}
          <View style={disc.featuredCard}>
            <View style={disc.featuredArtWrap}>
              {featured.imageUrl ? (
                <Image source={{ uri: featured.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
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

          {/* Track list */}
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

          {/* Recent releases */}
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
                      <Image source={{ uri: album.imageUrl }} style={disc.recentArt} resizeMode="cover" />
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
                <Image source={{ uri: album.imageUrl }} style={disc.allArt} resizeMode="cover" />
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
function CommunitiesTab() {
  return (
    <View style={comm.center}>
      <FontAwesome5 name="users" size={38} color="rgba(255,255,255,0.10)" />
      <Text style={comm.emptyText}>No communities yet</Text>
      <Text style={comm.emptySubtext}>This artist hasn't created any communities</Text>
    </View>
  );
}

// ─── EVENTS TAB ───────────────────────────────────────────────────────────────
function EventsTab() {
  return (
    <View style={ev.container}>
      {MOCK_EVENTS.map((event, i) => (
        <TouchableOpacity
          key={event.id}
          style={[ev.row, i === MOCK_EVENTS.length - 1 && ev.rowLast]}
          activeOpacity={0.7}
        >
          <View style={ev.dateCol}>
            <Text style={ev.month}>{event.month}</Text>
            <Text style={ev.day}>{event.day}</Text>
          </View>
          <View style={ev.info}>
            <Text style={ev.venue} numberOfLines={1}>{event.venue}</Text>
            <Text style={ev.city}  numberOfLines={1}>{event.city}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.22)" />
        </TouchableOpacity>
      ))}
      <View style={ev.footer}>
        <Text style={ev.footerText}>No more upcoming events</Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0D0D0D" },

  heroTopRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: 18, paddingTop: 6,
  },
  heroIconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.46)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.13)",
    alignItems: "center", justifyContent: "center",
  },
  heroBottom:  { position: "absolute", bottom: 20, left: 20, right: 20 },
  heroNameRow: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  heroName: {
    fontSize: 34, fontWeight: "900", color: "#fff",
    letterSpacing: -0.5, flexShrink: 1, lineHeight: 40,
  },
  verifiedBadge: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: "#1D9BF0",
    alignItems: "center", justifyContent: "center",
    flexShrink: 0, marginBottom: 4,
  },
  heroListeners: {
    fontSize: 13, fontWeight: "600",
    color: "rgba(255,255,255,0.52)", marginTop: 4,
  },

  badgeRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10, gap: 12,
  },
  badgeLeft: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, flex: 1 },
  spotifyBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: "rgba(29,185,84,0.14)",
    borderWidth: 1, borderColor: "rgba(29,185,84,0.28)",
  },
  spotifyBadgeText: { fontSize: 12, fontWeight: "700", color: "#1DB954" },
  appleBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.18)",
  },
  appleBadgeText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  genreChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
    backgroundColor: "rgba(171,0,255,0.12)",
    borderWidth: 1, borderColor: "rgba(171,0,255,0.26)",
  },
  genreText: { fontSize: 11, fontWeight: "600", color: "#AB00FF" },

  bio: {
    fontSize: 14, color: "rgba(255,255,255,0.58)", lineHeight: 22,
    paddingHorizontal: 20, marginBottom: 10,
  },
  labelRow: {
    flexDirection: "row", alignItems: "center", gap: 7,
    paddingHorizontal: 20, marginBottom: 20,
  },
  labelText: { fontSize: 12, color: "rgba(255,255,255,0.3)", fontWeight: "500" },

  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)",
  },
  tabBtn:        { flex: 1, alignItems: "center", paddingVertical: 14, position: "relative" },
  tabLabel:      { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.32)", letterSpacing: 0.7 },
  tabLabelActive:{ color: "#fff" },
  tabIndicator:  {
    position: "absolute", bottom: 0, left: "18%", right: "18%",
    height: 2, backgroundColor: "#FF6C1A", borderRadius: 2,
  },
  tabContent: { flex: 1, minHeight: 320 },
});

const FEATURED_W = SW - 40;
const RECENT_W   = 140;

const disc = StyleSheet.create({
  center:       { paddingTop: 56, alignItems: "center", gap: 12 },
  emptyText:    { fontSize: 15, fontWeight: "700", color: "rgba(255,255,255,0.22)" },
  emptySubtext: { fontSize: 13, color: "rgba(255,255,255,0.16)", marginTop: 4 },

  featuredCard: {
    marginHorizontal: 20, marginTop: 24, marginBottom: 6,
    backgroundColor: "#161618", borderRadius: 20, overflow: "hidden",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  featuredArtWrap:    { width: FEATURED_W - 2, height: FEATURED_W - 2, backgroundColor: "#1a1a1c" },
  featuredArtFallback:{ alignItems: "center", justifyContent: "center" },
  newBadge: {
    position: "absolute", top: 14, left: 14,
    backgroundColor: "#FF6C1A", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
  },
  newBadgeText:  { fontSize: 10, fontWeight: "900", color: "#fff", letterSpacing: 1 },
  featuredInfo:  { padding: 18 },
  featuredTitle: { fontSize: 19, fontWeight: "800", color: "#fff", lineHeight: 26, marginBottom: 5 },
  featuredMeta:  { fontSize: 12, color: "rgba(255,255,255,0.38)", fontWeight: "500" },

  trackList: {
    marginHorizontal: 20, marginBottom: 28,
    backgroundColor: "#161618", borderRadius: 16, overflow: "hidden",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.07)",
  },
  trackRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingVertical: 13, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)",
  },
  trackNum:  { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.22)", width: 22, textAlign: "right" },
  trackName: { flex: 1, fontSize: 14, fontWeight: "600", color: "#fff" },
  trackDur:  { fontSize: 12, color: "rgba(255,255,255,0.32)", fontWeight: "500" },

  sectionTitle: { fontSize: 17, fontWeight: "800", color: "#fff", marginHorizontal: 20, marginBottom: 14 },
  recentScroll: { paddingHorizontal: 20, gap: 16, paddingBottom: 4 },
  recentCard:   { width: RECENT_W },
  recentArt:    { width: RECENT_W, height: RECENT_W, borderRadius: 14, backgroundColor: "#1a1a1c" },
  recentArtFallback: { alignItems: "center", justifyContent: "center" },
  recentTitle:  { fontSize: 13, fontWeight: "700", color: "#fff", marginTop: 9, lineHeight: 18 },
  recentYear:   { fontSize: 11, color: "rgba(255,255,255,0.32)", marginTop: 3, fontWeight: "500" },

  // ── View toggle ───────────────────────────────────────────────────────────
  toggleRow: {
    flexDirection: "row", gap: 10,
    marginHorizontal: 20, marginTop: 20, marginBottom: 4,
  },
  toggleBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center", justifyContent: "center",
  },
  toggleBtnActive: {
    backgroundColor: "rgba(171,0,255,0.18)",
    borderColor: "rgba(171,0,255,0.50)",
  },
  toggleLabel:      { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.38)" },
  toggleLabelActive:{ color: "#AB00FF" },

  // ── Open in Spotify button (inside featured card) ─────────────────────────
  openBtn: {
    flexDirection: "row", alignItems: "center", gap: 7,
    alignSelf: "flex-start",
    marginTop: 12, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: "rgba(29,185,84,0.12)",
    borderWidth: 1, borderColor: "rgba(29,185,84,0.30)",
  },
  openBtnText: { fontSize: 12, fontWeight: "700", color: "#1DB954" },

  // ── All Releases list ─────────────────────────────────────────────────────
  allList: { marginHorizontal: 20, marginTop: 16 },
  allRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)",
  },
  allArt:         { width: 52, height: 52, borderRadius: 10, backgroundColor: "#1a1a1c" },
  allArtFallback: { alignItems: "center", justifyContent: "center" },
  allTitle:       { fontSize: 14, fontWeight: "700", color: "#fff" },
  allMeta:        { fontSize: 12, color: "rgba(255,255,255,0.36)", fontWeight: "500" },
  allSpotifyBtn:  {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "rgba(29,185,84,0.10)",
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
});

const comm = StyleSheet.create({
  center:       { paddingTop: 60, alignItems: "center", gap: 12 },
  emptyText:    { fontSize: 15, fontWeight: "700", color: "rgba(255,255,255,0.22)" },
  emptySubtext: { fontSize: 13, color: "rgba(255,255,255,0.16)", marginTop: 4 },
});

const ev = StyleSheet.create({
  container: { paddingTop: 8, paddingBottom: 50 },
  row: {
    flexDirection: "row", alignItems: "center", gap: 18,
    paddingHorizontal: 22, paddingVertical: 18,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)",
  },
  rowLast:  { borderBottomWidth: 0 },
  dateCol:  { width: 46, alignItems: "center" },
  month:    { fontSize: 10, fontWeight: "800", color: "#FF6C1A", letterSpacing: 0.8, textTransform: "uppercase" },
  day:      { fontSize: 28, fontWeight: "900", color: "#fff", lineHeight: 34 },
  info:     { flex: 1, gap: 3 },
  venue:    { fontSize: 15, fontWeight: "700", color: "#fff" },
  city:     { fontSize: 13, color: "rgba(255,255,255,0.42)" },
  footer:     { paddingTop: 28, alignItems: "center" },
  footerText: { fontSize: 13, color: "rgba(255,255,255,0.2)" },
});
