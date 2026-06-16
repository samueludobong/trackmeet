import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Modal, Pressable, TextInput, Platform, KeyboardAvoidingView, ActivityIndicator, Keyboard, Alert, ScrollView, FlatList } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import {
  searchSpotifyTracks, getValidSpotifyToken, getUserPlaylists,
  getPlaylistTracks, getRecommendedTracks,
  type SpotifyTrackResult, type SpotifyPlaylist,
} from "../../lib/spotify";
import {
  addSongToCuratedPlaylist, getCuratedPlaylistSongs,
} from "../../services/playlists";
import { useNowPlayingCtx } from "../../lib/feed/contexts";
import { useSheetDragClose } from "../../hooks/useSheetDragClose";
import { DragGrabber } from "../common/DragGrabber";
import { SH } from "../../lib/feed/dimensions";

const ACCENT = "#1DB954";

type Mode = "search" | "spotify" | "recommended";
type SpotifySubView =
  | { kind: "playlists" }
  | { kind: "tracks"; playlist: SpotifyPlaylist };

export function AddSongDialog({
  playlistId, userId, onClose, onAdded,
}: {
  playlistId: string;
  userId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { track: nowPlaying } = useNowPlayingCtx();

  // ── Slide + drag-to-close ───────────────────────────────────────────────
  const slideAnim = useRef(new Animated.Value(SH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, []);

  const close = () => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: SH, duration: 240, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => { onAdded(); onClose(); });
  };

  const { panHandlers, stretch } = useSheetDragClose({ slideAnim, onClose: close, closedValue: SH });
  const dragBackdrop = slideAnim.interpolate({ inputRange: [0, SH], outputRange: [1, 0], extrapolate: "clamp" });

  // ── Mode + per-tab state ────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>("search");
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  // Search tab
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SpotifyTrackResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Spotify tab
  const [spotifySub, setSpotifySub] = useState<SpotifySubView>({ kind: "playlists" });
  const [spotifyPlaylists, setSpotifyPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [spotifyPlaylistsLoading, setSpotifyPlaylistsLoading] = useState(false);
  const [spotifyTracks, setSpotifyTracks] = useState<SpotifyTrackResult[]>([]);
  const [spotifyTracksLoading, setSpotifyTracksLoading] = useState(false);

  // Recommended tab
  const [recs, setRecs] = useState<SpotifyTrackResult[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsLoaded, setRecsLoaded] = useState(false);

  // ── Lazy-load each tab on first activation ──────────────────────────────
  useEffect(() => {
    if (mode !== "spotify" || spotifyPlaylists.length > 0 || spotifyPlaylistsLoading) return;
    (async () => {
      setSpotifyPlaylistsLoading(true);
      const token = await getValidSpotifyToken(userId);
      if (!token) { setSpotifyPlaylistsLoading(false); return; }
      const list = await getUserPlaylists(token);
      setSpotifyPlaylists(list);
      setSpotifyPlaylistsLoading(false);
    })();
  }, [mode]);

  useEffect(() => {
    if (mode !== "recommended" || recsLoaded || recsLoading) return;
    (async () => {
      setRecsLoading(true);
      try {
        const token = await getValidSpotifyToken(userId);
        if (!token) { setRecsLoaded(true); return; }
        // Seed with up to 5 track IDs from this playlist (genre-aligned recs).
        const inPlaylist = await getCuratedPlaylistSongs(playlistId);
        const seedIds = inPlaylist.slice(0, 5).map(s => s.spotify_track_id);
        const list = await getRecommendedTracks(token, seedIds, 30);
        // Hide ones already in playlist.
        const have = new Set(inPlaylist.map(s => s.spotify_track_id));
        setRecs(list.filter(t => !have.has(t.id)));
      } finally {
        setRecsLoading(false);
        setRecsLoaded(true);
      }
    })();
  }, [mode]);

  // ── Search handler ───────────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    const token = await getValidSpotifyToken(userId);
    if (!token) { setSearching(false); return; }
    const found = await searchSpotifyTracks(token, query.trim(), 30);
    setSearchResults(found);
    setSearching(false);
  };

  // ── Spotify drill-in ───────────────────────────────────────────────────
  const openSpotifyPlaylist = async (pl: SpotifyPlaylist) => {
    setSpotifySub({ kind: "tracks", playlist: pl });
    setSpotifyTracks([]);
    setSpotifyTracksLoading(true);
    const token = await getValidSpotifyToken(userId);
    if (!token) { setSpotifyTracksLoading(false); return; }
    const { tracks } = await getPlaylistTracks(token, pl.id);
    setSpotifyTracks(tracks);
    setSpotifyTracksLoading(false);
  };

  // ── Add a single track ──────────────────────────────────────────────────
  const addTrack = async (track: SpotifyTrackResult) => {
    if (adding) return;
    if (added.has(track.id)) return;
    setAdding(track.id);
    let result;
    try {
      result = await addSongToCuratedPlaylist(playlistId, track);
    } catch (e: any) {
      Alert.alert("Add failed", e?.message ?? String(e));
      setAdding(null);
      return;
    }
    setAdding(null);
    if (!result.ok) {
      Alert.alert("Couldn't add song", result.error);
      return;
    }
    setAdded(prev => new Set(prev).add(track.id));
    onAdded();
  };

  // ── Now-playing banner data (Spotify track currently playing) ───────────
  const nowPlayingTrack: SpotifyTrackResult | null = useMemo(() => {
    if (!nowPlaying) return null;
    return {
      id: nowPlaying.id,
      name: nowPlaying.name,
      artist: nowPlaying.artist,
      albumArt: nowPlaying.albumArt,
      durationMs: nowPlaying.durationMs,
      previewUrl: nowPlaying.previewUrl,
    };
  }, [nowPlaying]);

  return (
    <Modal transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "rgba(0,0,0,0.65)" },
          { opacity: Animated.multiply(backdropAnim, dragBackdrop) },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      <KeyboardAvoidingView
        style={StyleSheet.absoluteFill}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: slideAnim }, { scaleY: stretch }] },
          ]}
        >
          <DragGrabber panHandlers={panHandlers} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Add Song</Text>
            <TouchableOpacity onPress={close} hitSlop={12}>
              <Ionicons name="close" size={22} color="rgba(255,255,255,0.55)" />
            </TouchableOpacity>
          </View>

          {/* Now Playing banner */}
          {nowPlayingTrack && (
            <View style={styles.nowBanner}>
              <View style={styles.nowDot} />
              {nowPlayingTrack.albumArt ? (
                <CachedImage source={{ uri: nowPlayingTrack.albumArt }} style={styles.nowArt} />
              ) : (
                <View style={[styles.nowArt, styles.artFallback]}>
                  <FontAwesome5 name="music" size={12} color="rgba(255,255,255,0.3)" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.nowLabel}>NOW PLAYING</Text>
                <Text style={styles.nowName} numberOfLines={1}>{nowPlayingTrack.name}</Text>
                <Text style={styles.nowArtist} numberOfLines={1}>{nowPlayingTrack.artist}</Text>
              </View>
              <AddBtn
                added={added.has(nowPlayingTrack.id)}
                loading={adding === nowPlayingTrack.id}
                onPress={() => addTrack(nowPlayingTrack)}
              />
            </View>
          )}

          {/* Tabs */}
          <View style={styles.tabRow}>
            <Tab label="Search" active={mode === "search"} onPress={() => setMode("search")} />
            <Tab label="From Spotify" active={mode === "spotify"} onPress={() => setMode("spotify")} />
            <Tab label="Recommended" active={mode === "recommended"} onPress={() => setMode("recommended")} />
          </View>

          {/* Content */}
          <View style={{ flex: 1 }}>
            {mode === "search" && (
              <View style={{ flex: 1 }}>
                <View style={styles.searchRow}>
                  <Ionicons name="search" size={15} color="rgba(255,255,255,0.4)" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search Spotify…"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={query}
                    onChangeText={setQuery}
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                  />
                  {searching ? (
                    <ActivityIndicator size="small" color={ACCENT} />
                  ) : (
                    query.length > 0 && (
                      <TouchableOpacity onPress={() => { setQuery(""); setSearchResults([]); }} hitSlop={10}>
                        <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.3)" />
                      </TouchableOpacity>
                    )
                  )}
                </View>

                <FlatList
                  data={searchResults}
                  keyExtractor={t => t.id}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    !searching && query.length > 0
                      ? <Text style={styles.emptyText}>No results for "{query}"</Text>
                      : !searching && query.length === 0
                        ? <Text style={styles.emptyText}>Type to search Spotify</Text>
                        : null
                  }
                  renderItem={({ item }) => (
                    <TrackRow
                      track={item}
                      added={added.has(item.id)}
                      loading={adding === item.id}
                      onAdd={() => addTrack(item)}
                    />
                  )}
                />
              </View>
            )}

            {mode === "spotify" && (
              <View style={{ flex: 1 }}>
                {spotifySub.kind === "tracks" && (
                  <View style={styles.subHeader}>
                    <TouchableOpacity onPress={() => setSpotifySub({ kind: "playlists" })} hitSlop={12}>
                      <Ionicons name="chevron-back" size={20} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.subHeaderTitle} numberOfLines={1}>{spotifySub.playlist.name}</Text>
                    <View style={{ width: 20 }} />
                  </View>
                )}

                {spotifySub.kind === "playlists" ? (
                  <FlatList
                    data={spotifyPlaylists}
                    keyExtractor={p => p.id}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                      spotifyPlaylistsLoading
                        ? <ActivityIndicator size="small" color={ACCENT} style={{ marginTop: 24 }} />
                        : <Text style={styles.emptyText}>No Spotify playlists found. Connect Spotify in Settings.</Text>
                    }
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.playlistRow}
                        activeOpacity={0.75}
                        onPress={() => openSpotifyPlaylist(item)}
                      >
                        {item.isLiked ? (
                          <View style={[styles.playlistArt, styles.likedArt]}>
                            <Ionicons name="heart" size={18} color={ACCENT} />
                          </View>
                        ) : item.imageUrl ? (
                          <CachedImage source={{ uri: item.imageUrl }} style={styles.playlistArt} />
                        ) : (
                          <View style={[styles.playlistArt, styles.artFallback]}>
                            <FontAwesome5 name="music" size={14} color="rgba(255,255,255,0.3)" />
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.playlistName} numberOfLines={1}>{item.name}</Text>
                          <Text style={styles.playlistMeta}>{item.trackCount} song{item.trackCount !== 1 ? "s" : ""}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.25)" />
                      </TouchableOpacity>
                    )}
                  />
                ) : (
                  <FlatList
                    data={spotifyTracks}
                    keyExtractor={t => t.id}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                      spotifyTracksLoading
                        ? <ActivityIndicator size="small" color={ACCENT} style={{ marginTop: 24 }} />
                        : <Text style={styles.emptyText}>No tracks in this playlist.</Text>
                    }
                    renderItem={({ item }) => (
                      <TrackRow
                        track={item}
                        added={added.has(item.id)}
                        loading={adding === item.id}
                        onAdd={() => addTrack(item)}
                      />
                    )}
                  />
                )}
              </View>
            )}

            {mode === "recommended" && (
              <FlatList
                data={recs}
                keyExtractor={t => t.id}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                  <Text style={styles.recsHint}>
                    Based on what's already in this playlist.
                  </Text>
                }
                ListEmptyComponent={
                  recsLoading
                    ? <ActivityIndicator size="small" color={ACCENT} style={{ marginTop: 24 }} />
                    : recsLoaded
                      ? <Text style={styles.emptyText}>Add a few songs first to get recommendations.</Text>
                      : null
                }
                renderItem={({ item }) => (
                  <TrackRow
                    track={item}
                    added={added.has(item.id)}
                    loading={adding === item.id}
                    onAdd={() => addTrack(item)}
                  />
                )}
              />
            )}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.tab} activeOpacity={0.8} onPress={onPress}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
      {active && <View style={styles.tabUnderline} />}
    </TouchableOpacity>
  );
}

