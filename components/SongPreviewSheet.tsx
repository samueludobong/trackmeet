import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useEffect, useRef, useState } from "react";
import { Audio } from "expo-av";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { openSpotifyLink, saveTrackToLiked } from "../lib/spotify";

const ART_SIZE = Math.min(Dimensions.get("window").width - 80, 220);

type Song = {
  id: string;
  name: string;
  artist: string;
  albumArt: string | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  song: Song | null;
  /** Viewer's Spotify access token — needed to fetch preview URL + save to liked */
  accessToken: string | null;
};

export function SongPreviewSheet({ visible, onClose, song, accessToken }: Props) {
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const slideAnim   = useRef(new Animated.Value(400)).current;

  const soundRef   = useRef<Audio.Sound | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [playing,    setPlaying]    = useState(false);
  const [posMs,      setPosMs]      = useState(0);
  const [durMs,      setDurMs]      = useState(30_000);
  const [saved,      setSaved]      = useState(false);
  const [saving,     setSaving]     = useState(false);
  // Keep Modal mounted until the close animation finishes
  const [rendered,   setRendered]   = useState(false);

  // ── Animate in/out ────────────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 1, duration: 240, useNativeDriver: true }),
        Animated.spring(slideAnim,    { toValue: 0, useNativeDriver: true, tension: 68, friction: 12 }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim,    { toValue: 400, duration: 260, useNativeDriver: true }),
      ]).start(() => setRendered(false));
    }
  }, [visible]);

  // ── Load + play preview when sheet opens / song changes ───────────────────
  useEffect(() => {
    if (!visible || !song?.id || !accessToken) return;

    let active = true;

    // Reset state
    setLoading(true);
    setPosMs(0);
    setSaved(false);
    setPreviewUrl(null);

    const load = async () => {
      try {
        // Fetch preview_url for this track ID
        const res = await fetch(`https://api.spotify.com/v1/tracks/${song.id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok || !active) return;
        const data = await res.json();
        const url: string | null = data.preview_url ?? null;
        if (!active) return;
        setPreviewUrl(url);

        if (!url) { setLoading(false); return; }

        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, shouldDuckAndroid: true });

        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true },
          (status) => {
            if (!status.isLoaded || !active) return;
            setPosMs(status.positionMillis ?? 0);
            setDurMs(status.durationMillis ?? 30_000);
            setPlaying(status.isPlaying ?? false);
          },
        );

        if (active) {
          soundRef.current = sound;
        } else {
          // Component closed while loading — clean up immediately
          await sound.stopAsync().catch(() => {});
          await sound.unloadAsync().catch(() => {});
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load().catch(console.error);

    return () => {
      active = false;
      const s = soundRef.current;
      soundRef.current = null;
      if (s) {
        s.stopAsync().then(() => s.unloadAsync()).catch(() => {});
      }
      setPlaying(false);
      setLoading(false);
    };
  }, [visible, song?.id]);

  // ── Controls ──────────────────────────────────────────────────────────────
  const togglePlay = async () => {
    const s = soundRef.current;
    if (!s) return;
    if (playing) await s.pauseAsync().catch(() => {});
    else         await s.playAsync().catch(() => {});
  };

  const handleSave = async () => {
    if (!song?.id || !accessToken || saved || saving) return;
    setSaving(true);
    const ok = await saveTrackToLiked(accessToken, song.id);
    if (ok) setSaved(true);
    setSaving(false);
  };

  const handleOpen = () => {
    if (!song?.id) return;
    openSpotifyLink(
      `spotify:track:${song.id}`,
      `https://open.spotify.com/track/${song.id}`,
    );
  };

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  const progress = durMs > 0 ? Math.min(posMs / durMs, 1) : 0;

  if (!song) return null;

  return (
    <Modal
      visible={rendered}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View
        style={[StyleSheet.absoluteFill, ps.root, { opacity: backdropAnim }]}
      >
      {/* Dimmed backdrop — tap to dismiss */}
      <Pressable
        style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.72)" }]}
        onPress={onClose}
      />

      {/* Bottom sheet */}
      <Animated.View style={[ps.sheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* Drag handle */}
        <View style={ps.handle} />

        {/* Album art */}
        <View style={ps.artWrap}>
          {song.albumArt ? (
            <Image source={{ uri: song.albumArt }} style={ps.art} resizeMode="cover" />
          ) : (
            <View style={[ps.art, ps.artFallback]}>
              <FontAwesome5 name="music" size={36} color="rgba(255,255,255,0.18)" />
            </View>
          )}
        </View>

        {/* Track + artist */}
        <Text style={ps.trackName} numberOfLines={1}>{song.name}</Text>
        <Text style={ps.artist}    numberOfLines={1}>{song.artist}</Text>

        {/* Progress bar + play button (only when a preview URL is available) */}
        {loading ? (
          <View style={ps.loadingWrap}>
            <ActivityIndicator color="rgba(255,255,255,0.4)" />
          </View>
        ) : previewUrl ? (
          <>
            <View style={ps.progressTrack}>
              <View style={[ps.progressFill, { width: `${progress * 100}%` as any }]} />
            </View>
            <View style={ps.times}>
              <Text style={ps.time}>{fmt(posMs)}</Text>
              <Text style={ps.time}>{fmt(durMs)}</Text>
            </View>

            <TouchableOpacity style={ps.playBtn} onPress={togglePlay} activeOpacity={0.85}>
              <Ionicons name={playing ? "pause" : "play"} size={28} color="#fff" />
            </TouchableOpacity>
          </>
        ) : (
          <View style={ps.loadingWrap}>
            <Text style={ps.noPreview}>No 30-second preview available</Text>
          </View>
        )}

        {/* Open + Save row */}
        <View style={ps.actions}>
          <TouchableOpacity style={ps.openBtn} activeOpacity={0.8} onPress={handleOpen}>
            <FontAwesome5 name="spotify" size={14} color="#1DB954" />
            <Text style={ps.openBtnText}>Open</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[ps.saveBtn, saved && ps.savedBtn]}
            activeOpacity={0.8}
            onPress={handleSave}
            disabled={saved || saving}
          >
            <Ionicons
              name={saved ? "heart" : "heart-outline"}
              size={14}
              color={saved ? "#1DB954" : "rgba(255,255,255,0.5)"}
            />
            <Text style={[ps.saveBtnText, saved && ps.savedBtnText]}>
              {saving ? "Saving…" : saved ? "Saved" : "Save to Liked"}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const ps = StyleSheet.create({
  root: { zIndex: 300 },

  sheet: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    backgroundColor: "#1A1A1C",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingBottom: 44,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderBottomWidth: 0,
  },

  handle: {
    width: 38, height: 4, borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginTop: 12, marginBottom: 26,
  },

  artWrap:    { marginBottom: 20 },
  art:        { width: ART_SIZE, height: ART_SIZE, borderRadius: 20 },
  artFallback:{
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center", justifyContent: "center",
  },

  trackName: {
    fontSize: 20, fontWeight: "800", color: "#fff",
    textAlign: "center", marginBottom: 5, alignSelf: "stretch",
  },
  artist: {
    fontSize: 14, color: "rgba(255,255,255,0.45)",
    textAlign: "center", marginBottom: 22, alignSelf: "stretch",
  },

  progressTrack: {
    alignSelf: "stretch", height: 3,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 2, marginBottom: 6,
  },
  progressFill: { height: 3, backgroundColor: "#1DB954", borderRadius: 2 },

  times: {
    alignSelf: "stretch",
    flexDirection: "row", justifyContent: "space-between",
    marginBottom: 22,
  },
  time: { fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: "600" },

  playBtn: {
    width: 62, height: 62, borderRadius: 31,
    backgroundColor: "#1DB954",
    alignItems: "center", justifyContent: "center",
    marginBottom: 28,
  },

  loadingWrap: {
    height: 90, alignItems: "center", justifyContent: "center",
  },
  noPreview: {
    fontSize: 13, color: "rgba(255,255,255,0.3)", textAlign: "center",
  },

  actions: {
    flexDirection: "row", gap: 12, alignSelf: "stretch",
  },
  openBtn: {
    flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8,
    height: 48, borderRadius: 14,
    backgroundColor: "rgba(29,185,84,0.12)",
    borderWidth: 1, borderColor: "rgba(29,185,84,0.3)",
  },
  openBtnText: { fontSize: 14, fontWeight: "700", color: "#1DB954" },
  saveBtn: {
    flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8,
    height: 48, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  savedBtn:     { backgroundColor: "rgba(29,185,84,0.12)", borderColor: "rgba(29,185,84,0.3)" },
  saveBtnText:  { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.5)" },
  savedBtnText: { color: "#1DB954" },
});
