import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { FontAwesome5 } from "@expo/vector-icons";
import { useNowPlaying } from "../lib/useNowPlaying";
import { openSpotifyLink } from "../lib/spotify";

const BANNER_H = 172;
const AVATAR_SIZE = 86;
const AVATAR_OVERLAP = Math.round(AVATAR_SIZE * 0.44);

// ─── Now Playing card ────────────────────────────────────────────────────────

function NowPlayingCard() {
  const { track, liveProgressMs, gradient, loading, needsReconnect, reconnect } = useNowPlaying();
  const pulse = useRef(new Animated.Value(1)).current;

  // Pulse the green dot while playing
  useEffect(() => {
    if (!track?.isPlaying) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 900, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [track?.isPlaying]);

  if (loading) return null;

  if (needsReconnect) {
    return (
      <View style={npStyles.card}>
        <View style={npStyles.header}>
          <FontAwesome5 name="spotify" size={13} color="#1DB954" />
          <Text style={[npStyles.label, { flex: 1 }]}>SPOTIFY</Text>
        </View>
        <TouchableOpacity
          style={npStyles.reconnectBtn}
          activeOpacity={0.8}
          onPress={reconnect}
        >
          <FontAwesome5 name="spotify" size={14} color="#fff" />
          <Text style={npStyles.reconnectText}>Reconnect Spotify</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!track?.isPlaying) {
    return null;
  }

  const progress = track.durationMs > 0 ? liveProgressMs / track.durationMs : 0;
  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={() =>
        openSpotifyLink(
          `spotify:track:${track.id}`,
          `https://open.spotify.com/track/${track.id}`,
        )
      }
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={npStyles.card}
      >
      {/* Header row */}
      <View style={npStyles.header}>
        <Animated.View style={[npStyles.dot, { opacity: pulse }]} />
        <Text style={npStyles.label}>LISTENING NOW</Text>
        <FontAwesome5 name="spotify" size={13} color="#1DB954" />
      </View>

      {/* Body */}
      <View style={npStyles.body}>
        {track.albumArt ? (
          <Image source={{ uri: track.albumArt }} style={npStyles.albumArt} />
        ) : (
          <View style={[npStyles.albumArt, npStyles.albumArtFallback]}>
            <FontAwesome5 name="music" size={18} color="rgba(255,255,255,0.3)" />
          </View>
        )}

        <View style={npStyles.info}>
          <Text style={npStyles.trackName} numberOfLines={1}>{track.name}</Text>
          <Text style={npStyles.artistName} numberOfLines={1}>{track.artist}</Text>

          {/* Progress bar */}
          <View style={npStyles.progressTrack}>
            <View style={[npStyles.progressFill, { width: `${progress * 100}%` as any }]} />
          </View>
          <View style={npStyles.progressTimes}>
            <Text style={npStyles.timeText}>{fmt(liveProgressMs)}</Text>
            <Text style={npStyles.timeText}>{fmt(track.durationMs)}</Text>
          </View>
        </View>
      </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        {/* Back arrow */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ─── Profile card ──────────────────────────────────────────── */}
          <View style={styles.card}>
            {/* Banner */}
            <View style={styles.bannerWrap}>
              <LinearGradient
                colors={["#3D0C00", "#CC4200", "#FF6C1A", "#CC4200", "#3D0C00"]}
                locations={[0, 0.25, 0.5, 0.75, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
              {/* Top-to-bottom darkening so banner fades to card bg */}
              <LinearGradient
                colors={["transparent", "rgba(22,22,24,0.55)"]}
                style={StyleSheet.absoluteFill}
              />
              {/* Spotlight glow */}
              <View style={styles.bannerGlow} />

              {/* Social icons + Follow — inside banner, bottom-right */}
              <View style={styles.bannerActions}>
                <TouchableOpacity style={styles.socialBtn} activeOpacity={0.7}>
                  <Text style={styles.socialIcon}>𝕏</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialBtn} activeOpacity={0.7}>
                  <Text style={styles.socialIcon}>◎</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialBtn} activeOpacity={0.7}>
                  <Text style={styles.socialIcon}>🎙</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.followBtn} activeOpacity={0.85}>
                  <Text style={styles.followBtnText}>Follow</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Avatar row — negative margin overlaps the banner */}
            <View style={[styles.avatarRow, { marginTop: -AVATAR_OVERLAP }]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarInitials}>JD</Text>
              </View>
            </View>

            {/* ─── Info ──────────────────────────────────────────────── */}
            <View style={styles.infoSection}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>Jane Doe</Text>
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>✓</Text>
                </View>
              </View>
              <Text style={styles.handle}>@thejanedoe</Text>

              <Text style={styles.bio}>
                {"Creative Designer w/ Marketing Expertise\nEx Art Director → "}
                <Text style={styles.mention}>@apple</Text>
              </Text>

              <View style={styles.statsRow}>
                <Text style={styles.statNum}>100</Text>
                <Text style={styles.statLabel}> Following</Text>
                <View style={{ width: 22 }} />
                <Text style={styles.statNum}>23.6K</Text>
                <Text style={styles.statLabel}> Followers</Text>
              </View>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaIcon}>⊙</Text>
                  <Text style={styles.metaText}>To Be Determined</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaIcon}>⊘</Text>
                  <Text style={styles.metaText}>To Be Determined</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ─── Now Playing ───────────────────────────────────────────── */}
          <NowPlayingCard />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0D0D0D" },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },

  backBtn: { paddingHorizontal: 18, paddingVertical: 10 },
  backIcon: { fontSize: 32, color: "#fff", fontWeight: "300", lineHeight: 36 },

  // Card shell — overflow hidden gives rounded corners on all children
  card: {
    backgroundColor: "#161618",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  // Banner
  bannerWrap: {
    height: BANNER_H,
    overflow: "hidden",
    position: "relative",
  },
  bannerGlow: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#FF7030",
    opacity: 0.38,
    alignSelf: "center",
    top: -100,
  },
  bannerActions: {
    position: "absolute",
    bottom: 14,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  socialBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  socialIcon: { fontSize: 15, color: "#fff" },
  followBtn: {
    paddingHorizontal: 18,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  followBtnText: { fontSize: 14, fontWeight: "700", color: "#111" },

  // Avatar row
  avatarRow: {
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: 18,
    backgroundColor: "#FF6B35",
    borderWidth: 3,
    borderColor: "#161618",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: { fontSize: 28, fontWeight: "800", color: "#fff" },

  // Info section
  infoSection: {
    paddingHorizontal: 20,
    paddingBottom: 26,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 3,
  },
  name: { fontSize: 21, fontWeight: "800", color: "#ffffff" },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#1D9BF0",
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedText: { fontSize: 10, fontWeight: "900", color: "#fff" },
  handle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.4)",
    marginBottom: 14,
  },
  bio: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    lineHeight: 22,
    marginBottom: 16,
  },
  mention: { color: "#1D9BF0" },
  statsRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 16,
  },
  statNum: { fontSize: 15, fontWeight: "800", color: "#ffffff" },
  statLabel: { fontSize: 14, color: "rgba(255,255,255,0.38)" },
  metaRow: {
    flexDirection: "row",
    gap: 20,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaIcon: { fontSize: 13, color: "rgba(255,255,255,0.28)" },
  metaText: { fontSize: 13, color: "rgba(255,255,255,0.32)" },
});

// ─── Now Playing styles ───────────────────────────────────────────────────────

const npStyles = StyleSheet.create({
  card: {
    marginTop: 12,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(29,185,84,0.2)",
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#1DB954",
  },
  label: {
    flex: 1,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
    color: "rgba(255,255,255,0.35)",
  },
  empty: {
    fontSize: 13,
    color: "rgba(255,255,255,0.25)",
    textAlign: "center",
    paddingVertical: 6,
  },
  body: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  albumArt: {
    width: 58,
    height: 58,
    borderRadius: 10,
  },
  albumArtFallback: {
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  trackName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: -0.2,
  },
  artistName: {
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
    marginBottom: 8,
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#1DB954",
    borderRadius: 2,
  },
  progressTimes: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  timeText: {
    fontSize: 10,
    color: "rgba(255,255,255,0.25)",
    fontWeight: "600",
  },
  reconnectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#1DB954",
    borderRadius: 12,
    paddingVertical: 12,
  },
  reconnectText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