function TrackRow({
  track, added, loading, onAdd,
}: {
  track: SpotifyTrackResult;
  added: boolean;
  loading: boolean;
  onAdd: () => void;
}) {
  return (
    <View style={styles.trackRow}>
      {track.albumArt ? (
        <CachedImage source={{ uri: track.albumArt }} style={styles.trackArt} />
      ) : (
        <View style={[styles.trackArt, styles.artFallback]}>
          <FontAwesome5 name="music" size={14} color="rgba(255,255,255,0.3)" />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.trackName} numberOfLines={1}>{track.name}</Text>
        <Text style={styles.trackArtist} numberOfLines={1}>{track.artist}</Text>
      </View>
      <AddBtn added={added} loading={loading} onPress={onAdd} />
    </View>
  );
}

function AddBtn({ added, loading, onPress }: { added: boolean; loading: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.addBtn, added && styles.addBtnDone]}
      onPress={onPress}
      disabled={loading || added}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator size="small" color={ACCENT} />
      ) : (
        <Text style={[styles.addBtnText, added && styles.addBtnTextDone]}>
          {added ? "✓" : "Add"}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    backgroundColor: "#10161D",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: "88%",
    borderTopWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22, paddingBottom: 12,
  },
  title: { color: "#fff", fontSize: 19, fontWeight: "800" },

  // ── Now Playing banner ────────────────────────────────────────────────────
  nowBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16, marginBottom: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: "rgba(29,185,84,0.10)",
    borderRadius: 14,
    borderWidth: 1, borderColor: "rgba(29,185,84,0.35)",
  },
  nowDot: {
    width: 7, height: 7, borderRadius: 4, backgroundColor: ACCENT,
    marginRight: 2,
  },
  nowArt: { width: 38, height: 38, borderRadius: 6 },
  nowLabel: {
    color: ACCENT, fontSize: 9, fontWeight: "800", letterSpacing: 1,
    marginBottom: 2,
  },
  nowName: { color: "#fff", fontSize: 13, fontWeight: "700" },
  nowArtist: { color: "rgba(255,255,255,0.55)", fontSize: 11, marginTop: 1 },

  // ── Tabs ──────────────────────────────────────────────────────────────────
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)",
    marginBottom: 8,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabText: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.4)" },
  tabTextActive: { color: "#fff" },
  tabUnderline: {
    position: "absolute",
    bottom: -1, left: "20%", right: "20%",
    height: 2, borderRadius: 2,
    backgroundColor: ACCENT,
  },

  // ── Search ────────────────────────────────────────────────────────────────
  searchRow: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 16, marginBottom: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  searchInput: { flex: 1, color: "#fff", fontSize: 14, padding: 0 },

  // ── Sub-header (Spotify drill-in) ─────────────────────────────────────────
  subHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 10,
  },
  subHeaderTitle: { flex: 1, color: "#fff", fontSize: 14, fontWeight: "700", marginHorizontal: 12, textAlign: "center" },

  // ── Track row ─────────────────────────────────────────────────────────────
  trackRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  trackArt: { width: 46, height: 46, borderRadius: 7 },
  trackName: { color: "#fff", fontSize: 14, fontWeight: "700" },
  trackArtist: { color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 2 },
  artFallback: {
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center", justifyContent: "center",
  },

  // ── Playlist row (Spotify tab) ────────────────────────────────────────────
  playlistRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  playlistArt: { width: 50, height: 50, borderRadius: 8 },
  likedArt: {
    backgroundColor: "rgba(29,185,84,0.14)",
    alignItems: "center", justifyContent: "center",
  },
  playlistName: { color: "#fff", fontSize: 14, fontWeight: "700" },
  playlistMeta: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 },

  // ── Add button ────────────────────────────────────────────────────────────
  addBtn: {
    minWidth: 56, height: 32, borderRadius: 16,
    paddingHorizontal: 14,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  addBtnDone: {
    backgroundColor: "rgba(29,185,84,0.18)",
    borderColor: "rgba(29,185,84,0.55)",
  },
  addBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  addBtnTextDone: { color: ACCENT },

  // ── Misc ─────────────────────────────────────────────────────────────────
  emptyText: {
    color: "rgba(255,255,255,0.35)",
    textAlign: "center",
    paddingHorizontal: 22, paddingVertical: 30,
    fontSize: 13,
  },
  recsHint: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12, fontWeight: "500",
    paddingHorizontal: 22, paddingBottom: 10,
  },
});
