import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { followUser, unfollowUser, checkIsFollowing } from "../lib/follows";
import { getOrCreateConversation } from "../lib/messages";
import { openSpotifyLink, saveTrackToLiked } from "../lib/spotify";

const BANNER_H = 172;
const AVATAR_SIZE = 86;
const AVATAR_OVERLAP = Math.round(AVATAR_SIZE * 0.44);

type OtherUserProfile = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  is_verified: boolean;
  followers_count: number;
  following_count: number;
  avatar_url: string | null;
  banner_url: string | null;
  current_song_name: string | null;
  current_song_artist: string | null;
  current_song_id: string | null;
  current_song_album_art: string | null;
  current_song_duration_ms: number | null;
  current_song_progress_ms: number | null;
  current_song_updated_at: string | null;
  top_genres: string[] | null;
  account_type: string | null;
};

// ─── Now Listening card (matches profile.tsx's NowPlayingCard) ─────────────────

function NowListeningCard({
  song,
  viewerToken,
}: {
  song: {
    name: string;
    artist: string | null;
    id: string | null;
    albumArt: string | null;
    durationMs: number | null;
    progressMs: number | null;
    updatedAt: string | null;
  };
  viewerToken: string | null;
}) {
  const pulse = useRef(new Animated.Value(1)).current;
  const [liveProgress, setLiveProgress] = useState(0);
  const [saved, setSaved]   = useState(false);
  const [saving, setSaving] = useState(false);

  // Pulsing green dot
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 900, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  // Live progress ticker — uses captured progress + elapsed since broadcast
  useEffect(() => {
    if (!song.durationMs || !song.updatedAt) { setLiveProgress(0); return; }
    const updatedAtMs  = new Date(song.updatedAt).getTime();
    const baseProgress = song.progressMs ?? 0;
    const calcProgress = () => Math.min(baseProgress + (Date.now() - updatedAtMs), song.durationMs!);
    setLiveProgress(calcProgress());
    const id = setInterval(() => setLiveProgress(calcProgress()), 1_000);
    return () => clearInterval(id);
  }, [song.id, song.updatedAt]);

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };
  const progress = song.durationMs && song.durationMs > 0 ? Math.min(liveProgress / song.durationMs, 1) : 0;

  const handleOpen = () => {
    if (!song.id) return;
    openSpotifyLink(`spotify:track:${song.id}`, `https://open.spotify.com/track/${song.id}`);
  };

  const handleSave = async () => {
    if (!song.id || !viewerToken || saved || saving) return;
    setSaving(true);
    const ok = await saveTrackToLiked(viewerToken, song.id);
    if (ok) setSaved(true);
    setSaving(false);
  };

  return (
    <LinearGradient
      colors={["#3D1A0C", "#1E0D08", "#0E0907"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={s.npCard}
    >
      {/* Header */}
      <View style={s.npHeader}>
        <Animated.View style={[s.npDot, { opacity: pulse }]} />
        <Text style={s.npHeaderLabel}>LISTENING NOW</Text>
        <FontAwesome5 name="spotify" size={13} color="#1DB954" />
      </View>

      {/* Body */}
      <View style={s.npBody}>
        {song.albumArt ? (
          <Image source={{ uri: song.albumArt }} style={s.npAlbumArt} />
        ) : (
          <View style={[s.npAlbumArt, s.npAlbumArtFallback]}>
            <FontAwesome5 name="music" size={18} color="rgba(255,255,255,0.3)" />
          </View>
        )}

        <View style={s.npInfo}>
          <Text style={s.npTrack} numberOfLines={1}>{song.name}</Text>
          <Text style={s.npArtist} numberOfLines={1}>{song.artist ?? ""}</Text>

          {/* Progress bar */}
          {!!song.durationMs && (
            <>
              <View style={s.npProgressTrack}>
                <View style={[s.npProgressFill, { width: `${progress * 100}%` as any }]} />
              </View>
              <View style={s.npProgressTimes}>
                <Text style={s.npTimeText}>{fmt(liveProgress)}</Text>
                <Text style={s.npTimeText}>{fmt(song.durationMs)}</Text>
              </View>
            </>
          )}

          {/* Open / Save buttons */}
          <View style={s.npBtnRow}>
            {!!song.id && (
              <TouchableOpacity style={s.npOpenBtn} activeOpacity={0.8} onPress={handleOpen}>
                <Ionicons name="open-outline" size={12} color="#1DB954" />
                <Text style={s.npOpenBtnText}>Open</Text>
              </TouchableOpacity>
            )}
            {!!song.id && !!viewerToken && (
              <TouchableOpacity
                style={[s.npSaveBtn, saved && s.npSavedBtn]}
                activeOpacity={0.8}
                onPress={handleSave}
                disabled={saved || saving}
              >
                <Ionicons
                  name={saved ? "heart" : "heart-outline"}
                  size={12}
                  color={saved ? "#1DB954" : "rgba(255,255,255,0.45)"}
                />
                <Text style={[s.npSaveBtnText, saved && s.npSavedBtnText]}>
                  {saving ? "…" : saved ? "Saved" : "Save"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

export default function UserProfileScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();

  const [profile,        setProfile]        = useState<OtherUserProfile | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [isFollowing,    setIsFollowing]    = useState(false);
  const [followLoading,  setFollowLoading]  = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [currentUserId,  setCurrentUserId]  = useState<string | null>(null);
  const [viewerToken,    setViewerToken]    = useState<string | null>(null);

  useEffect(() => { loadProfile(); }, [userId]);

  // Fetch viewer's own Spotify token so they can Open/Save tracks
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('users').select('spotify_access_token').eq('id', user.id).single();
      if (data?.spotify_access_token) setViewerToken(data.spotify_access_token);
    })();
  }, []);

  // Live song sync — realtime fast path + 5-second polling fallback.
  // postgres_changes only fires if the users table is in the supabase_realtime
  // publication; the poll makes it work regardless.
  useEffect(() => {
    if (!userId) return;

    const SONG_COLS = 'current_song_name, current_song_artist, current_song_id, current_song_album_art, current_song_duration_ms, current_song_progress_ms, current_song_updated_at';

    const syncSong = async () => {
      const { data } = await supabase
        .from('users')
        .select(SONG_COLS)
        .eq('id', userId)
        .single();
      if (data) setProfile(prev => prev ? { ...prev, ...data } : null);
    };

    // Fast path: instant update if realtime is configured for the users table
    const ch = supabase
      .channel(`profile-song:${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${userId}`,
      }, (payload) => {
        setProfile(prev => prev ? { ...prev, ...(payload.new as Partial<OtherUserProfile>) } : null);
      })
      .subscribe();

    // Fallback: poll every 5 seconds so it's always live
    const pollId = setInterval(syncSong, 5_000);

    return () => {
      supabase.removeChannel(ch);
      clearInterval(pollId);
    };
  }, [userId]);

  const loadProfile = async () => {
    if (!userId) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);

      const { data, error } = await supabase
        .from("users")
        .select("id, username, display_name, bio, is_verified, followers_count, following_count, avatar_url, banner_url, current_song_name, current_song_artist, current_song_id, current_song_album_art, current_song_duration_ms, current_song_progress_ms, current_song_updated_at, top_genres, account_type")
        .eq("id", userId)
        .single<OtherUserProfile>();

      if (error) throw error;
      setProfile(data);
      setFollowersCount(data.followers_count ?? 0);

      if (user && user.id !== userId) {
        const following = await checkIsFollowing(userId);
        setIsFollowing(following);
      }
    } catch (err) {
      console.error("loadProfile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!profile || followLoading) return;
    setFollowLoading(true);
    if (isFollowing) {
      const r = await unfollowUser(profile.id);
      if (!r.error) { setIsFollowing(false); setFollowersCount(c => Math.max(0, c - 1)); }
    } else {
      const r = await followUser(profile.id);
      if (!r.error) { setIsFollowing(true); setFollowersCount(c => c + 1); }
    }
    setFollowLoading(false);
  };

  const handleDM = async () => {
    if (!profile) return;
    const convId = await getOrCreateConversation(profile.id);
    if (!convId) return;
    router.replace({
      pathname: "/feed",
      params: {
        openTab: "Messages",
        openConvId: convId,
        openConvUserId: profile.id,
        openConvUserName: profile.username,
        openConvAvatar: profile.avatar_url ?? "",
      },
    });
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const f = parts[0]?.charAt(0).toUpperCase() ?? "";
    const l = parts.length > 1 ? parts[parts.length - 1].charAt(0).toUpperCase() : "";
    return `${f}${l}`;
  };

  const isOwnProfile = currentUserId === userId;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0D0D0D", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#AB00FF" size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0D0D0D", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 16 }}>User not found</Text>
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>

        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

          {/* ── Profile card ─────────────────────────────────── */}
          <View style={s.card}>

            {/* Banner */}
            <View style={s.bannerWrap}>
              <LinearGradient
                colors={["#3D0C00", "#CC4200", "#FF6C1A", "#CC4200", "#3D0C00"]}
                locations={[0, 0.25, 0.5, 0.75, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={["transparent", "rgba(22,22,24,0.55)"]}
                style={StyleSheet.absoluteFill}
              />
              <View style={s.bannerGlow} />

              {/* Action buttons — only for other users */}
              {!isOwnProfile && (
                <View style={s.bannerActions}>
                  <TouchableOpacity style={s.dmBtn} activeOpacity={0.85} onPress={handleDM}>
                    <Ionicons name="chatbubble-outline" size={13} color="#fff" />
                    <Text style={s.dmBtnText}>Message</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.followBtn, isFollowing && s.followingBtn]}
                    activeOpacity={0.85}
                    onPress={handleFollow}
                    disabled={followLoading}
                  >
                    <Text style={[s.followBtnText, isFollowing && s.followingBtnText]}>
                      {followLoading ? "…" : isFollowing ? "Following" : "Follow"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Own profile — show edit button */}
              {isOwnProfile && (
                <View style={s.bannerActions}>
                  <TouchableOpacity style={s.editBtn} activeOpacity={0.85}>
                    <Text style={s.editBtnText}>Edit Profile</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Avatar */}
            <View style={[s.avatarRow, { marginTop: -AVATAR_OVERLAP }]}>
              {profile.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={s.avatarImg} />
              ) : (
                <View style={s.avatar}>
                  <Text style={s.avatarInitials}>{getInitials(profile.display_name)}</Text>
                </View>
              )}
            </View>

            {/* Info */}
            <View style={s.infoSection}>
              <View style={s.nameRow}>
                <Text style={s.name}>{profile.display_name || profile.username}</Text>
                {profile.is_verified && (
                  <View style={s.verifiedBadge}>
                    <Text style={s.verifiedText}>✓</Text>
                  </View>
                )}
                {profile.account_type === "artist" && (
                  <View style={s.artistBadge}>
                    <Text style={s.artistBadgeText}>Artist</Text>
                  </View>
                )}
              </View>

              <Text style={s.handle}>@{profile.username}</Text>

              {!!profile.bio && (
                <Text style={s.bio}>{profile.bio}</Text>
              )}

              <View style={s.statsRow}>
                <TouchableOpacity style={s.statBtn}>
                  <Text style={s.statNum}>{profile.following_count?.toLocaleString() ?? "0"}</Text>
                  <Text style={s.statLabel}> Following</Text>
                </TouchableOpacity>
                <View style={{ width: 22 }} />
                <TouchableOpacity style={s.statBtn}>
                  <Text style={s.statNum}>{followersCount.toLocaleString()}</Text>
                  <Text style={s.statLabel}> Followers</Text>
                </TouchableOpacity>
              </View>

              {/* Top genres */}
              {(profile.top_genres?.length ?? 0) > 0 && (
                <View style={s.genreRow}>
                  {profile.top_genres!.slice(0, 4).map(g => (
                    <View key={g} style={s.genreChip}>
                      <Text style={s.genreText}>{g}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* ── Now Playing card ─────────────────────────────── */}
          {!!profile.current_song_name && (
            <NowListeningCard
              song={{
                name:       profile.current_song_name,
                artist:     profile.current_song_artist,
                id:         profile.current_song_id,
                albumArt:   profile.current_song_album_art,
                durationMs: profile.current_song_duration_ms,
                progressMs: profile.current_song_progress_ms,
                updatedAt:  profile.current_song_updated_at,
              }}
              viewerToken={viewerToken}
            />
          )}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0D0D0D" },
  scrollContent: { paddingHorizontal: 16, paddingTop: 1, paddingBottom: 40 },

  backBtn: { paddingHorizontal: 18, paddingVertical: 10 },
  backIcon: { fontSize: 32, color: "#fff", fontWeight: "300", lineHeight: 36 },

  // ── Card ──────────────────────────────────────────────────
  card: {
    backgroundColor: "#161618",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  // ── Banner ────────────────────────────────────────────────
  bannerWrap: { height: BANNER_H, overflow: "hidden", position: "relative" },
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

  // DM button
  dmBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  dmBtnText: { fontSize: 13, fontWeight: "600", color: "#fff" },

  // Follow button
  followBtn: {
    paddingHorizontal: 20,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  followingBtn: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  followBtnText: { fontSize: 14, fontWeight: "700", color: "#111" },
  followingBtnText: { color: "#fff" },

  // Edit Profile button (own profile)
  editBtn: {
    paddingHorizontal: 16,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  editBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },

  // ── Avatar ────────────────────────────────────────────────
  avatarRow: { paddingHorizontal: 18, paddingBottom: 12 },
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
  avatarImg: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: "#161618",
  },
  avatarInitials: { fontSize: 28, fontWeight: "800", color: "#fff" },

  // ── Info ──────────────────────────────────────────────────
  infoSection: { paddingHorizontal: 20, paddingBottom: 26 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" },
  name: { fontSize: 21, fontWeight: "800", color: "#fff" },
  verifiedBadge: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: "#1D9BF0",
    alignItems: "center", justifyContent: "center",
  },
  verifiedText: { fontSize: 10, fontWeight: "900", color: "#fff" },
  artistBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    backgroundColor: "rgba(171,0,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(171,0,255,0.4)",
  },
  artistBadgeText: { fontSize: 10, fontWeight: "800", color: "#AB00FF" },
  handle: { fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 14 },
  bio: { fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 22, marginBottom: 16 },

  statsRow: { flexDirection: "row", alignItems: "baseline", marginBottom: 16 },
  statBtn: { flexDirection: "row", alignItems: "baseline" },
  statNum: { fontSize: 15, fontWeight: "800", color: "#fff" },
  statLabel: { fontSize: 14, color: "rgba(255,255,255,0.38)" },

  genreRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  genreChip: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    backgroundColor: "rgba(171,0,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(171,0,255,0.28)",
  },
  genreText: { fontSize: 12, fontWeight: "600", color: "#AB00FF" },

  // ── Now Playing card (matches profile.tsx NowPlayingCard) ─────────────────
  npCard: {
    marginTop: 12,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(29,185,84,0.2)",
    padding: 16,
  },
  npHeader:      { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  npDot:         { width: 7, height: 7, borderRadius: 4, backgroundColor: "#1DB954" },
  npHeaderLabel: { flex: 1, fontSize: 10, fontWeight: "800", letterSpacing: 1.1, color: "rgba(255,255,255,0.35)" },
  npBody:        { flexDirection: "row", gap: 14, alignItems: "center" },
  npAlbumArt:        { width: 58, height: 58, borderRadius: 10 },
  npAlbumArtFallback:{ backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  npInfo:        { flex: 1, gap: 2 },
  npTrack:       { fontSize: 15, fontWeight: "700", color: "#fff", letterSpacing: -0.2 },
  npArtist:      { fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 8 },
  npProgressTrack: { height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.1)", overflow: "hidden" },
  npProgressFill:  { height: "100%" as any, backgroundColor: "#1DB954", borderRadius: 2 },
  npProgressTimes: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  npTimeText:      { fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: "600" },
  npBtnRow:        { flexDirection: "row", gap: 8, marginTop: 10 },
  npOpenBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
    backgroundColor: "rgba(29,185,84,0.12)",
    borderWidth: 1, borderColor: "rgba(29,185,84,0.35)",
  },
  npOpenBtnText: { fontSize: 11, fontWeight: "700", color: "#1DB954" },
  npSaveBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.14)",
  },
  npSavedBtn:     { backgroundColor: "rgba(29,185,84,0.12)", borderColor: "rgba(29,185,84,0.3)" },
  npSaveBtnText:  { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.45)" },
  npSavedBtnText: { color: "#1DB954" },
});
