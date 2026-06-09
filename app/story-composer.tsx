import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, TouchableOpacity, TextInput, Image, ActivityIndicator,
  StyleSheet, FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import {
  getValidSpotifyToken,
  getUserTopTracks,
  searchSpotifyTracks,
  getCurrentlyPlaying,
  type SpotifyTrackResult,
} from "../lib/spotify";
import { KeyboardDismissView } from "../components/shared/KeyboardDismissView";

type StoryType = "music" | "text" | "wrapped";

export default function StoryComposerScreen() {
  const router = useRouter();
  const [type, setType] = useState<StoryType>("music");

  return (
    <KeyboardDismissView style={s.root}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn} activeOpacity={0.7}>
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.title}>New Story</Text>
        <View style={s.iconBtn} />
      </View>

      <View style={s.tabsRow}>
        {(["music","text","wrapped"] as StoryType[]).map((t) => {
          const active = type === t;
          return (
            <TouchableOpacity
              key={t}
              activeOpacity={0.8}
              onPress={() => setType(t)}
              style={[s.tab, active && s.tabActive]}
            >
              <Ionicons
                name={t === "music" ? "musical-notes" : t === "text" ? "text" : "sparkles"}
                size={14}
                color={active ? "#0D0D0D" : "rgba(255,255,255,0.6)"}
              />
              <Text style={[s.tabTxt, active && s.tabTxtActive]}>
                {t === "music" ? "Music" : t === "text" ? "Text" : "Wrapped"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {type === "music"   && <MusicComposer />}
      {type === "text"    && <PlaceholderTab label="Text stories — coming soon" icon="text" />}
      {type === "wrapped" && <PlaceholderTab label="Wrapped stories — coming soon" icon="sparkles" />}
    </KeyboardDismissView>
  );
}

// ─── Music tab ────────────────────────────────────────────────────────────────
function MusicComposer() {
  const router = useRouter();
  const [token, setToken]       = useState<string | null>(null);
  const [nowPlaying, setNowPlaying] = useState<SpotifyTrackResult | null>(null);
  const [popular, setPopular]   = useState<SpotifyTrackResult[]>([]);
  const [loadingPop, setLoadingPop] = useState(true);
  const [query, setQuery]       = useState("");
  const [searchRes, setSearchRes] = useState<SpotifyTrackResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load Spotify token + currently-playing + initial popular list
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoadingPop(false); return; }
      const t = await getValidSpotifyToken(user.id);
      setToken(t);
      if (t) {
        const [np, top] = await Promise.all([
          getCurrentlyPlaying(t),
          getUserTopTracks(t, 25),
        ]);
        if (np && !("unauthorized" in np) && np.id) {
          setNowPlaying({
            id: np.id,
            name: np.name,
            artist: np.artist,
            albumArt: np.albumArt ?? null,
            durationMs: np.durationMs,
            previewUrl: np.previewUrl ?? null,
          });
        }
        setPopular(top);
      }
      setLoadingPop(false);
    })();
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const q = query.trim();
    if (!q) { setSearchRes([]); return; }
    if (!token) return;
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      setSearchRes(await searchSpotifyTracks(token, q, 25));
      setSearching(false);
    }, 350);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query, token]);

  const isSearching = query.trim().length > 0;
  // While not searching, surface "Now playing" at the very top of the list and
  // dedupe it out of the Popular section so the same track doesn't appear twice.
  const popularDeduped = nowPlaying ? popular.filter((t) => t.id !== nowPlaying.id) : popular;
  const list = isSearching ? searchRes : popularDeduped;
  const listLoading = isSearching ? searching : loadingPop;
  const showNowPlaying = !isSearching && nowPlaying != null;

  const onPick = (t: SpotifyTrackResult) => {
    router.push({
      pathname: "/story-card-picker",
      params: {
        songId: t.id,
        songName: t.name,
        songArtist: t.artist,
        songAlbumArt: t.albumArt ?? "",
      },
    });
  };

  if (!token && !loadingPop) {
    return (
      <View style={s.connectWrap}>
        <FontAwesome5 name="spotify" size={32} color="#1DB954" />
        <Text style={s.connectTitle}>Connect Spotify</Text>
        <Text style={s.connectSub}>Link your Spotify account to share music stories.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.4)" style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Search Spotify"
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery("")} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
        )}
      </View>

      {listLoading ? (
        <ActivityIndicator color="#AB00FF" style={{ marginTop: 30 }} />
      ) : !showNowPlaying && list.length === 0 ? (
        <Text style={s.emptyTxt}>{isSearching ? `No results for "${query.trim()}"` : "No popular tracks yet."}</Text>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <>
              {showNowPlaying && (
                <>
                  <Text style={s.sectionHeader}>Now playing</Text>
                  <TouchableOpacity activeOpacity={0.8} style={s.trackRow} onPress={() => onPick(nowPlaying!)}>
                    {nowPlaying!.albumArt ? (
                      <Image source={{ uri: nowPlaying!.albumArt }} style={s.trackArt} />
                    ) : (
                      <View style={[s.trackArt, s.trackArtFallback]}>
                        <FontAwesome5 name="music" size={14} color="rgba(255,255,255,0.3)" />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <View style={s.nowPlayingBadge}>
                        <View style={s.nowPlayingDot} />
                        <Text style={s.nowPlayingBadgeTxt}>Live on Spotify</Text>
                      </View>
                      <Text style={s.trackName} numberOfLines={1}>{nowPlaying!.name}</Text>
                      <Text style={s.trackArtist} numberOfLines={1}>{nowPlaying!.artist}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.4)" />
                  </TouchableOpacity>
                </>
              )}
              <Text style={s.sectionHeader}>{isSearching ? "Results" : "Popular right now"}</Text>
            </>
          }
          renderItem={({ item }) => (
            <TouchableOpacity activeOpacity={0.8} style={s.trackRow} onPress={() => onPick(item)}>
              {item.albumArt ? (
                <Image source={{ uri: item.albumArt }} style={s.trackArt} />
              ) : (
                <View style={[s.trackArt, s.trackArtFallback]}>
                  <FontAwesome5 name="music" size={14} color="rgba(255,255,255,0.3)" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.trackName} numberOfLines={1}>{item.name}</Text>
                <Text style={s.trackArtist} numberOfLines={1}>{item.artist}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

function PlaceholderTab({ label, icon }: { label: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={s.connectWrap}>
      <Ionicons name={icon} size={32} color="rgba(255,255,255,0.4)" />
      <Text style={s.connectTitle}>{label}</Text>
      <Text style={s.connectSub}>Tap the Music tab to share a song right now.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0D0D0D", paddingTop: 50 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 10 },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  title: { color: "#fff", fontSize: 17, fontWeight: "800" },

  tabsRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  tab: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  tabActive: { backgroundColor: "#fff", borderColor: "#fff" },
  tabTxt: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: "700" },
  tabTxtActive: { color: "#0D0D0D" },

  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginHorizontal: 16, marginTop: 10, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, color: "#fff" },

  sectionHeader: { color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", marginTop: 18, marginBottom: 6, marginHorizontal: 18 },

  trackRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  trackArt: { width: 44, height: 44, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.06)" },
  trackArtFallback: { alignItems: "center", justifyContent: "center" },
  trackName: { color: "#fff", fontSize: 14, fontWeight: "700" },
  trackArtist: { color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 2 },

  nowPlayingBadge:    { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", marginBottom: 3 },
  nowPlayingDot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: "#AB00FF" },
  nowPlayingBadgeTxt: { color: "#AB00FF", fontSize: 10, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" },

  emptyTxt: { color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "center", marginTop: 30 },

  connectWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 },
  connectTitle: { color: "#fff", fontWeight: "800", fontSize: 16, marginTop: 10 },
  connectSub: { color: "rgba(255,255,255,0.5)", fontSize: 13, textAlign: "center", marginTop: 4 },
});
