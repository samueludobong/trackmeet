import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Animated,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { followUser, unfollowUser, checkIsFollowing } from "../lib/follows";
import { getOrCreateConversation } from "../lib/messages";
import { openSpotifyLink, saveTrackToLiked, getValidSpotifyToken } from "../lib/spotify";
import { SongPreviewSheet } from "../components/SongPreviewSheet";
import { getActiveMeetForUser, type ActiveMeetForUser } from "../lib/meets";

const BANNER_H = 172;
const AVATAR_SIZE = 86;
const AVATAR_OVERLAP = Math.round(AVATAR_SIZE * 0.44);

// ─── Social platforms (matches feed.tsx) ──────────────────────────────────────
const SOCIAL_PLATFORMS = [
  { key: "instagram",  icon: "instagram",  color: "#E1306C" },
  { key: "twitter",    icon: "twitter",    color: "#1DA1F2" },
  { key: "tiktok",     icon: "tiktok",     color: "#fff"    },
  { key: "youtube",    icon: "youtube",    color: "#FF0000" },
  { key: "soundcloud", icon: "soundcloud", color: "#FF5500" },
  { key: "spotify",    icon: "spotify",    color: "#1DB954" },
  { key: "facebook",   icon: "facebook",   color: "#1877F2" },
  { key: "discord",    icon: "discord",    color: "#5865F2" },
  { key: "twitch",     icon: "twitch",     color: "#9146FF" },
  { key: "apple",      icon: "apple",      color: "#fff"    },
];
const BANNER_PLATFORM_PRIORITY = ["instagram", "twitter", "tiktok", "youtube", "soundcloud", "spotify"];

// ─── BannerShape ──────────────────────────────────────────────────────────────
function BannerShape({ shape, color, size }: { shape: string; color: string; size: number }) {
  const s = size;
  switch (shape) {
    case "circle":
      return <View style={{ width: s, height: s, borderRadius: s / 2, backgroundColor: color }} />;
    case "ring":
      return <View style={{ width: s, height: s, borderRadius: s / 2, borderWidth: Math.max(3, Math.round(s / 6)), borderColor: color, backgroundColor: "transparent" }} />;
    case "square":
      return <View style={{ width: s, height: s, borderRadius: Math.round(s / 8), backgroundColor: color }} />;
    case "diamond":
      return <View style={{ width: s * 0.72, height: s * 0.72, backgroundColor: color, transform: [{ rotate: "45deg" }] }} />;
    case "triangle":
      return <View style={{ width: 0, height: 0, borderLeftWidth: s / 2, borderRightWidth: s / 2, borderBottomWidth: Math.round(s * 0.87), borderStyle: "solid", borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: color }} />;
    case "oval":
      return <View style={{ width: s, height: Math.round(s * 0.6), borderRadius: s, backgroundColor: color }} />;
    case "plus":
      return (
        <View style={{ width: s, height: s, alignItems: "center", justifyContent: "center" }}>
          <View style={{ position: "absolute", width: s, height: Math.round(s / 3.2), backgroundColor: color, borderRadius: 4 }} />
          <View style={{ position: "absolute", width: Math.round(s / 3.2), height: s, backgroundColor: color, borderRadius: 4 }} />
        </View>
      );
    case "arc":
      return (
        <View style={{ width: s, height: Math.round(s / 2), overflow: "hidden" }}>
          <View style={{ width: s, height: s, borderRadius: s / 2, backgroundColor: color }} />
        </View>
      );
    default:
      return null;
  }
}

// ─── Profile type ─────────────────────────────────────────────────────────────
type OtherUserProfile = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  is_verified: boolean;
  followers_count: number;
  following_count: number;
  avatar_url: string | null;
  banner_color: string | null;
  banner_image_url: string | null;
  banner_shape: string | null;
  banner_shape_color: string | null;
  current_song_name: string | null;
  current_song_artist: string | null;
  current_song_id: string | null;
  current_song_album_art: string | null;
  current_song_duration_ms: number | null;
  current_song_progress_ms: number | null;
  current_song_updated_at: string | null;
  top_genres: string[] | null;
  account_type: string | null;
  pinned_song_id: string | null;
  pinned_song_name: string | null;
  pinned_song_artist: string | null;
  pinned_song_album_art: string | null;
  social_links: Record<string, string> | null;
};

