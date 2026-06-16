import React, { useContext, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform, Keyboard } from "react-native";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { CachedImage } from "../ui/CachedImage";
import { NowPlayingCtx } from "../../lib/feed/contexts";
import { searchSpotifyTracks, type SpotifyTrackResult } from "../../lib/spotify";
import { type PinnedSong } from "../../types/music";

/**
 * Lightweight song picker for the comment composer.
 *
 * Stripped to two paths only: the viewer's now-playing track at the top (one
 * tap to attach) and a Spotify search field below (debounced, tap a result to
 * attach). Skips the playlist / preview / save flow that the profile pinner
 * uses — comment-attach is supposed to be a sub-second action.
 */
export function CommentSongPicker({
  visible, onClose, onSelect, accessToken,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (song: PinnedSong) => void;
  accessToken: string | null;
}) {
  const np = useContext(NowPlayingCtx);
  const nowPlaying = np?.track ?? null;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyTrackResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modal slide animation — same shape as the other bottom sheets.
  const slideAnim = useRef(new Animated.Value(600)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(visible);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      slideAnim.setValue(600);
      backdropAnim.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 200 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else if (rendered) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 600, duration: 220, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished) setRendered(false); });
    }
  }, [visible, rendered, slideAnim, backdropAnim]);

  // Reset state every time the picker opens; clear pending search on close.
  useEffect(() => {
    if (visible) { setQuery(""); setResults([]); setSearching(false); }
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [visible]);

  // Debounced Spotify search.
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const q = query.trim();
    if (!q || !accessToken) { setResults([]); setSearching(false); return; }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      const found = await searchSpotifyTracks(accessToken, q, 20);
      setResults(found);
      setSearching(false);
    }, 280);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query, accessToken]);

  const handlePickNowPlaying = () => {
    if (!nowPlaying) return;
    onSelect({
      id: nowPlaying.id,
      name: nowPlaying.name,
      artist: nowPlaying.artist,
      albumArt: nowPlaying.albumArt,
      previewUrl: nowPlaying.previewUrl,
    });
  };

  const handlePickResult = (t: SpotifyTrackResult) => {
    onSelect({
      id: t.id,
      name: t.name,
      artist: t.artist,
      albumArt: t.albumArt,
      previewUrl: t.previewUrl,
    });
  };

  return (
    <Modal visible={rendered} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      {/* Single Pressable backdrop wraps the sheet (same shape as
          CreatePlaylistDialog). Avoids mixing absolute-positioned siblings with
          flex children — on Android that ordering is unreliable without explicit
          zIndex, and the absolute backdrop could end up swallowing taps to the
          search input. With this structure stacking is implicit and stable. */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <AnimatedPressable style={[styles.backdrop, { opacity: backdropAnim }]} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()}>
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Attach a song</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          {/* Now playing — one tap to attach the viewer's currently-playing track */}
          {nowPlaying && (
            <TouchableOpacity style={styles.npRow} activeOpacity={0.85} onPress={handlePickNowPlaying}>
              {nowPlaying.albumArt ? (
                <CachedImage source={{ uri: nowPlaying.albumArt }} style={styles.npArt} />
              ) : (
                <View style={[styles.npArt, styles.artFallback]}>
                  <FontAwesome5 name="music" size={14} color="rgba(255,255,255,0.4)" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View style={styles.npBadgeRow}>
                  <View style={styles.npDot} />
                  <Text style={styles.npBadge}>Now playing</Text>
                </View>
                <Text style={styles.npName} numberOfLines={1}>{nowPlaying.name}</Text>
                <Text style={styles.npArtist} numberOfLines={1}>{nowPlaying.artist}</Text>
              </View>
              <View style={styles.attachBtn}>
                <Ionicons name="add" size={18} color="#1DB954" />
              </View>
            </TouchableOpacity>
          )}

          {/* Search */}
          <View style={styles.searchRow}>
            <Ionicons name="search" size={16} color="rgba(255,255,255,0.45)" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search Spotify"
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            )}
          </View>

          {/* Results */}
          {query.trim().length > 0 ? (
            searching ? (
              <View style={styles.empty}>
                <ActivityIndicator color="rgba(255,255,255,0.5)" />
              </View>
            ) : results.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No matches yet — keep typing</Text>
              </View>
            ) : (
              <FlatList
                data={results}
                keyExtractor={(t) => t.id}
                keyboardShouldPersistTaps="handled"
                style={{ flex: 1 }}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.resultRow} activeOpacity={0.75} onPress={() => handlePickResult(item)}>
                    {item.albumArt ? (
                      <CachedImage source={{ uri: item.albumArt }} style={styles.resultArt} />
                    ) : (
                      <View style={[styles.resultArt, styles.artFallback]}>
                        <FontAwesome5 name="music" size={12} color="rgba(255,255,255,0.3)" />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.resultArtist} numberOfLines={1}>{item.artist}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )
          ) : (
            <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss}>
              <View style={styles.empty}>
                <Text style={styles.emptyText}>
                  {accessToken ? "Search for any song on Spotify" : "Connect Spotify to search songs"}
                </Text>
              </View>
            </Pressable>
          )}
        </Animated.View>
        </Pressable>
        </AnimatedPressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const styles = StyleSheet.create({
  // Full-screen backdrop with the sheet at the bottom — flex-end pushes the
  // sheet up when KeyboardAvoidingView shrinks this container.
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "flex-end" },
  sheet: {
    height: "78%",
    backgroundColor: "#161618",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    // Rounded bottom too: stays hidden below the screen edge when the keyboard
    // is closed, and becomes visible when the keyboard lifts the sheet up.
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    paddingHorizontal: 16, paddingTop: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  title: { fontSize: 16, fontWeight: "800", color: "#fff" },

  npRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 12, paddingVertical: 12, borderRadius: 14,
    backgroundColor: "rgba(29,185,84,0.08)",
    borderWidth: 1, borderColor: "rgba(29,185,84,0.3)",
    marginBottom: 12,
  },
  npArt: { width: 44, height: 44, borderRadius: 8, backgroundColor: "#222" },
  npBadgeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  npDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#1DB954" },
  npBadge: { fontSize: 10, fontWeight: "800", color: "#1DB954", letterSpacing: 0.5, textTransform: "uppercase" },
  npName: { fontSize: 14, fontWeight: "700", color: "#fff" },
  npArtist: { fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 1 },
  attachBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "rgba(29,185,84,0.18)",
    alignItems: "center", justifyContent: "center",
  },

  searchRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 12, height: 42, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#fff", paddingVertical: 0 },

  resultRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 10, paddingHorizontal: 4,
  },
  resultArt: { width: 38, height: 38, borderRadius: 6, backgroundColor: "#222" },
  resultName: { fontSize: 13, fontWeight: "700", color: "#fff" },
  resultArtist: { fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 1 },

  artFallback: { alignItems: "center", justifyContent: "center" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyText: { fontSize: 13, color: "rgba(255,255,255,0.4)", textAlign: "center" },
});
