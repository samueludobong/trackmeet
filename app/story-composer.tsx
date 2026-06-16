import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet, FlatList } from "react-native";
import { CachedImage } from "../components/ui/CachedImage";
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
import { s } from "../assets/styles/app/story-composer";

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
                      <CachedImage source={{ uri: nowPlaying!.albumArt }} style={s.trackArt} />
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
                <CachedImage source={{ uri: item.albumArt }} style={s.trackArt} />
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