// ─── Now Listening card ───────────────────────────────────────────────────────
function NowListeningCard({
  song,
  viewerToken,
  meet,
  onJoinMeet,
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
  // When set, this user is publicly in a meet (or hosting one) — render the
  // meet variant with a Join affordance.
  meet?: { hostName: string; isHost: boolean } | null;
  onJoinMeet?: () => void;
}) {
  const pulse = useRef(new Animated.Value(1)).current;
  const [liveProgress, setLiveProgress] = useState(0);
  const [saved, setSaved]   = useState(false);
  const [saving, setSaving] = useState(false);

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
    const sec = Math.floor(ms / 1000);
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
  };
  const progress = song.durationMs && song.durationMs > 0
    ? Math.min(liveProgress / song.durationMs, 1)
    : 0;

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
      colors={meet ? ["#2A0C3D", "#1A0820", "#0E070F"] : ["#3D1A0C", "#1E0D08", "#0E0907"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[s.nowPlayingCard, meet && s.nowPlayingCardMeet]}
    >
      {/* Meet banner — shows this user is hosting / in a synced listening room */}
      {meet && (
        <View style={s.npMeetBadge}>
          <View style={s.npLiveDot} />
          {meet.isHost ? (
            <Text style={s.npMeetBadgeText} numberOfLines={1}>
              <Text style={s.npMeetBadgeHost}>Hosting</Text> a live Meet
            </Text>
          ) : (
            <Text style={s.npMeetBadgeText} numberOfLines={1}>
              In <Text style={s.npMeetBadgeHost}>{meet.hostName}</Text>&apos;s Meet
            </Text>
          )}
        </View>
      )}

      <View style={s.npBody}>
        {song.albumArt ? (
          <Image source={{ uri: song.albumArt }} style={s.npAlbumArt} />
        ) : (
          <View style={[s.npAlbumArt, s.npAlbumArtFallback]}>
            <FontAwesome5 name="music" size={18} color="rgba(255,255,255,0.3)" />
          </View>
        )}

        <View style={s.npInfo}>
          <View style={{ flex: 1, alignItems: "center", gap: 6, flexDirection: "row", justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <Text style={s.npTrack} numberOfLines={1}>{song.name}</Text>
              <Text style={s.npArtist} numberOfLines={1}>{song.artist ?? ""}</Text>
            </View>
            <FontAwesome5 name="spotify" size={13} color="#1DB954" />
          </View>

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

      {/* Join the same meet — only when the user is publicly in one */}
      {meet && (
        <TouchableOpacity style={s.npJoinBtn} activeOpacity={0.85} onPress={onJoinMeet}>
          <Ionicons name="headset" size={15} color="#fff" />
          <Text style={s.npJoinBtnText}>Join Meet</Text>
        </TouchableOpacity>
      )}
    </LinearGradient>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function UserProfileScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();

  const [profile,        setProfile]        = useState<OtherUserProfile | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [isFollowing,       setIsFollowing]       = useState(false);
  const [followLoading,     setFollowLoading]     = useState(false);
  const [followersCount,    setFollowersCount]    = useState(0);
  const [currentUserId,     setCurrentUserId]     = useState<string | null>(null);
  const [viewerToken,       setViewerToken]       = useState<string | null>(null);
  const [pinnedPreviewOpen, setPinnedPreviewOpen] = useState(false);
  // The viewed user's active *public* meet, if any (private ones stay hidden).
  const [publicMeet,        setPublicMeet]        = useState<ActiveMeetForUser | null>(null);

  useEffect(() => { loadProfile(); }, [userId]);

  // Viewer's own Spotify token for Open/Save
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const token = await getValidSpotifyToken(user.id);
      if (token) setViewerToken(token);
    })();
  }, []);

  // Live song sync — realtime + 5-second polling fallback
  useEffect(() => {
    if (!userId) return;
    const SONG_COLS = "current_song_name, current_song_artist, current_song_id, current_song_album_art, current_song_duration_ms, current_song_progress_ms, current_song_updated_at";

    const syncSong = async () => {
      const { data } = await supabase.from("users").select(SONG_COLS).eq("id", userId).single();
      if (data) setProfile(prev => prev ? { ...prev, ...data } : null);
    };

    const ch = supabase
      .channel(`profile-song:${userId}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "users", filter: `id=eq.${userId}`,
      }, (payload) => {
        setProfile(prev => prev ? { ...prev, ...(payload.new as Partial<OtherUserProfile>) } : null);
      })
      .subscribe();

    const pollId = setInterval(syncSong, 5_000);
    return () => { supabase.removeChannel(ch); clearInterval(pollId); };
  }, [userId]);

  // Whether the viewed user is publicly in a meet — drives the meet now-playing
  // variant + Join button. Private participation is excluded (publicOnly).
  useEffect(() => {
    if (!userId) return;
    let active = true;
    const load = async () => {
      const m = await getActiveMeetForUser(userId, true);
      if (active) setPublicMeet(m);
    };
    load();
    const id = setInterval(load, 8_000);
    return () => { active = false; clearInterval(id); };
  }, [userId]);

  // Open the feed and let it prompt the viewer to join publicly/privately.
  const handleJoinMeet = () => {
    if (!publicMeet) return;
    router.replace({ pathname: "/feed", params: { openMeetId: publicMeet.meet.id } });
  };

  const loadProfile = async () => {
    if (!userId) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);

      const { data, error } = await supabase
        .from("users")
        .select(
          "id, username, display_name, bio, is_verified, followers_count, following_count, " +
          "avatar_url, banner_color, banner_image_url, banner_shape, banner_shape_color, " +
          "current_song_name, current_song_artist, current_song_id, current_song_album_art, " +
          "current_song_duration_ms, current_song_progress_ms, current_song_updated_at, " +
          "top_genres, account_type, pinned_song_id, pinned_song_name, pinned_song_artist, pinned_song_album_art, social_links"
        )
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

  // Social links visible in banner (priority order, up to 3 or 2+overflow)
  const linkedPlatforms = BANNER_PLATFORM_PRIORITY
    .map(k => SOCIAL_PLATFORMS.find(p => p.key === k)!)
    .filter(p => !!(profile.social_links?.[p.key]));
  const visibleSocial  = linkedPlatforms.slice(0, linkedPlatforms.length > 3 ? 2 : 3);
  const socialOverflow = linkedPlatforms.length - visibleSocial.length;

  return (
    <View style={s.screen}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>

        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

          {/* ── Profile card ──────────────────────────────────── */}
          <View style={s.card}>

            {/* Banner */}
            <View style={s.bannerWrap}>
              {profile.banner_image_url ? (
                <Image source={{ uri: profile.banner_image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              ) : profile.banner_color ? (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: profile.banner_color }]} />
              ) : (
                <LinearGradient
                  colors={["#3D0C00", "#CC4200", "#FF6C1A", "#CC4200", "#3D0C00"]}
                  locations={[0, 0.25, 0.5, 0.75, 1]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={StyleSheet.absoluteFill}
                />
              )}

              {profile.banner_shape && !profile.banner_image_url && (
                <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]} pointerEvents="none">
                  <BannerShape shape={profile.banner_shape} color={profile.banner_shape_color ?? "#ffffff"} size={72} />
                </View>
              )}

              <LinearGradient
                colors={["transparent", "rgba(22,22,24,0.55)"]}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />

              {/* Banner actions */}
              {!isOwnProfile ? (
                <View style={s.bannerActions}>
                  {visibleSocial.map(p => (
                    <TouchableOpacity
                      key={p.key}
                      style={s.socialBtn}
                      activeOpacity={0.7}
                      onPress={() => {
                        const url = profile.social_links?.[p.key];
                        if (url) Linking.openURL(url).catch(() => {});
                      }}
                    >
                      <FontAwesome5 name={p.icon} size={15} color={p.color} />
                    </TouchableOpacity>
                  ))}
                  {socialOverflow > 0 && (
                    <View style={[s.socialBtn, { backgroundColor: "rgba(255,255,255,0.18)" }]}>
                      <Text style={{ fontSize: 11, fontWeight: "800", color: "#fff" }}>+{socialOverflow}</Text>
                    </View>
                  )}
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
              ) : (
                <View style={s.bannerActions}>
                  <TouchableOpacity style={s.editBtn} activeOpacity={0.85}>
                    <Text style={s.editBtnText}>Edit Profile</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Avatar — overlaps banner bottom. A live ring + LIVE pill appear
                while this user is hosting / in a meet. */}
            <View style={[s.avatarRow, { marginTop: -AVATAR_OVERLAP }]}>
              {publicMeet && !isOwnProfile ? (
                <View style={s.avatarLiveWrap}>
                  <LinearGradient
                    colors={["#FF3B5C", "#AB00FF"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={s.avatarLiveRing}
                  >
                    {profile.avatar_url ? (
                      <Image source={{ uri: profile.avatar_url }} style={s.avatarRingImg} />
                    ) : (
                      <View style={[s.avatarRingImg, s.avatarRingFallback]}>
                        <Text style={s.avatarInitials}>{getInitials(profile.display_name)}</Text>
                      </View>
                    )}
                  </LinearGradient>
                  <View style={s.liveBadge}>
                    <Text style={s.liveBadgeText}>LIVE</Text>
                  </View>
                </View>
              ) : profile.avatar_url ? (
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

              {!!profile.bio && <Text style={s.bio}>{profile.bio}</Text>}

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

              {/* Pinned song — tap to preview */}
              {!!profile.pinned_song_name && (
                <TouchableOpacity
                  style={s.pinnedRow}
                  activeOpacity={0.8}
                  onPress={() => profile.pinned_song_id && setPinnedPreviewOpen(true)}
                >
                  {profile.pinned_song_album_art ? (
                    <Image source={{ uri: profile.pinned_song_album_art }} style={s.pinnedArt} />
                  ) : (
                    <View style={[s.pinnedArt, s.pinnedArtFallback]}>
                      <FontAwesome5 name="music" size={12} color="rgba(255,255,255,0.3)" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={s.pinnedLabel}>PINNED</Text>
                    <Text style={s.pinnedTrack} numberOfLines={1}>{profile.pinned_song_name}</Text>
                    {!!profile.pinned_song_artist && (
                      <Text style={s.pinnedArtist} numberOfLines={1}>{profile.pinned_song_artist}</Text>
                    )}
                  </View>
                  <FontAwesome5 name="thumbtack" size={12} color="#FF6C1A" />
                </TouchableOpacity>
              )}

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

          {/* ── Now Playing card ──────────────────────────────── */}
          {/* When publicly in a meet, show the meet's synced track (+ Join);
              otherwise fall back to the user's own broadcast now-playing. */}
          {(() => {
            // Don't surface the meet/join variant when viewing your own profile.
            const inMeet = publicMeet && !isOwnProfile;
            const m = inMeet ? publicMeet!.meet : null;
            const song = m
              ? {
                  name:       m.current_track_name ?? "Waiting for host…",
                  artist:     m.current_track_artist,
                  id:         m.current_track_id,
                  albumArt:   m.current_track_album_art,
                  durationMs: m.current_track_duration_ms,
                  progressMs: m.current_track_position_ms,
                  updatedAt:  m.position_updated_at,
                }
              : profile.current_song_name
              ? {
                  name:       profile.current_song_name,
                  artist:     profile.current_song_artist,
                  id:         profile.current_song_id,
                  albumArt:   profile.current_song_album_art,
                  durationMs: profile.current_song_duration_ms,
                  progressMs: profile.current_song_progress_ms,
                  updatedAt:  profile.current_song_updated_at,
                }
              : null;
            if (!song) return null;
            const hostName = inMeet
              ? (publicMeet!.host.display_name || publicMeet!.host.username)
              : null;
            return (
              <NowListeningCard
                song={song}
                viewerToken={viewerToken}
                meet={hostName ? { hostName, isHost: publicMeet!.isHost } : null}
                onJoinMeet={handleJoinMeet}
              />
            );
          })()}


        </ScrollView>
      </SafeAreaView>

      {/* Pinned song preview sheet */}
      <SongPreviewSheet
        visible={pinnedPreviewOpen}
        onClose={() => setPinnedPreviewOpen(false)}
        song={
          profile.pinned_song_id
            ? {
                id:       profile.pinned_song_id,
                name:     profile.pinned_song_name ?? "",
                artist:   profile.pinned_song_artist ?? "",
                albumArt: profile.pinned_song_album_art ?? null,
              }
            : null
        }
        accessToken={viewerToken}
      />

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: "#0D0D0D" },
  scrollContent: { paddingHorizontal: 16, paddingTop: 1, paddingBottom: 40 },

  backBtn:  { paddingHorizontal: 18, paddingVertical: 10 },
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
  bannerWrap:    { height: BANNER_H, overflow: "hidden" },
  bannerActions: {
    position: "absolute", bottom: 14, right: 16,
    flexDirection: "row", alignItems: "center", gap: 8,
  },

  socialBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.38)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },

  dmBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, height: 34, borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.22)",
  },
  dmBtnText: { fontSize: 13, fontWeight: "600", color: "#fff" },

  followBtn: {
    paddingHorizontal: 20, height: 34, borderRadius: 17,
    backgroundColor: "#ffffff",
    alignItems: "center", justifyContent: "center",
  },
  followingBtn: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.22)",
  },
  followBtnText:    { fontSize: 14, fontWeight: "700", color: "#111" },
  followingBtnText: { color: "#fff" },

  editBtn: {
    paddingHorizontal: 16, height: 34, borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.22)",
    alignItems: "center", justifyContent: "center",
  },
  editBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },

  // ── Avatar ────────────────────────────────────────────────
  avatarRow: { paddingHorizontal: 18, paddingBottom: 12 },
  avatar: {
    width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: 18,
    backgroundColor: "#FF6B35",
    borderWidth: 3, borderColor: "#161618",
    alignItems: "center", justifyContent: "center",
  },
  avatarImg: {
    width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: 18,
    borderWidth: 3, borderColor: "#161618",
  },
  avatarInitials: { fontSize: 28, fontWeight: "800", color: "#fff" },

  // ── Live ring (hosting / in a meet) ───────────────────────
  avatarLiveWrap:   { width: AVATAR_SIZE + 8, height: AVATAR_SIZE + 8, alignItems: "center", justifyContent: "center" },
  avatarLiveRing:   { width: AVATAR_SIZE + 8, height: AVATAR_SIZE + 8, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarRingImg:    { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: 18, borderWidth: 3, borderColor: "#161618" },
  avatarRingFallback: { backgroundColor: "#FF6B35", alignItems: "center", justifyContent: "center" },
  liveBadge: {
    position: "absolute", bottom: -4, alignSelf: "center",
    backgroundColor: "#FF3B5C", borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: 2, borderColor: "#161618",
  },
  liveBadgeText: { fontSize: 9, fontWeight: "900", color: "#fff", letterSpacing: 0.6 },

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
    borderWidth: 1, borderColor: "rgba(171,0,255,0.4)",
  },
  artistBadgeText: { fontSize: 10, fontWeight: "800", color: "#AB00FF" },
  handle: { fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 14 },
  bio:    { fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 22, marginBottom: 16 },

  statsRow: { flexDirection: "row", alignItems: "baseline", marginBottom: 16 },
  statBtn:  { flexDirection: "row", alignItems: "baseline" },
  statNum:  { fontSize: 15, fontWeight: "800", color: "#fff" },
  statLabel:{ fontSize: 14, color: "rgba(255,255,255,0.38)" },

  // ── Pinned song ───────────────────────────────────────────
  pinnedRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "rgba(255,108,26,0.09)",
    borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: "rgba(255,108,26,0.18)",
    marginBottom: 16,
  },
  pinnedArt: { width: 44, height: 44, borderRadius: 10 },
  pinnedArtFallback: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center", justifyContent: "center",
  },
  pinnedLabel:  { fontSize: 10, fontWeight: "700", color: "#FF6C1A", letterSpacing: 0.8, marginBottom: 2 },
  pinnedTrack:  { fontSize: 14, fontWeight: "700", color: "#fff" },
  pinnedArtist: { fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 1 },

  // ── Genres ────────────────────────────────────────────────
  genreRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  genreChip: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    backgroundColor: "rgba(171,0,255,0.12)",
    borderWidth: 1, borderColor: "rgba(171,0,255,0.28)",
  },
  genreText: { fontSize: 12, fontWeight: "600", color: "#AB00FF" },

  // ── Now Listening card ────────────────────────────────────
  nowPlayingCard: {
    marginTop: 12, borderRadius: 20, overflow: "hidden",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    padding: 16, gap: 14,
  },
  nowPlayingCardMeet: { borderColor: "rgba(171,0,255,0.45)" },
  npMeetBadge: {
    flexDirection: "row", alignItems: "center", gap: 7,
    alignSelf: "flex-start",
    backgroundColor: "rgba(171,0,255,0.22)",
    borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12,
  },
  npMeetBadgeText: { fontSize: 12, fontWeight: "700", color: "#E7CBFF", flexShrink: 1 },
  npMeetBadgeHost: { fontWeight: "800", color: "#fff" },
  npLiveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#FF3B5C" },
  npJoinBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#AB00FF", borderRadius: 24, paddingVertical: 12,
  },
  npJoinBtnText: { fontSize: 14, fontWeight: "800", color: "#fff" },
  npBody:            { flexDirection: "row", gap: 14, alignItems: "center" },
  npAlbumArt:        { width: 58, height: 58, borderRadius: 10 },
  npAlbumArtFallback:{ backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  npInfo:            { flex: 1, gap: 3 },
  npTrack:           { fontSize: 15, fontWeight: "700", color: "#fff", letterSpacing: -0.2 },
  npArtist:          { fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 10 },
  npProgressTrack:   { height: 3, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 2, marginBottom: 5 },
  npProgressFill:    { height: 3, backgroundColor: "#ffffff", borderRadius: 2 },
  npProgressTimes:   { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  npTimeText:        { fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: "600" },
  npBtnRow:          { flexDirection: "row", gap: 8, marginTop: 10 },
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
