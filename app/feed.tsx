import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Animated,
  Modal,
  Pressable,
  TextInput,
  Platform,
  PanResponder,
  Switch,
  Keyboard,
  Image,
  KeyboardAvoidingView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Linking,
  AppState,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Audio } from "expo-av";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRef, useState, useEffect, createContext, useContext } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import {
  AVATAR_MAP,
  STORIES, DUMMY_COMMENTS, NAV_ITEMS,
  FAKE_PHOTO_COLORS,
  DISCOVER_FILTERS, CAROUSEL_CARD_W, CAROUSEL_GAP, CAROUSEL_ITEMS,
  TRENDING_ARTISTS, FOR_YOU_RECS, UPCOMING_MEETS,
  NOW_PLAYING_STORIES,
  GROUP_CHATS, COMMUNITY_ITEMS, MESSAGES_UNREAD,
  PROFILE_TABS, PROFILE_POSTS, PROFILE_REPOSTS,
  DUMMY_COMMUNITIES,
  fmtCount,
  type Post, type DummyComment,
  type DummyCommunity, type CarouselItem, type ProfileTab,
  type NowPlayingStory,
  type GroupChat, type CommunityItem, type UserProfile,
} from "./data/mock";

import { openSpotifyLink, saveTrackToLiked, searchSpotifyTracks, getCurrentlyPlaying, getUserPlaylists, getPlaylistTracks, getValidSpotifyToken, skipPrevious, skipNext, setPlayback, playTrack, fetchSpotifyCanvas, connectSpotify, disconnectSpotify, type SpotifyTrackResult, type SpotifyPlaylist } from '../lib/spotify'
import { useNowPlaying, type NowPlayingTrack } from '../lib/useNowPlaying'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SongPreviewSheet } from '../components/SongPreviewSheet'
import {
  type ConversationInfo, type DbMessage,
  getConversations, getMessages,
  sendTextMessage, sendSpotifyTrackMessage,
} from '../lib/messages'
import { followUser, unfollowUser } from '../lib/follows'
import {
  startMeet, endMeet, joinMeet, leaveMeet,
  getLiveMeetsFromFollowing, getMeet, getActiveListenerCount,
  getMeetMessages, sendMeetMessage,
  updateMeetTrack, meetRowToTrackState, setTalkMode, setMeetOnProfile,
  recordMeetTrack, getMeetTracks, getActiveMeetForUser,
  type LiveMeet, type MeetMessage, type MeetTrack, type MeetTrackState, type MeetRow,
  type ActiveMeetForUser,
} from '../lib/meets'
import {
  syncListenerToHost, sanityCheckSync, expectedHostPosition,
  registerMeetSync, unregisterMeetSync,
  startTalkAudio, stopTalkAudio, restoreVolumeIfDucked,
} from '../lib/meetSync'
import { useVideoPlayer, VideoView } from 'expo-video'
import * as SecureStore from 'expo-secure-store'



const { width: SW, height: SH } = Dimensions.get("window");

const NAVBAR_H = 70;
const BOTTOM_INSET = 34;
const COMPOSER_ABOVE_NAV = NAVBAR_H + BOTTOM_INSET + 8;

// Card inner width (card has marginHorizontal: 13 → SW - 26) used for collage layouts
const COLLAGE_W = SW - 26;
const COLLAGE_GAP = 2;

// ─── Social platform config ───────────────────────────────────────────────────

type SocialPlatform = {
  key: string;
  label: string;
  icon: string;            // FontAwesome5 icon name
  color: string;
  placeholder: string;
};

const SOCIAL_PLATFORMS: SocialPlatform[] = [
  { key: "instagram",  label: "Instagram",   icon: "instagram",   color: "#ffffff", placeholder: "instagram.com/yourname" },
  { key: "x",          label: "X",           icon: "twitter",     color: "#ffffff", placeholder: "x.com/yourname" },
  { key: "tiktok",     label: "TikTok",      icon: "tiktok",      color: "#ffffff", placeholder: "tiktok.com/@yourname" },
  { key: "youtube",    label: "YouTube",     icon: "youtube",     color: "#ffffff", placeholder: "youtube.com/@channel" },
  { key: "soundcloud", label: "SoundCloud",  icon: "soundcloud",  color: "#ffffff", placeholder: "soundcloud.com/yourname" },
  { key: "snapchat",   label: "Snapchat",    icon: "snapchat",    color: "#ffffff", placeholder: "snapchat.com/yourname" },
  { key: "facebook",   label: "Facebook",    icon: "facebook",    color: "#ffffff", placeholder: "facebook.com/yourname" },
];

// Order in which platforms are shown on the profile banner (most relevant first)
const BANNER_PLATFORM_PRIORITY = ["instagram", "x", "youtube", "tiktok", "snapchat", "soundcloud", "facebook"];

// Lets any component inside a post card open the detail view without prop-drilling through card types
const OpenDetailCtx = createContext<(() => void) | undefined>(undefined);

// Lets the Meets tab (and notification deep links) open the listener room,
// which is mounted once at FeedScreen level.
// isPublic omitted → the listener room flow prompts the joiner to pick
// public/private; passed explicitly → join straight away with that choice.
const OpenMeetCtx = createContext<((meetId: string, isPublic?: boolean) => void) | null>(null);
const useOpenMeet = () => useContext(OpenMeetCtx);

// Lets ProfileView's "Start Meet" flow open the host room, which is mounted once
// at FeedScreen level so it (and the minimized mini-bar) survives tab switches.
const HostMeetCtx = createContext<((meetId: string, name: string) => void) | null>(null);
const useOpenHostMeet = () => useContext(HostMeetCtx);

// ─── Now Playing context ──────────────────────────────────────────────────────
// The hook lives in FeedScreen (never unmounts) so tab switches don't destroy
// the token cache or needsReconnect state.
type NowPlayingCtxValue = ReturnType<typeof useNowPlaying>
const NowPlayingCtx = createContext<NowPlayingCtxValue | null>(null)
const useNowPlayingCtx = () => {
  const ctx = useContext(NowPlayingCtx)
  if (!ctx) throw new Error('useNowPlayingCtx must be used inside NowPlayingCtx.Provider')
  return ctx
}

// ─── Curated playlist types ───────────────────────────────────────────────────
type CuratedPlaylist = {
  id: string
  user_id: string
  name: string
  image_url: string | null
  tags: string[]
  show_on_profile: boolean
  created_at: string
}

type CuratedSong = {
  id: string
  playlist_id: string
  spotify_track_id: string
  track_name: string
  track_artist: string
  album_art: string | null
  duration_ms: number
  position: number
}

// ─── Feed user context (current-user liked-post IDs + toggle handler) ────────
// Passed down to ActionRow without prop-drilling through every card layer.

type FeedUserCtxValue = {
  currentUserId: string | null;
  likedPostIds: Set<string>;
  onToggleLike: (postId: string) => void;
};
const FeedUserCtx = createContext<FeedUserCtxValue>({
  currentUserId: null,
  likedPostIds: new Set(),
  onToggleLike: () => {},
});

// ─── Spotify track card (shown inside chat when a track is shared) ───────────

function SpotifyTrackCard({
  track,
  fromMe,
}: {
  track: { id: string; name: string; artist: string; albumArt: string | null };
  fromMe: boolean;
}) {
  const [saved,   setSaved]   = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [checked, setChecked] = useState(false);

  // On mount, check if already saved
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('users')
          .select('spotify_access_token')
          .eq('id', user.id)
          .single();
        if (data?.spotify_access_token) {
          const res = await fetch(
            `https://api.spotify.com/v1/me/tracks/contains?ids=${track.id}`,
            { headers: { Authorization: `Bearer ${data.spotify_access_token}` } },
          );
          if (res.ok) {
            const arr = await res.json();
            setSaved(arr[0] === true);
          }
        }
      } catch {}
      setChecked(true);
    })();
  }, [track.id]);

  const handleSave = async () => {
    if (saved || saving) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('users')
        .select('spotify_access_token')
        .eq('id', user.id)
        .single();
      if (data?.spotify_access_token) {
        const ok = await saveTrackToLiked(data.spotify_access_token, track.id);
        if (ok) setSaved(true);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[spCard.card, fromMe && spCard.cardMe]}>
      {track.albumArt ? (
        <Image source={{ uri: track.albumArt }} style={spCard.art} resizeMode="cover" />
      ) : (
        <View style={spCard.artFallback}>
          <Ionicons name="musical-notes" size={22} color="#1DB954" />
        </View>
      )}

      <View style={spCard.info}>
        <View style={spCard.spotifyRow}>
          <FontAwesome5 name="spotify" size={11} color="#1DB954" />
          <Text style={spCard.spotifyLabel}>Spotify</Text>
        </View>
        <Text style={spCard.trackName} numberOfLines={1}>{track.name}</Text>
        <Text style={spCard.artistName} numberOfLines={1}>{track.artist}</Text>

        <View style={spCard.btnRow}>
          <TouchableOpacity
            style={spCard.openBtn}
            activeOpacity={0.8}
            onPress={() => openSpotifyLink(
              `spotify:track:${track.id}`,
              `https://open.spotify.com/track/${track.id}`,
            )}
          >
            <Ionicons name="open-outline" size={11} color="#1DB954" />
            <Text style={spCard.openBtnText}>Open</Text>
          </TouchableOpacity>

          {checked && (
            <TouchableOpacity
              style={[spCard.saveBtn, saved && spCard.savedBtn]}
              activeOpacity={0.8}
              onPress={handleSave}
              disabled={saved || saving}
            >
              <Ionicons
                name={saved ? "heart" : "heart-outline"}
                size={11}
                color={saved ? "#1DB954" : "rgba(255,255,255,0.45)"}
              />
              <Text style={[spCard.saveBtnText, saved && spCard.savedBtnText]}>
                {saving ? "…" : saved ? "Saved" : "Save"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const spCard = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    alignSelf: "flex-start",       // don't stretch to fill parent
    backgroundColor: "#0F1A12",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(29,185,84,0.25)",
    padding: 12,
    maxWidth: SW * 0.72,
  },
  cardMe: { alignSelf: "flex-end" },
  art: { width: 54, height: 54, borderRadius: 10, overflow: "hidden" },
  artFallback: {
    width: 54,
    height: 54,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "rgba(29,185,84,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1, gap: 2 },
  spotifyRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  spotifyLabel: { fontSize: 10, fontWeight: "700", color: "#1DB954", letterSpacing: 0.5 },
  trackName: { fontSize: 13, fontWeight: "700", color: "#fff", letterSpacing: -0.2 },
  artistName: { fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 8 },
  btnRow: { flexDirection: "row", gap: 7 },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: "rgba(29,185,84,0.12)",
    borderWidth: 1,
    borderColor: "rgba(29,185,84,0.35)",
  },
  openBtnText: { fontSize: 11, fontWeight: "700", color: "#1DB954" },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  savedBtn: {
    backgroundColor: "rgba(29,185,84,0.12)",
    borderColor: "rgba(29,185,84,0.3)",
  },
  saveBtnText: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.45)" },
  savedBtnText: { color: "#1DB954" },
});

// ─── Now Playing bubble (replaces plain story bubble) ────────────────────────

function NowPlayingBubble({ item }: { item: NowPlayingStory }) {
  const photo = AVATAR_MAP[item.user];
  return (
    <TouchableOpacity style={styles.nowPlayingItem} activeOpacity={0.8}>
      <View style={[styles.storyRing, { borderColor: item.color }]}>
        {photo ? (
          <Image source={photo} style={styles.storyAvatar} />
        ) : (
          <View style={[styles.storyAvatar, { backgroundColor: item.color + "25" }]}>
            <Text style={[styles.storyInitials, { color: item.color }]}>{item.initials}</Text>
          </View>
        )}
        {/* Music badge */}
        <View style={[styles.nowPlayingBadge, { backgroundColor: item.color }]}>
          <Ionicons name="musical-note" size={9} color="#0D0D0D" />
        </View>
      </View>
      <Text style={styles.storyName} numberOfLines={1}>{item.song}</Text>
      <Text style={styles.storyArtistSub} numberOfLines={1}>{item.artist}</Text>
    </TouchableOpacity>
  );
}

// ─── Now Playing banner (shown above composer) ────────────────────────────────

const WAVE_H = [5, 10, 15, 10, 18, 8, 14, 6];

function AnimatedWaveform({ color }: { color: string }) {
  const anims = useRef(WAVE_H.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const loops = anims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 80),
          Animated.timing(anim, { toValue: 1, duration: 380 + i * 40, useNativeDriver: false }),
          Animated.timing(anim, { toValue: 0, duration: 380 + i * 40, useNativeDriver: false }),
        ])
      )
    );
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, []);

  return (
    <View style={styles.nowPlayingWaves}>
      {WAVE_H.map((base, i) => {
        const height = anims[i].interpolate({
          inputRange: [0, 1],
          outputRange: [Math.max(3, base * 0.4), base],
        });
        return (
          <Animated.View
            key={i}
            style={[styles.nowPlayingWaveBar, { height, backgroundColor: color + "99" }]}
          />
        );
      })}
    </View>
  );
}

function NowPlayingBanner({
  onShare,
  onAttach,
}: {
  onShare?: (track: NowPlayingTrack) => void;
  onAttach?: (track: NowPlayingTrack) => void;
} = {}) {
  const { track } = useNowPlayingCtx();

  if (!track?.isPlaying) return null;

  const COLOR = "#1DB954";
  // When onAttach is provided (quick-post context) show a "+" button;
  // otherwise fall back to the paper-plane share-to-chat button.
  const handleBtn = () => {
    if (!track) return;
    onAttach ? onAttach(track) : onShare?.(track);
  };

  return (
    <View style={styles.nowPlayingBar}>
      {/* Album art or fallback swatch */}
      {track.albumArt ? (
        <Image source={{ uri: track.albumArt }} style={[styles.nowPlayingBarSwatch, { borderWidth: 0 }]} />
      ) : (
        <View style={[styles.nowPlayingBarSwatch, { backgroundColor: COLOR + "33", borderColor: COLOR + "55" }]}>
          <Ionicons name="musical-note" size={13} color={COLOR} />
        </View>
      )}

      {/* Track info */}
      <View style={{ flex: 1 }}>
        <Text style={styles.nowPlayingBarSong} numberOfLines={1}>{track.name}</Text>
        <Text style={styles.nowPlayingBarArtist} numberOfLines={1}>{track.artist}</Text>
      </View>

      {/* Animated waveform */}
      <AnimatedWaveform color={COLOR} />

      {/* Action button */}
      <TouchableOpacity
        style={styles.nowPlayingShareBtn}
        activeOpacity={0.75}
        onPress={handleBtn}
      >
        <Ionicons
          name={onAttach ? "add-circle-outline" : "paper-plane-outline"}
          size={onAttach ? 22 : 14}
          color={COLOR}
        />
      </TouchableOpacity>
    </View>
  );
}

// ─── Action row ───────────────────────────────────────────────────────────────

function ActionRow({ post }: { post: Post }) {
  const { currentUserId, likedPostIds, onToggleLike } = useContext(FeedUserCtx);
  const liked = likedPostIds.has(post.id);
  const [likeCount, setLikeCount] = useState(post.likes);
  const openDetail = useContext(OpenDetailCtx);

  // Keep local count in sync when the post prop changes (e.g. after DB sync)
  useEffect(() => { setLikeCount(post.likes); }, [post.likes]);

  const handleLike = () => {
    if (!currentUserId) return;
    setLikeCount((c) => (liked ? Math.max(0, c - 1) : c + 1));
    onToggleLike(post.id);
  };

  return (
    <View style={styles.actionRow}>
      <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={handleLike}>
        <Text style={[styles.actionIcon, liked && styles.actionIconLiked]}>{liked ? "♥" : "♡"}</Text>
        {likeCount > 0 && <Text style={[styles.actionCount, liked && styles.actionCountLiked]}>{likeCount}</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={openDetail}>
        <Ionicons name="chatbubble-outline" size={17} color="rgba(255,255,255,0.7)" />
        {post.comments > 0 && <Text style={styles.actionCount}>{post.comments}</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={() => {}}>
        <Text style={styles.actionIcon}>↗</Text>
        {post.shares > 0 && <Text style={styles.actionCount}>{post.shares}</Text>}
      </TouchableOpacity>
      <View style={{ flex: 1 }} />
      <TouchableOpacity activeOpacity={0.7} onPress={() => {}}>
        <Text style={styles.moreIcon}>···</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Lightbox styles ─────────────────────────────────────────────────────────

const lbStyles = StyleSheet.create({
  backdrop:  { flex: 1, backgroundColor: "#000" },
  header:    {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 54, paddingBottom: 10,
  },
  counter:   { fontSize: 15, color: "rgba(255,255,255,0.6)", fontWeight: "600" },
  closeBtn:  { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  page:      { width: SW, flex: 1, justifyContent: "center", alignItems: "center" },
  fullImage: { width: SW, height: SH * 0.78 },
  videoFull: { width: SW, height: SH * 0.62 },
});

// ─── Fullscreen image lightbox ─────────────────────────────────────────────────

function MediaLightbox({
  urls,
  startIndex,
  onClose,
}: {
  urls: string[];
  startIndex: number;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (startIndex > 0) {
      const t = setTimeout(() => {
        scrollRef.current?.scrollTo({ x: startIndex * SW, animated: false });
      }, 30);
      return () => clearTimeout(t);
    }
  }, []);

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={lbStyles.backdrop}>
        {/* Counter + close */}
        <View style={lbStyles.header}>
          <Text style={lbStyles.counter}>
            {urls.length > 1 ? `${currentIndex + 1} / ${urls.length}` : " "}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={12} style={lbStyles.closeBtn}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Horizontally paged images */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) =>
            setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / SW))
          }
          style={{ flex: 1 }}
        >
          {urls.map((url, i) => (
            <View key={i} style={lbStyles.page}>
              <Image
                source={{ uri: url }}
                style={lbStyles.fullImage}
                resizeMode="contain"
              />
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Fullscreen video lightbox ─────────────────────────────────────────────────

function VideoLightbox({ uri, onClose }: { uri: string; onClose: () => void }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.play();
  });

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={lbStyles.backdrop}>
        <View style={lbStyles.header}>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={onClose} hitSlop={12} style={lbStyles.closeBtn}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <VideoView
            player={player}
            style={lbStyles.videoFull}
            nativeControls
            contentFit="contain"
          />
        </View>
      </View>
    </Modal>
  );
}

// ─── Post header ──────────────────────────────────────────────────────────────

function PostHeader({ post }: { post: Post }) {
  const photo = AVATAR_MAP[post.user];
  const router = useRouter();

  const handleAuthorPress = () => {
    if (post.authorId) {
      router.push({ pathname: "/user-profile", params: { userId: post.authorId } });
    }
  };

  const avatarEl = post.avatarUrl ? (
    <Image source={{ uri: post.avatarUrl }} style={styles.postAvatar} />
  ) : photo ? (
    <Image source={photo} style={styles.postAvatar} />
  ) : (
    <View style={[styles.postAvatar, { backgroundColor: post.avatarColor + "22" }]}>
      <Text style={[styles.postAvatarText, { color: post.avatarColor }]}>{post.initials}</Text>
    </View>
  );

  return (
    <View style={styles.postHeader}>
      {/* Avatar → opens author profile */}
      <TouchableOpacity activeOpacity={0.72} onPress={handleAuthorPress} disabled={!post.authorId}>
        {avatarEl}
      </TouchableOpacity>

      <View style={{ flex: 1 }}>
        {/* Display name → opens author profile */}
        <TouchableOpacity activeOpacity={0.72} onPress={handleAuthorPress} disabled={!post.authorId}>
          <Text style={styles.postUser}>{post.bio}</Text>
        </TouchableOpacity>
        {/* Handle → also opens author profile */}
        <TouchableOpacity activeOpacity={0.6} onPress={handleAuthorPress} disabled={!post.authorId}>
          <Text style={styles.postBio} numberOfLines={1}>{post.handle} · {post.time}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Tappable post text — opens detail view ────────────────────────────────────

function PostText({ text }: { text: string }) {
  const openDetail = useContext(OpenDetailCtx);
  return (
    <TouchableOpacity activeOpacity={0.75} onPress={openDetail}>
      <Text style={styles.postText}>{text}</Text>
    </TouchableOpacity>
  );
}

// ─── Text card ────────────────────────────────────────────────────────────────

function TextCard({ post }: { post: Post }) {
  return (
    <View style={styles.card}>
      <PostHeader post={post} />
      {post.text && <PostText text={post.text} />}
      <ActionRow post={post} />
    </View>
  );
}

// ─── Image collage layout ─────────────────────────────────────────────────────

function ImageCollage({
  urls,
  onPress,
}: {
  urls: string[];
  onPress: (idx: number) => void;
}) {
  // ── 1 image: full width ──────────────────────────────────────────────────────
  if (urls.length === 1) {
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={() => onPress(0)}>
        <Image source={{ uri: urls[0] }} style={{ width: COLLAGE_W, height: 280 }} resizeMode="cover" />
      </TouchableOpacity>
    );
  }

  // ── 2 images: side by side ───────────────────────────────────────────────────
  if (urls.length === 2) {
    const w = (COLLAGE_W - COLLAGE_GAP) / 2;
    return (
      <View style={{ flexDirection: "row", gap: COLLAGE_GAP }}>
        {urls.map((url, i) => (
          <TouchableOpacity key={i} activeOpacity={0.9} onPress={() => onPress(i)}>
            <Image source={{ uri: url }} style={{ width: w, height: 220 }} resizeMode="cover" />
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  // ── 3 images: large left + two stacked right ─────────────────────────────────
  if (urls.length === 3) {
    const leftW  = Math.round(COLLAGE_W * 0.62);
    const rightW = COLLAGE_W - leftW - COLLAGE_GAP;
    const totalH = 250;
    const rightH = (totalH - COLLAGE_GAP) / 2;
    return (
      <View style={{ flexDirection: "row", gap: COLLAGE_GAP }}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => onPress(0)}>
          <Image source={{ uri: urls[0] }} style={{ width: leftW, height: totalH }} resizeMode="cover" />
        </TouchableOpacity>
        <View style={{ gap: COLLAGE_GAP }}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => onPress(1)}>
            <Image source={{ uri: urls[1] }} style={{ width: rightW, height: rightH }} resizeMode="cover" />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.9} onPress={() => onPress(2)}>
            <Image source={{ uri: urls[2] }} style={{ width: rightW, height: rightH }} resizeMode="cover" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── 4+ images: 2×2 grid, last cell shows +N badge ────────────────────────────
  const cellW  = (COLLAGE_W - COLLAGE_GAP) / 2;
  const cellH  = Math.round(cellW * 0.72);
  const shown  = urls.slice(0, 4);
  const extra  = urls.length - 4;
  return (
    <View style={{ gap: COLLAGE_GAP }}>
      {[0, 2].map((rowStart) => (
        <View key={rowStart} style={{ flexDirection: "row", gap: COLLAGE_GAP }}>
          {shown.slice(rowStart, rowStart + 2).map((url, j) => {
            const idx  = rowStart + j;
            const isLast = idx === 3 && extra > 0;
            return (
              <TouchableOpacity key={idx} activeOpacity={0.9} onPress={() => onPress(idx)} style={{ position: "relative" }}>
                <Image source={{ uri: url }} style={{ width: cellW, height: cellH }} resizeMode="cover" />
                {isLast && (
                  <View style={styles.collageMoreOverlay}>
                    <Text style={styles.collageMoreText}>+{extra}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ─── Image card ───────────────────────────────────────────────────────────────

function ImageCard({ post }: { post: Post }) {
  const urls = post.mediaUrls ?? [];
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  return (
    <View style={styles.card}>
      <PostHeader post={post} />
      {post.text && <PostText text={post.text} />}
      {urls.length > 0 ? (
        <ImageCollage urls={urls} onPress={(i) => setLightboxIdx(i)} />
      ) : (
        <View style={[styles.mediaBlock, { backgroundColor: post.mediaColor ?? "#1a1a1a" }]}>
          <Text style={styles.mediaPlaceholder}>🖼</Text>
        </View>
      )}
      <ActionRow post={post} />
      {lightboxIdx !== null && (
        <MediaLightbox
          urls={urls}
          startIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </View>
  );
}

// ─── Video card ───────────────────────────────────────────────────────────────

function VideoCard({ post }: { post: Post }) {
  return (
    <View style={styles.card}>
      <PostHeader post={post} />
      {post.text && <PostText text={post.text} />}
      <View style={[styles.mediaBlock, { backgroundColor: post.mediaColor ?? "#1a1a1a" }]}>
        <View style={styles.videoPlayCircle}>
          <Text style={styles.videoPlayIcon}>▶</Text>
        </View>
        {post.duration && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{post.duration}</Text>
          </View>
        )}
      </View>
      <ActionRow post={post} />
    </View>
  );
}

// ─── Music card ───────────────────────────────────────────────────────────────

function MusicCard({ post }: { post: Post }) {
  const accent = post.albumAccent ?? "#AB00FF";
  const bg     = post.albumColor  ?? "#111";
  const [saved,   setSaved]   = useState(false);
  const [saving,  setSaving]  = useState(false);

  const handleOpen = () => {
    if (!post.songId) return;
    openSpotifyLink(
      `spotify:track:${post.songId}`,
      `https://open.spotify.com/track/${post.songId}`,
    );
  };

  const handleSave = async () => {
    if (!post.songId || saving || saved) return;
    setSaving(true);
    try {
      // Fetch the user's Spotify access token from the DB
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("users")
        .select("spotify_access_token")
        .eq("id", user.id)
        .single();
      const token = data?.spotify_access_token;
      if (!token) return;
      const ok = await saveTrackToLiked(token, post.songId);
      if (ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.card}>
      <PostHeader post={post} />
      {post.text && <PostText text={post.text} />}

      <View style={[styles.musicPlayerCard, { backgroundColor: bg }]}>
        {/* Art — song info overlaid at bottom */}
        <View style={styles.musicArtArea}>
          {post.albumArt ? (
            <Image source={{ uri: post.albumArt }} style={styles.musicArtFill} resizeMode="cover" />
          ) : (
            <View style={[styles.musicArtFill, { backgroundColor: accent + "28" }]}>
              <Text style={styles.musicArtEmoji}>🎵</Text>
            </View>
          )}

          {/* Bottom scrim + song info */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.72)"]}
            style={styles.musicInfoOverlay}
            pointerEvents="none"
          />
          <View style={styles.musicInfoText} pointerEvents="none">
            <Text style={styles.musicSongTitle} numberOfLines={1}>{post.song}</Text>
            <Text style={styles.musicArtistName} numberOfLines={1}>{post.artist}</Text>
          </View>

          {/* Top-right: open in Spotify + save to Liked Songs */}
          <View style={styles.musicTopRight}>
            <TouchableOpacity
              style={styles.musicGlassBtn}
              activeOpacity={0.8}
              onPress={handleSave}
              disabled={saving || saved}
            >
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons
                    name={saved ? "heart" : "heart-outline"}
                    size={17}
                    color={saved ? "#ff4d6d" : "#fff"}
                  />
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.musicGlassBtn, { backgroundColor: "rgb(0, 0, 0)", borderColor: "rgba(255, 255, 255, 0.93)" }]}
              activeOpacity={0.8}
              onPress={handleOpen}
              disabled={!post.songId}
            >
              <FontAwesome5 name="spotify" size={17} color="#1DB954" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ActionRow post={post} />
    </View>
  );
}

// ─── Poll card ────────────────────────────────────────────────────────────────

function PollCard({ post }: { post: Post }) {
  const [voted, setVoted] = useState<string | null>(null);
  const [localOptions, setLocalOptions] = useState(post.pollOptions ?? []);
  const [voting, setVoting] = useState(false);

  // Derive total from live localOptions (not a snapshot), handle 0-vote state
  const displayTotal = localOptions.reduce((s, o) => s + o.votes, 0);
  const total = displayTotal || 1; // avoid division-by-zero for pct calculation

  const handleVote = async (optId: string) => {
    // Tapping the already-selected option is a no-op
    if (optId === voted || voting) return;

    const prevVoted = voted;
    const prevOptions = localOptions;

    // Optimistic update: increment new, decrement old
    const optimistic = localOptions.map((o) => {
      if (o.id === optId)      return { ...o, votes: o.votes + 1 };
      if (o.id === prevVoted)  return { ...o, votes: Math.max(0, o.votes - 1) };
      return o;
    });
    setVoted(optId);
    setLocalOptions(optimistic);
    setVoting(true);

    // Persist via SECURITY DEFINER RPC — bypasses RLS so any voter can update
    const { data, error } = await supabase.rpc("vote_on_poll", {
      p_post_id:     post.id,
      p_opt_id:      optId,
      p_prev_opt_id: prevVoted,
    });

    setVoting(false);

    if (error) {
      // Revert on failure
      console.log("[PollCard] vote error:", error.message);
      setVoted(prevVoted);
      setLocalOptions(prevOptions);
    } else if (data?.options) {
      // Sync with server-authoritative counts
      setLocalOptions(data.options);
    }
  };

  const maxVotes = Math.max(...localOptions.map((o) => o.votes));

  return (
    <View style={styles.card}>
      <PostHeader post={post} />
      {post.text && <PostText text={post.text} />}

      <View style={styles.pollContainer}>
        <Text style={styles.pollQuestion}>{post.pollQuestion}</Text>
        <View style={styles.pollOptions}>
          {localOptions.map((opt) => {
            const pct       = Math.round((opt.votes / total) * 100);
            const isVoted   = voted === opt.id;
            const isWinner  = voted !== null && opt.votes === maxVotes && opt.votes > 0;

            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.pollOption, isVoted && { borderColor: "rgba(171,0,255,0.45)" }]}
                activeOpacity={voted ? 0.65 : 0.8}
                onPress={() => handleVote(opt.id)}
                disabled={voting}
              >
                {/* Fill bar — visible once any vote has been cast */}
                {voted !== null && (
                  <View
                    style={[
                      styles.pollFillBar,
                      { width: `${pct}%` as any, backgroundColor: isWinner ? "#AB00FF22" : "rgba(255,255,255,0.06)" },
                    ]}
                  />
                )}
                <View style={styles.pollOptionInner}>
                  <Text style={[styles.pollOptionLabel, isVoted && { color: "#AB00FF" }]}>
                    {opt.label}
                  </Text>
                  {/* Right side: checkmark for current vote, pct after voting */}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    {voted !== null && (
                      <Text style={[styles.pollPct, isWinner && { color: "#AB00FF" }]}>{pct}%</Text>
                    )}
                    {isVoted && (
                      <Ionicons name="checkmark-circle" size={15} color="#AB00FF" />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.pollMeta}>
          {(voted === null ? displayTotal : displayTotal).toLocaleString()} votes
          {voted !== null ? " · tap another option to change" : " · tap to vote"}
        </Text>
      </View>

      <ActionRow post={post} />
    </View>
  );
}

// ─── DB row → Post adapter ────────────────────────────────────────────────────

function dbRowToPost(row: any): Post {
  const author = Array.isArray(row.users) ? row.users[0] : row.users;
  const diffMin = Math.floor((Date.now() - new Date(row.created_at).getTime()) / 60_000);
  const time =
    diffMin < 1 ? "just now"
    : diffMin < 60 ? `${diffMin}m`
    : diffMin < 1440 ? `${Math.floor(diffMin / 60)}h`
    : `${Math.floor(diffMin / 1440)}d`;
  const name = author?.display_name ?? author?.username ?? "User";
  const words = name.trim().split(/\s+/);
  const initials =
    words.length > 1
      ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  return {
    id: row.id,
    authorId: author?.id ?? undefined,
    user: author?.username ?? "user",
    handle: `@${author?.username ?? "user"}`,
    initials,
    avatarColor: "#AB00FF",
    avatarUrl: author?.avatar_url ?? null,
    bio: author?.display_name ?? null,
    time,
    text: row.text ?? undefined,
    type: row.type as Post["type"],
    mediaUrls: row.media_urls ?? [],
    song:     row.song_name      ?? undefined,
    artist:   row.song_artist    ?? undefined,
    songId:   row.song_id        ?? undefined,
    albumArt: row.song_album_art ?? undefined,
    pollQuestion: row.poll_question ?? undefined,
    pollOptions: row.poll_options ?? undefined,
    totalVotes: row.poll_options
      ? (row.poll_options as any[]).reduce((s: number, o: any) => s + (o.votes ?? 0), 0)
      : undefined,
    likes: row.likes_count ?? 0,
    comments: row.comments_count ?? 0,
    shares: 0,
  };
}

// ─── Post card router ─────────────────────────────────────────────────────────

function PostCard({ item }: { item: Post }) {
  if (item.type === "text") return <TextCard post={item} />;
  if (item.type === "image") return <ImageCard post={item} />;
  if (item.type === "video") return <VideoCard post={item} />;
  if (item.type === "music") return <MusicCard post={item} />;
  if (item.type === "poll") return <PollCard post={item} />;
  return null;
}

// ─── Comment type + adapter ───────────────────────────────────────────────────

type Comment = {
  id: string;
  postId: string;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  text: string;
  likesCount: number;
  parentCommentId: string | null;
  time: string;
  // Optional song attachment
  songId: string | null;
  songName: string | null;
  songArtist: string | null;
  songAlbumArt: string | null;
};

function rowToComment(row: any): Comment {
  const author  = Array.isArray(row.users) ? row.users[0] : row.users;
  const diffMin = Math.floor((Date.now() - new Date(row.created_at).getTime()) / 60_000);
  const time    = diffMin < 1 ? "just now" : diffMin < 60 ? `${diffMin}m` : diffMin < 1440 ? `${Math.floor(diffMin / 60)}h` : `${Math.floor(diffMin / 1440)}d`;
  return {
    id:              row.id,
    postId:          row.post_id,
    userId:          row.user_id,
    username:        author?.username   ?? "user",
    displayName:     author?.display_name ?? null,
    avatarUrl:       author?.avatar_url   ?? null,
    text:            row.text ?? "",
    likesCount:      row.likes_count    ?? 0,
    parentCommentId: row.parent_comment_id ?? null,
    time,
    songId:      row.song_id        ?? null,
    songName:    row.song_name      ?? null,
    songArtist:  row.song_artist    ?? null,
    songAlbumArt:row.song_album_art ?? null,
  };
}

const COMMENT_SELECT =
  "id, post_id, user_id, parent_comment_id, text, likes_count, created_at, song_id, song_name, song_artist, song_album_art, users!user_id(id, username, display_name, avatar_url)";

// ─── Comment row (swipeable, double-tap to like) ───────────────────────────────

function CommentRow({
  comment,
  currentUserId,
  onReply,
}: {
  comment: Comment;
  currentUserId: string | null;
  onReply: (c: Comment) => void;
}) {
  const [liked,     setLiked]     = useState(false);
  const [likeCount, setLikeCount] = useState(comment.likesCount);
  const translateX  = useRef(new Animated.Value(0)).current;
  const heartScale  = useRef(new Animated.Value(1)).current;
  const isLocked    = useRef(false);
  const lastTapRef  = useRef(0);
  const onReplyRef  = useRef(onReply);
  useEffect(() => { onReplyRef.current = onReply; }, [onReply]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) => {
        if (dx < -2 && Math.abs(dx) >= Math.abs(dy)) { isLocked.current = true; return true; }
        return false;
      },
      onShouldBlockNativeResponder: () => true,
      onPanResponderMove:   (_, { dx }) => { if (dx < 0) translateX.setValue(Math.max(dx, -90)); },
      onPanResponderRelease:(_, { dx }) => {
        isLocked.current = false;
        if (dx < -50) onReplyRef.current(comment);
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 240 }).start();
      },
      onPanResponderTerminate: () => {
        isLocked.current = false;
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  const indicatorOpacity = translateX.interpolate({ inputRange: [-70, -15, 0], outputRange: [1, 0, 0], extrapolate: "clamp" });

  const handleLike = async () => {
    if (!currentUserId) return;
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => wasLiked ? Math.max(0, c - 1) : c + 1);
    // Bounce the heart
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.45, useNativeDriver: true, damping: 6, stiffness: 500 }),
      Animated.spring(heartScale, { toValue: 1,    useNativeDriver: true, damping: 12, stiffness: 300 }),
    ]).start();
    supabase.rpc("toggle_comment_like", { p_comment_id: comment.id, p_user_id: currentUserId });
  };

  // Double-tap on the bubble body to like
  const handleBubbleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) handleLike();
    lastTapRef.current = now;
  };

  const initials = (comment.displayName ?? comment.username).slice(0, 2).toUpperCase();

  return (
    <View style={styles.commentWrap} {...pan.panHandlers}>
      <Animated.View style={[styles.commentReplyHint, { opacity: indicatorOpacity }]}>
        <Text style={styles.replyIndicatorArrow}>←</Text>
        <Text style={styles.replyIndicatorLabel}>Reply</Text>
      </Animated.View>

      <Animated.View style={[styles.commentRow, { transform: [{ translateX }] }]}>
        {/* Avatar */}
        {comment.avatarUrl ? (
          <Image source={{ uri: comment.avatarUrl }} style={styles.commentAvatar} />
        ) : (
          <View style={[styles.commentAvatar, { backgroundColor: "#AB00FF22", borderColor: "#AB00FF44" }]}>
            <Text style={[styles.commentAvatarText, { color: "#AB00FF" }]}>{initials}</Text>
          </View>
        )}

        {/* Bubble — double-tap anywhere on it to like */}
        <TouchableOpacity style={styles.commentBody} activeOpacity={0.85} onPress={handleBubbleTap}>
          <View style={styles.commentMeta}>
            <Text style={styles.commentHandle}>{comment.displayName ?? `@${comment.username}`}</Text>
            <Text style={styles.commentTime}>{comment.time}</Text>
          </View>
          {!!comment.text && <Text style={styles.commentText}>{comment.text}</Text>}
          {/* Song attachment */}
          {comment.songName && (
            <TouchableOpacity
              style={styles.commentSongCard}
              activeOpacity={0.8}
              onPress={() => comment.songId
                ? openSpotifyLink(`spotify:track:${comment.songId}`, `https://open.spotify.com/track/${comment.songId}`)
                : undefined
              }
            >
              {comment.songAlbumArt ? (
                <Image source={{ uri: comment.songAlbumArt }} style={styles.commentSongArt} />
              ) : (
                <View style={[styles.commentSongArt, styles.commentSongArtFallback]}>
                  <FontAwesome5 name="music" size={9} color="rgba(255,255,255,0.3)" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.commentSongName} numberOfLines={1}>{comment.songName}</Text>
                {comment.songArtist ? <Text style={styles.commentSongArtist} numberOfLines={1}>{comment.songArtist}</Text> : null}
              </View>
              <FontAwesome5 name="spotify" size={11} color="#1DB954" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Like button */}
        <Animated.View style={{ transform: [{ scale: heartScale }] }}>
          <TouchableOpacity style={styles.commentLikeBtn} onPress={handleLike} activeOpacity={0.7}>
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={15}
              color={liked ? "#FF3CAC" : "rgba(255,255,255,0.4)"}
            />
            {likeCount > 0 && (
              <Text style={[styles.commentLikeCount, liked && { color: "#FF3CAC" }]}>{likeCount}</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

// ─── Threaded comment (parent + its replies) ─────────────────────────────────

const REPLIES_COLLAPSED_MAX = 3;

function ThreadedCommentRow({
  comment,
  replies,
  currentUserId,
  onReply,
}: {
  comment: Comment;
  replies: Comment[];
  currentUserId: string | null;
  onReply: (c: Comment) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible   = showAll ? replies : replies.slice(0, REPLIES_COLLAPSED_MAX);
  const hiddenCnt = replies.length - REPLIES_COLLAPSED_MAX;

  return (
    <View>
      <CommentRow comment={comment} currentUserId={currentUserId} onReply={onReply} />
      {visible.length > 0 && (
        <View style={styles.repliesBlock}>
          {/* Vertical connector line */}
          <View style={styles.threadLine} />
          <View style={{ flex: 1 }}>
            {visible.map((reply, idx) => (
              <View key={reply.id} style={[styles.replyRow, idx > 0 && { marginTop: 6 }]}>
                <CommentRow comment={reply} currentUserId={currentUserId} onReply={onReply} />
              </View>
            ))}
            {!showAll && hiddenCnt > 0 && (
              <TouchableOpacity style={styles.showMoreReplies} onPress={() => setShowAll(true)} activeOpacity={0.7}>
                <View style={styles.showMoreDots}>
                  <View style={styles.showMoreDot} />
                  <View style={styles.showMoreDot} />
                  <View style={styles.showMoreDot} />
                </View>
                <Text style={styles.showMoreRepliesText}>
                  Show {hiddenCnt} more {hiddenCnt === 1 ? "reply" : "replies"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Swipeable post wrapper ───────────────────────────────────────────────────

function SwipeablePost({
  item,
  onQuickReply,
  onScrollLock,
  onPress,
}: {
  item: Post;
  onQuickReply: (post: Post) => void;
  onScrollLock: (enabled: boolean) => void;
  onPress: () => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  // Ref so the PanResponder closure always sees the latest value without stale captures
  const onQuickReplyRef = useRef(onQuickReply);
  const onScrollLockRef = useRef(onScrollLock);
  const isLocked = useRef(false);
  // Blocks the tap overlay's onPress if a swipe gesture just happened
  const swipeActivated = useRef(false);
  useEffect(() => { onQuickReplyRef.current = onQuickReply; }, [onQuickReply]);
  useEffect(() => { onScrollLockRef.current = onScrollLock; }, [onScrollLock]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) => {
        if (dx < -2 && Math.abs(dx) >= Math.abs(dy)) {
          if (!isLocked.current) {
            isLocked.current = true;
            swipeActivated.current = true;
            onScrollLockRef.current(false);
          }
          return true;
        }
        return false;
      },
      onShouldBlockNativeResponder: () => true,
      onPanResponderMove: (_, { dx }) => {
        if (dx < 0) translateX.setValue(Math.max(dx, -100));
      },
      onPanResponderRelease: (_, { dx }) => {
        isLocked.current = false;
        onScrollLockRef.current(true);
        if (dx < -55) onQuickReplyRef.current(item);
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 220,
        }).start();
        // Clear the flag after Pressable's onPress window has passed
        setTimeout(() => { swipeActivated.current = false; }, 300);
      },
      onPanResponderTerminate: () => {
        isLocked.current = false;
        swipeActivated.current = false;
        onScrollLockRef.current(true);
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  const indicatorOpacity = translateX.interpolate({
    inputRange: [-80, -20, 0],
    outputRange: [1, 0, 0],
    extrapolate: "clamp",
  });
  const indicatorSlide = translateX.interpolate({
    inputRange: [-80, -20, 0],
    outputRange: [0, 10, 16],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.swipeContainer} {...panResponder.panHandlers}>
      {/* Reply label — sits at right edge behind the card, revealed as it slides */}
      <Animated.View
        style={[
          styles.replyIndicator,
          { opacity: indicatorOpacity, transform: [{ translateX: indicatorSlide }] },
        ]}
      >
        <Text style={styles.replyIndicatorArrow}>←</Text>
        <Text style={styles.replyIndicatorLabel}>Reply</Text>
      </Animated.View>

      {/* Card slides left on top of the indicator */}
      {/* Only the PostHeader is tappable — context guards against swipe false-fires */}
      <OpenDetailCtx.Provider value={() => { if (!swipeActivated.current) onPress(); }}>
        <Animated.View style={{ transform: [{ translateX }] }}>
          <PostCard item={item} />
        </Animated.View>
      </OpenDetailCtx.Provider>
    </View>
  );
}

// ─── Quick reply overlay ──────────────────────────────────────────────────────

function QuickReplyOverlay({
  post,
  onClose,
  onOpenDetail,
}: {
  post: Post;
  onClose: () => void;
  onOpenDetail: () => void;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ initials: string; avatarUrl: string | null } | null>(null);
  const [selectedSong, setSelectedSong] = useState<PinnedSong | null>(null);
  const [songPickerVisible, setSongPickerVisible] = useState(false);
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const inputBottomAnim = useRef(new Animated.Value(BOTTOM_INSET + 16)).current;

  useEffect(() => {
    // Fetch current user profile for avatar + Spotify token
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);
      const [tok, profileRes] = await Promise.all([
        getValidSpotifyToken(user.id),
        supabase.from("users").select("username, display_name, avatar_url").eq("id", user.id).single(),
      ]);
      setSpotifyToken(tok);
      const data = profileRes.data;
      if (data) {
        const name: string = data.display_name ?? data.username ?? "?";
        setCurrentUser({
          initials: name.slice(0, 1).toUpperCase(),
          avatarUrl: data.avatar_url ?? null,
        });
      }
    })();

    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 22, stiffness: 220 }),
    ]).start();

    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvt, (e) => {
      const dur = Platform.OS === "ios" ? (e.duration ?? 260) : 260;
      Animated.timing(inputBottomAnim, {
        toValue: e.endCoordinates.height + 8,
        duration: dur,
        useNativeDriver: false,
      }).start();
    });
    const hideSub = Keyboard.addListener(hideEvt, (e) => {
      const dur = Platform.OS === "ios" ? (e.duration ?? 260) : 260;
      Animated.timing(inputBottomAnim, {
        toValue: BOTTOM_INSET + 16,
        duration: dur,
        useNativeDriver: false,
      }).start();
    });

    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const handleClose = () => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 160, useNativeDriver: true }),
    ]).start(onClose);
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if ((!trimmed && !selectedSong) || !currentUserId || sending) return;
    setSending(true);
    const song = selectedSong;
    const { error } = await supabase
      .from("post_comments")
      .insert({
        post_id: post.id,
        user_id: currentUserId,
        text: trimmed,
        ...(song && {
          song_id:        song.id,
          song_name:      song.name,
          song_artist:    song.artist,
          song_album_art: song.albumArt,
        }),
      });
    setSending(false);
    if (!error) {
      setText("");
      setSelectedSong(null);
      handleClose();
    }
  };

  return (
    <Modal transparent animationType="none" statusBarTranslucent onRequestClose={handleClose}>
      {/* Dark backdrop — tap to dismiss */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.qrBackdrop, { opacity: backdropAnim }]}
        pointerEvents="none"
      />
      <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

      {/* Focused post card */}
      <Pressable style={styles.qrCardWrap} onPress={() => {}}>
        <OpenDetailCtx.Provider value={onOpenDetail}>
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <PostCard item={post} />
            {/* Tap card body to open detail; stops above action row */}
            <Pressable
              style={[StyleSheet.absoluteFill, { bottom: 58 }]}
              onPress={onOpenDetail}
            />
          </Animated.View>
        </OpenDetailCtx.Provider>

        {/* X button — top-right corner of card */}
        <TouchableOpacity style={styles.qrCloseBtn} onPress={handleClose} activeOpacity={0.85}>
          <View style={styles.qrCloseBtnCircle}>
            <Text style={styles.qrCloseBtnIcon}>✕</Text>
          </View>
        </TouchableOpacity>
      </Pressable>

      {/* Reply input — floats above keyboard */}
      <Animated.View style={[styles.qrInputRow, { bottom: inputBottomAnim }]} pointerEvents="box-none">
        {/* Attached song card */}
        {selectedSong && (
          <View style={styles.qrSongCard}>
            {selectedSong.albumArt ? (
              <Image source={{ uri: selectedSong.albumArt }} style={styles.qrSongArt} />
            ) : (
              <View style={[styles.qrSongArt, styles.qrSongArtFallback]}>
                <FontAwesome5 name="music" size={9} color="rgba(255,255,255,0.3)" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.qrSongName} numberOfLines={1}>{selectedSong.name}</Text>
              {selectedSong.artist ? <Text style={styles.qrSongArtist} numberOfLines={1}>{selectedSong.artist}</Text> : null}
            </View>
            <FontAwesome5 name="spotify" size={11} color="#1DB954" style={{ marginRight: 4 }} />
            <TouchableOpacity onPress={() => setSelectedSong(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <FontAwesome5 name="times" size={12} color="rgba(255,255,255,0.45)" />
            </TouchableOpacity>
          </View>
        )}

        <Pressable style={styles.qrInputGlass} onPress={() => {}}>
          {/* + button — opens song picker */}
          <TouchableOpacity
            style={styles.qrPlusBtn}
            activeOpacity={0.8}
            onPress={() => setSongPickerVisible(true)}
          >
            <Text style={styles.qrPlusBtnIcon}>+</Text>
          </TouchableOpacity>

          {currentUser?.avatarUrl ? (
            <Image source={{ uri: currentUser.avatarUrl }} style={styles.qrAvatar} />
          ) : (
            <View style={[styles.qrAvatar, { backgroundColor: "#AB00FF22" }]}>
              <Text style={[styles.qrAvatarText, { color: "#AB00FF" }]}>
                {currentUser?.initials ?? "?"}
              </Text>
            </View>
          )}
          <View style={styles.qrInputInner}>
            <Text style={styles.qrReplyingTo}>Replying to {post.handle}</Text>
            <TextInput
              style={styles.qrInput}
              placeholder="Add a comment..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={text}
              onChangeText={setText}
              autoFocus
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />
          </View>
          <TouchableOpacity
            style={[styles.qrSend, ((!text.trim() && !selectedSong) || sending) && { opacity: 0.35 }]}
            disabled={(!text.trim() && !selectedSong) || sending}
            activeOpacity={0.8}
            onPress={handleSend}
          >
            {sending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.qrSendIcon}>↑</Text>
            }
          </TouchableOpacity>
        </Pressable>
      </Animated.View>

      {/* Song picker — absoluteFill overlay inside this Modal */}
      <PinnedSongOverlay
        visible={songPickerVisible}
        onClose={() => setSongPickerVisible(false)}
        onSelect={(song) => { setSelectedSong(song); setSongPickerVisible(false); }}
        accessToken={spotifyToken}
        ctaLabel="Attach to Reply"
        ctaIcon="music"
      />
    </Modal>
  );
}

// ─── Composer action menu (styled like Claude "Add to Chat" sheet) ────────────

function ComposerActionMenu({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [locationOn, setLocationOn] = useState(false);
  const [commentsOn, setCommentsOn] = useState(true);
  const slideAnim = useRef(new Animated.Value(500)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const open = () => {
    slideAnim.setValue(500);
    backdropAnim.setValue(0);
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 220 }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const close = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 500, duration: 200, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  useEffect(() => {
    if (visible) open();
  }, [visible]);

  const LIST_ROWS = [
    { icon: "↑", label: "Add files", right: null },
    { icon: "🎵", label: "Add track", right: "Search" },
    { icon: "🎧", label: "From playlist", right: "My Library" },
    { icon: "🔒", label: "Privacy", right: "Public" },
  ];

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={close}>
      <Animated.View style={[styles.menuBackdrop, { opacity: backdropAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      <Animated.View style={[styles.menuSheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* Handle */}
        <View style={styles.menuHandle} />

        {/* Header row: X | Title | All photos */}
        <View style={styles.menuHeader}>
          <TouchableOpacity style={styles.menuXBtn} onPress={close} activeOpacity={0.8}>
            <Text style={styles.menuXBtnIcon}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.menuHeaderTitle}>Add to post</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.menuHeaderRight}>All photos</Text>
          </TouchableOpacity>
        </View>

        {/* Photo strip: camera box + fake thumbnails */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.menuPhotoStrip}
          style={{ marginBottom: 4 }}
        >
          <TouchableOpacity style={styles.menuCameraBox} activeOpacity={0.8} onPress={close}>
            <Text style={styles.menuCameraIcon}>📷</Text>
            <Text style={styles.menuCameraLabel}>Camera</Text>
          </TouchableOpacity>
          {FAKE_PHOTO_COLORS.map((color, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.menuPhotoThumb, { backgroundColor: color }]}
              activeOpacity={0.8}
              onPress={close}
            />
          ))}
        </ScrollView>

        {/* Divider */}
        <View style={styles.menuSectionDivider} />

        {/* List rows */}
        <View style={styles.menuSection}>
          {LIST_ROWS.map((row, i) => (
            <TouchableOpacity
              key={row.label}
              style={[styles.menuRow, i < LIST_ROWS.length - 1 && styles.menuRowBorder]}
              activeOpacity={0.65}
              onPress={close}
            >
              <View style={styles.menuRowIconBox}>
                <Text style={styles.menuRowIconText}>{row.icon}</Text>
              </View>
              <Text style={styles.menuRowLabel}>{row.label}</Text>
              {row.right && (
                <View style={styles.menuRowRight}>
                  <Text style={styles.menuRowRightText}>{row.right}</Text>
                  <Text style={styles.menuRowChevron}>›</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Divider */}
        <View style={styles.menuSectionDivider} />

        {/* Toggle rows */}
        <View style={styles.menuSection}>
          {[
            { icon: "📍", label: "Location", value: locationOn, set: setLocationOn },
            { icon: "💬", label: "Allow comments", value: commentsOn, set: setCommentsOn },
          ].map((row, i, arr) => (
            <View
              key={row.label}
              style={[styles.menuRow, i < arr.length - 1 && styles.menuRowBorder]}
            >
              <View style={styles.menuRowIconBox}>
                <Text style={styles.menuRowIconText}>{row.icon}</Text>
              </View>
              <Text style={styles.menuRowLabel}>{row.label}</Text>
              <Switch
                value={row.value}
                onValueChange={row.set}
                trackColor={{ false: "rgba(255,255,255,0.15)", true: "#AB00FF" }}
                thumbColor="#ffffff"
                style={styles.menuToggle}
              />
            </View>
          ))}
        </View>

        {/* Divider */}
        <View style={styles.menuSectionDivider} />

        {/* Settings row */}
        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuRow} activeOpacity={0.65} onPress={close}>
            <View style={styles.menuRowIconBox}>
              <Text style={styles.menuRowIconText}>⚙️</Text>
            </View>
            <Text style={styles.menuRowLabel}>Post settings</Text>
            <Text style={[styles.menuRowChevron, { marginLeft: "auto" }]}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: BOTTOM_INSET + 8 }} />
      </Animated.View>
    </Modal>
  );
}

// ─── Trending carousel ────────────────────────────────────────────────────────

function TrendingCarousel({
  joinedMeets,
  followedArtists,
  onJoinMeet,
  onFollowArtist,
}: {
  joinedMeets: Set<string>;
  followedArtists: Set<string>;
  onJoinMeet: (id: string) => void;
  onFollowArtist: (id: string) => void;
}) {
  const flatRef = useRef<FlatList<CarouselItem>>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const activeIdxRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceRef = useRef<() => void>(() => {});

  advanceRef.current = () => {
    const next = (activeIdxRef.current + 1) % CAROUSEL_ITEMS.length;
    activeIdxRef.current = next;
    setActiveIdx(next);
    flatRef.current?.scrollToIndex({ index: next, animated: true });
    timerRef.current = setTimeout(() => advanceRef.current(), 3500);
  };

  useEffect(() => {
    timerRef.current = setTimeout(() => advanceRef.current(), 3500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const resetTimer = (idx: number) => {
    activeIdxRef.current = idx;
    setActiveIdx(idx);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => advanceRef.current(), 3500);
  };

  const onScrollEnd = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.max(0, Math.min(Math.round(x / (CAROUSEL_CARD_W + CAROUSEL_GAP)), CAROUSEL_ITEMS.length - 1));
    resetTimer(idx);
  };

  return (
    <View style={{ marginBottom: 28 }}>
      <FlatList
        ref={flatRef}
        data={CAROUSEL_ITEMS}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CAROUSEL_CARD_W + CAROUSEL_GAP}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 16, gap: CAROUSEL_GAP }}
        onMomentumScrollEnd={onScrollEnd}
        scrollEventThrottle={16}
        renderItem={({ item }) => {
          const isEvent = item.type === "event";
          const isArtist = item.type === "artist";
          const isJoined = isEvent && joinedMeets.has(item.ctaId);
          const isFollowing = isArtist && followedArtists.has(item.ctaId);
          const ctaActive = isJoined || isFollowing;
          return (
            <View style={[ds.carouselCard, { width: CAROUSEL_CARD_W }]}>
              <LinearGradient colors={item.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={ds.featuredGradient}>
                <View style={[ds.decoCircle, { width: 200, height: 200, top: -60, right: -60, backgroundColor: item.deco1 }]} />
                <View style={[ds.decoCircle, { width: 130, height: 130, bottom: -40, left: -30, backgroundColor: item.deco2 }]} />
                <View style={ds.featuredBadge}>
                  <Text style={ds.featuredBadgeText}>{item.badge}</Text>
                </View>
                <View style={{ flex: 1 }} />
                <View style={ds.featuredBottom}>
                  <Text style={ds.featuredTitle}>{item.title}</Text>
                  <Text style={ds.featuredSub}>{item.sub}</Text>
                  <View style={ds.featuredRow}>
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      {item.tags.map((t) => (
                        <View key={t} style={ds.featuredTag}><Text style={ds.featuredTagText}>{t}</Text></View>
                      ))}
                    </View>
                    <TouchableOpacity
                      style={[ds.featuredCta, ctaActive && ds.featuredCtaActive]}
                      activeOpacity={0.85}
                      onPress={() => {
                        if (isEvent) onJoinMeet(item.ctaId);
                        else if (isArtist) onFollowArtist(item.ctaId);
                      }}
                    >
                      <Text style={[ds.featuredCtaText, ctaActive && ds.featuredCtaTextActive]}>
                        {isJoined ? "✓ Going" : isFollowing ? "✓ Following" : item.cta}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </LinearGradient>
            </View>
          );
        }}
      />
      <View style={ds.dotRow}>
        {CAROUSEL_ITEMS.map((_, i) => (
          <TouchableOpacity
            key={i}
            activeOpacity={0.8}
            onPress={() => {
              flatRef.current?.scrollToIndex({ index: i, animated: true });
              resetTimer(i);
            }}
          >
            <View style={[ds.dot, i === activeIdx && ds.dotActive]} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── Discover view ────────────────────────────────────────────────────────────

type DiscoverUser = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  followers_count: number;
  following_count: number | null;
  is_verified: boolean | null;
  bio: string | null;
  banner_color: string | null;
  banner_image_url: string | null;
  banner_shape: string | null;
  banner_shape_color: string | null;
  pinned_song_name: string | null;
  pinned_song_artist: string | null;
  pinned_song_album_art: string | null;
  top_genres: string[] | null;
  account_type: string | null;
};

type ArtistResult = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  is_verified: boolean;
  avatar_url: string | null;
  banner_image_url: string | null;
  banner_color: string | null;
  genres: string[];
  monthly_listeners: number | null;
  label: string | null;
};

function DiscoverView() {
  const router = useRouter();
  const [activeFilter, setActiveFilter]       = useState("All");
  const [searchText, setSearchText]           = useState("");
  const [joinedMeets, setJoinedMeets]         = useState<Set<string>>(new Set());
  const [followedArtists, setFollowedArtists] = useState<Set<string>>(new Set());
  const [likedRecs, setLikedRecs]             = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing]           = useState(false);

  // ── People + Artist search ─────────────────────────────────────────────────
  const [userResults,    setUserResults]    = useState<DiscoverUser[]>([]);
  const [userFollowing,  setUserFollowing]  = useState<Set<string>>(new Set());
  const [userLoading,    setUserLoading]    = useState(false);
  const [artistResults,  setArtistResults]  = useState<ArtistResult[]>([]);
  const [artistLoading,  setArtistLoading]  = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    const q = searchText.trim();
    if (q.length < 2) {
      setUserResults([]); setUserLoading(false);
      setArtistResults([]); setArtistLoading(false);
      return;
    }
    setUserLoading(true);
    setArtistLoading(true);
    searchDebounce.current = setTimeout(async () => {
      const { data: { user: me } } = await supabase.auth.getUser();

      // Run both queries in parallel
      const [usersRes, artistsRes] = await Promise.all([
        supabase
          .from('users')
          .select('id, username, display_name, avatar_url, followers_count, following_count, is_verified, bio, banner_color, banner_image_url, banner_shape, banner_shape_color, pinned_song_name, pinned_song_artist, pinned_song_album_art, top_genres, account_type')
          .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
          .neq('id', me?.id ?? '')
          .order('followers_count', { ascending: false })
          .limit(20),
        supabase
          .from('artists')
          .select('id, name, slug, bio, is_verified, avatar_url, banner_image_url, banner_color, genres, monthly_listeners, label')
          .ilike('name', `%${q}%`)
          .order('monthly_listeners', { ascending: false })
          .limit(10),
      ]);

      const results = (usersRes.data ?? []) as DiscoverUser[];
      setUserResults(results);
      setArtistResults((artistsRes.data ?? []) as ArtistResult[]);

      // Batch-check which user results are already followed
      if (results.length > 0 && me) {
        const ids = results.map(u => u.id);
        const { data: fData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', me.id)
          .in('following_id', ids);
        setUserFollowing(new Set((fData ?? []).map((f: { following_id: string }) => f.following_id)));
      }

      setUserLoading(false);
      setArtistLoading(false);
    }, 350);
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current); };
  }, [searchText]);

  const onRefresh = async () => {
    setRefreshing(true);
    // Reset local interaction state on pull-to-refresh
    setJoinedMeets(new Set());
    setFollowedArtists(new Set());
    setLikedRecs(new Set());
    setRefreshing(false);
  };

  const toggleSet = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) =>
    setter((p) => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const showCarousel = activeFilter === "All" || activeFilter === "Events";
  const showArtists  = activeFilter === "All" || activeFilter === "Artists";
  const showForYou   = activeFilter === "All" || activeFilter === "Artists";
  const showMeets    = activeFilter === "All" || activeFilter === "Events";
  const showStories  = activeFilter === "Stories";

  const q = searchText.toLowerCase();
  const filteredArtists = TRENDING_ARTISTS.filter((a) => !q || a.name.toLowerCase().includes(q) || a.genre.toLowerCase().includes(q));
  const filteredMeets   = UPCOMING_MEETS.filter((m)   => !q || m.title.toLowerCase().includes(q) || m.tags.some((t) => t.toLowerCase().includes(q)));
  const filteredRecs    = FOR_YOU_RECS.filter((r)     => !q || r.title.toLowerCase().includes(q) || r.artist.toLowerCase().includes(q));
  const showPeople      = q.length >= 2;
  const noResults       = q && !userLoading && userResults.length === 0 && filteredArtists.length === 0 && filteredMeets.length === 0 && filteredRecs.length === 0;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={ds.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#AB00FF" />}
    >
      {/* Header */}
      <View style={ds.header}>
        <Text style={ds.headerTitle}>Discover</Text>
        <TouchableOpacity style={ds.iconBtn} activeOpacity={0.7}>
          <Ionicons name="options-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={ds.searchWrap}>
        <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.35)" style={{ marginRight: 8 }} />
        <TextInput
          style={ds.searchInput}
          placeholder="Search artists, events, music…"
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText("")} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.35)" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ds.filtersRow} style={{ marginBottom: 24 }}>
        {DISCOVER_FILTERS.map((f) => {
          const active = f === activeFilter;
          return (
            <TouchableOpacity key={f} style={[ds.filterPill, active && ds.filterPillActive]} activeOpacity={0.7} onPress={() => setActiveFilter(f)}>
              <Text style={[ds.filterPillText, active && ds.filterPillTextActive]}>{f}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Artist search results ─────────────────────────────── */}
      {showPeople && (
        <View style={{ marginBottom: 24, marginHorizontal: 16 }}>
          <View style={ds.sectionHeader}>
            <Text style={ds.sectionTitle}>Artists</Text>
          </View>
          {artistLoading ? (
            <ActivityIndicator color="#AB00FF" style={{ marginTop: 18 }} />
          ) : artistResults.length === 0 ? (
            <Text style={{ color: "rgba(255,255,255,0.28)", fontSize: 14, marginTop: 10, paddingHorizontal: 4 }}>
              No artists found for "{searchText.trim()}"
            </Text>
          ) : (
            artistResults.map(a => {
              const fmtListeners = (n: number | null) => {
                if (!n) return null;
                if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M listeners`;
                if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K listeners`;
                return `${n} listeners`;
              };
              return (
                <TouchableOpacity
                  key={a.id}
                  style={pplStyles.artistCard}
                  activeOpacity={0.88}
                  onPress={() => router.push({ pathname: '/artist-profile', params: { artistId: a.id } })}
                >
                  {/* Banner / avatar strip */}
                  <View style={pplStyles.artistBanner}>
                    {a.banner_image_url ? (
                      <Image source={{ uri: a.banner_image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    ) : a.banner_color ? (
                      <View style={[StyleSheet.absoluteFill, { backgroundColor: a.banner_color }]} />
                    ) : (
                      <LinearGradient
                        colors={["#3D0C00", "#CC4200", "#FF6C1A", "#CC4200", "#3D0C00"]}
                        locations={[0, 0.25, 0.5, 0.75, 1]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={StyleSheet.absoluteFill}
                      />
                    )}
                    <LinearGradient
                      colors={["transparent", "rgba(22,22,24,0.6)"]}
                      style={StyleSheet.absoluteFill}
                      pointerEvents="none"
                    />
                  </View>

                  {/* Avatar */}
                  <View style={pplStyles.artistAvatarRow}>
                    {a.avatar_url ? (
                      <Image source={{ uri: a.avatar_url }} style={pplStyles.artistAvatar} />
                    ) : (
                      <View style={[pplStyles.artistAvatar, pplStyles.artistAvatarFallback]}>
                        <FontAwesome5 name="microphone" size={18} color="rgba(255,255,255,0.3)" />
                      </View>
                    )}
                  </View>

                  {/* Info */}
                  <View style={pplStyles.artistInfo}>
                    <View style={pplStyles.nameRow}>
                      <Text style={pplStyles.name} numberOfLines={1}>{a.name}</Text>
                      {a.is_verified && (
                        <View style={pplStyles.verifiedBadge}>
                          <Text style={pplStyles.verifiedText}>✓</Text>
                        </View>
                      )}
                      <View style={pplStyles.artistBadge}>
                        <Text style={pplStyles.artistBadgeText}>Artist</Text>
                      </View>
                    </View>
                    {!!fmtListeners(a.monthly_listeners) && (
                      <Text style={pplStyles.username} numberOfLines={1}>{fmtListeners(a.monthly_listeners)}</Text>
                    )}
                    {!!a.bio && <Text style={pplStyles.bio} numberOfLines={2}>{a.bio}</Text>}
                    {a.genres.length > 0 && (
                      <View style={pplStyles.genreRow}>
                        {a.genres.slice(0, 3).map(g => (
                          <View key={g} style={pplStyles.genreChip}>
                            <Text style={pplStyles.genreText} numberOfLines={1}>{g}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      )}

      {/* ── People search results ─────────────────────────────── */}
      {showPeople && (
        <View style={{ marginBottom: 28, marginHorizontal: 16 }}>
          <View style={ds.sectionHeader}>
            <Text style={ds.sectionTitle}>People</Text>
          </View>
          {userLoading ? (
            <ActivityIndicator color="#AB00FF" style={{ marginTop: 18 }} />
          ) : userResults.length === 0 ? (
            <Text style={{ color: "rgba(255,255,255,0.28)", fontSize: 14, marginTop: 10, paddingHorizontal: 4 }}>
              No users found for "{searchText.trim()}"
            </Text>
          ) : (
            userResults.map(u => {
              const name = u.display_name || u.username;
              const initials = name.trim().split(/\s+/).map((p: string) => p[0]?.toUpperCase() ?? '').slice(0, 2).join('');
              const following = userFollowing.has(u.id);
              return (
                <TouchableOpacity
                  key={u.id}
                  style={pplStyles.card}
                  activeOpacity={0.92}
                  onPress={() => router.push({
                    pathname: '/user-profile',
                    params: { userId: u.id },
                  })}
                >
                  {/* Banner */}
                  <View style={pplStyles.bannerWrap}>
                    {u.banner_image_url ? (
                      <Image source={{ uri: u.banner_image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    ) : u.banner_color ? (
                      <View style={[StyleSheet.absoluteFill, { backgroundColor: u.banner_color }]} />
                    ) : (
                      <LinearGradient
                        colors={["#3D0C00", "#CC4200", "#FF6C1A", "#CC4200", "#3D0C00"]}
                        locations={[0, 0.25, 0.5, 0.75, 1]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={StyleSheet.absoluteFill}
                      />
                    )}
                    {u.banner_shape && !u.banner_image_url && (
                      <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
                        <BannerShape shape={u.banner_shape} color={u.banner_shape_color ?? "#ffffff"} size={36} />
                      </View>
                    )}
                    <View style={pplStyles.bannerFollowWrap}>
                      <TouchableOpacity
                        style={[pplStyles.followBtn, following && pplStyles.followingBtn]}
                        activeOpacity={0.8}
                        onPress={async () => {
                          if (following) {
                            setUserFollowing(prev => { const s = new Set(prev); s.delete(u.id); return s; });
                            await unfollowUser(u.id);
                          } else {
                            setUserFollowing(prev => new Set([...prev, u.id]));
                            await followUser(u.id);
                          }
                        }}
                      >
                        <Text style={[pplStyles.followBtnText, following && pplStyles.followingBtnText]}>
                          {following ? "Following" : "Follow"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Avatar */}
                  <View style={pplStyles.avatarRow}>
                    {u.avatar_url ? (
                      <Image source={{ uri: u.avatar_url }} style={pplStyles.avatarImg} />
                    ) : (
                      <View style={pplStyles.avatarFallback}>
                        <Text style={pplStyles.avatarInitials}>{initials}</Text>
                      </View>
                    )}
                  </View>

                  {/* Info */}
                  <View style={pplStyles.info}>
                    <View style={pplStyles.nameRow}>
                      <Text style={pplStyles.name} numberOfLines={1}>{name}</Text>
                      {!!u.is_verified && (
                        <View style={pplStyles.verifiedBadge}>
                          <Text style={pplStyles.verifiedText}>✓</Text>
                        </View>
                      )}
                    </View>
                    <Text style={pplStyles.username} numberOfLines={1}>@{u.username}</Text>
                    {!!u.bio && <Text style={pplStyles.bio} numberOfLines={2}>{u.bio}</Text>}
                    <View style={pplStyles.statsRow}>
                      <Text style={pplStyles.statNum}>{(u.following_count ?? 0).toLocaleString()}</Text>
                      <Text style={pplStyles.statLabel}> Following  </Text>
                      <Text style={pplStyles.statNum}>{(u.followers_count ?? 0).toLocaleString()}</Text>
                      <Text style={pplStyles.statLabel}> Followers</Text>
                    </View>
                    {!!u.pinned_song_name && (
                      <View style={pplStyles.pinnedRow}>
                        {u.pinned_song_album_art ? (
                          <Image source={{ uri: u.pinned_song_album_art }} style={pplStyles.pinnedArt} />
                        ) : (
                          <View style={pplStyles.pinnedArtFallback}>
                            <FontAwesome5 name="music" size={9} color="rgba(255,255,255,0.3)" />
                          </View>
                        )}
                        <Text style={pplStyles.pinnedText} numberOfLines={1}>
                          {u.pinned_song_name}{u.pinned_song_artist ? ` — ${u.pinned_song_artist}` : ""}
                        </Text>
                      </View>
                    )}
                    {(u.top_genres?.length ?? 0) > 0 && (
                      <View style={pplStyles.genreRow}>
                        {u.top_genres!.slice(0, 3).map(g => (
                          <View key={g} style={pplStyles.genreChip}>
                            <Text style={pplStyles.genreText} numberOfLines={1}>{g}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      )}

      {/* Carousel */}
      {showCarousel && !q && (
        <TrendingCarousel
          joinedMeets={joinedMeets}
          followedArtists={followedArtists}
          onJoinMeet={(id) => toggleSet(setJoinedMeets, id)}
          onFollowArtist={(id) => toggleSet(setFollowedArtists, id)}
        />
      )}

      {/* Stories */}
      {showStories && (
        <>
          <View style={[ds.sectionHeader, { marginTop: 4 }]}>
            <Text style={ds.sectionTitle}>Stories</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ds.storiesRow} style={{ marginBottom: 32 }}>
            {STORIES.map((s) => {
              const photo = AVATAR_MAP[s.name];
              return (
                <TouchableOpacity key={s.id} style={ds.storyItem2} activeOpacity={0.8}>
                  <View style={[ds.storyRing2, { borderColor: s.color }]}>
                    {photo ? (
                      <Image source={photo} style={ds.storyAvatar2} />
                    ) : (
                      <View style={[ds.storyAvatar2, { backgroundColor: s.color + "25", alignItems: "center", justifyContent: "center" }]}>
                        <Text style={{ fontSize: 20, fontWeight: "800", color: s.color }}>{s.initials}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={ds.storyName2} numberOfLines={1}>{s.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </>
      )}

      {/* Trending Artists */}
      {showArtists && filteredArtists.length > 0 && (
        <>
          <View style={ds.sectionHeader}>
            <Text style={ds.sectionTitle}>Trending Artists</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ds.artistsRow} style={{ marginBottom: 32 }}>
            {filteredArtists.map((a) => {
              const photo = AVATAR_MAP[a.user];
              const following = followedArtists.has(a.id);
              return (
                <View key={a.id} style={ds.artistCard}>
                  <View style={[ds.artistAvatarRing, { borderColor: a.color }]}>
                    {photo ? (
                      <Image source={photo} style={ds.artistAvatar} />
                    ) : (
                      <View style={[ds.artistAvatar, { backgroundColor: a.color + "25", alignItems: "center", justifyContent: "center" }]}>
                        <Text style={[ds.artistInitials, { color: a.color }]}>{a.initials}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={ds.artistName} numberOfLines={1}>{a.name}</Text>
                  <Text style={ds.artistGenre}>{a.genre}</Text>
                  <TouchableOpacity
                    style={[ds.followBtn, following && { backgroundColor: a.color, borderColor: a.color }]}
                    activeOpacity={0.8}
                    onPress={() => toggleSet(setFollowedArtists, a.id)}
                  >
                    <Text style={[ds.followBtnText, following && ds.followBtnTextActive]}>
                      {following ? "Following" : "Follow"}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        </>
      )}

      {/* For You */}
      {showForYou && filteredRecs.length > 0 && (
        <>
          <View style={ds.sectionHeader}>
            <Text style={ds.sectionTitle}>For You</Text>
            <Text style={ds.sectionSub}>Based on who you follow</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ds.recsRow} style={{ marginBottom: 32 }}>
            {filteredRecs.map((rec) => {
              const photo = AVATAR_MAP[rec.user];
              const liked = likedRecs.has(rec.id);
              const accentColor = rec.color === "#CAFF00" ? "#A8D400" : rec.color;
              const likeBtn = (
                <TouchableOpacity onPress={() => toggleSet(setLikedRecs, rec.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name={liked ? "heart" : "heart-outline"} size={15} color={liked ? "#FF3CAC" : "rgba(255,255,255,0.3)"} />
                </TouchableOpacity>
              );

              if (rec.type === "song") {
                return (
                  <TouchableOpacity key={rec.id} style={[ds.recCard, { borderColor: rec.color + "30" }]} activeOpacity={0.85}>
                    {/* Album art — vinyl aesthetic */}
                    <View style={ds.songThumb}>
                      <LinearGradient
                        colors={[rec.color + "18", rec.color + "55"]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      {/* Vinyl rings */}
                      <View style={[ds.vinylRing, { width: 118, height: 118, borderColor: rec.color + "18" }]} />
                      <View style={[ds.vinylRing, { width: 80,  height: 80,  borderColor: rec.color + "28" }]} />
                      <View style={[ds.vinylRing, { width: 48,  height: 48,  borderColor: rec.color + "40" }]} />
                      {/* Center disc */}
                      <View style={[ds.vinylCenter, { backgroundColor: rec.color + "22", borderColor: rec.color + "50" }]}>
                        {photo
                          ? <Image source={photo} style={ds.vinylPhoto} />
                          : <Ionicons name="musical-note" size={16} color={rec.color} />
                        }
                      </View>
                      {/* Duration */}
                      <View style={ds.songDurationBadge}>
                        <Ionicons name="musical-note" size={8} color="rgba(255,255,255,0.5)" />
                        <Text style={ds.songDurationText}>{rec.duration}</Text>
                      </View>
                    </View>
                    <View style={ds.recInfo}>
                      <Text style={ds.recTitle} numberOfLines={1}>{rec.title}</Text>
                      <Text style={ds.recArtist} numberOfLines={1}>{rec.artist}</Text>
                      <View style={ds.recBottom}>
                        <Text style={[ds.recGenre, { color: accentColor }]}>{rec.genre}</Text>
                        {likeBtn}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }

              // Video card
              return (
                <TouchableOpacity key={rec.id} style={ds.recCard} activeOpacity={0.85}>
                  <View style={[ds.recThumb, { backgroundColor: rec.color + "30" }]}>
                    {photo && <Image source={photo} style={ds.recThumbImg} />}
                    <LinearGradient colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.75)"]} style={StyleSheet.absoluteFill} />
                    {/* Play button */}
                    <View style={ds.recPlayBtn}>
                      <Ionicons name="play" size={16} color="#fff" />
                    </View>
                    {/* VIDEO badge */}
                    <View style={[ds.videoBadge, { backgroundColor: rec.color }]}>
                      <Text style={[ds.videoBadgeText, { color: rec.color === "#CAFF00" ? "#0D0D0D" : "#fff" }]}>VIDEO</Text>
                    </View>
                    {/* Duration */}
                    <View style={ds.recDurationBadge}>
                      <Text style={ds.recDurationText}>{rec.duration}</Text>
                    </View>
                  </View>
                  <View style={ds.recInfo}>
                    <Text style={ds.recTitle} numberOfLines={1}>{rec.title}</Text>
                    <Text style={ds.recArtist} numberOfLines={1}>{rec.artist}</Text>
                    <View style={ds.recBottom}>
                      <Text style={[ds.recGenre, { color: accentColor }]}>{rec.genre}</Text>
                      {likeBtn}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </>
      )}

      {/* Upcoming Meets */}
      {showMeets && filteredMeets.length > 0 && (
        <>
          <View style={ds.sectionHeader}>
            <Text style={ds.sectionTitle}>Upcoming Meets</Text>
          </View>
          <View style={ds.meetsCol}>
            {filteredMeets.map((meet) => {
              const joined = joinedMeets.has(meet.id);
              return (
                <View key={meet.id} style={ds.meetCard}>
                  <View style={[ds.meetStrip, { backgroundColor: meet.color }]} />
                  <View style={ds.meetBody}>
                    <View style={ds.meetTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={ds.meetTitle}>{meet.title}</Text>
                        <Text style={ds.meetSubtitle}>{meet.subtitle}</Text>
                      </View>
                      <View style={[ds.meetDateBadge, { backgroundColor: meet.color + "22", borderColor: meet.color + "44" }]}>
                        <Text style={[ds.meetDateText, { color: meet.color }]}>{meet.date}</Text>
                      </View>
                    </View>
                    <View style={ds.meetMeta}>
                      <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.4)" />
                      <Text style={ds.meetLocation}>{meet.location}</Text>
                    </View>
                    <View style={ds.meetBottomRow}>
                      <View style={{ flexDirection: "row", gap: 6 }}>
                        {meet.tags.map((t) => (
                          <View key={t} style={ds.meetTag}><Text style={ds.meetTagText}>{t}</Text></View>
                        ))}
                      </View>
                      <TouchableOpacity
                        style={[ds.rsvpBtn, { borderColor: meet.color }, joined && { backgroundColor: meet.color }]}
                        activeOpacity={0.8}
                        onPress={() => toggleSet(setJoinedMeets, meet.id)}
                      >
                        <Ionicons name={joined ? "checkmark" : "add"} size={12} color={joined ? "#0D0D0D" : meet.color} />
                        <Text style={[ds.rsvpText, { color: joined ? "#0D0D0D" : meet.color }]}>
                          {joined ? "Going" : "RSVP"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* Empty state */}
      {noResults && (
        <View style={ds.emptyState}>
          <Ionicons name="search-outline" size={40} color="rgba(255,255,255,0.15)" />
          <Text style={ds.emptyText}>No results for "{searchText}"</Text>
        </View>
      )}
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const ds = StyleSheet.create({
  scrollContent: { paddingBottom: NAVBAR_H + BOTTOM_INSET + 40 },

  header: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  headerTitle: { fontSize: 48, fontWeight: "900", color: "#ffffff", letterSpacing: -1, lineHeight: 44 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center", marginBottom: 4 },

  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginHorizontal: 16, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 16 },
  searchInput: { flex: 1, fontSize: 14, color: "#fff" },

  filtersRow: { paddingHorizontal: 16, gap: 8 },
  filterPill: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  filterPillActive: { backgroundColor: "#AB00FF", borderColor: "#AB00FF" },
  filterPillText: { fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: "600" },
  filterPillTextActive: { color: "#fff" },

  carouselCard: { borderRadius: 24, overflow: "hidden", height: 220 },
  featuredGradient: { flex: 1, padding: 20 },
  decoCircle: { position: "absolute", borderRadius: 999 },
  featuredBadge: { alignSelf: "flex-start", backgroundColor: "rgba(0,0,0,0.35)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  featuredBadgeText: { fontSize: 12, color: "#CAFF00", fontWeight: "700" },
  featuredBottom: { gap: 6 },
  featuredTitle: { fontSize: 26, fontWeight: "900", color: "#fff", letterSpacing: -0.5 },
  featuredSub: { fontSize: 13, color: "rgba(255,255,255,0.65)" },
  featuredRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  featuredTag: { backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  featuredTagText: { fontSize: 11, color: "#fff", fontWeight: "600" },
  featuredCta: { backgroundColor: "#CAFF00", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  featuredCtaActive: { backgroundColor: "rgba(255,255,255,0.2)", borderWidth: 1, borderColor: "rgba(255,255,255,0.4)" },
  featuredCtaText: { fontSize: 13, color: "#0D0D0D", fontWeight: "800" },
  featuredCtaTextActive: { color: "#fff" },

  dotRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.2)" },
  dotActive: { width: 18, backgroundColor: "#AB00FF" },

  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 14 },
  sectionTitle: { fontSize: 20, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },
  sectionSub: { fontSize: 12, color: "rgba(255,255,255,0.35)", fontWeight: "500" },
  seeAll: { fontSize: 13, color: "#AB00FF", fontWeight: "600" },

  storiesRow: { paddingHorizontal: 16, gap: 20 },
  storyItem2: { alignItems: "center", width: 72 },
  storyRing2: { width: 68, height: 68, borderRadius: 34, borderWidth: 3, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  storyAvatar2: { width: 60, height: 60, borderRadius: 30 },
  storyName2: { fontSize: 11, color: "rgba(255,255,255,0.5)", textAlign: "center" },

  artistsRow: { paddingHorizontal: 16, gap: 16 },
  artistCard: { alignItems: "center", width: 84 },
  artistAvatarRing: { width: 74, height: 74, borderRadius: 37, borderWidth: 3, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  artistAvatar: { width: 66, height: 66, borderRadius: 33 },
  artistInitials: { fontSize: 22, fontWeight: "800" },
  artistName: { fontSize: 12, color: "#fff", fontWeight: "700", textAlign: "center", marginBottom: 2 },
  artistGenre: { fontSize: 10, color: "rgba(255,255,255,0.4)", textAlign: "center", marginBottom: 8 },
  followBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  followBtnText: { fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: "700" },
  followBtnTextActive: { color: "#0D0D0D" },

  recsRow: { paddingHorizontal: 16, gap: 12 },
  recCard: { width: 158, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },

  // Song card — vinyl aesthetic
  songThumb: { width: 158, height: 108, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  vinylRing: { position: "absolute", borderRadius: 999, borderWidth: 1 },
  vinylCenter: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  vinylPhoto: { width: 42, height: 42, borderRadius: 21, resizeMode: "cover" },
  songDurationBadge: { position: "absolute", bottom: 8, right: 8, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  songDurationText: { fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: "600" },

  // Video card — thumbnail + play
  recThumb: { width: 158, height: 108, position: "relative" },
  recThumbImg: { width: "100%", height: "100%", resizeMode: "cover" },
  recPlayBtn: { position: "absolute", top: "50%", left: "50%", marginTop: -20, marginLeft: -20, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.35)" },
  videoBadge: { position: "absolute", top: 8, right: 8, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3 },
  videoBadgeText: { fontSize: 8, fontWeight: "900", letterSpacing: 0.5 },
  recDurationBadge: { position: "absolute", bottom: 8, left: 8, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  recDurationText: { fontSize: 10, color: "#fff", fontWeight: "600" },

  recInfo: { padding: 10, gap: 2 },
  recTitle: { fontSize: 13, color: "#fff", fontWeight: "700" },
  recArtist: { fontSize: 11, color: "rgba(255,255,255,0.45)" },
  recBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  recGenre: { fontSize: 10, fontWeight: "700" },

  meetsCol: { paddingHorizontal: 16, gap: 12 },
  meetCard: { backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 20, flexDirection: "row", overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  meetStrip: { width: 4 },
  meetBody: { flex: 1, padding: 14, gap: 8 },
  meetTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  meetTitle: { fontSize: 15, fontWeight: "800", color: "#fff", marginBottom: 2 },
  meetSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 16 },
  meetDateBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, alignItems: "center", minWidth: 58 },
  meetDateText: { fontSize: 10, fontWeight: "800", textAlign: "center", lineHeight: 14 },
  meetMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  meetLocation: { fontSize: 12, color: "rgba(255,255,255,0.4)" },
  meetBottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  meetTag: { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
  meetTagText: { fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: "600" },
  rsvpBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  rsvpText: { fontSize: 11, fontWeight: "800" },

  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: "rgba(255,255,255,0.3)", fontWeight: "500" },
});

// ─── Meets page ───────────────────────────────────────────────────────────────

const STREAM_CARD_GAP = 8;
const STREAM_CARD_W   = (SW - 32 - STREAM_CARD_GAP) / 2;
const WAVE_HEIGHTS    = [12, 22, 32, 18, 28, 10, 24, 16];

// ─── Live meet card (real data) ───────────────────────────────────────────────
function LiveMeetCard({ meet, onJoin }: { meet: LiveMeet; onJoin: (id: string) => void }) {
  const hostName = meet.host.display_name || meet.host.username;
  return (
    <View style={lmStyles.card}>
      {meet.current_track_album_art ? (
        <Image source={{ uri: meet.current_track_album_art }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <LinearGradient colors={["#AB00FF66", "#1c0030EE"]} style={StyleSheet.absoluteFill} />
      )}
      <LinearGradient colors={["rgba(0,0,0,0.15)", "rgba(0,0,0,0.82)"]} style={StyleSheet.absoluteFill} />

      <View style={lmStyles.cardTop}>
        <View style={lmStyles.liveBadge}>
          <View style={lmStyles.liveDot} />
          <Text style={lmStyles.liveBadgeText}>Live</Text>
        </View>
        <View style={lmStyles.viewerBadge}>
          <Ionicons name="headset-outline" size={10} color="rgba(255,255,255,0.85)" />
          <Text style={lmStyles.viewerText}>{fmtCount(meet.listenerCount)}</Text>
        </View>
      </View>

      <View style={lmStyles.cardBottom}>
        <Text style={lmStyles.cardTitle} numberOfLines={2}>{meet.name}</Text>
        {meet.current_track_name ? (
          <Text style={lmStyles.cardTrack} numberOfLines={1}>♪ {meet.current_track_name}</Text>
        ) : null}
        <Text style={lmStyles.cardHost} numberOfLines={1}>@{hostName}</Text>
        <TouchableOpacity style={lmStyles.joinBtn} activeOpacity={0.85} onPress={() => onJoin(meet.id)}>
          <Text style={lmStyles.joinBtnText}>Join</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const lmStyles = StyleSheet.create({
  card: { borderRadius: 16, overflow: "hidden", backgroundColor: "#111", marginBottom: STREAM_CARD_GAP, minHeight: 196, justifyContent: "space-between" },
  cardTop: { flexDirection: "row", justifyContent: "space-between", padding: 8 },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#E8000F", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#fff" },
  liveBadgeText: { fontSize: 10, color: "#fff", fontWeight: "800" },
  viewerBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  viewerText: { fontSize: 10, color: "#fff", fontWeight: "700" },
  cardBottom: { padding: 10, gap: 3 },
  cardTitle: { fontSize: 14, color: "#fff", fontWeight: "800", lineHeight: 18 },
  cardTrack: { fontSize: 11, color: "rgba(255,255,255,0.7)" },
  cardHost: { fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 6 },
  joinBtn: { backgroundColor: "#AB00FF", borderRadius: 18, paddingVertical: 8, alignItems: "center" },
  joinBtnText: { fontSize: 13, fontWeight: "800", color: "#fff" },
});

function MeetsView() {
  const [searchText, setSearchText] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [meets,      setMeets]      = useState<LiveMeet[]>([]);
  const [loading,    setLoading]    = useState(true);
  const openMeet = useOpenMeet();

  const load = async () => {
    const live = await getLiveMeetsFromFollowing();
    setMeets(live);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    setSearchText("");
    await load();
    setRefreshing(false);
  };

  const q = searchText.toLowerCase();
  const filtered = meets.filter((m) =>
    !q ||
    m.name.toLowerCase().includes(q) ||
    m.host.username.toLowerCase().includes(q) ||
    (m.host.display_name ?? "").toLowerCase().includes(q) ||
    m.tags.some((t) => t.toLowerCase().includes(q))
  );

  const leftCol  = filtered.filter((_, i) => i % 2 === 0);
  const rightCol = filtered.filter((_, i) => i % 2 === 1);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={ms.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#AB00FF" />}
    >
      {/* Header */}
      <View style={ms.header}>
        <Text style={ms.headerTitle}>Meets</Text>
      </View>

      {/* Search — reuse ds styles */}
      <View style={ds.searchWrap}>
        <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.35)" style={{ marginRight: 8 }} />
        <TextInput
          style={ds.searchInput}
          placeholder="Search live meets, hosts…"
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText("")} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.35)" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color="#AB00FF" style={{ marginTop: 48 }} />
      ) : filtered.length > 0 ? (
        <View style={ms.grid}>
          <View style={ms.col}>
            {leftCol.map((m) => <LiveMeetCard key={m.id} meet={m} onJoin={(id) => openMeet?.(id)} />)}
          </View>
          <View style={ms.col}>
            {rightCol.map((m) => <LiveMeetCard key={m.id} meet={m} onJoin={(id) => openMeet?.(id)} />)}
          </View>
        </View>
      ) : (
        <View style={ds.emptyState}>
          <Ionicons name="radio-outline" size={40} color="rgba(255,255,255,0.15)" />
          <Text style={ds.emptyText}>No live meets right now</Text>
          <Text style={[ds.emptyText, { fontSize: 12, marginTop: 4, opacity: 0.6 }]}>
            Meets from people you follow show up here
          </Text>
        </View>
      )}
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const ms = StyleSheet.create({
  scrollContent: { paddingBottom: NAVBAR_H + BOTTOM_INSET + 40 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  headerTitle: { fontSize: 48, fontWeight: "900", color: "#fff", letterSpacing: -1, lineHeight: 44 },

  tabRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 20 },
  tabPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  tabPillActive: { backgroundColor: "#AB00FF", borderColor: "#AB00FF" },
  tabText: { fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: "600" },
  tabTextActive: { color: "#fff" },
  liveTabDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,80,80,0.45)" },
  liveTabDotActive: { backgroundColor: "#FF3333" },

  grid: { flexDirection: "row", paddingHorizontal: 16, gap: STREAM_CARD_GAP },
  col: { flex: 1, gap: STREAM_CARD_GAP },

  card: { width: STREAM_CARD_W, borderRadius: 16, overflow: "hidden", backgroundColor: "#111", justifyContent: "space-between" },

  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: 8 },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#E8000F", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#fff" },
  liveBadgeText: { fontSize: 10, color: "#fff", fontWeight: "800" },
  meetBadge: { backgroundColor: "#AB00FF", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  meetBadgeText: { fontSize: 10, color: "#fff", fontWeight: "800" },
  viewerBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  viewerText: { fontSize: 10, color: "#fff", fontWeight: "700" },

  waveWrap: { position: "absolute", bottom: 44, left: 0, right: 0, flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 3, paddingHorizontal: 10 },
  waveBar: { width: 4, borderRadius: 2, opacity: 0.75 },

  cardBottom: { padding: 9, gap: 2 },
  typeTag: { alignSelf: "flex-start", width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", marginBottom: 3 },
  cardTitle: { fontSize: 12, color: "#fff", fontWeight: "700", lineHeight: 16 },
  cardHost: { fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 1 },
});

// ─── People search styles (Discover) ─────────────────────────────────────────
const CARD_AVATAR_SIZE = 52;
const CARD_AVATAR_OVERLAP = 18;
const CARD_BANNER_H = 86;

const pplStyles = StyleSheet.create({
  card: {
    backgroundColor: "#111113",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  bannerWrap: { height: CARD_BANNER_H, overflow: "hidden" },
  bannerFollowWrap: { position: "absolute", bottom: 10, right: 10 },
  avatarRow: {
    paddingHorizontal: 14,
    marginTop: -CARD_AVATAR_OVERLAP,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  avatarImg: {
    width: CARD_AVATAR_SIZE, height: CARD_AVATAR_SIZE,
    borderRadius: 14,
    borderWidth: 2.5, borderColor: "#111113",
    backgroundColor: "#1A1A1C",
  },
  avatarFallback: {
    width: CARD_AVATAR_SIZE, height: CARD_AVATAR_SIZE,
    borderRadius: 14,
    borderWidth: 2.5, borderColor: "#111113",
    backgroundColor: "#AB00FF33",
    alignItems: "center" as const, justifyContent: "center" as const,
  },
  avatarInitials: { fontSize: 18, fontWeight: "800" as const, color: "#AB00FF" },
  info: { paddingHorizontal: 14, paddingBottom: 14, paddingTop: 8 },
  nameRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6, flexShrink: 1 },
  name: { fontSize: 15, fontWeight: "700" as const, color: "#fff", flexShrink: 1 },
  verifiedBadge: {
    backgroundColor: "#FF6C1A", borderRadius: 8,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  verifiedText: { fontSize: 10, fontWeight: "800" as const, color: "#fff" },
  username: { fontSize: 12, color: "rgba(255,255,255,0.38)", marginTop: 2 },
  bio: { fontSize: 13, color: "rgba(255,255,255,0.52)", marginTop: 6, lineHeight: 18 },
  statsRow: { flexDirection: "row" as const, alignItems: "center" as const, marginTop: 10 },
  statNum: { fontSize: 13, fontWeight: "700" as const, color: "#fff" },
  statLabel: { fontSize: 12, color: "rgba(255,255,255,0.38)" },
  pinnedRow: {
    flexDirection: "row" as const, alignItems: "center" as const, gap: 7,
    marginTop: 10,
    backgroundColor: "rgba(255,108,26,0.08)",
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7,
  },
  pinnedArt: { width: 26, height: 26, borderRadius: 5 },
  pinnedArtFallback: {
    width: 26, height: 26, borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center" as const, justifyContent: "center" as const,
  },
  pinnedText: { flex: 1, fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: "500" as const },
  genreRow: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 6, marginTop: 10 },
  genreChip: {
    backgroundColor: "rgba(171,0,255,0.12)",
    borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: 1, borderColor: "rgba(171,0,255,0.2)",
  },
  genreText: { fontSize: 11, fontWeight: "600" as const, color: "#AB00FF" },
  followBtn: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: "#fff",
  },
  followingBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  followBtnText: { fontSize: 13, fontWeight: "700" as const, color: "#111" },
  followingBtnText: { color: "#fff" },

  // ── Artist card (standalone artists table) ────────────────────────────────
  artistCard: {
    backgroundColor: "#111113",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  artistBanner: { height: CARD_BANNER_H, overflow: "hidden" },
  artistAvatarRow: {
    paddingHorizontal: 14,
    marginTop: -CARD_AVATAR_OVERLAP,
    flexDirection: "row" as const,
    alignItems: "flex-end" as const,
  },
  artistAvatar: {
    width: CARD_AVATAR_SIZE, height: CARD_AVATAR_SIZE,
    borderRadius: 14,
    borderWidth: 2.5, borderColor: "#111113",
    backgroundColor: "#1A1A1C",
  },
  artistAvatarFallback: {
    alignItems: "center" as const, justifyContent: "center" as const,
    backgroundColor: "rgba(255,108,26,0.18)",
  },
  artistInfo: { paddingHorizontal: 14, paddingBottom: 14, paddingTop: 8 },
  artistBadge: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8,
    backgroundColor: "rgba(171,0,255,0.2)",
    borderWidth: 1, borderColor: "rgba(171,0,255,0.35)",
  },
  artistBadgeText: { fontSize: 10, fontWeight: "800" as const, color: "#AB00FF" },
});

// ─── Messages page ────────────────────────────────────────────────────────────

type MessagesTab = "Messages" | "Group Chats" | "Community";
const MESSAGES_TABS: MessagesTab[] = ["Messages", "Group Chats", "Community"];
const MSG_HEADER_H = 72;

function AvatarCircle({ user, size }: { user: string; size: number }) {
  const photo = AVATAR_MAP[user];
  const br = size / 2;
  if (photo) return <Image source={photo} style={{ width: size, height: size, borderRadius: br }} resizeMode="cover" />;
  return (
    <View style={{ width: size, height: size, borderRadius: br, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: size * 0.38, fontWeight: "700", color: "#fff" }}>{user[0].toUpperCase()}</Text>
    </View>
  );
}

function DirectMessagesList({ conversations, loading, onSelect }: {
  conversations: ConversationInfo[];
  loading: boolean;
  onSelect: (conv: ConversationInfo) => void;
}) {

  const fmtTime = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const initials = (u: ConversationInfo["otherUser"]) => {
    const name = u.display_name || u.username;
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  };

  if (loading) {
    return (
      <View style={{ paddingTop: 40, alignItems: "center" }}>
        <ActivityIndicator color="#AB00FF" />
      </View>
    );
  }

  if (conversations.length === 0) {
    return (
      <View style={{ paddingTop: 60, alignItems: "center", gap: 10 }}>
        <Ionicons name="chatbubble-outline" size={40} color="rgba(255,255,255,0.12)" />
        <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 15 }}>No messages yet</Text>
        <Text style={{ color: "rgba(255,255,255,0.18)", fontSize: 13 }}>Follow people and start a conversation</Text>
      </View>
    );
  }

  return (
    <View>
      {conversations.map(conv => (
        <TouchableOpacity
          key={conv.conversationId}
          style={msgStyles.dmRow}
          activeOpacity={0.75}
          onPress={() => onSelect(conv)}
        >
          <View style={msgStyles.dmAvatarWrap}>
            {conv.otherUser.avatar_url ? (
              <Image source={{ uri: conv.otherUser.avatar_url }} style={{ width: 52, height: 52, borderRadius: 26 }} />
            ) : (
              <View style={[msgStyles.dmAvatar, { backgroundColor: "#AB00FF33" }]}>
                <Text style={msgStyles.dmAvatarText}>{initials(conv.otherUser)}</Text>
              </View>
            )}
          </View>
          <View style={msgStyles.dmContent}>
            <View style={msgStyles.dmTopRow}>
              <Text style={msgStyles.dmName} numberOfLines={1}>
                {conv.otherUser.display_name || conv.otherUser.username}
              </Text>
              <Text style={msgStyles.dmTime}>{fmtTime(conv.last_message_at)}</Text>
            </View>
            <Text style={msgStyles.dmPreview} numberOfLines={1}>
              {conv.last_message_preview || "Say hello!"}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function GroupChatsList() {
  return (
    <View>
      {GROUP_CHATS.map((gc: GroupChat) => {
        const [m1, m2] = gc.members;
        return (
          <TouchableOpacity key={gc.id} style={msgStyles.gcRow} activeOpacity={0.75}>
            {/* Overlapping group avatars */}
            <View style={msgStyles.gcAvatarStack}>
              <View style={msgStyles.gcAvatarBack}>
                <AvatarCircle user={m2} size={30} />
              </View>
              <View style={msgStyles.gcAvatarFront}>
                <AvatarCircle user={m1} size={38} />
              </View>
            </View>
            <View style={msgStyles.gcContent}>
              <View style={msgStyles.gcTopRow}>
                <Text style={[msgStyles.gcName, gc.unread > 0 && msgStyles.gcNameUnread]} numberOfLines={1}>{gc.name}</Text>
                <Text style={msgStyles.gcTime}>{gc.time}</Text>
              </View>
              <View style={msgStyles.gcBottomRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[msgStyles.gcPreview, gc.unread > 0 && msgStyles.gcPreviewUnread]} numberOfLines={1}>
                    <Text style={msgStyles.gcSender}>{gc.sender}: </Text>{gc.preview}
                  </Text>
                  <Text style={msgStyles.gcMemberCount}>{gc.memberCount} members</Text>
                </View>
                {gc.unread > 0 && (
                  <View style={msgStyles.gcUnreadBadge}>
                    <Text style={msgStyles.gcUnreadBadgeText}>{gc.unread}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function CommunityList() {
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const toggleFollow = (id: string) =>
    setFollowed((p) => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; });

  return (
    <View style={{ paddingTop: 8, paddingHorizontal: 16, gap: 14 }}>
      {COMMUNITY_ITEMS.map((item: CommunityItem) => {
        const isFollowing = followed.has(item.id);
        return (
          <TouchableOpacity key={item.id} style={msgStyles.communityCard} activeOpacity={0.85}>
            {/* Top row */}
            <View style={msgStyles.communityTopRow}>
              <View style={msgStyles.communityLeftMeta}>
                {item.active && (
                  <>
                    <View style={msgStyles.activeDot} />
                    <Text style={msgStyles.activeText}>Active</Text>
                  </>
                )}
                <View style={[msgStyles.viewerStack, item.active && { marginLeft: 8 }]}>
                  {item.viewerUsers.map((u, i) => (
                    <View key={u} style={[msgStyles.viewerAvatarWrap, i === 0 && { marginLeft: 0 }, { zIndex: item.viewerUsers.length - i }]}>
                      <AvatarCircle user={u} size={18} />
                    </View>
                  ))}
                </View>
                <Text style={msgStyles.followerCount}>{item.followers} Followers</Text>
              </View>
              <TouchableOpacity
                style={[msgStyles.followCommunityBtn, isFollowing && msgStyles.followCommunityBtnActive]}
                onPress={() => toggleFollow(item.id)}
                activeOpacity={0.8}
              >
                {isFollowing ? (
                  <Text style={[msgStyles.followCommunityText, { color: "#AB00FF" }]}>✓ Following</Text>
                ) : (
                  <>
                    <Text style={msgStyles.followCommunityText}>Follow</Text>
                    <Text style={msgStyles.followCommunityText}> +</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Title */}
            <Text style={msgStyles.communityTitle}>{item.title}</Text>

            {/* Tags */}
            <View style={msgStyles.communityTagsRow}>
              {item.tags.map((tag) => (
                <View key={tag} style={msgStyles.communityTag}>
                  <Text style={msgStyles.communityTagText}>{tag}</Text>
                </View>
              ))}
            </View>

            {/* Divider */}
            <View style={msgStyles.communityDivider} />

            {/* Author row */}
            <View style={msgStyles.authorRow}>
              <AvatarCircle user={item.authorUser} size={26} />
              <View style={{ flex: 1 }}>
                <Text style={msgStyles.authorName}>{item.author}</Text>
                <Text style={msgStyles.authorFollowers}>{item.followers} Followers</Text>
              </View>
              <Text style={msgStyles.authorDate}>{item.date}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function MessagesView({ onOpenChat }: { onOpenChat: (conv: ConversationInfo) => void }) {
  const [activeTab, setActiveTab] = useState<MessagesTab>("Messages");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownAnim = useRef(new Animated.Value(0)).current;
  const chevronAnim  = useRef(new Animated.Value(0)).current;

  // Conversations — loaded once and cached; pull-to-refresh clears the cache
  const [conversations, setConversations] = useState<ConversationInfo[]>(_conversationsCache ?? []);
  const [convsLoading,  setConvsLoading]  = useState(!_conversationsCache);
  const [convsRefreshing, setConvsRefreshing] = useState(false);

  useEffect(() => {
    if (_conversationsCache) return;
    getConversations().then(c => {
      _conversationsCache = c;
      setConversations(c);
      setConvsLoading(false);
    });
  }, []);

  const refreshConversations = async () => {
    setConvsRefreshing(true);
    _conversationsCache = null;
    const c = await getConversations();
    _conversationsCache = c;
    setConversations(c);
    setConvsRefreshing(false);
  };

  const openDropdown = () => {
    setDropdownOpen(true);
    Animated.parallel([
      Animated.spring(dropdownAnim, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 280 }),
      Animated.spring(chevronAnim,  { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 280 }),
    ]).start();
  };

  const closeDropdown = () => {
    Animated.parallel([
      Animated.timing(dropdownAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(chevronAnim,  { toValue: 0, duration: 160, useNativeDriver: true }),
    ]).start(() => setDropdownOpen(false));
  };

  const selectTab = (tab: MessagesTab) => {
    setActiveTab(tab);
    closeDropdown();
  };

  const chevronRotate   = chevronAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const dropdownTranslY = dropdownAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] });
  const dropdownScale   = dropdownAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] });

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={msgStyles.header}>
        <TouchableOpacity
          style={msgStyles.dropdownTrigger}
          onPress={dropdownOpen ? closeDropdown : openDropdown}
          activeOpacity={0.8}
        >
          <Text style={msgStyles.headerTitle}>{activeTab}</Text>
          <Animated.View style={{ transform: [{ rotate: chevronRotate }], marginTop: 4 }}>
            <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.55)" />
          </Animated.View>
        </TouchableOpacity>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity style={ds.iconBtn} activeOpacity={0.7}>
            <Ionicons name="search-outline" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={ds.iconBtn} activeOpacity={0.7}>
            <Ionicons name="create-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Now Playing stories strip ── */}
      <View style={msgStyles.nowPlayingSection}>
        <Text style={msgStyles.nowPlayingLabel}>Now Listening</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={msgStyles.nowPlayingRow}
        >
          {NOW_PLAYING_STORIES.map((s) => (
            <NowPlayingBubble key={s.id} item={s} />
          ))}
        </ScrollView>
      </View>

      {/* Backdrop to close dropdown */}
      {dropdownOpen && (
        <Pressable
          style={[StyleSheet.absoluteFill, { top: MSG_HEADER_H, zIndex: 8 }]}
          onPress={closeDropdown}
        />
      )}

      {/* Dropdown menu */}
      {dropdownOpen && (
        <Animated.View
          style={[msgStyles.dropdown, {
            opacity: dropdownAnim,
            transform: [{ translateY: dropdownTranslY }, { scale: dropdownScale }],
            zIndex: 10,
            elevation: 10,
          }]}
        >
          {MESSAGES_TABS.map((tab, i) => {
            const active = tab === activeTab;
            const count  = MESSAGES_UNREAD[tab] ?? 0;
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  msgStyles.dropdownRow,
                  i < MESSAGES_TABS.length - 1 && msgStyles.dropdownRowBorder,
                  active && msgStyles.dropdownRowActive,
                ]}
                onPress={() => selectTab(tab)}
                activeOpacity={0.75}
              >
                <Text style={[msgStyles.dropdownRowText, active && msgStyles.dropdownRowTextActive]}>{tab}</Text>
                <View style={{ flex: 1 }} />
                {count > 0 && (
                  <View style={[msgStyles.dropdownBadge, active && msgStyles.dropdownBadgeActive]}>
                    <Text style={msgStyles.dropdownBadgeText}>{count}</Text>
                  </View>
                )}
                {active && <Ionicons name="checkmark" size={15} color="#AB00FF" style={{ marginLeft: 8 }} />}
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      )}

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: NAVBAR_H + BOTTOM_INSET + 40 }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!dropdownOpen}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          activeTab === "Messages" ? (
            <RefreshControl
              refreshing={convsRefreshing}
              onRefresh={refreshConversations}
              tintColor="#AB00FF"
            />
          ) : undefined
        }
      >
        {activeTab === "Messages"    && <DirectMessagesList conversations={conversations} loading={convsLoading} onSelect={onOpenChat} />}
        {activeTab === "Group Chats" && <GroupChatsList />}
        {activeTab === "Community"   && <CommunityList />}
      </ScrollView>
    </View>
  );
}

const msgStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    height: MSG_HEADER_H,
  },
  dropdownTrigger: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerTitle: { fontSize: 32, fontWeight: "900", color: "#fff", letterSpacing: -0.5 },

  dropdown: {
    position: "absolute",
    top: MSG_HEADER_H,
    left: 16,
    right: 16,
    backgroundColor: "#1C1C1E",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  dropdownRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 15 },
  dropdownRowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  dropdownRowActive: { backgroundColor: "rgba(171,0,255,0.1)" },
  dropdownRowText: { fontSize: 16, fontWeight: "600", color: "rgba(255,255,255,0.4)" },
  dropdownRowTextActive: { color: "#fff" },
  dropdownBadge: { backgroundColor: "#E8000F", borderRadius: 10, minWidth: 22, height: 22, alignItems: "center", justifyContent: "center", paddingHorizontal: 7 },
  dropdownBadgeActive: { backgroundColor: "#AB00FF" },
  dropdownBadgeText: { fontSize: 11, color: "#fff", fontWeight: "800" },

  // ── Direct messages ──
  dmRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  dmAvatarWrap: { position: "relative" },
  dmAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  dmAvatarText: { fontSize: 18, fontWeight: "800", color: "#AB00FF" },
  onlineDot: {
    position: "absolute",
    bottom: 1, right: 1,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: "#00E5A0",
    borderWidth: 2, borderColor: "#0D0D0D",
  },
  dmContent: { flex: 1 },
  dmTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  dmName: { fontSize: 15, fontWeight: "600", color: "rgba(255,255,255,0.5)" },
  dmNameUnread: { color: "#fff", fontWeight: "800" },
  dmTime: { fontSize: 12, color: "rgba(255,255,255,0.28)" },
  dmBottomRow: { flexDirection: "row", alignItems: "center" },
  dmPreview: { fontSize: 13, color: "rgba(255,255,255,0.28)", flex: 1 },
  dmPreviewUnread: { color: "rgba(255,255,255,0.55)" },
  dmUnreadBadge: {
    backgroundColor: "#AB00FF",
    borderRadius: 10, minWidth: 20, height: 20,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 6, marginLeft: 10,
  },
  dmUnreadBadgeText: { fontSize: 11, color: "#fff", fontWeight: "800" },

  // ── Group chats ──
  gcRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  gcAvatarStack: { width: 52, height: 52, position: "relative" },
  gcAvatarBack: {
    position: "absolute",
    bottom: 0, right: 0,
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 2, borderColor: "#0D0D0D",
    overflow: "hidden",
  },
  gcAvatarFront: {
    position: "absolute",
    top: 0, left: 0,
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 2, borderColor: "#0D0D0D",
    overflow: "hidden",
  },
  gcContent: { flex: 1 },
  gcTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 3 },
  gcName: { fontSize: 15, fontWeight: "600", color: "rgba(255,255,255,0.5)", flex: 1, marginRight: 8 },
  gcNameUnread: { color: "#fff", fontWeight: "800" },
  gcTime: { fontSize: 12, color: "rgba(255,255,255,0.28)" },
  gcBottomRow: { flexDirection: "row", alignItems: "flex-start" },
  gcPreview: { fontSize: 13, color: "rgba(255,255,255,0.28)" },
  gcPreviewUnread: { color: "rgba(255,255,255,0.55)" },
  gcSender: { fontWeight: "700", color: "rgba(255,255,255,0.45)" },
  gcMemberCount: { fontSize: 11, color: "rgba(255,255,255,0.22)", marginTop: 2 },
  gcUnreadBadge: {
    backgroundColor: "#FF6B35",
    borderRadius: 10, minWidth: 20, height: 20,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 6, marginLeft: 10, marginTop: 1,
  },
  gcUnreadBadgeText: { fontSize: 11, color: "#fff", fontWeight: "800" },

  // ── Community ──
  communityCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    padding: 16,
    gap: 12,
  },
  communityTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  communityLeftMeta: { flexDirection: "row", alignItems: "center", flex: 1 },
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#00E5A0" },
  activeText: { fontSize: 12, color: "#00E5A0", fontWeight: "700", marginLeft: 5 },
  viewerStack: { flexDirection: "row" },
  viewerAvatarWrap: {
    marginLeft: -5,
    borderRadius: 9,
    borderWidth: 1.5, borderColor: "#0D0D0D",
    overflow: "hidden",
    width: 18, height: 18,
  },
  followerCount: { fontSize: 12, color: "rgba(255,255,255,0.35)", marginLeft: 8 },
  followCommunityBtn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#AB00FF",
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
  },
  followCommunityBtnActive: { backgroundColor: "rgba(171,0,255,0.15)", borderWidth: 1, borderColor: "#AB00FF" },
  followCommunityText: { fontSize: 13, color: "#fff", fontWeight: "700" },
  communityTitle: { fontSize: 20, fontWeight: "900", color: "#fff", letterSpacing: -0.3, lineHeight: 26 },
  communityTagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  communityTag: { backgroundColor: "rgba(202,255,0,0.08)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  communityTagText: { fontSize: 12, color: "#CAFF00", fontWeight: "700" },
  communityDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.06)" },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  authorName: { fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: "700" },
  authorFollowers: { fontSize: 11, color: "rgba(255,255,255,0.25)" },
  authorDate: { fontSize: 12, color: "rgba(255,255,255,0.25)" },

  // ── Now Playing stories strip ──
  nowPlayingSection: {
    paddingTop: 4,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  nowPlayingLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  nowPlayingRow: { paddingHorizontal: 16, gap: 20 },
});

// ─── Swipe-to-reply wrapper ───────────────────────────────────────────────────
// Uses existing PanResponder (no new package). Only intercepts leftward swipes
// so it doesn't conflict with the outer swipe-right-to-dismiss handler.

function SwipeToReply({ onReply, children }: { onReply: () => void; children: React.ReactNode }) {
  const x = useRef(new Animated.Value(0)).current;
  const fired = useRef(false);
  const THRESHOLD = 55;

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) => g.dx < -6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
    onShouldBlockNativeResponder: () => false,
    onPanResponderMove: (_, g) => {
      if (g.dx >= 0) return;
      x.setValue(Math.max(g.dx * 0.62, -THRESHOLD - 10));
      if (!fired.current && g.dx < -THRESHOLD) fired.current = true;
    },
    onPanResponderRelease: (_, g) => {
      if (g.dx < -THRESHOLD) onReply();
      fired.current = false;
      Animated.spring(x, { toValue: 0, useNativeDriver: true, tension: 280, friction: 18 }).start();
    },
  })).current;

  const iconOpacity = x.interpolate({ inputRange: [-THRESHOLD, -18, 0], outputRange: [1, 0.3, 0], extrapolate: 'clamp' });
  const iconScale   = x.interpolate({ inputRange: [-THRESHOLD, -18, 0], outputRange: [1, 0.7, 0.5], extrapolate: 'clamp' });

  return (
    <View {...pan.panHandlers}>
      <Animated.View style={{ transform: [{ translateX: x }] }}>
        {children}
      </Animated.View>
      <Animated.View style={{
        position: 'absolute', right: 6, top: 0, bottom: 0,
        justifyContent: 'center',
        opacity: iconOpacity,
        transform: [{ scale: iconScale }],
      }}>
        <Ionicons name="arrow-undo-outline" size={17} color="rgba(255,255,255,0.65)" />
      </Animated.View>
    </View>
  );
}

// ─── Animated typing bubble ───────────────────────────────────────────────────

function TypingBubble({ name }: { name: string }) {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    const anims = dots.map((d, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 140),
        Animated.timing(d, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(d, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.delay(560 - i * 140),
      ]))
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);

  return (
    <View style={chatStyles.typingRow}>
      <View style={chatStyles.typingBubble}>
        {dots.map((d, i) => (
          <Animated.View key={i} style={[chatStyles.typingDot, {
            opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
            transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }],
          }]} />
        ))}
      </View>
      <Text style={chatStyles.typingName}>{name}</Text>
    </View>
  );
}

// ─── Chat detail view ─────────────────────────────────────────────────────────

function ChatDetailView({ conv, onClose }: { conv: ConversationInfo; onClose: () => void }) {
  const slideX = useRef(new Animated.Value(SW)).current;
  const [msgText,       setMsgText]    = useState("");
  const [msgs,          setMsgs]       = useState<DbMessage[]>([]);
  const [currentUserId, setCurUid]     = useState<string | null>(null);
  const [loading,       setLoading]    = useState(true);
  const [isOtherTyping, setOtherTyping]= useState(false);
  const [replyTo, setReplyTo]          = useState<{ id: string; preview: string; senderName: string } | null>(null);

  const flatRef          = useRef<FlatList<DbMessage>>(null);
  const channelRef       = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const userIdRef        = useRef<string | null>(null);
  const typingOutRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const otherTypingOutRef= useRef<ReturnType<typeof setTimeout> | null>(null);

  // Slide in + load messages + subscribe to realtime + broadcast
  useEffect(() => {
    Animated.spring(slideX, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }).start();

    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      userIdRef.current = user?.id ?? null;
      setCurUid(user?.id ?? null);
      const loaded = await getMessages(conv.conversationId);
      if (!active) return;
      setMsgs(loaded);
      setLoading(false);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 60);
    })();

    const ch = supabase
      .channel(`conv:${conv.conversationId}`)
      // Real-time new messages
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conv.conversationId}` },
        (payload) => {
          const msg = payload.new as DbMessage;
          setMsgs(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
          setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 60);
        })
      // Typing indicator (broadcast — no DB write needed)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId === userIdRef.current) return;
        setOtherTyping(payload.isTyping);
        clearTimeout(otherTypingOutRef.current ?? undefined);
        if (payload.isTyping) {
          otherTypingOutRef.current = setTimeout(() => setOtherTyping(false), 4000);
        }
      })
      .subscribe();

    channelRef.current = ch;

    return () => {
      active = false;
      clearTimeout(typingOutRef.current ?? undefined);
      clearTimeout(otherTypingOutRef.current ?? undefined);
      ch.unsubscribe();
      channelRef.current = null;
    };
  }, [conv.conversationId]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const broadcastTyping = (isTyping: boolean) => {
    if (!channelRef.current || !userIdRef.current) return;
    channelRef.current.send({
      type: 'broadcast', event: 'typing',
      payload: { userId: userIdRef.current, isTyping },
    });
  };

  const handleTextChange = (v: string) => {
    setMsgText(v);
    broadcastTyping(v.length > 0);
    clearTimeout(typingOutRef.current ?? undefined);
    if (v.length > 0) {
      typingOutRef.current = setTimeout(() => broadcastTyping(false), 2000);
    }
  };

  const handleClose = () => {
    Keyboard.dismiss();
    broadcastTyping(false);
    clearTimeout(typingOutRef.current ?? undefined);
    Animated.timing(slideX, { toValue: SW, duration: 260, useNativeDriver: true }).start(onClose);
  };

  // Swipe right to dismiss whole chat
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) => dx > 10 && dx > Math.abs(dy) * 2,
      onShouldBlockNativeResponder: () => false,
      onPanResponderMove: (_, { dx }) => { if (dx > 0) slideX.setValue(dx); },
      onPanResponderRelease: (_, { dx, vx }) => {
        if (dx > SW * 0.35 || vx > 0.8) handleClose();
        else Animated.spring(slideX, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }).start();
      },
    })
  ).current;

  const sendMessage = async () => {
    const text = msgText.trim();
    if (!text) return;
    setMsgText("");
    broadcastTyping(false);
    clearTimeout(typingOutRef.current ?? undefined);
    const reply = replyTo;
    setReplyTo(null);

    const tempId = `pending-${Date.now()}`;
    const optimistic: DbMessage = {
      id: tempId, conversation_id: conv.conversationId,
      sender_id: currentUserId ?? '', body: text, type: 'text',
      spotify_track_id: null, spotify_track_name: null,
      spotify_track_artist: null, spotify_album_art: null,
      reply_to_id: reply?.id ?? null,
      reply_to_preview: reply?.preview ?? null,
      created_at: new Date().toISOString(),
    };
    setMsgs(prev => [...prev, optimistic]);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 60);
    const result = await sendTextMessage(conv.conversationId, text, reply ?? undefined);
    if (result) setMsgs(prev => [...prev.filter(m => m.id !== tempId), result]);
  };

  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const otherName = conv.otherUser.display_name || conv.otherUser.username;
  const otherInitials = otherName.trim().split(/\s+/).map(p => p[0]?.toUpperCase() ?? '').slice(0, 2).join('');

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, {
        transform: [{ translateX: slideX }],
        backgroundColor: "#0D0D0D",
        zIndex: 200,
        elevation: 200,
      }]}
      {...pan.panHandlers}
    >
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* ── Header ── */}
        <View style={chatStyles.header}>
          <TouchableOpacity onPress={handleClose} style={chatStyles.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>

          <View style={chatStyles.headerCenter}>
            {conv.otherUser.avatar_url ? (
              <Image source={{ uri: conv.otherUser.avatar_url }} style={{ width: 36, height: 36, borderRadius: 18 }} />
            ) : (
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#AB00FF33", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "800", color: "#AB00FF" }}>{otherInitials}</Text>
              </View>
            )}
            <View style={{ gap: 1, flex: 1 }}>
              <Text style={chatStyles.headerName} numberOfLines={1}>{otherName}</Text>
              <Text style={[chatStyles.headerStatus, { color: "rgba(255,255,255,0.35)" }]}>@{conv.otherUser.username}</Text>
            </View>
          </View>

          <TouchableOpacity style={chatStyles.jamBtn} activeOpacity={0.8}>
            <Ionicons name="musical-notes" size={12} color="#0D0D0D" />
            <Text style={chatStyles.jamBtnText}>Jam</Text>
          </TouchableOpacity>
          <TouchableOpacity style={chatStyles.headerIconBtn} activeOpacity={0.7}>
            <Ionicons name="call-outline" size={17} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={chatStyles.headerIconBtn} activeOpacity={0.7}>
            <Ionicons name="videocam-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          {loading ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator color="#AB00FF" />
            </View>
          ) : (
            <FlatList
              ref={flatRef}
              data={msgs}
              keyExtractor={(m) => m.id}
              contentContainerStyle={chatStyles.messagesContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
              renderItem={({ item: msg, index }) => {
                const fromMe = msg.sender_id === currentUserId;
                const prev = msgs[index - 1];
                const next = msgs[index + 1];
                const firstInGroup = !prev || (prev.sender_id === currentUserId) !== fromMe;
                const lastInGroup  = !next || (next.sender_id === currentUserId) !== fromMe;
                const senderName   = fromMe ? "You" : otherName;

                // ── Spotify track card ──────────────────────────────────────
                if (msg.type === "spotify_track" && msg.spotify_track_id) {
                  return (
                    <SwipeToReply onReply={() => setReplyTo({
                      id: msg.id,
                      preview: `🎵 ${msg.spotify_track_name ?? "Track"}`,
                      senderName,
                    })}>
                      <View style={[chatStyles.msgWrap, fromMe && chatStyles.msgWrapMe, { marginTop: firstInGroup ? 12 : 3 }]}>
                        <SpotifyTrackCard
                          track={{ id: msg.spotify_track_id, name: msg.spotify_track_name ?? "Unknown", artist: msg.spotify_track_artist ?? "Unknown", albumArt: msg.spotify_album_art }}
                          fromMe={fromMe}
                        />
                        <Text style={[chatStyles.bubbleTime, fromMe && chatStyles.bubbleTimeMe, { paddingHorizontal: 4, marginTop: 3 }]}>
                          {fmtTime(msg.created_at)}
                        </Text>
                      </View>
                    </SwipeToReply>
                  );
                }

                // ── Regular text bubble ─────────────────────────────────────
                const bubbleRadius = fromMe
                  ? { borderTopRightRadius: firstInGroup ? 6 : 18, borderBottomRightRadius: lastInGroup ? 18 : 6 }
                  : { borderTopLeftRadius:  firstInGroup ? 6 : 18, borderBottomLeftRadius:  lastInGroup ? 18 : 6 };
                return (
                  <SwipeToReply onReply={() => setReplyTo({
                    id: msg.id,
                    preview: msg.body ?? "",
                    senderName,
                  })}>
                    <View style={[chatStyles.msgWrap, fromMe && chatStyles.msgWrapMe, { marginTop: firstInGroup ? 12 : 3 }]}>
                      {/* Reply quote */}
                      {!!msg.reply_to_preview && (
                        <View style={[chatStyles.replyQuote, fromMe && chatStyles.replyQuoteMe]}>
                          <View style={chatStyles.replyQuoteAccent} />
                          <Text style={chatStyles.replyQuoteText} numberOfLines={2}>{msg.reply_to_preview}</Text>
                        </View>
                      )}
                      <View style={[chatStyles.bubble, fromMe ? chatStyles.bubbleMe : chatStyles.bubbleThem, bubbleRadius]}>
                        <Text style={[chatStyles.bubbleText, fromMe && chatStyles.bubbleTextMe]}>{msg.body}</Text>
                        <Text style={[chatStyles.bubbleTime, fromMe && chatStyles.bubbleTimeMe]}>{fmtTime(msg.created_at)}</Text>
                      </View>
                    </View>
                  </SwipeToReply>
                );
              }}
            />
          )}

          {/* Typing indicator */}
          {isOtherTyping && <TypingBubble name={otherName} />}

          {/* Now playing banner */}
          <View style={{ paddingHorizontal: 12 }}>
            <NowPlayingBanner onShare={async (t) => {
              const tempId = `pending-sp-${Date.now()}`;
              const optimistic: DbMessage = {
                id: tempId, conversation_id: conv.conversationId,
                sender_id: currentUserId ?? '', body: null, type: 'spotify_track',
                spotify_track_id: t.id, spotify_track_name: t.name,
                spotify_track_artist: t.artist, spotify_album_art: t.albumArt,
                reply_to_id: null, reply_to_preview: null,
                created_at: new Date().toISOString(),
              };
              setMsgs(prev => [...prev, optimistic]);
              setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 60);
              const result = await sendSpotifyTrackMessage(conv.conversationId, {
                id: t.id, name: t.name, artist: t.artist, albumArt: t.albumArt,
              });
              if (result) setMsgs(prev => [...prev.filter(m => m.id !== tempId), result]);
            }} />
          </View>

          {/* Reply preview strip */}
          {!!replyTo && (
            <View style={chatStyles.replyBar}>
              <View style={chatStyles.replyBarAccent} />
              <View style={{ flex: 1 }}>
                <Text style={chatStyles.replyBarName}>{replyTo.senderName}</Text>
                <Text style={chatStyles.replyBarPreview} numberOfLines={1}>{replyTo.preview}</Text>
              </View>
              <TouchableOpacity onPress={() => setReplyTo(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={16} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>
          )}

          {/* Input bar */}
          <View style={chatStyles.inputBar}>
            <TouchableOpacity style={chatStyles.inputPlusBtn} activeOpacity={0.7}>
              <Ionicons name="add-circle-outline" size={28} color="rgba(255,255,255,0.38)" />
            </TouchableOpacity>
            <View style={chatStyles.inputWrap}>
              <TextInput
                style={chatStyles.input}
                placeholder="Message..."
                placeholderTextColor="rgba(255,255,255,0.28)"
                value={msgText}
                onChangeText={handleTextChange}
                multiline
                maxLength={500}
                returnKeyType="default"
              />
              {msgText.length === 0 ? (
                <TouchableOpacity style={chatStyles.inputAction} activeOpacity={0.7}>
                  <Ionicons name="mic-outline" size={18} color="rgba(255,255,255,0.38)" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[chatStyles.inputAction, chatStyles.sendBtn]} activeOpacity={0.8} onPress={sendMessage}>
                  <Ionicons name="send" size={14} color="#0D0D0D" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Animated.View>
  );
}

const chatStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  backBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, minWidth: 0 },
  headerOnlineDot: {
    position: "absolute", bottom: 0, right: 0,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: "#00E5A0",
    borderWidth: 2, borderColor: "#0D0D0D",
  },
  headerName: { fontSize: 15, fontWeight: "800", color: "#fff" },
  headerStatus: { fontSize: 11, color: "#00E5A0", fontWeight: "600" },

  // Start Jam pill
  jamBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#CAFF00", borderRadius: 20,
    paddingHorizontal: 11, paddingVertical: 6,
  },
  jamBtnText: { fontSize: 12, color: "#0D0D0D", fontWeight: "800" },

  // Call / video icon buttons
  headerIconBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.09)",
  },

  // Messages list
  messagesContent: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 16 },
  msgWrap: { alignSelf: "flex-start", maxWidth: SW * 0.74 },
  msgWrapMe: { alignSelf: "flex-end" },
  bubble: { paddingHorizontal: 14, paddingTop: 9, paddingBottom: 7, borderRadius: 18 },
  bubbleThem: { backgroundColor: "#1C1C1E" },
  bubbleMe:   { backgroundColor: "#AB00FF" },
  bubbleText: { fontSize: 15, color: "rgba(255,255,255,0.82)", lineHeight: 21 },
  bubbleTextMe: { color: "#fff" },
  bubbleTime: { fontSize: 10, color: "rgba(255,255,255,0.3)", textAlign: "right", marginTop: 3 },
  bubbleTimeMe: { color: "rgba(255,255,255,0.55)" },

  // Input bar — no longer absolute, sits in document flow
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: BOTTOM_INSET,
    backgroundColor: "#0D0D0D",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
  },
  inputPlusBtn: { paddingBottom: 4 },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  input: { flex: 1, fontSize: 15, color: "#fff", maxHeight: 100, paddingVertical: 0 },
  inputAction: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  sendBtn: { backgroundColor: "#AB00FF", borderRadius: 15 },

  // Reply quote shown inside received/sent bubbles
  replyQuote: {
    flexDirection: "row",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 10,
    marginBottom: 4,
    overflow: "hidden",
    maxWidth: SW * 0.65,
  },
  replyQuoteMe: { alignSelf: "flex-end" },
  replyQuoteAccent: { width: 3, backgroundColor: "rgba(255,255,255,0.35)" },
  replyQuoteText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    flex: 1,
  },

  // Reply-to strip above input bar
  replyBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  replyBarAccent: { width: 3, height: 32, borderRadius: 2, backgroundColor: "#AB00FF" },
  replyBarName: { fontSize: 11, fontWeight: "700", color: "#AB00FF", marginBottom: 2 },
  replyBarPreview: { fontSize: 12, color: "rgba(255,255,255,0.5)" },

  // Typing indicator
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1C1C1E",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  typingName: { fontSize: 11, color: "rgba(255,255,255,0.3)" },
});

// ─── Bottom glass navbar ──────────────────────────────────────────────────────

function BottomNav({
  active,
  onPress,
}: {
  active: string;
  onPress: (label: string) => void;
}) {
  return (
    <View style={styles.navBarWrap} pointerEvents="box-none">
      <View style={styles.navBarGlass}>
        {NAV_ITEMS.map((item) => {
          const isActive = item.label === active;
          return (
            <TouchableOpacity
              key={item.label}
              style={styles.navItem}
              activeOpacity={0.7}
              onPress={() => onPress(item.label)}
            >
              <Ionicons
                name={(isActive ? item.iconActive : item.icon) as keyof typeof Ionicons.glyphMap}
                size={24}
                color={isActive ? "#AB00FF" : "rgba(255,255,255,0.3)"}
              />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Post detail overlay ──────────────────────────────────────────────────────

function PostDetailOverlay({ post, onClose }: { post: Post; onClose: () => void }) {
  const slideX = useRef(new Animated.Value(SW)).current;
  const [replyText,   setReplyText]   = useState("");
  const [replyingTo,  setReplyingTo]  = useState<Comment | null>(null);
  const [comments,    setComments]    = useState<Comment[]>([]);
  const [sending,     setSending]     = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedSong, setSelectedSong] = useState<PinnedSong | null>(null);
  const [songPickerVisible, setSongPickerVisible] = useState(false);
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
  const replyBarBottom = useRef(new Animated.Value(BOTTOM_INSET + 8)).current;
  const listRef = useRef<FlatList>(null);

  // Load current user + Spotify token + comments on mount
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const tok = await getValidSpotifyToken(user.id);
        setSpotifyToken(tok);
      }

      const { data } = await supabase
        .from("post_comments")
        .select(COMMENT_SELECT)
        .eq("post_id", post.id)
        .order("created_at", { ascending: true });
      if (data) setComments(data.map(rowToComment));
    })();
  }, [post.id]);

  const handleSend = async () => {
    if (!currentUserId || (!replyText.trim() && !selectedSong) || sending) return;
    const text = replyText.trim();
    const parentId = replyingTo?.id ?? null;
    const song = selectedSong;
    setReplyText("");
    setReplyingTo(null);
    setSelectedSong(null);
    setSending(true);
    try {
      const { data, error } = await supabase
        .from("post_comments")
        .insert({
          post_id: post.id,
          user_id: currentUserId,
          text,
          parent_comment_id: parentId,
          ...(song && {
            song_id:        song.id,
            song_name:      song.name,
            song_artist:    song.artist,
            song_album_art: song.albumArt,
          }),
        })
        .select(COMMENT_SELECT)
        .single();
      if (error) throw error;
      setComments((prev) => [...prev, rowToComment(data)]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    } catch (e: any) {
      Alert.alert("Comment failed", e.message ?? "Could not post comment.");
      setReplyText(text);
      setSelectedSong(song);
    } finally {
      setSending(false);
    }
  };

  // Slide in on mount
  useEffect(() => {
    Animated.spring(slideX, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }).start();
  }, []);

  // Keyboard tracking for reply bar
  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvt, (e) => {
      Animated.timing(replyBarBottom, { toValue: e.endCoordinates.height + 8, duration: Platform.OS === "ios" ? (e.duration ?? 260) : 260, useNativeDriver: false }).start();
    });
    const hideSub = Keyboard.addListener(hideEvt, (e) => {
      Animated.timing(replyBarBottom, { toValue: BOTTOM_INSET + 8, duration: Platform.OS === "ios" ? (e.duration ?? 260) : 260, useNativeDriver: false }).start();
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const handleClose = () => {
    Keyboard.dismiss();
    Animated.timing(slideX, { toValue: SW, duration: 260, useNativeDriver: true }).start(onClose);
  };

  // Swipe-right-to-go-back PanResponder
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) => dx > 8 && dx > Math.abs(dy) * 2,
      onShouldBlockNativeResponder: () => false,
      onPanResponderMove: (_, { dx }) => {
        if (dx > 0) slideX.setValue(dx);
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        if (dx > SW * 0.3 || vx > 0.8) {
          handleClose();
        } else {
          Animated.spring(slideX, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(slideX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.detailOverlay, { transform: [{ translateX: slideX }] }]} {...pan.panHandlers}>
      {/* Header */}
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={handleClose} style={styles.detailBackBtn} activeOpacity={0.7}>
          <Text style={styles.detailBackIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.detailHeaderTitle}>Post</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Comments list with post as header */}
      {(() => {
        // Build parent → replies map; top-level = no parentCommentId
        const topLevel: Comment[] = [];
        const repliesMap = new Map<string, Comment[]>();
        for (const c of comments) {
          if (!c.parentCommentId) {
            topLevel.push(c);
          } else {
            const arr = repliesMap.get(c.parentCommentId) ?? [];
            arr.push(c);
            repliesMap.set(c.parentCommentId, arr);
          }
        }
        return (
          <FlatList
            ref={listRef}
            data={topLevel}
            keyExtractor={(c) => c.id}
            contentContainerStyle={styles.detailListContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <>
                <PostCard item={post} />
                <View style={styles.detailDivider}>
                  <Text style={styles.detailDividerLabel}>
                    {topLevel.length === 0 ? "No comments yet" : `${topLevel.length} Comment${topLevel.length === 1 ? "" : "s"}`}
                  </Text>
                </View>
              </>
            }
            renderItem={({ item }) => (
              <ThreadedCommentRow
                comment={item}
                replies={repliesMap.get(item.id) ?? []}
                currentUserId={currentUserId}
                onReply={(c) => setReplyingTo(c)}
              />
            )}
            ItemSeparatorComponent={() => <View style={styles.commentSeparator} />}
          />
        );
      })()}

      {/* Sticky reply bar */}
      <Animated.View style={[styles.detailReplyBarWrap, { bottom: replyBarBottom }]}>
        {replyingTo && (
          <View style={styles.detailReplyContext}>
            <Text style={styles.detailReplyContextText}>
              Replying to {replyingTo.displayName ?? `@${replyingTo.username}`}
            </Text>
            <TouchableOpacity onPress={() => setReplyingTo(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.detailReplyContextX}>×</Text>
            </TouchableOpacity>
          </View>
        )}
        {/* Attached song card */}
        {selectedSong && (
          <View style={styles.detailSongCard}>
            {selectedSong.albumArt ? (
              <Image source={{ uri: selectedSong.albumArt }} style={styles.detailSongArt} />
            ) : (
              <View style={[styles.detailSongArt, styles.detailSongArtFallback]}>
                <FontAwesome5 name="music" size={9} color="rgba(255,255,255,0.3)" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.detailSongName} numberOfLines={1}>{selectedSong.name}</Text>
              {selectedSong.artist ? <Text style={styles.detailSongArtist} numberOfLines={1}>{selectedSong.artist}</Text> : null}
            </View>
            <FontAwesome5 name="spotify" size={11} color="#1DB954" style={{ marginRight: 6 }} />
            <TouchableOpacity onPress={() => setSelectedSong(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <FontAwesome5 name="times" size={12} color="rgba(255,255,255,0.45)" />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.composerGlass}>
          <TouchableOpacity style={styles.composerPlus} activeOpacity={0.8} onPress={() => setSongPickerVisible(true)}>
            <Text style={styles.composerPlusIcon}>+</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.composerInput}
            placeholder={replyingTo ? `Reply to ${replyingTo.displayName ?? `@${replyingTo.username}`}…` : "Add a comment…"}
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={replyText}
            onChangeText={setReplyText}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.composerSend, ((!replyText.trim() && !selectedSong) || sending) && { opacity: 0.4 }]}
            activeOpacity={0.8}
            onPress={handleSend}
            disabled={(!replyText.trim() && !selectedSong) || sending}
          >
            {sending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.composerSendIcon}>↑</Text>}
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Song picker overlay */}
      <PinnedSongOverlay
        visible={songPickerVisible}
        onClose={() => setSongPickerVisible(false)}
        onSelect={(song) => { setSelectedSong(song); setSongPickerVisible(false); }}
        accessToken={spotifyToken}
        ctaLabel="Attach to Reply"
        ctaIcon="music"
      />
    </Animated.View>
  );
}

// ─── Gradient toggle ──────────────────────────────────────────────────────────

const TOGGLE_W = 48;
const TOGGLE_H = 28;
const THUMB_SIZE = 22;
const THUMB_TRAVEL = TOGGLE_W - THUMB_SIZE - 6; // 3px padding each side

function GradientToggle({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  // Sync animation when value changes externally (e.g. initial DB load)
  useEffect(() => {
    Animated.spring(anim, {
      toValue: value ? 1 : 0,
      useNativeDriver: true,
      damping: 18,
      stiffness: 260,
    }).start();
  }, [value]);

  const handlePress = () => {
    onValueChange(!value);
  };

  const thumbX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, THUMB_TRAVEL] });

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.85}>
      <View style={profileStyles.toggleTrack}>
        {value ? (
          <LinearGradient
            colors={["#FF6C1A", "#CC4200", "#3D1A0C"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.13)" }]} />
        )}
        <Animated.View style={[profileStyles.toggleThumb, { transform: [{ translateX: thumbX }] }]} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Broadcast row ────────────────────────────────────────────────────────────

function BroadcastRow() {
  const { broadcastingEnabled, broadcastLoading, toggleBroadcasting } = useNowPlayingCtx();
  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={toggleBroadcasting}
      disabled={broadcastLoading}
      style={profileStyles.broadcastRow}
    >
      <Text style={profileStyles.broadcastLabel}>Broadcast session</Text>
      <GradientToggle value={broadcastingEnabled} onValueChange={toggleBroadcasting} />
    </TouchableOpacity>
  );
}

// ─── Profile section tabs ─────────────────────────────────────────────────────

// ─── Add Song dialog ──────────────────────────────────────────────────────────

function AddSongDialog({
  playlistId, userId, onClose, onAdded,
}: {
  playlistId: string
  userId: string
  onClose: () => void
  onAdded: () => void
}) {
  const { track: nowPlaying } = useNowPlayingCtx()
  const [mode, setMode] = useState<'search' | 'now'>('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SpotifyTrackResult[]>([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
  const [added, setAdded] = useState<Set<string>>(new Set())

  const handleSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    const token = await getValidSpotifyToken(userId)
    if (!token) { setSearching(false); return }
    const found = await searchSpotifyTracks(token, query.trim(), 20)
    setResults(found)
    setSearching(false)
  }

  const addTrack = async (track: SpotifyTrackResult) => {
    if (adding || added.has(track.id)) return
    setAdding(track.id)
    const { data: existing } = await supabase
      .from('curated_playlist_songs')
      .select('position')
      .eq('playlist_id', playlistId)
      .order('position', { ascending: false })
      .limit(1)
    const nextPos = (existing?.[0]?.position ?? -1) + 1
    await supabase.from('curated_playlist_songs').insert({
      playlist_id: playlistId,
      spotify_track_id: track.id,
      track_name: track.name,
      track_artist: track.artist,
      album_art: track.albumArt,
      duration_ms: track.durationMs,
      position: nextPos,
    })
    setAdded(prev => new Set(prev).add(track.id))
    setAdding(null)
    onAdded()
  }

  const nowTrack: SpotifyTrackResult | null = nowPlaying ? {
    id: nowPlaying.id,
    name: nowPlaying.name,
    artist: nowPlaying.artist,
    albumArt: nowPlaying.albumArt,
    durationMs: nowPlaying.durationMs,
    previewUrl: nowPlaying.previewUrl,
  } : null

  return (
    <Modal transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={cpStyles.dialogOverlay} onPress={onClose}>
          <Pressable onPress={e => e.stopPropagation()}>
            <View style={cpStyles.dialogSheet}>
              <View style={cpStyles.dialogHandle} />
              <Text style={cpStyles.dialogTitle}>Add Song</Text>

              <View style={cpStyles.modeRow}>
                <TouchableOpacity
                  style={[cpStyles.modeBtn, mode === 'search' && cpStyles.modeBtnActive]}
                  onPress={() => setMode('search')}
                >
                  <Text style={[cpStyles.modeBtnText, mode === 'search' && cpStyles.modeBtnTextActive]}>Search</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[cpStyles.modeBtn, mode === 'now' && cpStyles.modeBtnActive]}
                  onPress={() => setMode('now')}
                >
                  <Text style={[cpStyles.modeBtnText, mode === 'now' && cpStyles.modeBtnTextActive]}>Now Playing</Text>
                </TouchableOpacity>
              </View>

              {mode === 'search' ? (
                <>
                  <View style={cpStyles.searchRow}>
                    <TextInput
                      style={cpStyles.searchInput}
                      placeholder="Search Spotify…"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={query}
                      onChangeText={setQuery}
                      onSubmitEditing={handleSearch}
                      returnKeyType="search"
                    />
                    <TouchableOpacity style={cpStyles.searchBtn} onPress={handleSearch} activeOpacity={0.8}>
                      {searching
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Ionicons name="search" size={18} color="#fff" />
                      }
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {results.map(track => (
                      <View key={track.id} style={cpStyles.trackRow}>
                        {track.albumArt
                          ? <Image source={{ uri: track.albumArt }} style={cpStyles.trackArt} />
                          : <View style={[cpStyles.trackArt, { alignItems: 'center', justifyContent: 'center' }]}>
                              <Text style={{ fontSize: 18 }}>🎵</Text>
                            </View>
                        }
                        <View style={cpStyles.trackInfo}>
                          <Text style={cpStyles.trackName} numberOfLines={1}>{track.name}</Text>
                          <Text style={cpStyles.trackArtist} numberOfLines={1}>{track.artist}</Text>
                        </View>
                        <TouchableOpacity
                          style={[cpStyles.addBtn, added.has(track.id) && cpStyles.addBtnDone]}
                          onPress={() => addTrack(track)}
                          activeOpacity={0.7}
                          disabled={!!adding || added.has(track.id)}
                        >
                          {adding === track.id
                            ? <ActivityIndicator size="small" color="#FF6C1A" />
                            : <Text style={[cpStyles.addBtnText, added.has(track.id) && cpStyles.addBtnTextDone]}>
                                {added.has(track.id) ? '✓' : 'Add'}
                              </Text>
                          }
                        </TouchableOpacity>
                      </View>
                    ))}
                    {results.length === 0 && !searching && query.length > 0 && (
                      <Text style={{ color: 'rgba(255,255,255,0.25)', textAlign: 'center', paddingVertical: 20 }}>
                        No results found
                      </Text>
                    )}
                  </ScrollView>
                </>
              ) : (
                <View>
                  {nowTrack ? (
                    <View style={cpStyles.trackRow}>
                      {nowTrack.albumArt
                        ? <Image source={{ uri: nowTrack.albumArt }} style={cpStyles.trackArt} />
                        : <View style={[cpStyles.trackArt, { alignItems: 'center', justifyContent: 'center' }]}>
                            <Text style={{ fontSize: 18 }}>🎵</Text>
                          </View>
                      }
                      <View style={cpStyles.trackInfo}>
                        <Text style={cpStyles.trackName} numberOfLines={1}>{nowTrack.name}</Text>
                        <Text style={cpStyles.trackArtist} numberOfLines={1}>{nowTrack.artist}</Text>
                        <Text style={{ fontSize: 11, color: '#1DB954', fontWeight: '600', marginTop: 2 }}>● Now playing</Text>
                      </View>
                      <TouchableOpacity
                        style={[cpStyles.addBtn, added.has(nowTrack.id) && cpStyles.addBtnDone]}
                        onPress={() => addTrack(nowTrack)}
                        activeOpacity={0.7}
                        disabled={!!adding || added.has(nowTrack.id)}
                      >
                        {adding === nowTrack.id
                          ? <ActivityIndicator size="small" color="#FF6C1A" />
                          : <Text style={[cpStyles.addBtnText, added.has(nowTrack.id) && cpStyles.addBtnTextDone]}>
                              {added.has(nowTrack.id) ? '✓' : 'Add'}
                            </Text>
                        }
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                      <Text style={{ fontSize: 32, marginBottom: 12 }}>🎵</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Nothing playing right now</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, marginTop: 6 }}>Open Spotify and play a track</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── Create Playlist dialog ───────────────────────────────────────────────────

function CreatePlaylistDialog({
  userId, onClose, onCreate,
}: {
  userId: string
  onClose: () => void
  onCreate: (playlist: CuratedPlaylist) => void
}) {
  const [name, setName] = useState('')
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [creating, setCreating] = useState(false)
  const [uploading, setUploading] = useState(false)

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) { Alert.alert('Permission required', 'Allow photo access to set a cover image.'); return }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    })
    if (result.canceled || !result.assets[0]) return
    const uri = result.assets[0].uri
    setImageUri(uri)
    setUploading(true)
    try {
      const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg'
      const res = await fetch(uri)
      const blob = await res.blob()
      // blob.arrayBuffer() is unreliable in React Native — use FileReader like
      // the avatar/banner uploads do
      const ab = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as ArrayBuffer)
        reader.onerror = reject
        reader.readAsArrayBuffer(blob)
      })
      // First path segment must be the user ID to satisfy the post-media RLS policy:
      // auth.uid()::text = (storage.foldername(name))[1]
      const fileName = `${userId}/playlist-${Date.now()}.${ext}`
      const { error } = await supabase.storage
        .from('post-media')
        .upload(fileName, ab, { contentType: `image/${ext}`, upsert: true })
      if (error) {
        console.log('[Playlist] cover upload error:', error.message)
      } else {
        const { data: { publicUrl } } = supabase.storage.from('post-media').getPublicUrl(fileName)
        setImageUrl(publicUrl)
      }
    } catch (e) {
      console.log('[Playlist] cover upload exception:', e)
    }
    setUploading(false)
  }

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) { setTags(prev => [...prev, t]); setTagInput('') }
  }

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag))

  const create = async () => {
    if (!name.trim() || creating) return
    setCreating(true)
    const { data, error } = await supabase
      .from('curated_playlists')
      .insert({ user_id: userId, name: name.trim(), image_url: imageUrl, tags, show_on_profile: false })
      .select()
      .single()
    setCreating(false)
    if (!error && data) onCreate(data as CuratedPlaylist)
  }

  return (
    <Modal transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={cpStyles.dialogOverlay} onPress={onClose}>
          <Pressable onPress={e => e.stopPropagation()}>
            <ScrollView style={cpStyles.dialogSheet} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={cpStyles.dialogHandle} />
              <Text style={cpStyles.dialogTitle}>Create Playlist</Text>

              {/* Cover image picker */}
              <TouchableOpacity style={cpStyles.imagePicker} onPress={pickImage} activeOpacity={0.8}>
                {imageUri
                  ? <Image source={{ uri: imageUri }} style={{ width: 90, height: 90, borderRadius: 18 }} resizeMode="cover" />
                  : <>
                      <Ionicons name="camera-outline" size={26} color="rgba(255,255,255,0.35)" />
                      <Text style={cpStyles.imagePickerText}>Cover Photo</Text>
                    </>
                }
                {uploading && (
                  <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                    <ActivityIndicator color="#fff" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Name */}
              <Text style={cpStyles.label}>PLAYLIST NAME</Text>
              <TextInput
                style={cpStyles.input}
                placeholder="Give it a name…"
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={name}
                onChangeText={setName}
                maxLength={60}
              />

              {/* Tags */}
              <Text style={cpStyles.label}>TAGS</Text>
              {tags.length > 0 && (
                <View style={cpStyles.tagRow}>
                  {tags.map(tag => (
                    <TouchableOpacity key={tag} style={cpStyles.tagChip} onPress={() => removeTag(tag)} activeOpacity={0.75}>
                      <Text style={cpStyles.tagChipText}>{tag}</Text>
                      <Text style={cpStyles.tagChipText}> ×</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <View style={cpStyles.tagInputRow}>
                <TextInput
                  style={cpStyles.tagInput}
                  placeholder="e.g. Chill, Late Night…"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  value={tagInput}
                  onChangeText={setTagInput}
                  onSubmitEditing={addTag}
                  returnKeyType="done"
                  maxLength={30}
                />
                <TouchableOpacity style={cpStyles.addTagBtn} onPress={addTag} activeOpacity={0.8}>
                  <Text style={cpStyles.addTagBtnText}>Add</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[cpStyles.createSubmitBtn, (!name.trim() || creating) && { opacity: 0.45 }]}
                onPress={create}
                activeOpacity={0.8}
                disabled={!name.trim() || creating}
              >
                {creating
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={cpStyles.createSubmitText}>Create Playlist</Text>
                }
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── Real song rows ───────────────────────────────────────────────────────────

function RealSongRow({ track, accent, onDelete }: { track: CuratedSong; accent: string; onDelete?: () => void }) {
  return (
    <TouchableOpacity style={pdStyles.songRow} activeOpacity={0.75}>
      {track.album_art
        ? <Image source={{ uri: track.album_art }} style={[pdStyles.songArt, { borderRadius: 8 }]} />
        : <View style={[pdStyles.songArt, { backgroundColor: accent + '30', alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ fontSize: 13 }}>🎵</Text>
          </View>
      }
      <View style={pdStyles.songInfo}>
        <Text style={pdStyles.songTitle} numberOfLines={1}>{track.track_name}</Text>
        <Text style={pdStyles.songArtist} numberOfLines={1}>{track.track_artist}</Text>
      </View>
      {onDelete && (
        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="trash-outline" size={16} color="rgba(255,255,255,0.22)" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  )
}

function SpotifyTrackRow({ track, accent }: { track: SpotifyTrackResult; accent: string }) {
  return (
    <TouchableOpacity style={pdStyles.songRow} activeOpacity={0.75}>
      {track.albumArt
        ? <Image source={{ uri: track.albumArt }} style={[pdStyles.songArt, { borderRadius: 8 }]} />
        : <View style={[pdStyles.songArt, { backgroundColor: accent + '30', alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ fontSize: 13 }}>🎵</Text>
          </View>
      }
      <View style={pdStyles.songInfo}>
        <Text style={pdStyles.songTitle} numberOfLines={1}>{track.name}</Text>
        <Text style={pdStyles.songArtist} numberOfLines={1}>{track.artist}</Text>
      </View>
    </TouchableOpacity>
  )
}

// ─── Curated playlist detail overlay ─────────────────────────────────────────

function CuratedPlaylistDetailOverlay({
  playlist, userId, onClose, onUpdated,
}: {
  playlist: CuratedPlaylist
  userId: string
  onClose: () => void
  onUpdated: (updated: CuratedPlaylist) => void
}) {
  const insets = useSafeAreaInsets()
  const slideX = useRef(new Animated.Value(SW)).current
  const [songs, setSongs] = useState<CuratedSong[]>([])
  const [songsLoading, setSongsLoading] = useState(true)
  const [showOnProfile, setShowOnProfile] = useState(playlist.show_on_profile)
  const [showAddSong, setShowAddSong] = useState(false)

  const ACCENT = '#AB00FF'

  useEffect(() => {
    Animated.spring(slideX, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }).start()
    loadSongs()
  }, [])

  const loadSongs = async () => {
    setSongsLoading(true)
    const { data } = await supabase
      .from('curated_playlist_songs')
      .select('*')
      .eq('playlist_id', playlist.id)
      .order('position', { ascending: true })
    setSongs((data ?? []) as CuratedSong[])
    setSongsLoading(false)
  }

  const handleClose = () => {
    Animated.timing(slideX, { toValue: SW, duration: 260, useNativeDriver: true }).start(onClose)
  }

  const toggleShowOnProfile = async () => {
    const newVal = !showOnProfile
    setShowOnProfile(newVal)
    await supabase.from('curated_playlists').update({ show_on_profile: newVal }).eq('id', playlist.id)
    onUpdated({ ...playlist, show_on_profile: newVal })
  }

  const deleteSong = async (songId: string) => {
    await supabase.from('curated_playlist_songs').delete().eq('id', songId)
    setSongs(prev => prev.filter(s => s.id !== songId))
  }

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, { dx, dy }) => dx > 8 && dx > Math.abs(dy) * 2,
    onShouldBlockNativeResponder: () => false,
    onPanResponderMove: (_, { dx }) => { if (dx > 0) slideX.setValue(dx) },
    onPanResponderRelease: (_, { dx, vx }) => {
      if (dx > SW * 0.3 || vx > 0.8) handleClose()
      else Animated.spring(slideX, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }).start()
    },
    onPanResponderTerminate: () => {
      Animated.spring(slideX, { toValue: 0, useNativeDriver: true }).start()
    },
  })).current

  return (
    <Modal transparent animationType="none" statusBarTranslucent onRequestClose={handleClose}>
      <Animated.View style={[StyleSheet.absoluteFill, pdStyles.screen, { transform: [{ translateX: slideX }] }]} {...pan.panHandlers}>
        <FlatList
          data={songs}
          keyExtractor={s => s.id}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            songsLoading
              ? <ActivityIndicator color={ACCENT} style={{ marginTop: 32 }} />
              : <View style={{ alignItems: 'center', paddingTop: 40 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 15 }}>No songs yet</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.15)', fontSize: 13, marginTop: 6 }}>Tap "Add Song" above to get started</Text>
                </View>
          }
          ListHeaderComponent={
            <>
              {/* ── Hero ── */}
              <View style={[pdStyles.hero, { minHeight: 340 + insets.top }]}>
                {/* Full-bleed background: cover image or mosaic of album arts */}
                {playlist.image_url ? (
                  <Image source={{ uri: playlist.image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : songs.length > 0 ? (
                  <View style={[StyleSheet.absoluteFill, { flexDirection: 'row', flexWrap: 'wrap' }]}>
                    {songs.slice(0, 4).map((s, i) =>
                      s.album_art
                        ? <Image key={s.id} source={{ uri: s.album_art }} style={{ width: '50%', height: '50%' }} resizeMode="cover" />
                        : <View key={s.id} style={{ width: '50%', height: '50%', backgroundColor: ACCENT + (i % 2 === 0 ? '55' : '33') }} />
                    )}
                  </View>
                ) : (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: ACCENT + '33' }]} />
                )}
                {/* Dark gradient overlay so text is readable over the image */}
                <LinearGradient
                  colors={['rgba(0,0,0,0.18)', 'rgba(0,0,0,0.55)', '#0D0D0D']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                {/* Back button – absolutely positioned so it doesn't disturb flex-end flow */}
                <TouchableOpacity
                  style={[pdStyles.backBtn, { paddingTop: insets.top + 6 }]}
                  onPress={handleClose}
                  activeOpacity={0.7}
                >
                  <Text style={pdStyles.backIcon}>‹</Text>
                </TouchableOpacity>

                {/* Title block */}
                <View style={pdStyles.heroInfo}>
                  <Text style={pdStyles.heroTitle} numberOfLines={2}>{playlist.name}</Text>
                  <View style={pdStyles.heroMetaRow}>
                    <View style={[pdStyles.sourceIconBadge, { backgroundColor: '#AB00FF' }]}>
                      <Text style={pdStyles.sourceIconText}>T</Text>
                    </View>
                    <Text style={pdStyles.heroMetaText}>Curated</Text>
                    <Text style={pdStyles.heroMetaDot}>·</Text>
                    <Text style={pdStyles.heroMetaText}>{songs.length} Song{songs.length !== 1 ? 's' : ''}</Text>
                    {playlist.tags.length > 0 && (
                      <>
                        <Text style={pdStyles.heroMetaDot}>·</Text>
                        <Text style={pdStyles.heroMetaText}>{playlist.tags.slice(0, 2).join(', ')}</Text>
                      </>
                    )}
                  </View>

                  {/* Show on profile toggle */}
                  <TouchableOpacity
                    style={[pdStyles.showOnProfileBtn, showOnProfile && { borderColor: ACCENT, backgroundColor: ACCENT + '18' }]}
                    onPress={toggleShowOnProfile}
                    activeOpacity={0.8}
                  >
                    {showOnProfile && <Text style={[pdStyles.showOnProfileText, { color: ACCENT }]}>✓ </Text>}
                    <Text style={[pdStyles.showOnProfileText, showOnProfile && { color: ACCENT }]}>
                      {showOnProfile ? 'Showing on profile' : 'Show on profile'}
                    </Text>
                  </TouchableOpacity>

                  {/* Add Song button */}
                  <TouchableOpacity style={cpStyles.addSongBtn} onPress={() => setShowAddSong(true)} activeOpacity={0.8}>
                    <Ionicons name="add-circle-outline" size={16} color="#FF6C1A" />
                    <Text style={cpStyles.addSongBtnText}>Add Song</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={[pdStyles.playBtn, { backgroundColor: ACCENT }]} activeOpacity={0.85}>
                  <Text style={pdStyles.playIcon}>▶</Text>
                </TouchableOpacity>
              </View>

              {/* ── Action bar ── */}
              <View style={pdStyles.actionBar}>
                <TouchableOpacity style={pdStyles.actionBtn} activeOpacity={0.7}>
                  <Text style={pdStyles.actionIcon}>↺</Text>
                </TouchableOpacity>
                <TouchableOpacity style={pdStyles.actionBtn} activeOpacity={0.7}>
                  <Text style={pdStyles.actionIcon}>♡</Text>
                </TouchableOpacity>
                <TouchableOpacity style={pdStyles.actionBtn} activeOpacity={0.7}>
                  <Text style={pdStyles.actionIcon}>↓</Text>
                </TouchableOpacity>
                <TouchableOpacity style={pdStyles.actionBtn} activeOpacity={0.7}>
                  <Text style={[pdStyles.actionIcon, { fontSize: 22, letterSpacing: 2 }]}>···</Text>
                </TouchableOpacity>
              </View>
              <View style={pdStyles.songListDivider} />
            </>
          }
          renderItem={({ item }) => (
            <RealSongRow track={item} accent={ACCENT} onDelete={() => deleteSong(item.id)} />
          )}
          ItemSeparatorComponent={() => <View style={pdStyles.songDivider} />}
        />
      </Animated.View>

      {showAddSong && (
        <AddSongDialog
          playlistId={playlist.id}
          userId={userId}
          onClose={() => setShowAddSong(false)}
          onAdded={loadSongs}
        />
      )}
    </Modal>
  )
}

// ─── Spotify playlist detail overlay ─────────────────────────────────────────

function SpotifyPlaylistDetailOverlay({
  playlist, userId, onClose,
}: {
  playlist: SpotifyPlaylist
  userId: string
  onClose: () => void
}) {
  const insets = useSafeAreaInsets()
  const slideX = useRef(new Animated.Value(SW)).current
  const [tracks, setTracks] = useState<SpotifyTrackResult[]>([])
  const [tracksLoading, setTracksLoading] = useState(true)
  const [showOnProfile, setShowOnProfile] = useState(false)

  const ACCENT = '#1DB954'

  useEffect(() => {
    Animated.spring(slideX, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }).start()
    // Check if already showing on profile
    supabase.from('spotify_playlist_profile')
      .select('playlist_id')
      .eq('user_id', userId)
      .eq('playlist_id', playlist.id)
      .maybeSingle()
      .then(({ data }) => setShowOnProfile(!!data))
    // Load tracks
    ;(async () => {
      const token = await getValidSpotifyToken(userId)
      if (!token) { setTracksLoading(false); return }
      const { tracks: t } = await getPlaylistTracks(token, playlist.id)
      setTracks(t)
      setTracksLoading(false)
    })()
  }, [])

  const handleClose = () => {
    Animated.timing(slideX, { toValue: SW, duration: 260, useNativeDriver: true }).start(onClose)
  }

  const toggleShowOnProfile = async () => {
    const newVal = !showOnProfile
    setShowOnProfile(newVal)
    if (newVal) {
      await supabase.from('spotify_playlist_profile').upsert({ user_id: userId, playlist_id: playlist.id })
    } else {
      await supabase.from('spotify_playlist_profile').delete()
        .eq('user_id', userId).eq('playlist_id', playlist.id)
    }
  }

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, { dx, dy }) => dx > 8 && dx > Math.abs(dy) * 2,
    onShouldBlockNativeResponder: () => false,
    onPanResponderMove: (_, { dx }) => { if (dx > 0) slideX.setValue(dx) },
    onPanResponderRelease: (_, { dx, vx }) => {
      if (dx > SW * 0.3 || vx > 0.8) handleClose()
      else Animated.spring(slideX, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }).start()
    },
    onPanResponderTerminate: () => {
      Animated.spring(slideX, { toValue: 0, useNativeDriver: true }).start()
    },
  })).current

  return (
    <Modal transparent animationType="none" statusBarTranslucent onRequestClose={handleClose}>
      <Animated.View style={[StyleSheet.absoluteFill, pdStyles.screen, { transform: [{ translateX: slideX }] }]} {...pan.panHandlers}>
        <FlatList
          data={tracks}
          keyExtractor={t => t.id}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            tracksLoading
              ? <ActivityIndicator color={ACCENT} style={{ marginTop: 32 }} />
              : <View style={{ alignItems: 'center', paddingTop: 40 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 15 }}>No tracks found</Text>
                </View>
          }
          ListHeaderComponent={
            <>
              {/* ── Hero ── */}
              <View style={[pdStyles.hero, { minHeight: 340 + insets.top }]}>
                {/* Full-bleed background: cover image or mosaic of album arts */}
                {playlist.imageUrl ? (
                  <Image source={{ uri: playlist.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : tracks.length > 0 ? (
                  <View style={[StyleSheet.absoluteFill, { flexDirection: 'row', flexWrap: 'wrap' }]}>
                    {tracks.slice(0, 4).map((t, i) =>
                      t.albumArt
                        ? <Image key={t.id} source={{ uri: t.albumArt }} style={{ width: '50%', height: '50%' }} resizeMode="cover" />
                        : <View key={t.id} style={{ width: '50%', height: '50%', backgroundColor: ACCENT + (i % 2 === 0 ? '55' : '33') }} />
                    )}
                  </View>
                ) : (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0a1a0a' }]} />
                )}
                {/* Dark gradient overlay so text is readable over the image */}
                <LinearGradient
                  colors={['rgba(0,0,0,0.18)', 'rgba(0,0,0,0.55)', '#0D0D0D']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                {/* Back button – absolutely positioned so it doesn't disturb flex-end flow */}
                <TouchableOpacity
                  style={[pdStyles.backBtn, { paddingTop: insets.top + 6 }]}
                  onPress={handleClose}
                  activeOpacity={0.7}
                >
                  <Text style={pdStyles.backIcon}>‹</Text>
                </TouchableOpacity>

                {/* Title block */}
                <View style={pdStyles.heroInfo}>
                  <Text style={pdStyles.heroTitle} numberOfLines={2}>{playlist.name}</Text>
                  <View style={pdStyles.heroMetaRow}>
                    <View style={[pdStyles.sourceIconBadge, { backgroundColor: '#1DB954' }]}>
                      <Text style={pdStyles.sourceIconText}>S</Text>
                    </View>
                    <Text style={pdStyles.heroMetaText}>Spotify</Text>
                    <Text style={pdStyles.heroMetaDot}>·</Text>
                    <Text style={pdStyles.heroMetaText}>{playlist.trackCount} Song{playlist.trackCount !== 1 ? 's' : ''}</Text>
                  </View>

                  {/* Show on profile toggle */}
                  <TouchableOpacity
                    style={[pdStyles.showOnProfileBtn, showOnProfile && { borderColor: ACCENT, backgroundColor: ACCENT + '18' }]}
                    onPress={toggleShowOnProfile}
                    activeOpacity={0.8}
                  >
                    {showOnProfile && <Text style={[pdStyles.showOnProfileText, { color: ACCENT }]}>✓ </Text>}
                    <Text style={[pdStyles.showOnProfileText, showOnProfile && { color: ACCENT }]}>
                      {showOnProfile ? 'Showing on profile' : 'Show on profile'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={[pdStyles.playBtn, { backgroundColor: ACCENT }]} activeOpacity={0.85}>
                  <Text style={pdStyles.playIcon}>▶</Text>
                </TouchableOpacity>
              </View>

              {/* ── Action bar ── */}
              <View style={pdStyles.actionBar}>
                <TouchableOpacity style={pdStyles.actionBtn} activeOpacity={0.7}>
                  <Text style={pdStyles.actionIcon}>↺</Text>
                </TouchableOpacity>
                <TouchableOpacity style={pdStyles.actionBtn} activeOpacity={0.7}>
                  <Text style={pdStyles.actionIcon}>♡</Text>
                </TouchableOpacity>
                <TouchableOpacity style={pdStyles.actionBtn} activeOpacity={0.7}>
                  <Text style={pdStyles.actionIcon}>↓</Text>
                </TouchableOpacity>
                <TouchableOpacity style={pdStyles.actionBtn} activeOpacity={0.7}>
                  <Text style={[pdStyles.actionIcon, { fontSize: 22, letterSpacing: 2 }]}>···</Text>
                </TouchableOpacity>
              </View>
              <View style={pdStyles.songListDivider} />
            </>
          }
          renderItem={({ item }) => <SpotifyTrackRow track={item} accent={ACCENT} />}
          ItemSeparatorComponent={() => <View style={pdStyles.songDivider} />}
        />
      </Animated.View>
    </Modal>
  )
}

const pdStyles = StyleSheet.create({
  screen: { backgroundColor: "#0D0D0D" },
  hero: { minHeight: 340, justifyContent: "flex-end", overflow: "hidden" },
  backBtn: { position: "absolute", top: 0, left: 0, paddingHorizontal: 18, paddingBottom: 0, zIndex: 10 },
  backIcon: { fontSize: 32, color: "#fff", fontWeight: "300", lineHeight: 36 },
  artMosaic: { flexDirection: "row", flexWrap: "wrap", width: 130, height: 130, borderRadius: 16, overflow: "hidden", alignSelf: "center", marginBottom: 20 },
  mosaicCell: { width: 65, height: 65 },
  heroInfo: { paddingHorizontal: 20, paddingBottom: 24 },
  heroTitle: { fontSize: 28, fontWeight: "900", color: "#fff", lineHeight: 34, marginBottom: 10 },
  heroMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14, flexWrap: "wrap" },
  sourceIconBadge: { width: 18, height: 18, borderRadius: 4, alignItems: "center", justifyContent: "center" },
  sourceIconText: { fontSize: 10, fontWeight: "900", color: "#fff" },
  heroMetaText: { fontSize: 13, color: "rgba(255,255,255,0.55)", fontWeight: "500" },
  heroMetaDot: { fontSize: 13, color: "rgba(255,255,255,0.25)" },
  showOnProfileBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  showOnProfileText: { fontSize: 13, color: "#fff", fontWeight: "600" },
  playBtn: { position: "absolute", bottom: 20, right: 20, width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
  playIcon: { fontSize: 20, color: "#fff", marginLeft: 3 },
  actionBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" },
  actionBtn: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4 },
  actionIcon: { fontSize: 24, color: "rgba(255,255,255,0.7)" },
  actionCount: { fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: "600" },
  songListDivider: { height: 8 },
  songRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 14 },
  songInfo: { flex: 1 },
  songTitle: { fontSize: 15, fontWeight: "600", color: "#fff", marginBottom: 3 },
  songArtist: { fontSize: 13, color: "rgba(255,255,255,0.4)" },
  songArt: { width: 46, height: 46, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  songDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.05)", marginHorizontal: 16 },
});

const cpStyles = StyleSheet.create({
  // Filter pills
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.04)' },
  filterBtnActive: { borderColor: '#FF6C1A', backgroundColor: 'rgba(255,108,26,0.12)' },
  filterLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.38)' },
  filterLabelActive: { color: '#FF6C1A' },
  // Create playlist button
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: 'rgba(255,108,26,0.07)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,108,26,0.18)', marginBottom: 6 },
  createBtnText: { fontSize: 14, fontWeight: '700', color: '#FF6C1A' },
  // Profile badge on card
  profileBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, backgroundColor: 'rgba(171,0,255,0.15)', marginRight: 2 },
  profileBadgeText: { fontSize: 10, fontWeight: '700', color: '#AB00FF' },
  // Dialog overlay + sheet
  dialogOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
  dialogSheet: { backgroundColor: '#161618', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.08)', maxHeight: SH * 0.88 },
  dialogHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', marginBottom: 20 },
  dialogTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 18 },
  // Image picker
  imagePicker: { width: 90, height: 90, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 20, overflow: 'hidden' },
  imagePickerText: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 },
  // Form fields
  label: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.35)', letterSpacing: 0.9, marginBottom: 8 },
  input: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#fff', marginBottom: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  // Tags
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  tagChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: 'rgba(171,0,255,0.14)', borderWidth: 1, borderColor: 'rgba(171,0,255,0.28)' },
  tagChipText: { fontSize: 12, fontWeight: '600', color: '#AB00FF' },
  tagInputRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  tagInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  addTagBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center' },
  addTagBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  // Create submit
  createSubmitBtn: { backgroundColor: '#FF6C1A', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  createSubmitText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  // Mode tabs (Add Song dialog)
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  modeBtnActive: { backgroundColor: 'rgba(255,108,26,0.12)', borderColor: '#FF6C1A' },
  modeBtnText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.4)' },
  modeBtnTextActive: { color: '#FF6C1A' },
  // Search
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  searchInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  searchBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#FF6C1A', alignItems: 'center', justifyContent: 'center' },
  // Track rows
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  trackArt: { width: 46, height: 46, borderRadius: 8, backgroundColor: '#1a0a2e', flexShrink: 0 },
  trackInfo: { flex: 1 },
  trackName: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 2 },
  trackArtist: { fontSize: 12, color: 'rgba(255,255,255,0.38)' },
  // Add buttons
  addBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(255,108,26,0.12)', borderWidth: 1, borderColor: 'rgba(255,108,26,0.25)' },
  addBtnText: { fontSize: 12, fontWeight: '700', color: '#FF6C1A' },
  addBtnDone: { backgroundColor: 'rgba(29,185,84,0.12)', borderColor: 'rgba(29,185,84,0.3)' },
  addBtnTextDone: { color: '#1DB954' },
  // Add Song button in detail hero
  addSongBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(255,108,26,0.1)', borderWidth: 1, borderColor: 'rgba(255,108,26,0.28)', marginTop: 10 },
  addSongBtnText: { fontSize: 13, fontWeight: '700', color: '#FF6C1A' },
});

// ─── Playlist list cards ──────────────────────────────────────────────────────

function CuratedPlaylistCard({ pl, onPress }: { pl: CuratedPlaylist; onPress: () => void }) {
  return (
    <TouchableOpacity style={profileStyles.playlistListItem} onPress={onPress} activeOpacity={0.82}>
      <View style={[profileStyles.playlistListArt, { backgroundColor: '#1a0030' }]}>
        {pl.image_url
          ? <Image source={{ uri: pl.image_url }} style={{ width: 56, height: 56 }} resizeMode="cover" />
          : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 22 }}>🎵</Text>
            </View>
        }
      </View>
      <View style={{ flex: 1 }}>
        <Text style={profileStyles.playlistListName} numberOfLines={1}>{pl.name}</Text>
        <Text style={profileStyles.playlistListMeta}>
          {pl.tags.length > 0 ? pl.tags.slice(0, 2).join(' · ') : 'Curated'}
        </Text>
      </View>
      {pl.show_on_profile && (
        <View style={cpStyles.profileBadge}>
          <Text style={cpStyles.profileBadgeText}>On profile</Text>
        </View>
      )}
      <Text style={profileStyles.playlistChevron}>›</Text>
    </TouchableOpacity>
  );
}

function SpotifyPlaylistCard({ pl, onPress }: { pl: SpotifyPlaylist; onPress: () => void }) {
  return (
    <TouchableOpacity style={profileStyles.playlistListItem} onPress={onPress} activeOpacity={0.82}>
      <View style={[profileStyles.playlistListArt, { backgroundColor: '#0a1a0a' }]}>
        {pl.imageUrl
          ? <Image source={{ uri: pl.imageUrl }} style={{ width: 56, height: 56 }} resizeMode="cover" />
          : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 22 }}>🎵</Text>
            </View>
        }
      </View>
      <View style={{ flex: 1 }}>
        <Text style={profileStyles.playlistListName} numberOfLines={1}>{pl.name}</Text>
        <Text style={profileStyles.playlistListMeta}>{pl.trackCount} song{pl.trackCount !== 1 ? 's' : ''}</Text>
      </View>
      <Text style={profileStyles.playlistChevron}>›</Text>
    </TouchableOpacity>
  );
}

function CommunityCard({ co }: { co: DummyCommunity }) {
  return (
    <TouchableOpacity style={profileStyles.communityCard} activeOpacity={0.82}>
      <View style={[profileStyles.communityIcon, { backgroundColor: co.color + "18" }]}>
        <Text style={{ fontSize: 22 }}>👥</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={profileStyles.communityName}>{co.name}</Text>
        <Text style={profileStyles.communityDesc} numberOfLines={1}>{co.desc}</Text>
      </View>
      <Text style={[profileStyles.communityMembers, { color: co.color }]}>{co.members}</Text>
    </TouchableOpacity>
  );
}

function ProfileTabs({ userId }: { userId: string | null }) {
  const [active, setActive]             = useState<ProfileTab>("Posts");
  const [myPosts, setMyPosts]           = useState<Post[]>(_myPostsCache ?? []);
  const [postsLoading, setPostsLoading] = useState(!_myPostsCache);
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const contentAnim   = useRef(new Animated.Value(1)).current;
  const activeRef     = useRef<ProfileTab>("Posts");
  const tabWidth = (SW - 32) / PROFILE_TABS.length;

  // ── Playlist state ─────────────────────────────────────────────────────────
  const [playlistFilter, setPlaylistFilter] = useState<'curated' | 'spotify'>('curated');
  const [curatedPlaylists, setCuratedPlaylists] = useState<CuratedPlaylist[]>([]);
  const [curatedLoading, setCuratedLoading]     = useState(false);
  const [curatedLoaded, setCuratedLoaded]       = useState(false);
  const [spotifyPlaylists, setSpotifyPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [spLoading, setSpLoading]               = useState(false);
  const [spLoaded, setSpLoaded]                 = useState(false);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [openCurated, setOpenCurated]   = useState<CuratedPlaylist | null>(null);
  const [openSpotify, setOpenSpotify]   = useState<SpotifyPlaylist | null>(null);

  // ── Posts effect ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId || _myPostsCache) return;
    setPostsLoading(true);
    supabase
      .from("posts")
      .select("id, type, text, media_urls, song_id, song_name, song_artist, song_album_art, poll_question, poll_options, created_at, likes_count, comments_count, users!user_id(id, username, display_name, avatar_url)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (!error && data) {
          const posts = data.map(dbRowToPost);
          _myPostsCache = posts;
          setMyPosts(posts);
        }
        setPostsLoading(false);
      });
  }, [userId]);

  // ── Load curated playlists when tab is active ──────────────────────────────
  useEffect(() => {
    if (active !== 'Playlists' || playlistFilter !== 'curated' || curatedLoaded || !userId) return;
    setCuratedLoading(true);
    supabase
      .from('curated_playlists')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setCuratedPlaylists((data ?? []) as CuratedPlaylist[]);
        setCuratedLoading(false);
        setCuratedLoaded(true);
      });
  }, [active, playlistFilter, userId, curatedLoaded]);

  // ── Load Spotify playlists when tab is active ──────────────────────────────
  useEffect(() => {
    if (active !== 'Playlists' || playlistFilter !== 'spotify' || spLoaded || !userId) return;
    setSpLoading(true);
    getValidSpotifyToken(userId).then(async token => {
      if (!token) { setSpLoading(false); return; }
      const pls = await getUserPlaylists(token);
      setSpotifyPlaylists(pls);
      setSpLoading(false);
      setSpLoaded(true);
    });
  }, [active, playlistFilter, userId, spLoaded]);

  // ── Tab switcher ───────────────────────────────────────────────────────────
  const switchTo = (tab: ProfileTab, index: number) => {
    activeRef.current = tab;
    setActive(tab);
    contentAnim.setValue(0.5);
    Animated.timing(contentAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    Animated.spring(indicatorAnim, { toValue: index * tabWidth, useNativeDriver: true, damping: 22, stiffness: 280 }).start();
  };

  // Swipe left/right to change tabs
  const swipePan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, { dx, dy }) =>
      Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 2,
    onShouldBlockNativeResponder: () => false,
    onPanResponderRelease: (_, { dx, vx }) => {
      const idx = PROFILE_TABS.indexOf(activeRef.current);
      if ((dx < -50 || vx < -0.5) && idx < PROFILE_TABS.length - 1) {
        const next = idx + 1;
        activeRef.current = PROFILE_TABS[next];
        setActive(PROFILE_TABS[next]);
        contentAnim.setValue(0.5);
        Animated.timing(contentAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
        Animated.spring(indicatorAnim, { toValue: next * tabWidth, useNativeDriver: true, damping: 22, stiffness: 280 }).start();
      } else if ((dx > 50 || vx > 0.5) && idx > 0) {
        const prev = idx - 1;
        activeRef.current = PROFILE_TABS[prev];
        setActive(PROFILE_TABS[prev]);
        contentAnim.setValue(0.5);
        Animated.timing(contentAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
        Animated.spring(indicatorAnim, { toValue: prev * tabWidth, useNativeDriver: true, damping: 22, stiffness: 280 }).start();
      }
    },
  })).current;

  // ── Render content ─────────────────────────────────────────────────────────
  const renderContent = () => {
    if (active === "Posts") {
      if (postsLoading) return <ActivityIndicator color="#FF6C1A" style={{ marginTop: 48 }} />;
      if (myPosts.length === 0) {
        return (
          <View style={{ alignItems: "center", paddingTop: 52 }}>
            <Text style={{ color: "rgba(255,255,255,0.25)", fontSize: 15 }}>No posts yet</Text>
          </View>
        );
      }
      return (
        <View style={{ gap: 12, paddingTop: 12 }}>
          {myPosts.map((post) => <PostCard key={post.id} item={post} />)}
        </View>
      );
    }

    if (active === "Reposts") {
      return (
        <View style={{ gap: 12, paddingTop: 12 }}>
          {PROFILE_REPOSTS.map((post) => (
            <View key={post.id}>
              <View style={profileStyles.repostLabel}>
                <Text style={profileStyles.repostLabelText}>↺  Reposted</Text>
              </View>
              <PostCard item={post} />
            </View>
          ))}
        </View>
      );
    }

    if (active === "Playlists") {
      return (
        <View style={{ paddingTop: 12 }}>
          {/* ── Filter: Curated Playlists / Spotify Playlists ── */}
          <View style={cpStyles.filterRow}>
            <TouchableOpacity
              style={[cpStyles.filterBtn, playlistFilter === 'curated' && cpStyles.filterBtnActive]}
              onPress={() => setPlaylistFilter('curated')}
            >
              <Text style={[cpStyles.filterLabel, playlistFilter === 'curated' && cpStyles.filterLabelActive]}>
                Curated Playlists
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[cpStyles.filterBtn, playlistFilter === 'spotify' && cpStyles.filterBtnActive]}
              onPress={() => setPlaylistFilter('spotify')}
            >
              <Text style={[cpStyles.filterLabel, playlistFilter === 'spotify' && cpStyles.filterLabelActive]}>
                Spotify Playlists
              </Text>
            </TouchableOpacity>
          </View>

          {playlistFilter === 'curated' ? (
            <>
              {/* Create playlist button */}
              <TouchableOpacity
                style={cpStyles.createBtn}
                onPress={() => setShowCreatePlaylist(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={18} color="#FF6C1A" />
                <Text style={cpStyles.createBtnText}>Create Playlist</Text>
              </TouchableOpacity>

              {curatedLoading ? (
                <ActivityIndicator color="#FF6C1A" style={{ marginTop: 28 }} />
              ) : curatedPlaylists.length === 0 ? (
                <View style={{ alignItems: 'center', paddingTop: 36 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 15 }}>No curated playlists yet</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.15)', fontSize: 13, marginTop: 6 }}>Create one above to get started</Text>
                </View>
              ) : (
                <View style={{ gap: 6 }}>
                  {curatedPlaylists.map(pl => (
                    <CuratedPlaylistCard
                      key={pl.id}
                      pl={pl}
                      onPress={() => setOpenCurated(pl)}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <>
              {spLoading ? (
                <ActivityIndicator color="#1DB954" style={{ marginTop: 28 }} />
              ) : spotifyPlaylists.length === 0 && spLoaded ? (
                <View style={{ alignItems: 'center', paddingTop: 36 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 15 }}>No Spotify playlists found</Text>
                </View>
              ) : (
                <View style={{ gap: 6 }}>
                  {spotifyPlaylists.map(pl => (
                    <SpotifyPlaylistCard
                      key={pl.id}
                      pl={pl}
                      onPress={() => setOpenSpotify(pl)}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      );
    }

    return (
      <View style={{ gap: 10, paddingTop: 12 }}>
        {DUMMY_COMMUNITIES.map((co) => <CommunityCard key={co.id} co={co} />)}
      </View>
    );
  };

  return (
    <View style={profileStyles.tabsWrap} {...swipePan.panHandlers}>
      {/* Tab row */}
      <View style={profileStyles.tabRow}>
        <Animated.View
          style={[profileStyles.tabIndicator, { width: tabWidth, transform: [{ translateX: indicatorAnim }] }]}
        >
          <LinearGradient
            colors={["#FF6C1A", "#CC4200"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        {PROFILE_TABS.map((tab, i) => (
          <TouchableOpacity
            key={tab}
            style={[profileStyles.tabBtn, { width: tabWidth }]}
            onPress={() => switchTo(tab, i)}
            activeOpacity={0.7}
          >
            <Text style={[profileStyles.tabLabel, active === tab && profileStyles.tabLabelActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content fades in on tab switch */}
      <Animated.View style={{ opacity: contentAnim }}>
        {renderContent()}
      </Animated.View>

      {/* ── Modals ── */}
      {showCreatePlaylist && userId && (
        <CreatePlaylistDialog
          userId={userId}
          onClose={() => setShowCreatePlaylist(false)}
          onCreate={(pl) => {
            setCuratedPlaylists(prev => [pl, ...prev]);
            setShowCreatePlaylist(false);
          }}
        />
      )}

      {openCurated && userId && (
        <CuratedPlaylistDetailOverlay
          playlist={openCurated}
          userId={userId}
          onClose={() => setOpenCurated(null)}
          onUpdated={(updated) => {
            setCuratedPlaylists(prev => prev.map(p => p.id === updated.id ? updated : p));
            setOpenCurated(updated);
          }}
        />
      )}

      {openSpotify && userId && (
        <SpotifyPlaylistDetailOverlay
          playlist={openSpotify}
          userId={userId}
          onClose={() => setOpenSpotify(null)}
        />
      )}
    </View>
  );
}

// ─── Profile view ─────────────────────────────────────────────────────────────

const PROFILE_BANNER_H = 172;
const PROFILE_AVATAR_SIZE = 86;
const PROFILE_AVATAR_OVERLAP = Math.round(PROFILE_AVATAR_SIZE * 0.44);

// Cached once per login session — cleared on pull-to-refresh
let _profileCache:      UserProfile    | null = null;
let _myPostsCache:      Post[]         | null = null;
let _conversationsCache: ConversationInfo[] | null = null;

const BANNER_PALETTE = [
  "#FF3B30", "#FF6C1A", "#FF9500", "#FFCC00",
  "#A3D977", "#30D158", "#00C7BE", "#0A84FF",
  "#6E6AE8", "#BF5AF2", "#FF375F", "#FF2D55",
  "#8E8E93", "#3A3A3C", "#1C1C1E", "#0D0D0D",
];
// 4 swatches per row, 10px gap between them, 20px padding on each side
const SWATCH_SIZE = Math.floor((SW - 40 - 30) / 4);
const PALETTE_ROWS: string[][] = [];
for (let i = 0; i < BANNER_PALETTE.length; i += 4) {
  PALETTE_ROWS.push(BANNER_PALETTE.slice(i, i + 4));
}

const BANNER_SHAPES = [
  { key: "none",     label: "None"     },
  { key: "circle",   label: "Circle"   },
  { key: "ring",     label: "Ring"     },
  { key: "square",   label: "Square"   },
  { key: "diamond",  label: "Diamond"  },
  { key: "triangle", label: "Triangle" },
  { key: "oval",     label: "Oval"     },
  { key: "plus",     label: "Plus"     },
  { key: "arc",      label: "Arc"      },
];
const SHAPE_ROWS: { key: string; label: string }[][] = [];
for (let i = 0; i < BANNER_SHAPES.length; i += 4) {
  SHAPE_ROWS.push(BANNER_SHAPES.slice(i, i + 4));
}

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

function isLightColor(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

function daysRemaining(fromIso: string, totalDays: number): number {
  const elapsed = Math.floor((Date.now() - new Date(fromIso).getTime()) / 86_400_000);
  return Math.max(0, totalDays - elapsed);
}

// ─── Song Search Overlay ──────────────────────────────────────────────────────

type PinnedSong = { id: string; name: string; artist: string; albumArt: string | null; previewUrl: string | null };

type BaseStep = "home" | "search" | "playlists" | { type: "playlistTracks"; id: string; name: string };
type PinStep = BaseStep | { type: "preview"; song: PinnedSong; from: BaseStep };

type NowPlayingSnap = { id: string; name: string; artist: string; albumArt: string | null; previewUrl: string | null } | null;

function PinnedSongOverlay({ visible, onClose, onSelect, accessToken, ctaLabel = "Pin to Profile", ctaIcon = "thumbtack" }: {
  visible: boolean;
  onClose: () => void;
  onSelect: (song: PinnedSong) => void;
  accessToken: string | null;
  ctaLabel?: string;
  ctaIcon?: string;
}) {
  const [step, setStep] = useState<PinStep>("home");
  const [nowPlaying, setNowPlaying] = useState<NowPlayingSnap>(null);
  const [loadingNow, setLoadingNow] = useState(false);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [playlistTracks, setPlaylistTracks] = useState<SpotifyTrackResult[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SpotifyTrackResult[]>([]);
  const [searching, setSearching] = useState(false);
  // Preview audio state
  const [previewPositionMs, setPreviewPositionMs] = useState(0);
  const [previewDurationMs, setPreviewDurationMs] = useState(30_000);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewSaved, setPreviewSaved] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const slideAnim = useRef(new Animated.Value(600)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      setStep("home");
      setQuery("");
      setSearchResults([]);
      setPlaylists([]);
      setPlaylistTracks([]);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
      if (accessToken) {
        setLoadingNow(true);
        getCurrentlyPlaying(accessToken).then((res) => {
          if (res && !("unauthorized" in res) && res.id) {
            setNowPlaying({ id: res.id, name: res.name, artist: res.artist, albumArt: res.albumArt ?? null, previewUrl: res.previewUrl ?? null });
          } else {
            setNowPlaying(null);
          }
          setLoadingNow(false);
        });
      }
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 600, duration: 200, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  useEffect(() => {
    if (step === "playlists" && accessToken && playlists.length === 0 && !loadingPlaylists) {
      setLoadingPlaylists(true);
      getUserPlaylists(accessToken).then((pls) => { setPlaylists(pls); setLoadingPlaylists(false); });
    }
  }, [step]);

  useEffect(() => {
    if (typeof step === "object" && step.type === "playlistTracks" && accessToken) {
      setLoadingTracks(true);
      setPlaylistTracks([]);
      getPlaylistTracks(accessToken, step.id).then(({ tracks }) => { setPlaylistTracks(tracks); setLoadingTracks(false); });
    }
  }, [step]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!query.trim() || !accessToken) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      const res = await searchSpotifyTracks(accessToken, query.trim());
      setSearchResults(res);
      setSearching(false);
    }, 450);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query]);

  // Load & play preview audio whenever the preview step is active
  const previewSongId  = typeof step === "object" && step.type === "preview" ? step.song.id       : undefined;
  const previewSongUrl = typeof step === "object" && step.type === "preview" ? step.song.previewUrl : undefined;

  useEffect(() => {
    let active = true;
    let localSound: Audio.Sound | null = null;

    const cleanup = () => {
      active = false;
      const s = localSound ?? soundRef.current;
      if (s) { s.stopAsync().catch(() => {}); s.unloadAsync().catch(() => {}); }
      soundRef.current = null;
      setPreviewPlaying(false);
      setPreviewPositionMs(0);
    };

    if (!previewSongUrl) { cleanup(); return cleanup; }

    setPreviewLoading(true);
    setPreviewPositionMs(0);
    setPreviewDurationMs(30_000);
    setPreviewSaved(false);

    Audio.setAudioModeAsync({ playsInSilentModeIOS: true, shouldDuckAndroid: true }).then(() =>
      Audio.Sound.createAsync(
        { uri: previewSongUrl },
        { shouldPlay: true },
        (status) => {
          if (!active || !status.isLoaded) return;
          setPreviewPositionMs(status.positionMillis);
          if (status.durationMillis) setPreviewDurationMs(status.durationMillis);
          setPreviewPlaying(status.isPlaying);
        },
      )
    ).then(({ sound: s }) => {
      if (!active) { s.stopAsync().catch(() => {}); s.unloadAsync().catch(() => {}); return; }
      localSound = s;
      soundRef.current = s;
      setPreviewLoading(false);
    }).catch(() => { if (active) setPreviewLoading(false); });

    return cleanup;
  }, [previewSongId]);

  // Stop audio when overlay closes
  useEffect(() => {
    if (!visible && soundRef.current) {
      soundRef.current.stopAsync().catch(() => {});
      soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
  }, [visible]);

  const pin = (song: PinnedSong) => { onSelect(song); onClose(); };

  const goBack = () => {
    if (typeof step === "object" && step.type === "preview") setStep(step.from);
    else if (typeof step === "object" && step.type === "playlistTracks") setStep("playlists");
    else setStep("home");
  };

  const togglePreviewPlayback = async () => {
    if (!soundRef.current) return;
    if (previewPlaying) await soundRef.current.pauseAsync();
    else await soundRef.current.playAsync();
  };

  const savePreviewToLiked = async () => {
    if (typeof step !== "object" || step.type !== "preview" || !accessToken) return;
    const ok = await saveTrackToLiked(accessToken, step.song.id);
    if (ok) setPreviewSaved(true);
  };

  const fmtMs = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  const title = step === "home" ? "Pin a Song"
    : step === "search" ? "Search Spotify"
    : step === "playlists" ? "Playlists"
    : typeof step === "object" && step.type === "playlistTracks" ? step.name
    : typeof step === "object" && step.type === "preview" ? "Preview"
    : "Pin a Song";

  const isSubStep = step !== "home";

  const TrackRow = ({ item }: { item: SpotifyTrackResult }) => (
    <TouchableOpacity
      style={epOverlayStyles.resultRow}
      activeOpacity={0.75}
      onPress={() => setStep({ type: "preview", song: { id: item.id, name: item.name, artist: item.artist, albumArt: item.albumArt, previewUrl: item.previewUrl }, from: step as BaseStep })}
    >
      {item.albumArt ? (
        <Image source={{ uri: item.albumArt }} style={epOverlayStyles.resultArt} />
      ) : (
        <View style={[epOverlayStyles.resultArt, epOverlayStyles.resultArtFallback]}>
          <FontAwesome5 name="music" size={12} color="rgba(255,255,255,0.3)" />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={epOverlayStyles.resultTrack} numberOfLines={1}>{item.name}</Text>
        <Text style={epOverlayStyles.resultArtist} numberOfLines={1}>{item.artist}</Text>
      </View>
    </TouchableOpacity>
  );

  // Rendered inside EditProfileOverlay's Modal as an Animated.View overlay (no nested Modal)
  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { zIndex: 100, opacity: backdropAnim }]}
      pointerEvents={visible ? "auto" : "none"}
    >
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.70)" }]} onPress={onClose} />
      <Animated.View style={[psStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={epOverlayStyles.handle} />
        <View style={epOverlayStyles.sheetHeader}>
          <TouchableOpacity onPress={isSubStep ? goBack : onClose} hitSlop={12} style={psStyles.navBtn}>
            <FontAwesome5
              name={isSubStep ? "chevron-left" : "times"}
              size={isSubStep ? 14 : 16}
              color="rgba(255,255,255,0.55)"
            />
          </TouchableOpacity>
          <Text style={epOverlayStyles.sheetTitle}>{title}</Text>
          {isSubStep ? (
            <TouchableOpacity onPress={onClose} hitSlop={12} style={psStyles.navBtn}>
              <FontAwesome5 name="times" size={16} color="rgba(255,255,255,0.55)" />
            </TouchableOpacity>
          ) : (
            <View style={psStyles.navBtn} />
          )}
        </View>

        {/* ── HOME ── */}
        {step === "home" && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={psStyles.homeContent} showsVerticalScrollIndicator={false}>
            <Text style={psStyles.sectionLabel}>NOW PLAYING</Text>
            {loadingNow ? (
              <ActivityIndicator color="#1DB954" style={{ marginVertical: 24 }} />
            ) : nowPlaying ? (
              <TouchableOpacity
                style={psStyles.nowPlayingCard}
                activeOpacity={0.82}
                onPress={() => setStep({ type: "preview", song: nowPlaying, from: "home" })}
              >
                {nowPlaying.albumArt ? (
                  <Image source={{ uri: nowPlaying.albumArt }} style={psStyles.npArt} />
                ) : (
                  <View style={[psStyles.npArt, psStyles.npArtFallback]}>
                    <FontAwesome5 name="music" size={18} color="rgba(255,255,255,0.25)" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={psStyles.npTrack} numberOfLines={1}>{nowPlaying.name}</Text>
                  <Text style={psStyles.npArtist} numberOfLines={1}>{nowPlaying.artist}</Text>
                </View>
                <FontAwesome5 name="chevron-right" size={12} color="rgba(255,255,255,0.25)" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={psStyles.addSongBtn} onPress={() => setStep("search")} activeOpacity={0.8}>
                <FontAwesome5 name="plus" size={14} color="#fff" />
                <Text style={psStyles.addSongText}>Add Song</Text>
              </TouchableOpacity>
            )}

            <View style={psStyles.divider} />

            <TouchableOpacity style={psStyles.menuRow} onPress={() => setStep("search")} activeOpacity={0.75}>
              <View style={[psStyles.menuIcon, { backgroundColor: "rgba(255,108,26,0.15)" }]}>
                <FontAwesome5 name="search" size={14} color="#FF6C1A" />
              </View>
              <Text style={psStyles.menuLabel}>Search Spotify</Text>
              <FontAwesome5 name="chevron-right" size={12} color="rgba(255,255,255,0.2)" />
            </TouchableOpacity>

            <TouchableOpacity style={psStyles.menuRow} onPress={() => setStep("playlists")} activeOpacity={0.75}>
              <View style={[psStyles.menuIcon, { backgroundColor: "rgba(29,185,84,0.12)" }]}>
                <FontAwesome5 name="list-ul" size={13} color="#1DB954" />
              </View>
              <Text style={psStyles.menuLabel}>Browse Playlists</Text>
              <FontAwesome5 name="chevron-right" size={12} color="rgba(255,255,255,0.2)" />
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* ── SEARCH ── */}
        {step === "search" && (
          <>
            <View style={epOverlayStyles.searchRow}>
              <FontAwesome5 name="search" size={14} color="rgba(255,255,255,0.3)" style={{ marginRight: 8 }} />
              <TextInput
                style={epOverlayStyles.searchInput}
                placeholder="Search Spotify…"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={query}
                onChangeText={setQuery}
                autoFocus
              />
              {searching && <ActivityIndicator size="small" color="#1DB954" />}
            </View>
            <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {searchResults.map((item) => <TrackRow key={item.id} item={item} />)}
              {!searching && query.trim() && searchResults.length === 0 && (
                <Text style={epOverlayStyles.emptyText}>No results for "{query}"</Text>
              )}
              {!query.trim() && <Text style={epOverlayStyles.emptyText}>Type to search Spotify</Text>}
            </ScrollView>
          </>
        )}

        {/* ── PLAYLISTS ── */}
        {step === "playlists" && (
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {loadingPlaylists ? (
              <ActivityIndicator color="#1DB954" style={{ marginTop: 48 }} />
            ) : playlists.length === 0 ? (
              <Text style={epOverlayStyles.emptyText}>No playlists found</Text>
            ) : playlists.map((pl) => (
              <TouchableOpacity
                key={pl.id}
                style={epOverlayStyles.resultRow}
                activeOpacity={0.75}
                onPress={() => setStep({ type: "playlistTracks", id: pl.id, name: pl.name })}
              >
                {pl.isLiked ? (
                  <View style={[psStyles.plArt, psStyles.likedArt]}>
                    <FontAwesome5 name="heart" size={18} color="#1DB954" />
                  </View>
                ) : pl.imageUrl ? (
                  <Image source={{ uri: pl.imageUrl }} style={psStyles.plArt} />
                ) : (
                  <View style={[psStyles.plArt, psStyles.plArtFallback]}>
                    <FontAwesome5 name="music" size={16} color="rgba(255,255,255,0.2)" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={epOverlayStyles.resultTrack} numberOfLines={1}>{pl.name}</Text>
                  <Text style={epOverlayStyles.resultArtist}>{pl.trackCount} songs</Text>
                </View>
                <FontAwesome5 name="chevron-right" size={11} color="rgba(255,255,255,0.2)" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* ── PLAYLIST TRACKS ── */}
        {typeof step === "object" && step.type === "playlistTracks" && (
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {loadingTracks ? (
              <ActivityIndicator color="#1DB954" style={{ marginTop: 48 }} />
            ) : playlistTracks.length === 0 ? (
              <Text style={epOverlayStyles.emptyText}>No tracks in this playlist</Text>
            ) : playlistTracks.map((item) => <TrackRow key={item.id} item={item} />)}
          </ScrollView>
        )}

        {/* ── PREVIEW ── */}
        {typeof step === "object" && step.type === "preview" && (() => {
          const song = step.song;
          const capMs = Math.min(previewDurationMs, 30_000);
          const progress = capMs > 0 ? Math.min(previewPositionMs / capMs, 1) : 0;
          return (
            <View style={psStyles.previewWrap}>
              {/* Album art */}
              {song.albumArt ? (
                <Image source={{ uri: song.albumArt }} style={psStyles.previewArt} />
              ) : (
                <View style={[psStyles.previewArt, psStyles.previewArtFallback]}>
                  <FontAwesome5 name="music" size={40} color="rgba(255,255,255,0.15)" />
                </View>
              )}

              {/* Track info */}
              <Text style={psStyles.previewTrack} numberOfLines={2}>{song.name}</Text>
              <Text style={psStyles.previewArtist} numberOfLines={1}>{song.artist}</Text>

              {/* Progress + times */}
              {song.previewUrl ? (
                <>
                  <View style={psStyles.previewProgressTrack}>
                    <View style={[psStyles.previewProgressFill, { width: `${progress * 100}%` as any }]} />
                  </View>
                  <View style={psStyles.previewTimes}>
                    <Text style={psStyles.previewTime}>{fmtMs(previewPositionMs)}</Text>
                    <Text style={psStyles.previewTime}>{fmtMs(capMs)}</Text>
                  </View>
                  {/* Play / Pause */}
                  <TouchableOpacity
                    style={psStyles.playPauseBtn}
                    onPress={togglePreviewPlayback}
                    activeOpacity={0.8}
                    disabled={previewLoading}
                  >
                    {previewLoading
                      ? <ActivityIndicator color="#fff" />
                      : <FontAwesome5 name={previewPlaying ? "pause" : "play"} size={22} color="#fff" />
                    }
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={psStyles.noPreviewText}>No preview available</Text>
              )}

              {/* Actions row */}
              <View style={psStyles.previewActions}>
                <TouchableOpacity
                  style={psStyles.openBtn}
                  activeOpacity={0.8}
                  onPress={() => openSpotifyLink(`spotify:track:${song.id}`, `https://open.spotify.com/track/${song.id}`)}
                >
                  <FontAwesome5 name="spotify" size={14} color="#1DB954" />
                  <Text style={psStyles.openBtnText}>Open</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[psStyles.saveBtn, previewSaved && psStyles.saveBtnSaved]}
                  activeOpacity={0.8}
                  onPress={savePreviewToLiked}
                  disabled={previewSaved}
                >
                  <FontAwesome5
                    name={previewSaved ? "heart" : "heart"}
                    size={13}
                    color={previewSaved ? "#1DB954" : "rgba(255,255,255,0.7)"}
                  />
                  <Text style={[psStyles.saveBtnText, previewSaved && psStyles.saveBtnTextSaved]}>
                    {previewSaved ? "Saved" : "Save to Playlist"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Action CTA */}
              <TouchableOpacity style={psStyles.pinCTA} onPress={() => pin(song)} activeOpacity={0.85}>
                <FontAwesome5 name={ctaIcon} size={13} color="#000" />
                <Text style={psStyles.pinCTAText}>{ctaLabel}</Text>
              </TouchableOpacity>
            </View>
          );
        })()}
      </Animated.View>
    </Animated.View>
  );
}

// ─── Edit Profile Overlay ─────────────────────────────────────────────────────

type EditFormData = {
  display_name: string;
  username: string;
  bio: string;
  avatar_url: string | null;
  banner_color: string | null;
  banner_image_url: string | null;
  banner_shape: string | null;
  banner_shape_color: string | null;
  username_changed_at: string | null;
  display_name_change_count: number;
  display_name_window_start: string | null;
  pinned_song_id: string | null;
  pinned_song_name: string | null;
  pinned_song_artist: string | null;
  pinned_song_album_art: string | null;
  profile_links: string[];
  social_links: Record<string, string>;
};

// ─── Banner Color Overlay ─────────────────────────────────────────────────────

function BannerColorOverlay({ visible, onClose, selectedColor, bannerImageUrl, onSelectColor, onSelectImage, userId, selectedShape, selectedShapeColor, onSelectShape, onSelectShapeColor }: {
  visible: boolean;
  onClose: () => void;
  selectedColor: string | null;
  bannerImageUrl: string | null;
  onSelectColor: (color: string) => void;
  onSelectImage: (uri: string) => void;
  userId: string | null;
  selectedShape: string | null;
  selectedShapeColor: string | null;
  onSelectShape: (shape: string) => void;
  onSelectShapeColor: (color: string) => void;
}) {
  const slideAnim = useRef(new Animated.Value(500)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [imageUploading, setImageUploading] = useState(false);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 500, duration: 200, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const pickBannerImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission needed", "Allow photo access to set a banner image."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"] as any,
      allowsEditing: true,
      aspect: [16, 9] as [number, number],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0] || !userId) return;
    setImageUploading(true);
    try {
      const uri = result.assets[0].uri;
      const mimeType = result.assets[0].mimeType ?? "image/jpeg";
      const fileName = `${userId}/banner`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });
      // delete first so upsert doesn't get blocked by same-key caching
      await supabase.storage.from("banners").remove([fileName]);
      const { error: uploadError } = await supabase.storage
        .from("banners")
        .upload(fileName, arrayBuffer, { contentType: mimeType, upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("banners").getPublicUrl(fileName);
      onSelectImage(`${publicUrl}?t=${Date.now()}`);
      onClose();
    } catch (e: any) {
      Alert.alert("Upload failed", e.message ?? "Could not upload image.");
    } finally {
      setImageUploading(false);
    }
  };

  // Rendered inside the edit sheet's Animated.View — no nested Modal needed
  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { zIndex: 50, opacity: backdropAnim }]}
      pointerEvents={visible ? "auto" : "none"}
    >
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.55)" }]} onPress={onClose} />
      <Animated.View style={[bcOverlayStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={bcOverlayStyles.handle} />
        <View style={bcOverlayStyles.header}>
          <Text style={bcOverlayStyles.title}>Banner</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Text style={bcOverlayStyles.closeBtn}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={bcOverlayStyles.content} showsVerticalScrollIndicator={false}>
          {/* Add Image */}
          <TouchableOpacity
            style={bcOverlayStyles.imageBox}
            onPress={pickBannerImage}
            activeOpacity={0.75}
            disabled={imageUploading}
          >
            {imageUploading ? (
              <ActivityIndicator color="#FF6C1A" />
            ) : bannerImageUrl ? (
              <>
                <Image source={{ uri: bannerImageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                <View style={bcOverlayStyles.imageOverlay}>
                  <FontAwesome5 name="camera" size={18} color="#fff" />
                  <Text style={bcOverlayStyles.imageBoxText}>Change Image</Text>
                </View>
              </>
            ) : (
              <>
                <FontAwesome5 name="image" size={24} color="rgba(255,255,255,0.28)" />
                <Text style={bcOverlayStyles.imageBoxText}>Add Banner Image</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={bcOverlayStyles.dividerRow}>
            <View style={bcOverlayStyles.dividerLine} />
            <Text style={bcOverlayStyles.dividerText}>or choose a color</Text>
            <View style={bcOverlayStyles.dividerLine} />
          </View>

          {/* Color grid */}
          {PALETTE_ROWS.map((row, rowIdx) => (
            <View key={rowIdx} style={bcOverlayStyles.colorRow}>
              {row.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    bcOverlayStyles.colorSwatch,
                    { backgroundColor: color, width: SWATCH_SIZE, height: SWATCH_SIZE },
                    selectedColor === color && !bannerImageUrl && bcOverlayStyles.colorSwatchSelected,
                  ]}
                  onPress={() => { onSelectColor(color); onClose(); }}
                  activeOpacity={0.8}
                >
                  {selectedColor === color && !bannerImageUrl && (
                    <FontAwesome5 name="check" size={14} color={isLightColor(color) ? "#000" : "#fff"} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {/* Shape section */}
          <View style={[bcOverlayStyles.dividerRow, { marginTop: 8 }]}>
            <View style={bcOverlayStyles.dividerLine} />
            <Text style={bcOverlayStyles.dividerText}>shape</Text>
            <View style={bcOverlayStyles.dividerLine} />
          </View>
          <View style={{ opacity: bannerImageUrl ? 0.3 : 1 }} pointerEvents={bannerImageUrl ? "none" : "auto"}>
            {bannerImageUrl ? (
              <Text style={bsOverlayStyles.disabledHint}>Remove the image to use a shape</Text>
            ) : null}
            {SHAPE_ROWS.map((row, rowIdx) => (
              <View key={rowIdx} style={bcOverlayStyles.colorRow}>
                {row.map(({ key, label }) => {
                  const isNone = key === "none";
                  const isSelected = isNone ? !selectedShape : selectedShape === key;
                  const previewColor = isSelected ? (selectedShapeColor ?? "#fff") : "rgba(255,255,255,0.55)";
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[bsOverlayStyles.shapeCell, { width: SWATCH_SIZE }, isSelected && bsOverlayStyles.shapeCellSelected]}
                      onPress={() => onSelectShape(key)}
                      activeOpacity={0.75}
                    >
                      <View style={bsOverlayStyles.shapeIconWrap}>
                        {isNone ? (
                          <FontAwesome5 name="ban" size={22} color={isSelected ? "#FF6C1A" : "rgba(255,255,255,0.4)"} />
                        ) : (
                          <BannerShape shape={key} color={previewColor} size={30} />
                        )}
                      </View>
                      <Text style={[bsOverlayStyles.shapeLabel, isSelected && bsOverlayStyles.shapeLabelSelected]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            <View style={[bcOverlayStyles.dividerRow, { marginTop: 8 }]}>
              <View style={bcOverlayStyles.dividerLine} />
              <Text style={bcOverlayStyles.dividerText}>shape color</Text>
              <View style={bcOverlayStyles.dividerLine} />
            </View>
            {PALETTE_ROWS.map((row, rowIdx) => (
              <View key={rowIdx} style={bcOverlayStyles.colorRow}>
                {row.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      bcOverlayStyles.colorSwatch,
                      { backgroundColor: color, width: SWATCH_SIZE, height: SWATCH_SIZE },
                      selectedShapeColor === color && bcOverlayStyles.colorSwatchSelected,
                    ]}
                    onPress={() => onSelectShapeColor(color)}
                    activeOpacity={0.8}
                  >
                    {selectedShapeColor === color && (
                      <FontAwesome5 name="check" size={14} color={isLightColor(color) ? "#000" : "#fff"} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}



function EditProfileOverlay({ visible, onClose, initialData, onSaved, accessToken, userId }: {
  visible: boolean;
  onClose: () => void;
  initialData: EditFormData;
  onSaved: (data: EditFormData) => void;
  accessToken: string | null;
  userId: string | null;
}) {
  const [form, setForm] = useState<EditFormData>(initialData);
  const [saving, setSaving] = useState(false);
  const [songSearchOpen, setSongSearchOpen] = useState(false);
  const [bannerColorOpen, setBannerColorOpen] = useState(false);
  const [newLink, setNewLink] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const slideAnim = useRef(new Animated.Value(800)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setForm(initialData);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 190 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 800, duration: 250, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission needed", "Allow photo access to set a profile picture."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"] as any,
      allowsEditing: true,
      aspect: [1, 1] as [number, number],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0] || !userId) return;
    setAvatarUploading(true);
    try {
      const uri = result.assets[0].uri;
      const ext = uri.split(".").pop() ?? "jpg";
      const fileName = `${userId}/avatar.${ext}`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, arrayBuffer, { contentType: `image/${ext}`, upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName);
      setForm((f) => ({ ...f, avatar_url: publicUrl }));
    } catch (e: any) {
      Alert.alert("Upload failed", e.message ?? "Could not upload image.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const addLink = () => {
    const trimmed = newLink.trim();
    if (!trimmed) return;
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    setForm((f) => ({ ...f, profile_links: [...f.profile_links, withProtocol] }));
    setNewLink("");
  };

  const removeLink = (idx: number) =>
    setForm((f) => ({ ...f, profile_links: f.profile_links.filter((_, i) => i !== idx) }));

  const setSocialLink = (key: string, value: string) => {
    setForm((f) => {
      const next = { ...f.social_links };
      if (value.trim()) {
        // Ensure the URL has a protocol
        next[key] = /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;
      } else {
        delete next[key];
      }
      return { ...f, social_links: next };
    });
  };

  // ── Cooldown state ──────────────────────────────────────────────────────────
  const usernameDaysLeft = form.username_changed_at
    ? daysRemaining(form.username_changed_at, 14)
    : 0;
  const isUsernameLocked = usernameDaysLeft > 0;

  const dnWindowExpired =
    !form.display_name_window_start ||
    daysRemaining(form.display_name_window_start, 30) === 0;
  const dnChangesUsed = dnWindowExpired ? 0 : (form.display_name_change_count ?? 0);
  const dnChangesLeft = Math.max(0, 2 - dnChangesUsed);
  const isDNLocked = dnChangesLeft === 0;
  const dnDaysLeft = isDNLocked && form.display_name_window_start
    ? daysRemaining(form.display_name_window_start, 30)
    : 0;

  const usernameLabelSuffix = isUsernameLocked
    ? ` [${usernameDaysLeft} day${usernameDaysLeft !== 1 ? "s" : ""}]`
    : "";
  const dnLabelSuffix = isDNLocked
    ? ` [${dnDaysLeft} day${dnDaysLeft !== 1 ? "s" : ""}]`
    : dnChangesLeft < 2
    ? ` [${dnChangesLeft} left]`
    : "";

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const usernameChanged = form.username.trim() !== (initialData.username ?? "");
      const displayNameChanged = form.display_name.trim() !== (initialData.display_name ?? "");

      let newUsernameChangedAt = form.username_changed_at;
      let newDNCount = form.display_name_change_count ?? 0;
      let newDNWindowStart = form.display_name_window_start;

      if (usernameChanged && !isUsernameLocked) {
        newUsernameChangedAt = new Date().toISOString();
      }

      if (displayNameChanged && !isDNLocked) {
        if (dnWindowExpired) {
          newDNWindowStart = new Date().toISOString();
          newDNCount = 1;
        } else {
          newDNCount = (form.display_name_change_count ?? 0) + 1;
        }
      }

      const { error } = await supabase.from("users").update({
        display_name: (isDNLocked ? initialData.display_name : form.display_name.trim()) || null,
        username: (isUsernameLocked ? initialData.username : form.username.trim()) || null,
        bio: form.bio.trim() || null,
        avatar_url: form.avatar_url,
        banner_color: form.banner_color,
        banner_image_url: form.banner_image_url,
        banner_shape: form.banner_shape,
        banner_shape_color: form.banner_shape_color,
        username_changed_at: newUsernameChangedAt,
        display_name_change_count: newDNCount,
        display_name_window_start: newDNWindowStart,
        pinned_song_id: form.pinned_song_id,
        pinned_song_name: form.pinned_song_name,
        pinned_song_artist: form.pinned_song_artist,
        pinned_song_album_art: form.pinned_song_album_art,
        profile_links: form.profile_links,
        social_links: form.social_links,
      }).eq("id", userId);
      if (error) throw error;
      onSaved({
        ...form,
        username_changed_at: newUsernameChangedAt,
        display_name_change_count: newDNCount,
        display_name_window_start: newDNWindowStart,
      });
      onClose();
    } catch (e: any) {
      Alert.alert("Save failed", e.message ?? "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  const initials = form.display_name
    ? form.display_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, epOverlayStyles.backdrop, { opacity: backdropAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <Animated.View style={[epOverlayStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>

            <View style={epOverlayStyles.sheetHeader}>
              <TouchableOpacity onPress={onClose} hitSlop={12}>
                <Text style={epOverlayStyles.cancelBtn}>Cancel</Text>
              </TouchableOpacity>
              <Text style={epOverlayStyles.sheetTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={save} disabled={saving} hitSlop={8}>
                {saving
                  ? <ActivityIndicator size="small" color="#FF6C1A" />
                  : <Text style={epOverlayStyles.saveBtn}>Save</Text>}
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              {/* ── Banner ── */}
              <View style={epOverlayStyles.section}>
                <Text style={epOverlayStyles.sectionLabel}>BANNER</Text>
                <View style={epOverlayStyles.bannerPreview}>
                  {form.banner_image_url ? (
                    <View style={StyleSheet.absoluteFill} pointerEvents="none">
                      <Image source={{ uri: form.banner_image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    </View>
                  ) : form.banner_color ? (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: form.banner_color }]} pointerEvents="none" />
                  ) : (
                    <LinearGradient
                      colors={["#3D0C00", "#CC4200", "#FF6C1A", "#CC4200", "#3D0C00"]}
                      locations={[0, 0.25, 0.5, 0.75, 1]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={StyleSheet.absoluteFill}
                      pointerEvents="none"
                    />
                  )}
                  {form.banner_shape && !form.banner_image_url ? (
                    <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]} pointerEvents="none">
                      <BannerShape shape={form.banner_shape} color={form.banner_shape_color ?? "#ffffff"} size={56} />
                    </View>
                  ) : null}
                  <TouchableOpacity
                    style={[StyleSheet.absoluteFill, { alignItems: "flex-end", justifyContent: "flex-end", padding: 10 }]}
                    activeOpacity={0.8}
                    onPress={() => setBannerColorOpen(true)}
                  >
                    <View style={epOverlayStyles.bannerEditBtn}>
                      <FontAwesome5 name="pen" size={10} color="#fff" />
                      <Text style={epOverlayStyles.bannerEditText}>Edit Banner</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              {/* ── Avatar ── */}
              <View style={epOverlayStyles.avatarSection}>
                <TouchableOpacity style={epOverlayStyles.avatarWrap} onPress={pickAvatar} activeOpacity={0.8}>
                  {avatarUploading ? (
                    <View style={[epOverlayStyles.avatarCircle, epOverlayStyles.avatarLoading]}>
                      <ActivityIndicator color="#fff" />
                    </View>
                  ) : form.avatar_url ? (
                    <Image source={{ uri: form.avatar_url }} style={epOverlayStyles.avatarCircle} />
                  ) : (
                    <View style={epOverlayStyles.avatarCircle}>
                      <Text style={epOverlayStyles.avatarInitials}>{initials}</Text>
                    </View>
                  )}
                  <View style={epOverlayStyles.avatarEditBadge}>
                    <FontAwesome5 name="camera" size={11} color="#fff" />
                  </View>
                </TouchableOpacity>
                <Text style={epOverlayStyles.avatarHint}>Tap to change photo</Text>
              </View>

              {/* ── Display name ── */}
              <View style={epOverlayStyles.section}>
                <Text style={epOverlayStyles.sectionLabel}>
                  {"DISPLAY NAME"}
                  {dnLabelSuffix ? (
                    <Text style={isDNLocked ? epOverlayStyles.cooldownBadgeLocked : epOverlayStyles.cooldownBadge}>
                      {dnLabelSuffix}
                    </Text>
                  ) : null}
                </Text>
                <TextInput
                  style={[epOverlayStyles.input, isDNLocked && epOverlayStyles.inputLocked]}
                  value={form.display_name}
                  onChangeText={(t) => !isDNLocked && setForm((f) => ({ ...f, display_name: t }))}
                  placeholder="Your name"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  editable={!isDNLocked}
                />
              </View>

              {/* ── Username ── */}
              <View style={epOverlayStyles.section}>
                <Text style={epOverlayStyles.sectionLabel}>
                  {"USERNAME"}
                  {usernameLabelSuffix ? (
                    <Text style={epOverlayStyles.cooldownBadgeLocked}>{usernameLabelSuffix}</Text>
                  ) : null}
                </Text>
                <TextInput
                  style={[epOverlayStyles.input, isUsernameLocked && epOverlayStyles.inputLocked]}
                  value={form.username}
                  onChangeText={(t) => !isUsernameLocked && setForm((f) => ({ ...f, username: t.replace(/\s/g, "").toLowerCase() }))}
                  placeholder="@handle"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  autoCapitalize="none"
                  editable={!isUsernameLocked}
                />
              </View>

              {/* ── Bio ── */}
              <View style={epOverlayStyles.section}>
                <Text style={epOverlayStyles.sectionLabel}>BIO</Text>
                <TextInput
                  style={[epOverlayStyles.input, epOverlayStyles.inputMulti]}
                  value={form.bio}
                  onChangeText={(t) => setForm((f) => ({ ...f, bio: t }))}
                  placeholder="Tell people about yourself…"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* ── Pinned song ── */}
              <View style={epOverlayStyles.section}>
                <Text style={epOverlayStyles.sectionLabel}>PINNED SONG</Text>
                <TouchableOpacity style={epOverlayStyles.songRow} activeOpacity={0.75} onPress={() => setSongSearchOpen(true)}>
                  {form.pinned_song_album_art ? (
                    <Image source={{ uri: form.pinned_song_album_art }} style={epOverlayStyles.songArt} />
                  ) : (
                    <View style={[epOverlayStyles.songArt, epOverlayStyles.songArtFallback]}>
                      <FontAwesome5 name="music" size={14} color="rgba(255,255,255,0.25)" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    {form.pinned_song_name ? (
                      <>
                        <Text style={epOverlayStyles.songName} numberOfLines={1}>{form.pinned_song_name}</Text>
                        <Text style={epOverlayStyles.songArtist} numberOfLines={1}>{form.pinned_song_artist}</Text>
                      </>
                    ) : (
                      <Text style={epOverlayStyles.songPlaceholder}>Choose a song to pin…</Text>
                    )}
                  </View>
                  <FontAwesome5 name="search" size={12} color="rgba(255,255,255,0.35)" />
                </TouchableOpacity>
                {form.pinned_song_id && (
                  <TouchableOpacity
                    style={epOverlayStyles.clearBtn}
                    onPress={() => setForm((f) => ({
                      ...f,
                      pinned_song_id: null, pinned_song_name: null,
                      pinned_song_artist: null, pinned_song_album_art: null,
                    }))}
                  >
                    <Text style={epOverlayStyles.clearBtnText}>Remove pinned song</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* ── Social Accounts ── */}
              <View style={epOverlayStyles.section}>
                <Text style={epOverlayStyles.sectionLabel}>SOCIAL ACCOUNTS</Text>
                {SOCIAL_PLATFORMS.map((p) => (
                  <View key={p.key} style={epOverlayStyles.socialRow}>
                    <View style={[epOverlayStyles.socialIconWrap, { backgroundColor: p.color + "22" }]}>
                      <FontAwesome5 name={p.icon} size={16} color={p.color} />
                    </View>
                    <TextInput
                      style={epOverlayStyles.socialInput}
                      value={form.social_links[p.key]?.replace(/^https?:\/\//, "") ?? ""}
                      onChangeText={(t) => setSocialLink(p.key, t)}
                      placeholder={p.placeholder}
                      placeholderTextColor="rgba(255,255,255,0.2)"
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="url"
                    />
                    {!!form.social_links[p.key] && (
                      <TouchableOpacity onPress={() => setSocialLink(p.key, "")} hitSlop={10}>
                        <FontAwesome5 name="times-circle" size={15} color="rgba(255,100,100,0.6)" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>

              {/* ── Links ── */}
              <View style={epOverlayStyles.section}>
                <Text style={epOverlayStyles.sectionLabel}>LINKS</Text>
                {form.profile_links.map((link, idx) => (
                  <View key={idx} style={epOverlayStyles.linkRow}>
                    <FontAwesome5 name="link" size={12} color="rgba(255,255,255,0.3)" style={{ marginRight: 8 }} />
                    <Text style={epOverlayStyles.linkText} numberOfLines={1}>{link}</Text>
                    <TouchableOpacity onPress={() => removeLink(idx)} hitSlop={10}>
                      <FontAwesome5 name="times" size={13} color="rgba(255,100,100,0.7)" />
                    </TouchableOpacity>
                  </View>
                ))}
                <View style={epOverlayStyles.linkInputRow}>
                  <TextInput
                    style={epOverlayStyles.linkInput}
                    value={newLink}
                    onChangeText={setNewLink}
                    placeholder="Add a link…"
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    onSubmitEditing={addLink}
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    style={[epOverlayStyles.addLinkBtn, !newLink.trim() && { opacity: 0.4 }]}
                    onPress={addLink}
                    disabled={!newLink.trim()}
                  >
                    <FontAwesome5 name="plus" size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>

          <BannerColorOverlay
            visible={bannerColorOpen}
            onClose={() => setBannerColorOpen(false)}
            selectedColor={form.banner_color}
            bannerImageUrl={form.banner_image_url}
            userId={userId}
            onSelectColor={(color) => setForm((f) => ({ ...f, banner_color: color, banner_image_url: null }))}
            onSelectImage={(uri) => setForm((f) => ({ ...f, banner_image_url: uri, banner_color: null }))}
            selectedShape={form.banner_shape}
            selectedShapeColor={form.banner_shape_color}
            onSelectShape={(shape) => setForm((f) => ({ ...f, banner_shape: shape === "none" ? null : shape }))}
            onSelectShapeColor={(color) => setForm((f) => ({ ...f, banner_shape_color: color }))}
          />
          <PinnedSongOverlay
            visible={songSearchOpen}
            onClose={() => setSongSearchOpen(false)}
            accessToken={accessToken}
            onSelect={(song) => setForm((f) => ({
              ...f,
              pinned_song_id: song.id,
              pinned_song_name: song.name,
              pinned_song_artist: song.artist,
              pinned_song_album_art: song.albumArt,
            }))}
          />
        </Animated.View>
      </Modal>
  );
}

// ─── Links sheet (mini overlay listing all profile links) ─────────────────────

// ─── Spotify URL parser + metadata fetcher (used by LinksSheet) ───────────────

function parseSpotifyUrl(url: string): { type: string; id: string } | null {
  const m = url.match(/open\.spotify\.com\/(track|artist|album|playlist)\/([A-Za-z0-9]+)/);
  return m ? { type: m[1], id: m[2] } : null;
}

type SpotifyLinkInfo = {
  resourceType: string;
  name: string;
  subtitle: string | null;
  imageUrl: string | null;
};

async function fetchSpotifyLinkInfo(
  token: string,
  type: string,
  id: string,
): Promise<SpotifyLinkInfo | null> {
  try {
    const ep = type === "playlist"
      ? `https://api.spotify.com/v1/playlists/${id}?fields=name,images,owner`
      : `https://api.spotify.com/v1/${type}s/${id}`;
    const res = await fetch(ep, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const d = await res.json();
    switch (type) {
      case "track":    return { resourceType: "track",    name: d.name, subtitle: d.artists?.[0]?.name ?? null, imageUrl: d.album?.images?.[0]?.url ?? null };
      case "artist":   return { resourceType: "artist",   name: d.name, subtitle: null,                         imageUrl: d.images?.[0]?.url ?? null };
      case "album":    return { resourceType: "album",    name: d.name, subtitle: d.artists?.[0]?.name ?? null, imageUrl: d.images?.[0]?.url ?? null };
      case "playlist": return { resourceType: "playlist", name: d.name, subtitle: `by ${d.owner?.display_name ?? "Spotify"}`, imageUrl: d.images?.[0]?.url ?? null };
      default:         return null;
    }
  } catch { return null; }
}

// ─── Links sheet styles ───────────────────────────────────────────────────────

const linksSheetStyles = StyleSheet.create({
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#1A1A1C",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: BOTTOM_INSET + 16,
    borderTopWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  handle:  { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", alignSelf: "center", marginTop: 10, marginBottom: 4 },
  heading: { fontSize: 11, fontWeight: "700", letterSpacing: 1, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10 },
  row:     { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 13, gap: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(255,255,255,0.07)" },
  iconWrap:    { width: 44, height: 44, borderRadius: 10, backgroundColor: "rgba(255,108,26,0.13)", alignItems: "center", justifyContent: "center" },
  spotifyWrap: { width: 44, height: 44, borderRadius: 10, backgroundColor: "rgba(29,185,84,0.12)", alignItems: "center", justifyContent: "center" },
  art:         { width: 44, height: 44, borderRadius: 8 },
  artCircle:   { width: 44, height: 44, borderRadius: 22 },
  domain: { fontSize: 14, fontWeight: "600", color: "#fff" },
  path:   { fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 1 },
});

// ─── Settings overlay ─────────────────────────────────────────────────────────

type SavedAccount = {
  email: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
};

const SAVED_ACCOUNTS_KEY = "trackmeet_saved_accounts";

function SettingsOverlay({
  profile,
  userId,
  onClose,
  onProfileRefresh,
}: {
  profile: UserProfile | null;
  userId: string | null;
  onClose: () => void;
  onProfileRefresh: () => void;
}) {
  const { resetSpotify, refresh: refreshNowPlaying } = useNowPlayingCtx();

  // Which screen is visible: 'main' | 'connected-apps'
  type Screen = 'main' | 'connected-apps';
  const [screen,      setScreen]      = useState<Screen>('main');
  const [showConfirm, setShowConfirm] = useState(false);
  const [signingOut,  setSigningOut]  = useState(false);

  // Connected-apps sub-screen state
  const [spotifyConnected,    setSpotifyConnected]    = useState(!!profile?.spotify_access_token);
  const [showDisconnectAlert, setShowDisconnectAlert] = useState(false);
  const [disconnecting,       setDisconnecting]       = useState(false);
  const [connecting,          setConnecting]          = useState(false);

  const slideAnim    = useRef(new Animated.Value(400)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  // Sub-screen slides in from the right (within the sheet)
  const subSlideX    = useRef(new Animated.Value(SW)).current;
  const router = useRouter();

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim,    { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 200 }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, []);

  const close = () => {
    Animated.parallel([
      Animated.timing(slideAnim,    { toValue: 400, duration: 200, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0,   duration: 180, useNativeDriver: true }),
    ]).start(onClose);
  };

  // Push to a sub-screen
  const openScreen = (s: Screen) => {
    setScreen(s);
    subSlideX.setValue(SW);
    Animated.spring(subSlideX, { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 220 }).start();
  };

  const goBack = () => {
    Animated.timing(subSlideX, { toValue: SW, duration: 220, useNativeDriver: true }).start(() => {
      setScreen('main');
      setShowDisconnectAlert(false);
    });
  };

  // ── Sign-out ──────────────────────────────────────────────────────────────
  const doSignOut = async (save: boolean) => {
    setSigningOut(true);
    try {
      if (save && profile) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const account: SavedAccount = {
            email: user.email,
            displayName: profile.display_name ?? profile.username ?? "",
            username: profile.username ?? "",
            avatarUrl: profile.avatar_url ?? null,
          };
          const raw = await SecureStore.getItemAsync(SAVED_ACCOUNTS_KEY);
          const existing: SavedAccount[] = raw ? JSON.parse(raw) : [];
          const merged = [account, ...existing.filter(a => a.email !== account.email)];
          await SecureStore.setItemAsync(SAVED_ACCOUNTS_KEY, JSON.stringify(merged));
        }
      }
      await supabase.auth.signOut();
      router.replace("/signup");
    } catch (e) {
      console.error("signOut error", e);
      setSigningOut(false);
    }
  };

  // ── Spotify disconnect ────────────────────────────────────────────────────
  const handleDisconnect = async () => {
    if (!userId) return;
    setDisconnecting(true);
    await disconnectSpotify(userId);
    // Immediately wipe context state so all screens reflect the change
    resetSpotify();
    setSpotifyConnected(false);
    setShowDisconnectAlert(false);
    setDisconnecting(false);
    onProfileRefresh();
  };

  // ── Spotify connect ───────────────────────────────────────────────────────
  const handleConnect = async () => {
    if (!userId || connecting) return;
    setConnecting(true);
    const result = await connectSpotify(userId);
    setConnecting(false);
    if ('success' in result && result.success) {
      // Wipe stale cache then immediately poll with the new token
      resetSpotify();
      refreshNowPlaying();
      setSpotifyConnected(true);
      onProfileRefresh();
    } else if ('error' in result) {
      console.log('[Settings] Spotify connect error:', result.error);
    }
  };

  return (
    <Modal transparent animationType="none" statusBarTranslucent onRequestClose={screen === 'main' ? close : goBack}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.55)", opacity: backdropAnim }]}
        pointerEvents="none"
      />
      <Pressable style={StyleSheet.absoluteFill} onPress={screen === 'main' ? close : goBack} />

      <Animated.View
        style={[settingsOverlayStyles.sheet, { transform: [{ translateY: slideAnim }] }]}
        pointerEvents="box-none"
      >
        <Pressable onPress={() => {}}>

          {/* ── MAIN SCREEN ─────────────────────────────────────────────── */}
          {screen === 'main' && (
            <>
              <View style={settingsOverlayStyles.handle} />
              <Text style={settingsOverlayStyles.title}>Settings</Text>

              {!showConfirm ? (
                <>
                  {/* Connected Apps row */}
                  <TouchableOpacity
                    style={settingsOverlayStyles.menuRow}
                    activeOpacity={0.8}
                    onPress={() => openScreen('connected-apps')}
                  >
                    <View style={settingsOverlayStyles.menuIconWrap}>
                      <Ionicons name="apps-outline" size={20} color="rgba(255,255,255,0.85)" />
                    </View>
                    <Text style={settingsOverlayStyles.menuLabel}>Connected Apps</Text>
                    <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.25)" />
                  </TouchableOpacity>

                  {/* Spacer */}
                  <View style={{ height: 8 }} />

                  {/* Log Out row */}
                  <TouchableOpacity
                    style={settingsOverlayStyles.logoutRow}
                    activeOpacity={0.8}
                    onPress={() => setShowConfirm(true)}
                  >
                    <View style={settingsOverlayStyles.logoutIconWrap}>
                      <Ionicons name="log-out-outline" size={20} color="#ff4d6d" />
                    </View>
                    <Text style={settingsOverlayStyles.logoutLabel}>Log Out</Text>
                    <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.25)" />
                  </TouchableOpacity>
                </>
              ) : (
                <View style={settingsOverlayStyles.confirmBlock}>
                  <Text style={settingsOverlayStyles.confirmTitle}>Save account?</Text>
                  <Text style={settingsOverlayStyles.confirmSub}>
                    Keep your account saved for quick sign-in next time.
                  </Text>
                  <TouchableOpacity
                    style={settingsOverlayStyles.saveBtn}
                    activeOpacity={0.85}
                    onPress={() => doSignOut(true)}
                    disabled={signingOut}
                  >
                    {signingOut
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={settingsOverlayStyles.saveBtnText}>Save & Sign Out</Text>
                    }
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={settingsOverlayStyles.skipBtn}
                    activeOpacity={0.8}
                    onPress={() => doSignOut(false)}
                    disabled={signingOut}
                  >
                    <Text style={settingsOverlayStyles.skipBtnText}>Just Sign Out</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {/* ── CONNECTED APPS SCREEN ───────────────────────────────────── */}
          {screen === 'connected-apps' && (
            <Animated.View style={{ transform: [{ translateX: subSlideX }] }}>
              {/* Drag handle (keeps visual parity with main screen) */}
              <View style={settingsOverlayStyles.handle} />
              {/* Sub-screen header */}
              <View style={settingsOverlayStyles.subHeader}>
                <TouchableOpacity style={settingsOverlayStyles.backBtn} activeOpacity={0.7} onPress={goBack}>
                  <Ionicons name="chevron-back" size={20} color="#fff" />
                </TouchableOpacity>
                <Text style={settingsOverlayStyles.subTitle}>Connected Apps</Text>
                <View style={{ width: 36 }} />
              </View>

              {/* Spotify row */}
              <View style={settingsOverlayStyles.appRow}>
                {/* Spotify logo */}
                <View style={settingsOverlayStyles.spotifyLogoWrap}>
                  <FontAwesome5 name="spotify" size={22} color="#1DB954" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={settingsOverlayStyles.appName}>Spotify</Text>
                  <Text style={settingsOverlayStyles.appStatus}>
                    {spotifyConnected ? "Connected" : "Not connected"}
                  </Text>
                </View>

                {spotifyConnected ? (
                  /* Connected state — green dot + X to disconnect */
                  <View style={settingsOverlayStyles.connectedRight}>
                    <View style={settingsOverlayStyles.connectedDot} />
                    <TouchableOpacity
                      style={settingsOverlayStyles.disconnectBtn}
                      activeOpacity={0.75}
                      onPress={() => setShowDisconnectAlert(true)}
                    >
                      <Ionicons name="close" size={15} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* Disconnected state — Connect button */
                  <TouchableOpacity
                    style={settingsOverlayStyles.connectBtn}
                    activeOpacity={0.85}
                    onPress={handleConnect}
                    disabled={connecting}
                  >
                    {connecting
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={settingsOverlayStyles.connectBtnText}>Connect</Text>
                    }
                  </TouchableOpacity>
                )}
              </View>

              {/* Disconnect confirm */}
              {showDisconnectAlert && (
                <View style={settingsOverlayStyles.disconnectConfirm}>
                  <Text style={settingsOverlayStyles.disconnectConfirmTitle}>Disconnect Spotify?</Text>
                  <Text style={settingsOverlayStyles.disconnectConfirmSub}>
                    Your now-playing and broadcasting data will be cleared.
                  </Text>
                  <View style={settingsOverlayStyles.disconnectBtnRow}>
                    <TouchableOpacity
                      style={settingsOverlayStyles.disconnectCancelBtn}
                      activeOpacity={0.8}
                      onPress={() => setShowDisconnectAlert(false)}
                    >
                      <Text style={settingsOverlayStyles.disconnectCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={settingsOverlayStyles.disconnectConfirmBtn}
                      activeOpacity={0.85}
                      onPress={handleDisconnect}
                      disabled={disconnecting}
                    >
                      {disconnecting
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={settingsOverlayStyles.disconnectConfirmText}>Disconnect</Text>
                      }
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </Animated.View>
          )}

        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const settingsOverlayStyles = StyleSheet.create({
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#1a1a1f",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingBottom: 40,
    overflow: "hidden",
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginTop: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginHorizontal: 12,
    marginTop: 4,
    backgroundColor: "rgba(255,77,109,0.08)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,77,109,0.18)",
  },
  logoutIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,77,109,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutLabel: { flex: 1, fontSize: 15, fontWeight: "600", color: "#ff4d6d" },
  confirmBlock: { paddingHorizontal: 20, paddingTop: 8, gap: 10 },
  confirmTitle: { fontSize: 19, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },
  confirmSub: { fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 18, marginBottom: 4 },
  saveBtn: {
    backgroundColor: "#AB00FF",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
  },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  skipBtn: {
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  skipBtnText: { fontSize: 15, fontWeight: "600", color: "rgba(255,255,255,0.55)" },

  // ── Generic menu row (used for Connected Apps, etc.) ──────────────────────
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginHorizontal: 12,
    marginTop: 4,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: "600", color: "#fff" },

  // ── Connected Apps sub-screen ─────────────────────────────────────────────
  subHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
    marginBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  subTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },

  // Spotify app row
  appRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginHorizontal: 16,
    marginVertical: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  spotifyLogoWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(29,185,84,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  appName:   { fontSize: 15, fontWeight: "700", color: "#fff" },
  appStatus: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 },

  // Right side of app row when connected
  connectedRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  connectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1DB954",
  },
  disconnectBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Connect button (when disconnected)
  connectBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#1DB954",
  },
  connectBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },

  // Disconnect confirmation block
  disconnectConfirm: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    backgroundColor: "rgba(255,77,109,0.08)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,77,109,0.18)",
    gap: 10,
  },
  disconnectConfirmTitle: { fontSize: 15, fontWeight: "700", color: "#fff" },
  disconnectConfirmSub:   { fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 18 },
  disconnectBtnRow:       { flexDirection: "row", gap: 10, marginTop: 2 },
  disconnectCancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  disconnectCancelText: { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.55)" },
  disconnectConfirmBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#ff4d6d",
  },
  disconnectConfirmText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});

// ─── Social links sheet (mini overlay listing all linked social accounts) ──────

function SocialLinksSheet({
  socialLinks,
  onClose,
}: {
  socialLinks: Record<string, string>;
  onClose: () => void;
}) {
  const slideAnim    = useRef(new Animated.Value(400)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim,    { toValue: 0, useNativeDriver: true, damping: 26, stiffness: 220 }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim,    { toValue: 400, duration: 220, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0,   duration: 180, useNativeDriver: true }),
    ]).start(onClose);
  };

  const linked = BANNER_PLATFORM_PRIORITY
    .map((k) => SOCIAL_PLATFORMS.find((p) => p.key === k)!)
    .filter((p) => !!socialLinks[p.key]);

  return (
    <Modal transparent visible animationType="none" onRequestClose={dismiss} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.55)", opacity: backdropAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
      </Animated.View>
      <Animated.View style={[linksSheetStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={linksSheetStyles.handle} />
        <Text style={linksSheetStyles.heading}>Social Accounts</Text>
        {linked.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={linksSheetStyles.row}
            activeOpacity={0.72}
            onPress={() => { Linking.openURL(socialLinks[p.key]).catch(() => {}); dismiss(); }}
          >
            <View style={[linksSheetStyles.iconWrap, { backgroundColor: p.color + "22" }]}>
              <FontAwesome5 name={p.icon} size={18} color={p.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={linksSheetStyles.domain}>{p.label}</Text>
              <Text style={linksSheetStyles.path} numberOfLines={1}>
                {socialLinks[p.key].replace(/^https?:\/\//, "")}
              </Text>
            </View>
            <FontAwesome5 name="external-link-alt" size={12} color="rgba(255,255,255,0.25)" />
          </TouchableOpacity>
        ))}
      </Animated.View>
    </Modal>
  );
}

// ─── Links sheet (mini overlay listing all profile links) ─────────────────────

function LinksSheet({
  links,
  onClose,
  accessToken,
}: {
  links: string[];
  onClose: () => void;
  accessToken: string | null;
}) {
  const slideAnim    = useRef(new Animated.Value(400)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  // Per-link Spotify metadata + loading flags
  const [infos,   setInfos]   = useState<(SpotifyLinkInfo | null)[]>(links.map(() => null));
  const [loading, setLoading] = useState<boolean[]>(
    links.map((url) => !!parseSpotifyUrl(url) && !!accessToken)
  );

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim,    { toValue: 0, useNativeDriver: true, damping: 26, stiffness: 220 }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    // Kick off Spotify fetches for any spotify URLs
    if (!accessToken) return;
    links.forEach((url, i) => {
      const parsed = parseSpotifyUrl(url);
      if (!parsed) return;
      fetchSpotifyLinkInfo(accessToken, parsed.type, parsed.id).then((info) => {
        setInfos((prev)   => { const n = [...prev];    n[i] = info;  return n; });
        setLoading((prev) => { const n = [...prev];    n[i] = false; return n; });
      });
    });
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim,    { toValue: 400, duration: 220, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0,   duration: 180, useNativeDriver: true }),
    ]).start(onClose);
  };

  const openLink = (url: string) => { Linking.openURL(url).catch(() => {}); dismiss(); };

  return (
    <Modal transparent visible animationType="none" onRequestClose={dismiss} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.55)", opacity: backdropAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
      </Animated.View>
      <Animated.View style={[linksSheetStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={linksSheetStyles.handle} />
        <Text style={linksSheetStyles.heading}>Links</Text>

        {links.map((url, i) => {
          const meta      = infos[i];
          const isLoading = loading[i];
          const isSpotify = !!parseSpotifyUrl(url);
          const clean     = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
          const domain    = clean.split("/")[0];
          const rest      = clean.slice(domain.length);

          const thumb = isSpotify
            ? isLoading
              ? <View style={linksSheetStyles.spotifyWrap}><ActivityIndicator size="small" color="#1DB954" /></View>
              : meta?.imageUrl
                ? <Image source={{ uri: meta.imageUrl }} style={meta.resourceType === "artist" ? linksSheetStyles.artCircle : linksSheetStyles.art} />
                : <View style={linksSheetStyles.spotifyWrap}><FontAwesome5 name="spotify" size={20} color="#1DB954" /></View>
            : <View style={linksSheetStyles.iconWrap}><FontAwesome5 name="link" size={14} color="#FF6C1A" /></View>;

          const primaryText   = meta?.name ?? domain;
          const secondaryText = meta?.subtitle ?? (rest.length > 1 ? rest : null);

          return (
            <TouchableOpacity key={i} style={linksSheetStyles.row} activeOpacity={0.72} onPress={() => openLink(url)}>
              {thumb}
              <View style={{ flex: 1 }}>
                <Text style={linksSheetStyles.domain} numberOfLines={1}>{primaryText}</Text>
                {secondaryText ? <Text style={linksSheetStyles.path} numberOfLines={1}>{secondaryText}</Text> : null}
              </View>
              <FontAwesome5 name="external-link-alt" size={12} color="rgba(255,255,255,0.25)" />
            </TouchableOpacity>
          );
        })}
      </Animated.View>
    </Modal>
  );
}

// ─── Start Meet Overlay ──────────────────────────────────────────────────────

function StartMeetOverlay({ visible, onClose, onStarted }: { visible: boolean; onClose: () => void; onStarted: (meetId: string, name: string) => void }) {
  const slideY    = useRef(new Animated.Value(SH)).current;
  const backdropO = useRef(new Animated.Value(0)).current;
  // kbPad grows to keyboard height so scroll content is never hidden behind it
  const kbPad     = useRef(new Animated.Value(0)).current;

  const [meetName,        setMeetName]        = useState("");
  const [meetDescription, setMeetDescription] = useState("");
  const [allowComments,   setAllowComments]   = useState(true);
  const [allowReactions,  setAllowReactions]  = useState(true);
  const [tagInput,        setTagInput]        = useState("");
  const [tags,            setTags]            = useState<string[]>([]);
  const [starting,        setStarting]        = useState(false);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideY,    { toValue: 0, useNativeDriver: true, tension: 70, friction: 14 }),
        Animated.timing(backdropO, { toValue: 1, useNativeDriver: true, duration: 220 }),
      ]).start();

      const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
      const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
      const showSub = Keyboard.addListener(showEvt, (e) => {
        Animated.timing(kbPad, {
          toValue: e.endCoordinates.height,
          duration: Platform.OS === "ios" ? (e.duration ?? 260) : 260,
          useNativeDriver: false,
        }).start();
      });
      const hideSub = Keyboard.addListener(hideEvt, (e) => {
        Animated.timing(kbPad, {
          toValue: 0,
          duration: Platform.OS === "ios" ? (e.duration ?? 260) : 260,
          useNativeDriver: false,
        }).start();
      });
      return () => { showSub.remove(); hideSub.remove(); };
    } else {
      Keyboard.dismiss();
      kbPad.setValue(0);
      Animated.parallel([
        Animated.timing(slideY,    { toValue: SH,  useNativeDriver: true, duration: 260 }),
        Animated.timing(backdropO, { toValue: 0,   useNativeDriver: true, duration: 220 }),
      ]).start(() => {
        setMeetName(""); setMeetDescription("");
        setAllowComments(true); setAllowReactions(true);
        setTagInput(""); setTags([]); setStarting(false);
      });
    }
  }, [visible]);

  const addTag = () => {
    const cleaned = tagInput.trim().replace(/^#+/, "");
    if (!cleaned) return;
    if (tags.length >= 5) return;
    if (!tags.includes(cleaned)) setTags(prev => [...prev, cleaned]);
    setTagInput("");
  };

  const removeTag = (t: string) => setTags(prev => prev.filter(x => x !== t));

  const handleStart = async () => {
    if (!meetName.trim()) return;
    setStarting(true);
    try {
      const { meetId, error } = await startMeet({
        name:           meetName.trim(),
        description:    meetDescription.trim() || null,
        tags,
        allowComments:  allowComments,
        allowReactions: allowReactions,
      });
      if (error || !meetId) throw new Error(error ?? "Could not start meet");
      onClose();
      onStarted(meetId, meetName.trim());
    } catch (err) {
      console.error("Start Meet error:", err);
    } finally {
      setStarting(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      {/* Dimmed backdrop */}
      <Animated.View
        style={[StyleSheet.absoluteFill, mmStyles.backdrop, { opacity: backdropO }]}
        pointerEvents="none"
      />
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

      {/* Sheet — fixed position, top anchored. Keyboard scrolls content inside, never moves the sheet. */}
      <Animated.View style={[mmStyles.sheet, { transform: [{ translateY: slideY }] }]}>
        <View style={mmStyles.handle} />

        <View style={mmStyles.header}>
          <Text style={mmStyles.headerTitle}>Start a Meet</Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={mmStyles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={mmStyles.label}>Meet Name *</Text>
          <TextInput
            style={mmStyles.input}
            placeholder="Give your meet a name…"
            placeholderTextColor="rgba(255,255,255,0.28)"
            value={meetName}
            onChangeText={setMeetName}
            maxLength={60}
          />

          <Text style={mmStyles.label}>Description</Text>
          <TextInput
            style={[mmStyles.input, mmStyles.inputMultiline]}
            placeholder="What are you listening to? What's the vibe?"
            placeholderTextColor="rgba(255,255,255,0.28)"
            value={meetDescription}
            onChangeText={setMeetDescription}
            multiline
            maxLength={280}
          />

          <View style={mmStyles.toggleRow}>
            <Text style={mmStyles.toggleLabel}>Allow Comments</Text>
            <Switch value={allowComments} onValueChange={setAllowComments}
              trackColor={{ false: "rgba(255,255,255,0.12)", true: "#AB00FF" }} thumbColor="#fff" />
          </View>
          <View style={mmStyles.toggleRow}>
            <Text style={mmStyles.toggleLabel}>Allow Reactions</Text>
            <Switch value={allowReactions} onValueChange={setAllowReactions}
              trackColor={{ false: "rgba(255,255,255,0.12)", true: "#AB00FF" }} thumbColor="#fff" />
          </View>

          <Text style={mmStyles.label}>Tags <Text style={mmStyles.labelMuted}>(up to 5)</Text></Text>
          <View style={mmStyles.tagInputRow}>
            <TextInput
              style={mmStyles.tagInput}
              placeholder="Add a tag…"
              placeholderTextColor="rgba(255,255,255,0.28)"
              value={tagInput}
              onChangeText={setTagInput}
              onSubmitEditing={addTag}
              returnKeyType="done"
              maxLength={30}
              autoCapitalize="none"
            />
            <TouchableOpacity style={mmStyles.tagAddBtn} onPress={addTag} activeOpacity={0.75}>
              <Ionicons name="add" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          {tags.length > 0 && (
            <View style={mmStyles.tagChips}>
              {tags.map(t => (
                <TouchableOpacity key={t} style={mmStyles.tagChip} onPress={() => removeTag(t)} activeOpacity={0.7}>
                  <Text style={mmStyles.tagChipText}>#{t}</Text>
                  <Ionicons name="close" size={12} color="rgba(255,255,255,0.55)" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[mmStyles.startBtn, (!meetName.trim() || starting) && mmStyles.startBtnDisabled]}
            activeOpacity={0.85}
            onPress={handleStart}
            disabled={!meetName.trim() || starting}
          >
            <FontAwesome5 name="broadcast-tower" size={15} color="#fff" />
            <Text style={mmStyles.startBtnText}>{starting ? "Starting…" : "Start Meet"}</Text>
          </TouchableOpacity>

          {/* Spacer that grows with keyboard height so the Start button is always reachable */}
          <Animated.View style={{ height: kbPad }} />
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}
// ─── Meet Live Screen ─────────────────────────────────────────────────────────
// Architecture: Page 1 (now-playing) is always rendered inside the modal.
// Page 2 (music picker) is an absolutely-positioned panel that slides in
// from the right — avoids horizontal-ScrollView touch/height conflicts.

// SecureStore flag — set once the user checks "don't show again" on the
// join explainer so we skip it on future joins.
const MEET_GUIDE_KEY = 'meet-playback-guide-dismissed';

// ─── Listener Meet room ───────────────────────────────────────────────────────
function MeetListenerScreen({
  visible, onClose, meetId, userId, isPublic = false, minimized = false, onMinimize, onExpand, onInfo,
}: {
  visible: boolean;
  onClose: () => void;
  meetId: string | null;
  userId: string | null;
  isPublic?: boolean;
  minimized?: boolean;
  onMinimize?: () => void;
  onExpand?: () => void;
  onInfo?: (info: { name: string; trackName: string | null; albumArt: string | null }) => void;
}) {
  const slideAnim = useRef(new Animated.Value(SH)).current;

  const [accessToken,   setAccessToken]   = useState<string | null>(null);
  const [meet,          setMeet]          = useState<MeetRow | null>(null);
  const [trackState,    setTrackState]    = useState<MeetTrackState | null>(null);
  const [host,          setHost]          = useState<{ username: string; display_name: string | null; avatar_url: string | null } | null>(null);
  const [listenerCount, setListenerCount] = useState(1);
  const [messages,      setMessages]      = useState<MeetMessage[]>([]);
  const [chatInput,     setChatInput]     = useState('');
  const [livePos,       setLivePos]       = useState(0);
  const [saving,        setSaving]        = useState(false);
  const [savedId,       setSavedId]       = useState<string | null>(null);
  const [ended,         setEnded]         = useState(false);
  const [summary,       setSummary]       = useState<MeetTrack[] | null>(null);
  const [showGuide,     setShowGuide]     = useState(false);
  const [dontShowGuide, setDontShowGuide] = useState(false);
  // Becomes true once the listener has kicked off playback in Spotify (by tapping
  // "Got it"). Until then we don't drive playback via the Web API — there's no
  // active device yet, so Web API play calls would 404.
  const [launched,      setLaunched]      = useState(false);

  // ── Slide in/out ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 180 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: SH, useNativeDriver: true, duration: 280 }).start();
    }
  }, [visible]);

  // Resolve a valid Spotify token for sync + save on open.
  useEffect(() => {
    if (!visible || !userId) return;
    getValidSpotifyToken(userId).then((t) => setAccessToken(t));
  }, [visible, userId]);

  // On open, decide whether to show the "we'll briefly open Spotify" explainer.
  // If the user previously checked "don't show again", skip straight to launch.
  useEffect(() => {
    if (!visible) return;
    let active = true;
    (async () => {
      const dismissed = await SecureStore.getItemAsync(MEET_GUIDE_KEY);
      if (!active) return;
      if (dismissed === '1') { setShowGuide(false); setLaunched(true); }
      else                   { setShowGuide(true);  setLaunched(false); }
    })();
    return () => { active = false; };
  }, [visible]);

  // Open Spotify to the host's current track exactly once per join, once we've
  // both passed the explainer (launched) and know what's playing. Opening the
  // app makes it the active Spotify device so the Web API can keep it in sync
  // when the user returns.
  const openedOnceRef = useRef(false);
  useEffect(() => {
    if (!visible) { openedOnceRef.current = false; return; }
    if (!launched || showGuide || !trackState?.id) return;
    if (openedOnceRef.current) return;
    openedOnceRef.current = true;
    openSpotifyLink(
      `spotify:track:${trackState.id}`,
      `https://open.spotify.com/track/${trackState.id}`,
    );
  }, [visible, launched, showGuide, trackState?.id]);

  const handleGotIt = async () => {
    if (dontShowGuide) { try { await SecureStore.setItemAsync(MEET_GUIDE_KEY, '1'); } catch {} }
    setShowGuide(false);
    setLaunched(true);
  };

  // ── Join + load + subscribe ────────────────────────────────────────────────
  useEffect(() => {
    if (!visible || !meetId) return;
    let active = true;

    (async () => {
      await joinMeet(meetId, isPublic);
      await registerMeetSync();
      const m = await getMeet(meetId);
      if (!active) return;
      if (m) {
        setMeet(m);
        setTrackState(meetRowToTrackState(m));
        const { data: h } = await supabase
          .from('users').select('username, display_name, avatar_url').eq('id', m.host_id).single();
        if (active) setHost(h ?? null);
      }
      getMeetMessages(meetId).then((msgs) => { if (active) setMessages(msgs); });
      getActiveListenerCount(meetId).then((c) => { if (active) setListenerCount(Math.max(c, 1)); });
    })();

    const channel = supabase
      .channel(`meet-listener-${meetId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'meets', filter: `id=eq.${meetId}` },
        ({ new: row }: any) => {
          if (!active) return;
          setMeet(row);
          setTrackState(meetRowToTrackState(row));
          if (row.is_live === false) setEnded(true);
        })
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'meet_messages', filter: `meet_id=eq.${meetId}` },
        async ({ new: row }: any) => {
          const { data: author } = await supabase
            .from('users').select('username, display_name, avatar_url').eq('id', row.user_id).single();
          if (active) setMessages((prev) =>
            prev.some((x) => x.id === row.id) ? prev : [...prev, { ...row, author: author ?? undefined }]);
        })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'meet_participants', filter: `meet_id=eq.${meetId}` },
        () => { getActiveListenerCount(meetId).then((c) => { if (active) setListenerCount(Math.max(c, 1)); }); })
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, [visible, meetId]);

  // Refs holding the freshest token + host state so the steady 5s sanity-check
  // interval below reads live values instead of a stale closure snapshot.
  const syncTokenRef = useRef(accessToken);
  const syncStateRef = useRef(trackState);
  syncTokenRef.current = accessToken;
  syncStateRef.current = trackState;
  const [inSync, setInSync] = useState(true);

  // If the viewer is actually this meet's host (e.g. they tapped their own meet
  // in the Meets list), NEVER run listener sync — it would seek the host's own
  // Spotify to match the row the host itself writes, fighting any manual seek
  // and rewinding playback in a loop. The host is the source of truth.
  const isHostViewer = !!meet && !!userId && meet.host_id === userId;

  // ── Event-driven sync ───────────────────────────────────────────────────────
  // The realtime `meets` UPDATE subscription re-runs this effect on every host
  // write (~2s) because trackState changes, so we react near-live. Drift-only +
  // cooldown logic in sanityCheckSync prevents seek thrash.
  // Only runs after the listener has launched Spotify (so a device is active).
  useEffect(() => {
    if (!visible || !launched || ended || isHostViewer || !accessToken || !trackState) return;
    syncListenerToHost(accessToken, trackState);
  }, [visible, launched, ended, isHostViewer, accessToken, trackState?.id, trackState?.isPlaying, trackState?.talkMode, trackState?.positionUpdatedAt]);

  // ── Sanity check every 5s ─────────────────────────────────────────────────────
  // Independent steady heartbeat: confirms the listener's song AND playback timer
  // still match the host, correcting only when they've drifted. Reads refs so the
  // interval never resets when host state changes (which would starve the timer).
  // Stops once the meet has ended, so a host who keeps playing in the summary view
  // can't drag listeners back into playback.
  useEffect(() => {
    if (!visible || !launched || ended || isHostViewer) return;
    const check = async () => {
      const tok = syncTokenRef.current;
      const st  = syncStateRef.current;
      if (!tok || !st) return;
      const status = await sanityCheckSync(tok, st);
      setInSync(status.inSync);
      if (!status.inSync) {
        console.log(`[MeetSync] sanity check — out of sync (${status.reason}` +
          (status.driftMs != null ? `, drift ${Math.round(status.driftMs)}ms` : '') +
          `)${status.corrected ? ' → corrected' : ''}`);
      }
    };
    const id = setInterval(check, 5_000);
    return () => clearInterval(id);
  }, [visible, launched, ended]);

  // ── Re-sync the moment the user returns to the app from Spotify ─────────────
  // This is what "comes back here and we'll handle the rest" means: when the app
  // foregrounds, snap the listener to the host's current position.
  useEffect(() => {
    if (!visible || !launched || ended || isHostViewer) return;
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && accessToken && trackState) {
        syncListenerToHost(accessToken, trackState);
      }
    });
    return () => sub.remove();
  }, [visible, launched, ended, isHostViewer, accessToken, trackState?.id, trackState?.isPlaying, trackState?.talkMode, trackState?.positionUpdatedAt]);

  // ── Talk-mode voice channel ─────────────────────────────────────────────────
  useEffect(() => {
    if (!visible || !meetId) return;
    if (trackState?.talkMode) startTalkAudio(meetId, false);
    else stopTalkAudio();
  }, [visible, meetId, trackState?.talkMode]);

  // ── Local progress ticker (extrapolates host position) ──────────────────────
  useEffect(() => {
    if (!visible || !trackState) return;
    const tick = () => setLivePos(expectedHostPosition(trackState));
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [visible, trackState?.id, trackState?.isPlaying, trackState?.positionUpdatedAt, trackState?.positionMs]);

  // When the host ends the meet: stop the listener's music (restoring volume
  // first in case the host was mid-talk), surface the room if it was minimized,
  // and load the tracklist so the listener gets the same end-of-meet summary.
  useEffect(() => {
    if (!ended || !meetId) return;
    onExpand?.();
    if (accessToken) {
      (async () => {
        await restoreVolumeIfDucked(accessToken);
        await setPlayback(accessToken, false);
      })();
    }
    getMeetTracks(meetId).then(setSummary);
  }, [ended, meetId, accessToken]);

  // Report lightweight display info up to the persistent mini-bar.
  useEffect(() => {
    if (!visible) return;
    onInfo?.({
      name: host?.display_name || host?.username || meet?.name || "Meet",
      trackName: trackState?.name ?? null,
      albumArt: trackState?.albumArt ?? null,
    });
  }, [visible, host?.username, host?.display_name, meet?.name, trackState?.name, trackState?.albumArt]);

  const handleSendChat = async () => {
    const body = chatInput.trim();
    if (!body || !meetId) return;
    setChatInput('');
    const sent = await sendMeetMessage(meetId, body);
    if (sent) setMessages((prev) => prev.some((x) => x.id === sent.id) ? prev : [...prev, sent]);
  };

  const handleSaveSong = async () => {
    if (!accessToken || !trackState?.id || saving) return;
    setSaving(true);
    const ok = await saveTrackToLiked(accessToken, trackState.id);
    setSaving(false);
    if (ok) setSavedId(trackState.id);
  };

  const handleLeave = async () => {
    if (meetId) await leaveMeet(meetId);
    if (accessToken) await restoreVolumeIfDucked(accessToken);
    await unregisterMeetSync();
    await stopTalkAudio();
    setMeet(null); setTrackState(null); setMessages([]); setEnded(false); setSummary(null);
    setShowGuide(false); setLaunched(false); setDontShowGuide(false);
    openedOnceRef.current = false;
    onClose();
  };

  if (!visible) return null;

  const fmtMs = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };
  const progressPct = trackState?.durationMs ? Math.min(livePos / trackState.durationMs, 1) : 0;
  const hostName = host?.display_name || host?.username || meet?.name || "Host";
  const isSaved  = savedId === trackState?.id;

  return (
    <Modal visible={visible && !minimized} animationType="none" transparent statusBarTranslucent onRequestClose={onMinimize ?? handleLeave}>
      <Animated.View style={[mlStyles.root, { transform: [{ translateY: slideAnim }] }]}>
        {/* Background — synced album art */}
        {trackState?.albumArt ? (
          <Image source={{ uri: trackState.albumArt }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "#0c0007" }]} />
        )}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.5)" }]} pointerEvents="none" />
        <LinearGradient colors={["transparent", "rgba(0,0,0,0.6)", "rgba(0,0,0,0.94)"]} locations={[0.30, 0.62, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />

        {/* Talk-mode banner */}
        {trackState?.talkMode && (
          <View style={llStyles.talkBanner}>
            <Ionicons name="mic" size={16} color="#fff" />
            <Text style={llStyles.talkBannerText}>{hostName} is talking — music paused</Text>
          </View>
        )}

        {/* Synced now-playing */}
        <View style={mlStyles.trackSection}>
          <Text style={mlStyles.trackName} numberOfLines={1}>{trackState?.name ?? "Waiting for host…"}</Text>
          <Text style={mlStyles.trackArtist} numberOfLines={1}>{trackState?.artist ?? ""}</Text>

          {/* Live sync status — reflects the 5s sanity check against the host */}
          {launched && trackState?.id && !trackState?.talkMode && (
            <View style={llStyles.syncRow}>
              {inSync ? (
                <>
                  <View style={llStyles.syncDotOk} />
                  <Text style={llStyles.syncTextOk}>In sync with host</Text>
                </>
              ) : (
                <>
                  <ActivityIndicator size="small" color="#FFB020" />
                  <Text style={llStyles.syncTextBusy}>Syncing with host…</Text>
                </>
              )}
            </View>
          )}

          <View style={mlStyles.progressTrack}>
            <View style={[mlStyles.progressFill, { width: `${progressPct * 100}%` as any }]} />
          </View>
          <View style={mlStyles.progressTimes}>
            <Text style={mlStyles.progressTime}>{fmtMs(livePos)}</Text>
            <Text style={mlStyles.progressTime}>{fmtMs(trackState?.durationMs ?? 0)}</Text>
          </View>
          {/* Save song */}
          <TouchableOpacity
            style={[llStyles.saveSongBtn, (isSaved || !trackState?.id) && llStyles.saveSongBtnDone]}
            activeOpacity={0.85}
            onPress={handleSaveSong}
            disabled={saving || isSaved || !trackState?.id}
          >
            <Ionicons name={isSaved ? "checkmark" : "heart-outline"} size={18} color="#fff" />
            <Text style={llStyles.saveSongText}>{isSaved ? "Saved" : saving ? "Saving…" : "Save song"}</Text>
          </TouchableOpacity>
        </View>

        {/* Live chat */}
        <View style={mlStyles.commentSection}>
          <MeetChatList messages={messages} />
        </View>

        {/* Chat input */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={mlStyles.bottomBarWrap}
        >
          <View style={mlStyles.bottomBar}>
            <View style={mlStyles.inputPill}>
              <TextInput
                style={mlStyles.inputField}
                placeholder="Send a message"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={chatInput}
                onChangeText={setChatInput}
                onSubmitEditing={handleSendChat}
                returnKeyType="send"
              />
              <TouchableOpacity onPress={handleSendChat} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="send" size={20} color="#E91E8C" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>

        {/* Ended → tracklist summary (same as host, with a save option).
            Falls back to a simple notice until the tracklist has loaded. */}
        {ended && (summary ? (
          <MeetSummaryScreen
            tracks={summary}
            listenerCount={listenerCount}
            accessToken={accessToken}
            onClose={handleLeave}
            role="listener"
            meetId={meetId}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, llStyles.endedOverlay]}>
            <Ionicons name="radio-outline" size={56} color="rgba(255,255,255,0.5)" />
            <Text style={llStyles.endedTitle}>This Meet has ended</Text>
            <TouchableOpacity style={llStyles.endedBtn} activeOpacity={0.85} onPress={handleLeave}>
              <Text style={llStyles.endedBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Join explainer — shown once (until "don't show again") so the brief
            jump to Spotify doesn't feel like a glitch. */}
        {showGuide && !ended && (
          <View style={[StyleSheet.absoluteFill, gdStyles.scrim]}>
            <View style={gdStyles.card}>
              <View style={gdStyles.iconWrap}>
                <Ionicons name="sync-outline" size={28} color="#1DB954" />
              </View>
              <Text style={gdStyles.title}>Starting the music</Text>
              <Text style={gdStyles.body}>
                We&apos;ll briefly open your streaming service to start playback — then
                come back here and we&apos;ll handle the rest, keeping you in sync with the host.
              </Text>

              <TouchableOpacity
                style={gdStyles.toggleRow}
                activeOpacity={0.7}
                onPress={() => setDontShowGuide((v) => !v)}
              >
                <View style={[gdStyles.checkbox, dontShowGuide && gdStyles.checkboxOn]}>
                  {dontShowGuide && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <Text style={gdStyles.toggleText}>Don&apos;t show this again</Text>
              </TouchableOpacity>

              <TouchableOpacity style={gdStyles.gotItBtn} activeOpacity={0.85} onPress={handleGotIt}>
                <Text style={gdStyles.gotItText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Top bar — host info + minimize + leave. Rendered LAST so it stays
            above the guide scrim and is always tappable (minimize/leave). */}
        <View style={mlStyles.topBar}>
          <View style={mlStyles.topLeft}>
            {host?.avatar_url ? (
              <Image source={{ uri: host.avatar_url }} style={{ width: 44, height: 44, borderRadius: 22 }} />
            ) : (
              <LinearGradient colors={["#AB00FF", "#FF6C1A"]} style={mlStyles.avatarRing}>
                <View style={mlStyles.avatarInner}>
                  <Text style={mlStyles.avatarInitial}>{hostName.slice(0, 1).toUpperCase()}</Text>
                </View>
              </LinearGradient>
            )}
            <View>
              <Text style={mlStyles.hostName}>{hostName}</Text>
              <View style={mlStyles.listenerRow}>
                <View style={mlStyles.liveDotSm} />
                <Text style={mlStyles.listenerText}>{listenerCount} listening</Text>
              </View>
            </View>
          </View>
          <View style={mlStyles.topRight}>
            <TouchableOpacity style={mlStyles.topCircle} activeOpacity={0.75} onPress={onMinimize ?? handleLeave}>
              <Ionicons name="chevron-down" size={19} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={mlStyles.endBtn} activeOpacity={0.8} onPress={handleLeave}>
              <Text style={mlStyles.endBtnText}>Leave</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const gdStyles = StyleSheet.create({
  scrim: { backgroundColor: "rgba(0,0,0,0.78)", alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  card: { width: "100%", maxWidth: 360, backgroundColor: "#171018", borderRadius: 24, padding: 24, alignItems: "center" },
  iconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(29,185,84,0.16)", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  title: { fontSize: 20, fontWeight: "800", color: "#fff", marginBottom: 8, textAlign: "center" },
  body: { fontSize: 14, lineHeight: 20, color: "rgba(255,255,255,0.7)", textAlign: "center", marginBottom: 20 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 10, alignSelf: "stretch", marginBottom: 20 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "rgba(255,255,255,0.35)", alignItems: "center", justifyContent: "center" },
  checkboxOn: { backgroundColor: "#1DB954", borderColor: "#1DB954" },
  toggleText: { fontSize: 14, color: "rgba(255,255,255,0.85)", fontWeight: "600" },
  gotItBtn: { alignSelf: "stretch", backgroundColor: "#1DB954", borderRadius: 26, paddingVertical: 15, alignItems: "center" },
  gotItText: { fontSize: 16, fontWeight: "800", color: "#fff" },
});

// ─── Join confirmation (public vs private) ────────────────────────────────────
// Before entering a meet, the joiner chooses whether their participation is
// visible on their profile. Public surfaces a "Join" affordance to anyone who
// views their now-playing; private keeps their profile looking like ordinary
// solo listening.
function JoinMeetPrompt({
  visible, onCancel, onChoose,
}: {
  visible: boolean;
  onCancel: () => void;
  onChoose: (isPublic: boolean) => void;
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent onRequestClose={onCancel}>
      <TouchableOpacity style={jpStyles.scrim} activeOpacity={1} onPress={onCancel}>
        <TouchableOpacity activeOpacity={1} style={jpStyles.card}>
          <View style={jpStyles.iconWrap}>
            <FontAwesome5 name="headphones" size={24} color="#AB00FF" />
          </View>
          <Text style={jpStyles.title}>Join this Meet</Text>
          <Text style={jpStyles.body}>
            Choose how you join. You can listen privately, or let others see you&apos;re
            here so they can join too.
          </Text>

          <TouchableOpacity style={jpStyles.publicBtn} activeOpacity={0.85} onPress={() => onChoose(true)}>
            <Ionicons name="people" size={18} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={jpStyles.publicBtnText}>Join publicly</Text>
              <Text style={jpStyles.btnSub}>Shown on your profile — friends can join you</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={jpStyles.privateBtn} activeOpacity={0.85} onPress={() => onChoose(false)}>
            <Ionicons name="lock-closed" size={18} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={jpStyles.privateBtnText}>Join privately</Text>
              <Text style={jpStyles.btnSub}>Your profile shows a normal now-playing</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={jpStyles.cancelBtn} activeOpacity={0.7} onPress={onCancel}>
            <Text style={jpStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const jpStyles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.78)", alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  card: { width: "100%", maxWidth: 360, backgroundColor: "#171018", borderRadius: 24, padding: 24, alignItems: "center" },
  iconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(171,0,255,0.16)", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  title: { fontSize: 20, fontWeight: "800", color: "#fff", marginBottom: 8, textAlign: "center" },
  body: { fontSize: 14, lineHeight: 20, color: "rgba(255,255,255,0.7)", textAlign: "center", marginBottom: 20 },
  publicBtn: { alignSelf: "stretch", flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#AB00FF", borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 12 },
  publicBtnText: { fontSize: 16, fontWeight: "800", color: "#fff" },
  privateBtn: { alignSelf: "stretch", flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 8 },
  privateBtnText: { fontSize: 16, fontWeight: "800", color: "#fff" },
  btnSub: { fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 2 },
  cancelBtn: { paddingVertical: 12, alignItems: "center", alignSelf: "stretch" },
  cancelText: { fontSize: 15, fontWeight: "700", color: "rgba(255,255,255,0.55)" },
});

// ─── Persistent minimized-meet bar ────────────────────────────────────────────
// Floats above the bottom nav on every screen while a meet is minimized, so the
// user can browse the app without leaving the meet. Tap to expand back.
function MeetMiniBar({
  albumArt, title, subtitle, onExpand,
}: {
  albumArt: string | null;
  title: string;
  subtitle: string;
  onExpand: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <TouchableOpacity
      style={[mbStyles.bar, { bottom: 78 + Math.max(insets.bottom - 6, 0) }]}
      activeOpacity={0.9}
      onPress={onExpand}
    >
      {albumArt ? (
        <Image source={{ uri: albumArt }} style={mbStyles.art} />
      ) : (
        <View style={[mbStyles.art, mbStyles.artFallback]}>
          <Ionicons name="musical-note" size={16} color="#fff" />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View style={mbStyles.titleRow}>
          <View style={mbStyles.liveDot} />
          <Text style={mbStyles.title} numberOfLines={1}>{title}</Text>
        </View>
        <Text style={mbStyles.subtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      <View style={mbStyles.expandBtn}>
        <Ionicons name="chevron-up" size={18} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

const mbStyles = StyleSheet.create({
  bar: {
    position: "absolute", left: 12, right: 12,
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "rgba(20,10,24,0.97)", borderRadius: 16, padding: 10,
    borderWidth: 1, borderColor: "rgba(171,0,255,0.45)",
    shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  art: { width: 42, height: 42, borderRadius: 9, backgroundColor: "#222" },
  artFallback: { backgroundColor: "rgba(171,0,255,0.35)", alignItems: "center", justifyContent: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#FF3B5C" },
  title: { fontSize: 14, fontWeight: "800", color: "#fff", flexShrink: 1 },
  subtitle: { fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2 },
  expandBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
});

const llStyles = StyleSheet.create({
  talkBanner: {
    position: "absolute", top: 104, left: 16, right: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "rgba(171,0,255,0.85)", borderRadius: 14, paddingVertical: 10,
  },
  talkBannerText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  saveSongBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "rgba(29,185,84,0.92)", borderRadius: 24, paddingVertical: 12, marginTop: 18,
  },
  saveSongBtnDone: { backgroundColor: "rgba(29,185,84,0.4)" },
  saveSongText: { fontSize: 14, fontWeight: "800", color: "#fff" },
  syncRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 8 },
  syncDotOk: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#1DB954" },
  syncTextOk: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.6)" },
  syncTextBusy: { fontSize: 12, fontWeight: "600", color: "#FFB020" },
  endedOverlay: { backgroundColor: "rgba(0,0,0,0.88)", alignItems: "center", justifyContent: "center", gap: 14 },
  endedTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
  endedBtn: { backgroundColor: "#AB00FF", borderRadius: 24, paddingHorizontal: 32, paddingVertical: 13, marginTop: 8 },
  endedBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});

// ─── Meet chat list (shared by host + listener rooms) ─────────────────────────
function MeetChatList({ messages }: { messages: MeetMessage[] }) {
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [messages.length]);

  // Only show the most recent handful so the overlay never fills the screen.
  const recent = messages.slice(-6);

  return (
    <ScrollView
      ref={scrollRef}
      style={{ maxHeight: 220 }}
      contentContainerStyle={{ gap: 9, justifyContent: "flex-end", flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {recent.map((m) => {
        const name = m.author?.display_name || m.author?.username || "Listener";
        return (
          <View key={m.id} style={mcStyles.row}>
            {m.author?.avatar_url ? (
              <Image source={{ uri: m.author.avatar_url }} style={mcStyles.avatar} />
            ) : (
              <View style={[mcStyles.avatar, mcStyles.avatarFallback]}>
                <Text style={mcStyles.avatarLetter}>{name.slice(0, 1).toUpperCase()}</Text>
              </View>
            )}
            <View style={mcStyles.bubble}>
              <Text style={mcStyles.name}>{name}</Text>
              <Text style={mcStyles.text}>{m.body}</Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const mcStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  avatar: { width: 30, height: 30, borderRadius: 15, flexShrink: 0, backgroundColor: "#222" },
  avatarFallback: { backgroundColor: "rgba(171,0,255,0.4)", alignItems: "center", justifyContent: "center" },
  avatarLetter: { fontSize: 12, fontWeight: "800", color: "#fff" },
  bubble: { backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 7, flexShrink: 1 },
  name: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.6)", marginBottom: 1 },
  text: { fontSize: 13, color: "#fff" },
});

// ─── End-of-meet summary ──────────────────────────────────────────────────────
function MeetSummaryScreen({
  tracks, listenerCount, accessToken, onClose, role = "listener", meetId = null,
}: {
  tracks: MeetTrack[];
  listenerCount: number;
  accessToken: string | null;
  onClose: () => void;
  role?: "host" | "listener";
  meetId?: string | null;
}) {
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [onProfile, setOnProfile] = useState(false);
  const [pinning,   setPinning]   = useState(false);
  // Per-track save state, keyed by Spotify track_id.
  const [savedIds,  setSavedIds]  = useState<Record<string, boolean>>({});
  const [savingId,  setSavingId]  = useState<string | null>(null);

  const handleSaveAll = async () => {
    if (!accessToken || saving || tracks.length === 0) return;
    setSaving(true);
    const next: Record<string, boolean> = {};
    for (const t of tracks) {
      const ok = await saveTrackToLiked(accessToken, t.track_id);
      if (ok) next[t.track_id] = true;
    }
    setSavedIds((prev) => ({ ...prev, ...next }));
    setSaving(false);
    setSaved(true);
  };

  const handleSaveOne = async (trackId: string) => {
    if (!accessToken || savingId || savedIds[trackId]) return;
    setSavingId(trackId);
    const ok = await saveTrackToLiked(accessToken, trackId);
    setSavingId(null);
    if (ok) setSavedIds((prev) => ({ ...prev, [trackId]: true }));
  };

  const handleShowOnProfile = async () => {
    if (!meetId || pinning || onProfile) return;
    setPinning(true);
    await setMeetOnProfile(meetId, true);
    setPinning(false);
    setOnProfile(true);
  };

  return (
    <View style={[StyleSheet.absoluteFill, sumStyles.root]}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <View style={sumStyles.header}>
          <Ionicons name="checkmark-circle" size={48} color="#AB00FF" />
          <Text style={sumStyles.title}>Meet ended</Text>
          <Text style={sumStyles.sub}>{tracks.length} tracks · {listenerCount} listeners</Text>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 10 }} showsVerticalScrollIndicator={false}>
          {tracks.length === 0 ? (
            <Text style={sumStyles.empty}>No tracks were played this meet.</Text>
          ) : tracks.map((t) => (
            <View key={t.id} style={sumStyles.trackRow}>
              {t.album_art ? (
                <Image source={{ uri: t.album_art }} style={sumStyles.art} />
              ) : (
                <View style={[sumStyles.art, { backgroundColor: "#1DB95422", alignItems: "center", justifyContent: "center" }]}>
                  <Ionicons name="musical-note" size={16} color="#1DB954" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={sumStyles.trackName} numberOfLines={1}>{t.name}</Text>
                <Text style={sumStyles.trackArtist} numberOfLines={1}>{t.artist ?? ""}</Text>
              </View>
              {accessToken && (
                <TouchableOpacity
                  style={sumStyles.rowSaveBtn}
                  activeOpacity={0.7}
                  onPress={() => handleSaveOne(t.track_id)}
                  disabled={!!savingId || savedIds[t.track_id]}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {savingId === t.track_id ? (
                    <ActivityIndicator size="small" color="#1DB954" />
                  ) : (
                    <Ionicons
                      name={savedIds[t.track_id] ? "checkmark-circle" : "add-circle-outline"}
                      size={26}
                      color={savedIds[t.track_id] ? "#1DB954" : "rgba(255,255,255,0.8)"}
                    />
                  )}
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>

        <View style={sumStyles.footer}>
          {/* Host: surface this meet's tracklist on their profile.
              Listener: save the tracklist to their own Spotify Liked Songs. */}
          {role === "host" ? (
            tracks.length > 0 && (
              <TouchableOpacity
                style={[sumStyles.saveBtn, onProfile && sumStyles.saveBtnDone]}
                activeOpacity={0.85}
                onPress={handleShowOnProfile}
                disabled={pinning || onProfile || !meetId}
              >
                <Ionicons name={onProfile ? "checkmark" : "person-circle-outline"} size={16} color="#fff" />
                <Text style={sumStyles.saveBtnText}>
                  {onProfile ? "Showing on profile" : pinning ? "Adding…" : "Show on profile"}
                </Text>
              </TouchableOpacity>
            )
          ) : (
            tracks.length > 0 && (
              <TouchableOpacity
                style={[sumStyles.saveBtn, (saved || !accessToken) && sumStyles.saveBtnDone]}
                activeOpacity={0.85}
                onPress={handleSaveAll}
                disabled={saving || saved || !accessToken}
              >
                <Ionicons name={saved ? "checkmark" : "heart"} size={16} color="#fff" />
                <Text style={sumStyles.saveBtnText}>
                  {saved ? "Saved to Liked Songs" : saving ? "Saving…" : "Save all to Spotify"}
                </Text>
              </TouchableOpacity>
            )
          )}
          <TouchableOpacity style={sumStyles.doneBtn} activeOpacity={0.85} onPress={onClose}>
            <Text style={sumStyles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const sumStyles = StyleSheet.create({
  root: { backgroundColor: "#0D0D0D" },
  header: { alignItems: "center", paddingTop: 24, paddingBottom: 8, gap: 6 },
  title: { fontSize: 26, fontWeight: "900", color: "#fff" },
  sub: { fontSize: 14, color: "rgba(255,255,255,0.5)" },
  empty: { fontSize: 14, color: "rgba(255,255,255,0.4)", textAlign: "center", marginTop: 40 },
  trackRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 10 },
  art: { width: 44, height: 44, borderRadius: 8 },
  trackName: { fontSize: 14, fontWeight: "700", color: "#fff" },
  trackArtist: { fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 },
  rowSaveBtn: { width: 32, alignItems: "center", justifyContent: "center" },
  footer: { padding: 16, gap: 10 },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#1DB954", borderRadius: 26, paddingVertical: 15 },
  saveBtnDone: { backgroundColor: "rgba(29,185,84,0.45)" },
  saveBtnText: { fontSize: 15, fontWeight: "800", color: "#fff" },
  doneBtn: { alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 26, paddingVertical: 15 },
  doneBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});

function MeetLiveScreen({
  visible, onClose, meetId, meetName, accessToken, userId, minimized = false, onMinimize,
}: {
  visible: boolean;
  onClose: () => void;
  meetId: string | null;
  meetName?: string;
  accessToken: string | null;
  userId: string | null;
  minimized?: boolean;
  onMinimize?: () => void;
}) {
  const { track, liveProgressMs } = useNowPlayingCtx();

  // ── Live meet state (host) ────────────────────────────────────────────────
  const [listenerCount, setListenerCount] = useState(1);
  const [messages,      setMessages]      = useState<MeetMessage[]>([]);
  const [chatInput,     setChatInput]     = useState('');
  const [talkOn,        setTalkOn]        = useState(false);
  const [ending,        setEnding]        = useState(false);
  const [summary,       setSummary]       = useState<MeetTrack[] | null>(null);
  const lastWrittenRef  = useRef<string | null>(null);

  // Refs that always hold the freshest track + position so the heartbeat
  // interval below reads LIVE values instead of stale closure snapshots.
  const trackRef    = useRef(track);
  const progressRef = useRef(liveProgressMs);
  trackRef.current    = track;
  progressRef.current = liveProgressMs;

  // Load + subscribe to chat and participant count while the meet is open.
  useEffect(() => {
    if (!visible || !meetId) return;
    let active = true;

    getMeetMessages(meetId).then((m) => { if (active) setMessages(m); });
    getActiveListenerCount(meetId).then((c) => { if (active) setListenerCount(Math.max(c, 1)); });

    const channel = supabase
      .channel(`meet-host-${meetId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'meet_messages', filter: `meet_id=eq.${meetId}` },
        async ({ new: row }: any) => {
          // Realtime payload lacks the joined author — fetch the display fields.
          const { data: author } = await supabase
            .from('users').select('username, display_name, avatar_url').eq('id', row.user_id).single();
          if (active) setMessages((prev) =>
            prev.some((x) => x.id === row.id) ? prev : [...prev, { ...row, author: author ?? undefined }]);
        })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'meet_participants', filter: `meet_id=eq.${meetId}` },
        () => { getActiveListenerCount(meetId).then((c) => { if (active) setListenerCount(Math.max(c, 1)); }); })
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, [visible, meetId]);

  // Host broadcasts the currently-playing track + live position into the meet
  // row so listeners can sync. A 2s heartbeat reads the LIVE track/position from
  // refs (not a stale closure) so every write carries the true position with a
  // matching position_updated_at — listeners extrapolate from there.
  useEffect(() => {
    // Stop broadcasting once the meet has ended (summary shown) — otherwise the
    // host continuing to play would keep dragging listeners back into playback.
    if (!visible || !meetId || summary) return;
    const write = () => {
      const t = trackRef.current;
      if (!t) return;
      updateMeetTrack(meetId, {
        id:         t.id,
        name:       t.name,
        artist:     t.artist,
        albumArt:   t.albumArt,
        durationMs: t.durationMs,
        positionMs: progressRef.current,
        isPlaying:  t.isPlaying,
      });
    };
    const id = setInterval(write, 2_000);
    return () => clearInterval(id);
  }, [visible, meetId, summary]);

  // Immediate broadcast + tracklist record whenever the song or play state
  // changes, so listeners react instantly instead of waiting for the heartbeat.
  useEffect(() => {
    if (!visible || !meetId || summary || !track) return;
    updateMeetTrack(meetId, {
      id:         track.id,
      name:       track.name,
      artist:     track.artist,
      albumArt:   track.albumArt,
      durationMs: track.durationMs,
      positionMs: liveProgressMs,
      isPlaying:  track.isPlaying,
    });
    if (track.isPlaying && lastWrittenRef.current !== track.id) {
      lastWrittenRef.current = track.id;
      recordMeetTrack(meetId, { id: track.id, name: track.name, artist: track.artist, albumArt: track.albumArt });
    }
  }, [visible, meetId, summary, track?.id, track?.isPlaying]);

  const handleSendChat = async () => {
    const body = chatInput.trim();
    if (!body || !meetId) return;
    setChatInput('');
    const sent = await sendMeetMessage(meetId, body);
    // Optimistically append in case realtime echo is delayed.
    if (sent) setMessages((prev) => prev.some((x) => x.id === sent.id) ? prev : [...prev, sent]);
  };

  const handleToggleTalk = async () => {
    if (!meetId) return;
    const next = !talkOn;
    setTalkOn(next);
    await setTalkMode(meetId, next);
  };

  const handleEndMeet = async () => {
    if (!meetId || ending) return;
    setEnding(true);
    const tracks = await getMeetTracks(meetId);
    await endMeet(meetId);
    // Stop the host's own music when the meet wraps, if it's still playing.
    const endTok = apiToken ?? accessToken;
    if (endTok && track?.isPlaying) await setPlayback(endTok, false);
    setSummary(tracks);
    setEnding(false);
  };

  const closeAll = () => {
    setSummary(null);
    setTalkOn(false);
    setMessages([]);
    onClose();
  };
  const slideAnim   = useRef(new Animated.Value(SH)).current;
  const musicSlideX = useRef(new Animated.Value(SW)).current;  // slides in from right

  // ── Page 1 state ──────────────────────────────────────────────────────────
  const [canvasUrl,   setCanvasUrl]   = useState<string | null>(null);
  const [ctrlLoading, setCtrlLoading] = useState(false);
  const [pickerOpen,  setPickerOpen]  = useState(false);

  // ── Page 2 state ──────────────────────────────────────────────────────────
  // apiToken is always a refreshed, valid token — used for all Spotify API calls
  const [apiToken,         setApiToken]         = useState<string | null>(null);
  const [playlists,        setPlaylists]        = useState<SpotifyPlaylist[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<SpotifyPlaylist | null>(null);
  const [playlistTracks,   setPlaylistTracks]   = useState<SpotifyTrackResult[]>([]);
  const [tracksLoading,    setTracksLoading]    = useState(false);
  const [tracksError,      setTracksError]      = useState<number | null>(null);
  const [searchQuery,      setSearchQuery]      = useState('');
  const [searchResults,    setSearchResults]    = useState<SpotifyTrackResult[]>([]);
  const [searchLoading,    setSearchLoading]    = useState(false);
  const [playingId,        setPlayingId]        = useState<string | null>(null);

  // Canvas video player — always created at hook level; source swapped when found
  const player = useVideoPlayer(null, (p) => { p.loop = true; });

  // Fetch a guaranteed-valid token whenever the screen opens
  useEffect(() => {
    if (!visible || !userId) return;
    getValidSpotifyToken(userId).then((t) => { if (t) setApiToken(t); });
  }, [visible, userId]);

  // Keep playingId in sync with the currently playing track
  useEffect(() => { if (track?.id) setPlayingId(track.id); }, [track?.id]);

  // ── Music picker open / close ─────────────────────────────────────────────
  const openMusicPicker = () => {
    setPickerOpen(true);
    Animated.spring(musicSlideX, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }).start();
  };
  const closeMusicPicker = (instant = false) => {
    const done = () => {
      setPickerOpen(false);
      setSelectedPlaylist(null);
      setPlaylistTracks([]);
      setTracksLoading(false);
      setTracksError(null);
      setSearchQuery('');
      setSearchResults([]);
    };
    if (instant) { musicSlideX.setValue(SW); done(); }
    else Animated.timing(musicSlideX, { toValue: SW, useNativeDriver: true, duration: 240 }).start(done);
  };

  // ── Modal slide animation ─────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 180 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: SH, useNativeDriver: true, duration: 280 }).start();
      setCanvasUrl(null);
      player.pause();
      closeMusicPicker(true);
      setPlaylists([]);
      setApiToken(null);
    }
  }, [visible]);

  // ── Canvas fetch ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!visible || !track?.id || !accessToken) { setCanvasUrl(null); return; }
    let cancelled = false;
    fetchSpotifyCanvas(track.id, accessToken).then((url) => {
      if (cancelled) return;
      setCanvasUrl(url);
      if (url) { player.replace(url); player.loop = true; player.play(); }
      else      { player.pause(); }
    });
    return () => { cancelled = true; };
  }, [track?.id, accessToken, visible]);

  // ── Load playlists once apiToken is ready ────────────────────────────────
  useEffect(() => {
    if (!apiToken || playlists.length > 0) return;
    setPlaylistsLoading(true);
    getUserPlaylists(apiToken).then((list) => {
      setPlaylists(list);
      setPlaylistsLoading(false);
    });
  }, [apiToken]);

  // ── Search debounce ──────────────────────────────────────────────────────
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      if (!apiToken) return;
      setSearchLoading(true);
      const res = await searchSpotifyTracks(apiToken, q);
      setSearchResults(res);
      setSearchLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery, apiToken]);

  // ── Playlist drill-down ──────────────────────────────────────────────────
  // tracksLoading is set to true synchronously by selectPlaylist() before this fires.
  // We always call getValidSpotifyToken fresh here to guarantee a non-stale token —
  // the apiToken state is good for playlists list but a playlist tap may come later.
  useEffect(() => {
    if (!selectedPlaylist || !userId) return;
    let cancelled = false;
    (async () => {
      // Refresh token on every drill-down so we never hit a stale 401
      const freshToken = await getValidSpotifyToken(userId);
      if (!freshToken || cancelled) { setTracksLoading(false); return; }
      const { tracks, httpError } = await getPlaylistTracks(freshToken, selectedPlaylist.id);
      if (cancelled) return;
      setPlaylistTracks(tracks);
      setTracksError(httpError ?? null);
      setTracksLoading(false);
    })();
    return () => { cancelled = true; };
  }, [selectedPlaylist?.id]);

  // ── Playlist selection (sets loading immediately to avoid empty flicker) ──
  const selectPlaylist = (pl: SpotifyPlaylist) => {
    setSelectedPlaylist(pl);
    setPlaylistTracks([]);
    setTracksError(null);
    setTracksLoading(true);
  };

  // ── Playback helpers ─────────────────────────────────────────────────────
  // Prefer apiToken (auto-refreshed) over the raw accessToken prop (may be stale)
  const tok = apiToken ?? accessToken;

  const handlePrev = async () => {
    if (!tok || ctrlLoading) return;
    setCtrlLoading(true);
    await skipPrevious(tok);
    setTimeout(() => setCtrlLoading(false), 800);
  };
  const handleNext = async () => {
    if (!tok || ctrlLoading) return;
    setCtrlLoading(true);
    await skipNext(tok);
    setTimeout(() => setCtrlLoading(false), 800);
  };
  const handlePlayPause = async () => {
    if (!tok || ctrlLoading || !track) return;
    setCtrlLoading(true);
    await setPlayback(tok, !track.isPlaying);
    setTimeout(() => setCtrlLoading(false), 600);
  };
  const handlePlayTrack = async (t: SpotifyTrackResult) => {
    if (!tok) return;
    setPlayingId(t.id);
    await playTrack(tok, `spotify:track:${t.id}`);
  };

  // ── Progress ─────────────────────────────────────────────────────────────
  const fmtMs = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };
  const progressPct = track?.durationMs ? Math.min(liveProgressMs / track.durationMs, 1) : 0;

  // ── Page 2 content ───────────────────────────────────────────────────────
  const isSearching  = searchQuery.trim().length > 0;
  const showTracks   = !isSearching && selectedPlaylist !== null;
  const p2Loading    = isSearching ? searchLoading : showTracks ? tracksLoading : playlistsLoading;
  const p2Title      = isSearching ? "Search" : showTracks ? (selectedPlaylist?.name ?? "Playlist") : "Your Music";

  if (!visible) return null;

  return (
    <Modal visible={visible && !minimized} animationType="none" transparent statusBarTranslucent onRequestClose={onMinimize ?? onClose}>
      <Animated.View style={[mlStyles.root, { transform: [{ translateY: slideAnim }] }]}>

        {/* ══ PAGE 1 — NOW PLAYING (always rendered, full screen) ══════════ */}
        {canvasUrl ? (
          <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} allowsFullscreen={false} />
        ) : track?.albumArt ? (
          <Image source={{ uri: track.albumArt }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "#0c0007" }]} />
        )}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.42)" }]} pointerEvents="none" />
        <LinearGradient colors={["transparent", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.92)"]} locations={[0.30, 0.62, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />

        {/* Top bar — ♫ opens picker */}
        <View style={mlStyles.topBar}>
          <View style={mlStyles.topLeft}>
            <LinearGradient colors={["#AB00FF", "#FF6C1A"]} style={mlStyles.avatarRing}>
              <View style={mlStyles.avatarInner}>
                <Text style={mlStyles.avatarInitial}>{(meetName ?? "M").slice(0, 1).toUpperCase()}</Text>
              </View>
            </LinearGradient>
            <View>
              <Text style={mlStyles.hostName}>{meetName ?? "My Meet"}</Text>
              <View style={mlStyles.listenerRow}>
                <View style={mlStyles.liveDotSm} />
                <Text style={mlStyles.listenerText}>{listenerCount} listening</Text>
              </View>
            </View>
          </View>
          <View style={mlStyles.topRight}>
            <TouchableOpacity style={mlStyles.topCircle} activeOpacity={0.75} onPress={openMusicPicker}>
              <Ionicons name="musical-notes" size={17} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={mlStyles.endBtn} activeOpacity={0.8} onPress={handleEndMeet} disabled={ending}>
              <Text style={mlStyles.endBtnText}>{ending ? "Ending…" : "End"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={mlStyles.topCircle} activeOpacity={0.75} onPress={onMinimize ?? onClose}>
              <Ionicons name="chevron-down" size={19} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Track info + playback controls */}
        <View style={mlStyles.trackSection}>
          <Text style={mlStyles.trackName} numberOfLines={1}>{track?.name ?? "—"}</Text>
          <Text style={mlStyles.trackArtist} numberOfLines={1}>{track?.artist ?? ""}</Text>
          <View style={mlStyles.progressTrack}>
            <View style={[mlStyles.progressFill, { width: `${progressPct * 100}%` as any }]} />
          </View>
          <View style={mlStyles.progressTimes}>
            <Text style={mlStyles.progressTime}>{fmtMs(liveProgressMs)}</Text>
            <Text style={mlStyles.progressTime}>{fmtMs(track?.durationMs ?? 0)}</Text>
          </View>
          <View style={mlStyles.controls}>
            <TouchableOpacity activeOpacity={0.7} onPress={handlePrev} disabled={ctrlLoading}>
              <Ionicons name="play-skip-back" size={34} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={mlStyles.playBtn} activeOpacity={0.8} onPress={handlePlayPause} disabled={ctrlLoading}>
              <Ionicons name={track?.isPlaying ? "pause" : "play"} size={30} color="#fff" style={track?.isPlaying ? undefined : { marginLeft: 3 }} />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} onPress={handleNext} disabled={ctrlLoading}>
              <Ionicons name="play-skip-forward" size={34} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Live chat */}
        <View style={mlStyles.commentSection}>
          <MeetChatList messages={messages} />
        </View>

        {/* Bottom bar — real chat input + mic (talk) */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={mlStyles.bottomBarWrap}
        >
          <View style={mlStyles.bottomBar}>
            <View style={mlStyles.inputPill}>
              <TextInput
                style={mlStyles.inputField}
                placeholder="Send a message"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={chatInput}
                onChangeText={setChatInput}
                onSubmitEditing={handleSendChat}
                returnKeyType="send"
              />
              <TouchableOpacity onPress={handleSendChat} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="send" size={20} color="#E91E8C" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[mlStyles.micBtn, talkOn && mlStyles.micBtnOn]}
              activeOpacity={0.8}
              onPress={handleToggleTalk}
            >
              <Ionicons name={talkOn ? "mic" : "mic-outline"} size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {/* End-of-meet summary */}
        {summary && (
          <MeetSummaryScreen
            tracks={summary}
            listenerCount={listenerCount}
            accessToken={apiToken ?? accessToken}
            onClose={closeAll}
            role="host"
            meetId={meetId}
          />
        )}

        {/* ══ MUSIC PICKER — absolute panel, slides in from the right ══════════ */}
        {pickerOpen && (
          <Animated.View style={[mlStyles.musicPage, { transform: [{ translateX: musicSlideX }] }]}>

            {/* Header */}
            <View style={mlStyles.musicHeader}>
              <TouchableOpacity
                style={mlStyles.musicBackBtn}
                activeOpacity={0.7}
                onPress={showTracks
                  ? () => { setSelectedPlaylist(null); setPlaylistTracks([]); setTracksLoading(false); }
                  : () => closeMusicPicker()
                }
              >
                <Ionicons name="chevron-back" size={22} color="#fff" />
              </TouchableOpacity>
              <Text style={mlStyles.musicTitle}>{p2Title}</Text>
              <View style={{ width: 36 }} />
            </View>

            {/* Search bar */}
            <View style={mlStyles.musicSearchRow}>
              <Ionicons name="search" size={16} color="rgba(255,255,255,0.4)" style={{ marginRight: 8 }} />
              <TextInput
                style={mlStyles.musicSearchInput}
                placeholder="Search songs, artists..."
                placeholderTextColor="rgba(255,255,255,0.32)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => { setSearchQuery(''); setSearchResults([]); }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={17} color="rgba(255,255,255,0.35)" />
                </TouchableOpacity>
              )}
            </View>

            {/* List — musicPage is absoluteFill, so flex:1 here = remaining height */}
            <View style={{ flex: 1 }}>
              {p2Loading ? (
                <ActivityIndicator color="#AB00FF" style={{ marginTop: 48 }} />
              ) : isSearching ? (
                <FlatList
                  style={{ flex: 1 }}
                  data={searchResults}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <MusicTrackRow track={item} playing={playingId === item.id} onPlay={handlePlayTrack} />
                  )}
                  contentContainerStyle={mlStyles.musicListContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  ListEmptyComponent={<Text style={mlStyles.musicEmpty}>No results for "{searchQuery}"</Text>}
                />
              ) : showTracks ? (
                <FlatList
                  style={{ flex: 1 }}
                  data={playlistTracks}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <MusicTrackRow track={item} playing={playingId === item.id} onPlay={handlePlayTrack} />
                  )}
                  contentContainerStyle={mlStyles.musicListContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  ListEmptyComponent={
                    tracksError === 401 || tracksError === 403
                      ? (
                        <View style={{ alignItems: 'center', paddingHorizontal: 24, marginTop: 48, gap: 8 }}>
                          <Ionicons name="lock-closed-outline" size={32} color="rgba(255,255,255,0.25)" />
                          <Text style={[mlStyles.musicEmpty, { marginTop: 8 }]}>
                            Spotify access error ({tracksError})
                          </Text>
                          <Text style={[mlStyles.musicEmpty, { fontSize: 11, marginTop: 0 }]}>
                            Go to Settings → Connected Apps and reconnect Spotify to grant playlist access.
                          </Text>
                        </View>
                      )
                      : tracksError
                        ? <Text style={mlStyles.musicEmpty}>Could not load tracks (HTTP {tracksError})</Text>
                        : <Text style={mlStyles.musicEmpty}>No tracks in this playlist</Text>
                  }
                />
              ) : (
                <FlatList
                  style={{ flex: 1 }}
                  data={playlists}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <MusicPlaylistRow playlist={item} onPress={() => selectPlaylist(item)} />
                  )}
                  contentContainerStyle={mlStyles.musicListContent}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={<Text style={mlStyles.musicEmpty}>No playlists found</Text>}
                />
              )}
            </View>

          </Animated.View>
        )}

      </Animated.View>
    </Modal>
  );
}

// ── Page 2 row components ─────────────────────────────────────────────────────

function MusicTrackRow({
  track, playing, onPlay,
}: {
  track: SpotifyTrackResult;
  playing: boolean;
  onPlay: (t: SpotifyTrackResult) => void;
}) {
  const fmtDur = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };
  return (
    <TouchableOpacity style={mlStyles.musicRow} activeOpacity={0.75} onPress={() => onPlay(track)}>
      {track.albumArt ? (
        <Image source={{ uri: track.albumArt }} style={mlStyles.musicRowArt} />
      ) : (
        <View style={[mlStyles.musicRowArt, { backgroundColor: "#2a2a2e", alignItems: "center", justifyContent: "center" }]}>
          <Ionicons name="musical-note" size={18} color="rgba(255,255,255,0.25)" />
        </View>
      )}
      <View style={{ flex: 1, marginRight: 10 }}>
        <Text style={[mlStyles.musicRowName, playing && { color: "#AB00FF" }]} numberOfLines={1}>{track.name}</Text>
        <Text style={mlStyles.musicRowSub} numberOfLines={1}>{track.artist}  ·  {fmtDur(track.durationMs)}</Text>
      </View>
      {playing
        ? <Ionicons name="musical-notes" size={17} color="#AB00FF" />
        : <Ionicons name="play-circle-outline" size={26} color="rgba(255,255,255,0.35)" />
      }
    </TouchableOpacity>
  );
}

function MusicPlaylistRow({
  playlist, onPress,
}: {
  playlist: SpotifyPlaylist;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={mlStyles.musicRow} activeOpacity={0.75} onPress={onPress}>
      {playlist.imageUrl ? (
        <Image source={{ uri: playlist.imageUrl }} style={mlStyles.musicRowArt} />
      ) : (
        <View style={[mlStyles.musicRowArt, { backgroundColor: playlist.isLiked ? "#1c4d2e" : "#1e1e22", alignItems: "center", justifyContent: "center" }]}>
          <Ionicons name={playlist.isLiked ? "heart" : "musical-notes"} size={18} color={playlist.isLiked ? "#1DB954" : "rgba(255,255,255,0.3)"} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={mlStyles.musicRowName} numberOfLines={1}>{playlist.name}</Text>
        <Text style={mlStyles.musicRowSub} numberOfLines={1}>{playlist.trackCount} songs</Text>
      </View>
      <Ionicons name="chevron-forward" size={17} color="rgba(255,255,255,0.25)" />
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function ProfileView() {
  const { track, liveProgressMs, gradient, needsReconnect, reconnect } = useNowPlayingCtx();
  const router = useRouter();
  const [profile,     setProfile]     = useState<UserProfile | null>(_profileCache);
  const [refreshing,  setRefreshing]  = useState(false);
  const [editOpen,            setEditOpen]            = useState(false);
  const [linksSheetOpen,      setLinksSheetOpen]      = useState(false);
  const [socialLinksSheetOpen, setSocialLinksSheetOpen] = useState(false);
  const [settingsOpen,        setSettingsOpen]        = useState(false);
  const [pinnedPreviewOpen,   setPinnedPreviewOpen]   = useState(false);
  const [userId,         setUserId]         = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [meetOverlayVisible, setMeetOverlayVisible] = useState(false);
  const [activeMeet, setActiveMeet] = useState<ActiveMeetForUser | null>(null);
  const openHostMeet = useOpenHostMeet();
  const openMeet = useOpenMeet();

  // Track whether *we* are currently in a meet, so the now-playing card can show
  // the "in [host]" variant instead of the ordinary solo card. Polled lightly
  // since join/leave happens elsewhere in the tree.
  useEffect(() => {
    if (!userId) return;
    let active = true;
    const load = async () => {
      const m = await getActiveMeetForUser(userId, false);
      if (active) setActiveMeet(m);
    };
    load();
    const id = setInterval(load, 8_000);
    return () => { active = false; clearInterval(id); };
  }, [userId]);

  const fetchProfile = async (force = false) => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Not authenticated");
      // Always resolve userId so ProfileTabs can load posts
      setUserId(user.id);

      if (_profileCache && !force) { setProfile(_profileCache); return; }

      const { data, error } = await supabase
        .from("users")
        .select("username, display_name, bio, is_verified, followers_count, following_count, avatar_url, banner_color, banner_image_url, banner_shape, banner_shape_color, username_changed_at, display_name_change_count, display_name_window_start, pinned_song_id, pinned_song_name, pinned_song_artist, pinned_song_album_art, profile_links, social_links, spotify_access_token")
        .eq("id", user.id)
        .single<UserProfile>();

      if (error) throw new Error(error.message);
      setAccessToken(data.spotify_access_token ?? null);
      _profileCache = data;
      setProfile(data);
    } catch (err) {
      console.error("fetchProfile:", err);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    _profileCache = null;
    _myPostsCache = null;
    await fetchProfile(true);
    setRefreshing(false);
  };

  const getInitials = (name?: string | null) => {
  if (!name) return "";
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const first = words[0].charAt(0).toUpperCase();
  if (words.length === 1) return first;
  const last = words[words.length - 1].charAt(0).toUpperCase();
  return `${first}${last}`;
};



  return (
    <View style={{ flex: 1 }}>
      {/* ─── Top bar ─────────────────────────────────────────────── */}
      <View style={profileStyles.topBar}>
        <Text style={profileStyles.topBarTitle}>Profile</Text>
        <View style={profileStyles.topBarRight}>
          <TouchableOpacity style={profileStyles.topBarIconBtn} activeOpacity={0.7}>
            <Text style={profileStyles.topBarIcon}>🔔</Text>
          </TouchableOpacity>
          <TouchableOpacity style={profileStyles.topBarIconBtn} activeOpacity={0.7} onPress={() => setSettingsOpen(true)}>
            <Ionicons name="settings-outline" size={20} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
          <TouchableOpacity style={profileStyles.proBadge} activeOpacity={0.85}>
            <Text style={profileStyles.proBadgeText}>PRO</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={profileStyles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#AB00FF" />}
      >
      <View style={profileStyles.card}>
        {/* Banner */}
        <View style={profileStyles.bannerWrap}>
          {profile?.banner_image_url ? (
            <Image source={{ uri: profile.banner_image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : profile?.banner_color ? (
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
          {profile?.banner_shape && !profile.banner_image_url ? (
            <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]} pointerEvents="none">
              <BannerShape shape={profile.banner_shape} color={profile.banner_shape_color ?? "#ffffff"} size={72} />
            </View>
          ) : null}
          <LinearGradient
            colors={["transparent", "rgba(22,22,24,0.55)"]}
            style={StyleSheet.absoluteFill}
          />
          {/* <View style={profileStyles.bannerGlow} /> */}

          <View style={profileStyles.bannerActions}>
            {/* Social icons — only linked platforms, up to 3 (2 + overflow badge) */}
            {(() => {
              const linked = BANNER_PLATFORM_PRIORITY
                .map((k) => SOCIAL_PLATFORMS.find((p) => p.key === k)!)
                .filter((p) => !!(profile?.social_links?.[p.key]));
              const visible  = linked.slice(0, linked.length > 3 ? 2 : 3);
              const overflow = linked.length - visible.length;
              return (
                <>
                  {visible.map((p) => (
                    <TouchableOpacity
                      key={p.key}
                      style={profileStyles.socialBtn}
                      activeOpacity={0.7}
                      onPress={() => Linking.openURL(profile!.social_links![p.key]).catch(() => {})}
                    >
                      <FontAwesome5 name={p.icon} size={15} color={p.color} />
                    </TouchableOpacity>
                  ))}
                  {overflow > 0 && (
                    <TouchableOpacity
                      style={[profileStyles.socialBtn, { backgroundColor: "rgba(255,255,255,0.18)" }]}
                      activeOpacity={0.7}
                      onPress={() => setSocialLinksSheetOpen(true)}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "800", color: "#fff" }}>+{overflow}</Text>
                    </TouchableOpacity>
                  )}
                </>
              );
            })()}
            <TouchableOpacity style={profileStyles.editProfileBtn} activeOpacity={0.85} onPress={() => setEditOpen(true)}>
              <Text style={profileStyles.editProfileBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Avatar row — negative margin overlaps banner bottom */}
        <View style={[profileStyles.avatarRow, { marginTop: -PROFILE_AVATAR_OVERLAP }]}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={profileStyles.avatar} />
          ) : (
            <View style={profileStyles.avatar}>
              <Text style={profileStyles.avatarInitials}>{getInitials(profile?.display_name)}</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={profileStyles.infoSection}>
          <View style={profileStyles.nameRow}>
            <Text style={profileStyles.name}>{profile?.display_name}</Text>
            {profile?.is_verified && (
              <View style={profileStyles.verifiedBadge}>
                <Text style={profileStyles.verifiedText}>✓</Text>
              </View>
            )}
          </View>
          <Text style={profileStyles.handle}>@{profile?.username}</Text>

          <Text style={profileStyles.bio}>
            {profile?.bio || "No bio available"}
          </Text>

          <View style={profileStyles.statsRow}>
            <Text style={profileStyles.statNum}>{profile?.following_count?.toLocaleString() || "0"}</Text>
            <Text style={profileStyles.statLabel}> Following</Text>
            <View style={{ width: 22 }} />
            <Text style={profileStyles.statNum}>{profile?.followers_count?.toLocaleString() || "0"}</Text>
            <Text style={profileStyles.statLabel}> Followers</Text>
          </View>

          <View style={profileStyles.metaRow}>
            <TouchableOpacity
              style={profileStyles.metaItem}
              activeOpacity={0.7}
              onPress={() => {
                if (profile?.pinned_song_id) setPinnedPreviewOpen(true);
                else setEditOpen(true);
              }}
            >
              <FontAwesome5 name="music" size={11} color={profile?.pinned_song_id ? "#FF6C1A" : "rgba(255,255,255,0.28)"} />
              <Text
                style={[profileStyles.metaText, profile?.pinned_song_id && { color: "rgba(255,255,255,0.7)" }]}
                numberOfLines={1}
              >
                {profile?.pinned_song_name
                  ? `${profile.pinned_song_name} — ${profile.pinned_song_artist}`
                  : "Pin a song"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={profileStyles.metaItem}
              activeOpacity={0.7}
              onPress={() => {
                const links = profile?.profile_links;
                if (links?.length) {
                  if (links.length === 1) {
                    Linking.openURL(links[0]).catch(() => {});
                  } else {
                    setLinksSheetOpen(true);
                  }
                } else {
                  setEditOpen(true);
                }
              }}
            >
              <FontAwesome5 name="link" size={11} color={profile?.profile_links?.length ? "#FF6C1A" : "rgba(255,255,255,0.28)"} />
              {profile?.profile_links?.length ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flex: 1 }}>
                  <Text
                    style={[profileStyles.metaText, { color: "rgba(255,255,255,0.7)" }]}
                    numberOfLines={1}
                  >
                    {profile.profile_links[0].replace(/^https?:\/\//, "").slice(0, 13)}
                  </Text>
                  {profile.profile_links.length > 1 && (
                    <View style={profileStyles.linkBadge}>
                      <Text style={profileStyles.linkBadgeText}>+{profile.profile_links.length}</Text>
                    </View>
                  )}
                </View>
              ) : (
                <Text style={profileStyles.metaText}>Add link</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ─── Spotify reconnect prompt ────────────────────────────── */}
      {needsReconnect && (
        <TouchableOpacity
          style={profileStyles.reconnectCard}
          activeOpacity={0.82}
          onPress={reconnect}
        >
          <FontAwesome5 name="spotify" size={16} color="#1DB954" />
          <View style={{ flex: 1 }}>
            <Text style={profileStyles.reconnectTitle}>Reconnect Spotify</Text>
            <Text style={profileStyles.reconnectSub}>Your session expired — tap to reconnect</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" />
        </TouchableOpacity>
      )}

      {/* ─── Now Playing card — only shown while actively playing ── */}
      {!needsReconnect && track?.isPlaying && (() => {
        const progress = track.durationMs > 0 ? liveProgressMs / track.durationMs : 0;
        const fmt = (ms: number) => {
          const s = Math.floor(ms / 1000);
          return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
        };
        // You're a participant of your own meet too — distinguish hosting from
        // listening so "Return" goes to the right room (host vs listener).
        const isHosting = !!activeMeet && activeMeet.meet.host_id === userId;
        const meetHost  = activeMeet && !isHosting ? (activeMeet.host.display_name || activeMeet.host.username) : null;
        const inMeet    = isHosting || !!meetHost;
        return (
          <LinearGradient
            colors={inMeet ? ["#2A0C3D", "#1A0820", "#0E070F"] : gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[profileStyles.nowPlayingCard, inMeet && profileStyles.nowPlayingCardMeet]}
          >
            {/* In-a-meet banner — distinguishes synced listening / hosting from solo */}
            {inMeet && (
              <View style={profileStyles.npMeetBadge}>
                <FontAwesome5 name="broadcast-tower" size={11} color="#D9A8FF" />
                {isHosting ? (
                  <Text style={profileStyles.npMeetBadgeText} numberOfLines={1}>
                    Hosting <Text style={profileStyles.npMeetBadgeHost}>your Meet</Text>
                  </Text>
                ) : (
                  <Text style={profileStyles.npMeetBadgeText} numberOfLines={1}>
                    Listening in <Text style={profileStyles.npMeetBadgeHost}>{meetHost}</Text>&apos;s Meet
                  </Text>
                )}
              </View>
            )}
            {/* Album art + song info row */}
            <View style={profileStyles.npTopRow}>
              {track.albumArt ? (
                <Image source={{ uri: track.albumArt }} style={profileStyles.npArt} />
              ) : (
                <View style={[profileStyles.npArt, profileStyles.npArtFallback]}>
                  <Text style={profileStyles.npArtEmoji}>🎵</Text>
                </View>
              )}

              <View style={profileStyles.npInfo}>
                <Text style={profileStyles.npTitle} numberOfLines={1}>{track.name}</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => openSpotifyLink(
                    `spotify:artist:${track.artistId}`,
                    `https://open.spotify.com/artist/${track.artistId}`,
                  )}
                >
                  <Text style={[profileStyles.npArtist]} numberOfLines={1}>
                    {track.artist}
                  </Text>
                </TouchableOpacity>

                {/* Progress bar */}
                <View style={profileStyles.npProgressTrack}>
                  <View style={[profileStyles.npProgressFill, { width: `${progress * 100}%` as any }]}>
                    <View style={profileStyles.npProgressThumb} />
                  </View>
                </View>

                {/* Timestamps */}
                <View style={profileStyles.npTimestamps}>
                  <Text style={profileStyles.npTime}>{fmt(liveProgressMs)}</Text>
                  <Text style={profileStyles.npTime}>{fmt(track.durationMs)}</Text>
                </View>
              </View>
            </View>

            {/* Broadcast row — hidden while in a meet (your output is the host's) */}
            {!inMeet && <BroadcastRow />}

            {/* Hosting → back to host room. Listening → back to listener room.
                Otherwise → start a new meet. */}
            {isHosting ? (
              <TouchableOpacity
                style={profileStyles.startMeetBtn}
                activeOpacity={0.85}
                onPress={() => activeMeet && openHostMeet?.(activeMeet.meet.id, activeMeet.meet.name)}
              >
                <Ionicons name="headset" size={15} color="#fff" />
                <Text style={profileStyles.startMeetBtnText}>Return to your Meet</Text>
              </TouchableOpacity>
            ) : meetHost ? (
              <TouchableOpacity
                style={profileStyles.startMeetBtn}
                activeOpacity={0.85}
                onPress={() => activeMeet && openMeet?.(activeMeet.meet.id, activeMeet.isPublic)}
              >
                <Ionicons name="headset" size={15} color="#fff" />
                <Text style={profileStyles.startMeetBtnText}>Return to Meet</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={profileStyles.startMeetBtn}
                activeOpacity={0.85}
                onPress={() => setMeetOverlayVisible(true)}
              >
                <FontAwesome5 name="broadcast-tower" size={14} color="#fff" />
                <Text style={profileStyles.startMeetBtnText}>Start Meet</Text>
              </TouchableOpacity>
            )}
          </LinearGradient>
        );
      })()}

      {/* ─── Section tabs ────────────────────────────────────────── */}
      <ProfileTabs userId={userId} />
    </ScrollView>

    {linksSheetOpen && (
      <LinksSheet
        links={profile?.profile_links ?? []}
        onClose={() => setLinksSheetOpen(false)}
        accessToken={accessToken}
      />
    )}

    {socialLinksSheetOpen && (
      <SocialLinksSheet
        socialLinks={profile?.social_links ?? {}}
        onClose={() => setSocialLinksSheetOpen(false)}
      />
    )}

    <EditProfileOverlay
      visible={editOpen}
      onClose={() => setEditOpen(false)}
      initialData={{
        display_name: profile?.display_name ?? "",
        username: profile?.username ?? "",
        bio: profile?.bio ?? "",
        avatar_url: profile?.avatar_url ?? null,
        banner_color: profile?.banner_color ?? null,
        banner_image_url: profile?.banner_image_url ?? null,
        banner_shape: profile?.banner_shape ?? null,
        banner_shape_color: profile?.banner_shape_color ?? null,
        username_changed_at: profile?.username_changed_at ?? null,
        display_name_change_count: profile?.display_name_change_count ?? 0,
        display_name_window_start: profile?.display_name_window_start ?? null,
        pinned_song_id: profile?.pinned_song_id ?? null,
        pinned_song_name: profile?.pinned_song_name ?? null,
        pinned_song_artist: profile?.pinned_song_artist ?? null,
        pinned_song_album_art: profile?.pinned_song_album_art ?? null,
        profile_links: profile?.profile_links ?? [],
        social_links: profile?.social_links ?? {},
      }}
      userId={userId}
      accessToken={accessToken}
      onSaved={(data) => {
        const updated: UserProfile = {
          ...(profile ?? {} as UserProfile),
          display_name: data.display_name || null,
          username: data.username,
          bio: data.bio || null,
          avatar_url: data.avatar_url,
          banner_color: data.banner_color,
          banner_image_url: data.banner_image_url,
          banner_shape: data.banner_shape,
          banner_shape_color: data.banner_shape_color,
          username_changed_at: data.username_changed_at,
          display_name_change_count: data.display_name_change_count,
          display_name_window_start: data.display_name_window_start,
          pinned_song_id: data.pinned_song_id,
          pinned_song_name: data.pinned_song_name,
          pinned_song_artist: data.pinned_song_artist,
          pinned_song_album_art: data.pinned_song_album_art,
          profile_links: data.profile_links,
          social_links: data.social_links,
        };
        _profileCache = updated;
        setProfile(updated);
      }}
    />

    {settingsOpen && (
      <SettingsOverlay
        profile={profile}
        userId={userId}
        onClose={() => setSettingsOpen(false)}
        onProfileRefresh={() => { _profileCache = null; fetchProfile(true); }}
      />
    )}

    {/* Pinned song preview — opened by tapping the pinned song row */}
    <SongPreviewSheet
      visible={pinnedPreviewOpen}
      onClose={() => setPinnedPreviewOpen(false)}
      song={
        profile?.pinned_song_id
          ? {
              id:       profile.pinned_song_id,
              name:     profile.pinned_song_name ?? "",
              artist:   profile.pinned_song_artist ?? "",
              albumArt: profile.pinned_song_album_art ?? null,
            }
          : null
      }
      accessToken={accessToken}
    />

    <StartMeetOverlay
      visible={meetOverlayVisible}
      onClose={() => setMeetOverlayVisible(false)}
      onStarted={(meetId, name) => { setMeetOverlayVisible(false); openHostMeet?.(meetId, name); }}
    />
    </View>
  );
}

const profileStyles = StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: NAVBAR_H + BOTTOM_INSET + 32 },

  // Top bar — flat, no border radius
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  topBarTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.3,
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  topBarIconBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarIcon: { fontSize: 18, color: "rgba(255,255,255,0.6)" },
  proBadge: {
    paddingHorizontal: 12,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#AB00FF",
    alignItems: "center",
    justifyContent: "center",
  },
  proBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 1.2,
  },
  card: { backgroundColor: "#161618", borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  bannerWrap: { height: PROFILE_BANNER_H, overflow: "hidden" },
  bannerGlow: { position: "absolute", width: 280, height: 280, borderRadius: 140, backgroundColor: "#FF7030", opacity: 0.38, alignSelf: "center", top: -100 },
  bannerActions: { position: "absolute", bottom: 14, right: 16, flexDirection: "row", alignItems: "center", gap: 8 },
  socialBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(0,0,0,0.35)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  socialIcon: { fontSize: 15, color: "#fff" },
  followBtn: { paddingHorizontal: 18, height: 34, borderRadius: 17, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center" },
  followBtnText: { fontSize: 14, fontWeight: "700", color: "#111" },
  editProfileBtn: { paddingHorizontal: 16, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" },
  editProfileBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  avatarRow: { paddingHorizontal: 18, paddingBottom: 12 },
  avatar: { width: PROFILE_AVATAR_SIZE, height: PROFILE_AVATAR_SIZE, borderRadius: 18, backgroundColor: "#FF6B35", borderWidth: 3, borderColor: "#161618", alignItems: "center", justifyContent: "center" },
  avatarInitials: { fontSize: 28, fontWeight: "800", color: "#fff" },
  infoSection: { paddingHorizontal: 20, paddingBottom: 26 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 },
  name: { fontSize: 21, fontWeight: "800", color: "#ffffff" },
  verifiedBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#1D9BF0", alignItems: "center", justifyContent: "center" },
  verifiedText: { fontSize: 10, fontWeight: "900", color: "#fff" },
  handle: { fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 14 },
  bio: { fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 22, marginBottom: 16 },
  mention: { color: "#1D9BF0" },
  statsRow: { flexDirection: "row", alignItems: "baseline", marginBottom: 16 },
  statNum: { fontSize: 15, fontWeight: "800", color: "#ffffff" },
  statLabel: { fontSize: 14, color: "rgba(255,255,255,0.38)" },
  metaRow: { flexDirection: "row", gap: 20, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5, flex: 1, maxWidth: "55%" },
  metaIcon: { fontSize: 13, color: "rgba(255,255,255,0.28)" },
  metaText: { fontSize: 13, color: "rgba(255,255,255,0.32)" },
  linkBadge: { backgroundColor: "rgba(255,108,26,0.18)", borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  linkBadgeText: { fontSize: 10, fontWeight: "800", color: "#FF6C1A" },

  // Spotify reconnect
  reconnectCard: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(29,185,84,0.08)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(29,185,84,0.2)",
    padding: 14,
  },
  reconnectTitle: { fontSize: 14, fontWeight: "700", color: "#fff" },
  reconnectSub: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 },

  // Now Playing card
  nowPlayingCard: {
    marginTop: 12,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 16,
    gap: 14,
  },
  nowPlayingCardMeet: { borderColor: "rgba(171,0,255,0.45)" },
  npMeetBadge: {
    flexDirection: "row", alignItems: "center", gap: 7,
    alignSelf: "flex-start",
    backgroundColor: "rgba(171,0,255,0.22)",
    borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12,
    marginBottom: 2,
  },
  npMeetBadgeText: { fontSize: 12, fontWeight: "700", color: "#E7CBFF", flexShrink: 1 },
  npMeetBadgeHost: { fontWeight: "800", color: "#fff" },
  npTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  npArt: {
    width: 68,
    height: 68,
    borderRadius: 10,
    backgroundColor: "#2a1a10",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  npArtFallback: { backgroundColor: "#2a1a10", alignItems: "center", justifyContent: "center" },
  npArtEmoji: { fontSize: 26, opacity: 0.5 },
  npInfo: { flex: 1, gap: 3 },
  npTitle: { fontSize: 15, fontWeight: "700", color: "#ffffff" },
  npArtist: { fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 10 },
  npProgressTrack: { height: 3, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 2, marginBottom: 5 },
  npProgressFill: { width: "35%", height: 3, backgroundColor: "#ffffff", borderRadius: 2, position: "relative" },
  npProgressThumb: { position: "absolute", right: -5, top: -4, width: 11, height: 11, borderRadius: 6, backgroundColor: "#fff" },
  npTimestamps: { flexDirection: "row", justifyContent: "space-between" },
  npTime: { fontSize: 11, color: "rgba(255,255,255,0.35)" },

  // Section tabs
  tabsWrap: { marginTop: 12 },
  tabRow: {
    flexDirection: "row",
    position: "relative",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    height: 2,
    borderRadius: 1,
    overflow: "hidden",
  },
  tabBtn: {
    paddingVertical: 12,
    alignItems: "center",
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.32)",
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: "#ffffff",
  },
  // Repost label
  repostLabel: { paddingHorizontal: 16, paddingBottom: 6, paddingTop: 2 },
  repostLabelText: { fontSize: 12, color: "rgba(255,255,255,0.35)", fontWeight: "600" },

  // Playlist list items
  playlistListItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 14,
  },
  playlistListArt: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
  },
  playlistListArtInner: { ...StyleSheet.absoluteFillObject, flexDirection: "row", flexWrap: "wrap" },
  playlistListMiniCell: { width: "50%", height: "100%" },
  playlistListName: { fontSize: 15, fontWeight: "700", color: "#fff", marginBottom: 3 },
  playlistListMeta: { fontSize: 13, color: "rgba(255,255,255,0.38)" },
  playlistChevron: { fontSize: 20, color: "rgba(255,255,255,0.25)", paddingRight: 4 },

  // Community cards
  communityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  communityIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  communityName: { fontSize: 14, fontWeight: "700", color: "#fff", marginBottom: 3 },
  communityDesc: { fontSize: 12, color: "rgba(255,255,255,0.4)" },
  communityMembers: { fontSize: 13, fontWeight: "700", flexShrink: 0 },

  // Gradient toggle
  toggleTrack: {
    width: TOGGLE_W,
    height: TOGGLE_H,
    borderRadius: TOGGLE_H / 2,
    overflow: "hidden",
    justifyContent: "center",
    paddingLeft: 3,
  },
  toggleThumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },

  // Broadcast row
  broadcastRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  broadcastLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "500",
  },

  // Start Meet button — lives inside the Now Playing card
  startMeetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 12,
    paddingVertical: 11,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.28)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  startMeetBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.2,
  },
});

// ─── Start Meet Overlay styles ───────────────────────────────────────────────

const mmStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.70)",
  },
  sheet: {
    // Fixed height anchored to the bottom. Keyboard slides over the bottom portion;
    // the inner ScrollView lets the user reach everything by scrolling.
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    height: SH * 0.85,
    backgroundColor: "#111113",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignSelf: "center",
    marginTop: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#fff" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.55)",
    marginTop: 18,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  labelMuted: { fontWeight: "400", textTransform: "none", letterSpacing: 0 },

  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#fff",
  },
  inputMultiline: {
    minHeight: 88,
    textAlignVertical: "top",
  },

  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  toggleLabel: { fontSize: 15, color: "#fff", fontWeight: "500" },

  tagInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tagInput: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: "#fff",
  },
  tagAddBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: "rgba(171,0,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(171,0,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  tagChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(171,0,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(171,0,255,0.32)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagChipText: { fontSize: 13, color: "#AB00FF", fontWeight: "600" },

  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 28,
    paddingVertical: 15,
    borderRadius: 24,
    backgroundColor: "#AB00FF",
  },
  startBtnDisabled: { opacity: 0.40 },
  startBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
});

// ─── Meet Live Screen styles ──────────────────────────────────────────────────

const mlStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },

  // ── Top bar ───────────────────────────────────────────────────────────────
  topBar: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 52,
    paddingBottom: 10,
  },
  topLeft:  { flexDirection: "row", alignItems: "center", gap: 10 },
  topRight: { flexDirection: "row", alignItems: "center", gap: 8 },

  // Gradient-ring avatar (like in image)
  avatarRing: {
    width: 44, height: 44, borderRadius: 22,
    padding: 2.5,
    alignItems: "center", justifyContent: "center",
  },
  avatarInner: {
    flex: 1, width: "100%", borderRadius: 18,
    backgroundColor: "#1c0030",
    alignItems: "center", justifyContent: "center",
  },
  avatarInitial: { fontSize: 15, fontWeight: "800", color: "#fff" },
  hostName:      { fontSize: 16, fontWeight: "700", color: "#fff" },
  listenerRow:   { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  liveDotSm:     { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FF3B30" },
  listenerText:  { fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: "600" },

  // Dark circular buttons — exactly as in image
  topCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(45,45,45,0.82)",
    alignItems: "center", justifyContent: "center",
  },
  endBtn: {
    paddingHorizontal: 16, height: 38, borderRadius: 19,
    backgroundColor: "#E8000F",
    alignItems: "center", justifyContent: "center",
  },
  endBtnText: { fontSize: 13, fontWeight: "800", color: "#fff" },
  micBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: "rgba(45,45,45,0.82)",
    alignItems: "center", justifyContent: "center",
  },
  micBtnOn: { backgroundColor: "#AB00FF" },

  // ── Comments + hearts row ────────────────────────────────────────────────
  commentSection: {
    position: "absolute",
    left: 0, right: 0,
    bottom: BOTTOM_INSET + 76,   // sits above bottom bar
    flexDirection: "row",
    alignItems: "flex-end",
    paddingLeft: 14,
    paddingRight: 10,
  },
  commentCol: { flex: 1, gap: 9 },

  msgRow: { flexDirection: "row", alignItems: "center", gap: 8 },

  msgAvatar: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  msgAvatarLetter: { fontSize: 13, fontWeight: "800", color: "#fff" },

  msgBubble: {
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexShrink: 1,
  },
  msgName: { fontSize: 12, fontWeight: "700", color: "#fff",                   marginBottom: 2 },
  msgText: { fontSize: 13, fontWeight: "400", color: "rgba(255,255,255,0.88)" },

  // Hearts aligned to bottom-right of the comment stack
  heartsCol: {
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 4,
    paddingLeft: 4,
    gap: 8,
  },
  heartLg: { fontSize: 26 },
  heartSm: { fontSize: 18, opacity: 0.70 },

  // ── Bottom bar ────────────────────────────────────────────────────────────
  bottomBarWrap: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: BOTTOM_INSET + 16,
    gap: 14,
  },
  // White pill — exactly as in image
  inputPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 10,
  },
  inputPlaceholder: { fontSize: 15, color: "rgba(0,0,0,0.32)" },
  inputField: { flex: 1, fontSize: 15, color: "#000", padding: 0 },
  // Icons are standalone — no container — matching the image

  // ── Swipe hint (right edge of page 1) ────────────────────────────────────
  swipeHint: {
    position: "absolute",
    right: 12,
    top: SH * 0.52,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    opacity: 0.5,
  },
  swipeHintText: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgb(255,255,255)",
    letterSpacing: 0.5,
  },

  // ── Page 2 — Music picker ─────────────────────────────────────────────────
  musicPage: {
    width: SW,
    height: SH,
    backgroundColor: "#0e0e11",
    flexDirection: "column",   // explicit — children stack vertically
  },
  musicHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  musicBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  musicTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
  },
  musicSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  musicSearchInput: {
    flex: 1,
    fontSize: 15,
    color: "#fff",
    paddingVertical: 0,
  },
  musicListContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: BOTTOM_INSET + 24,
  },
  musicRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  musicRowArt: {
    width: 50,
    height: 50,
    borderRadius: 8,
    flexShrink: 0,
  },
  musicRowName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 3,
  },
  musicRowSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
  },
  musicEmpty: {
    textAlign: "center",
    marginTop: 48,
    fontSize: 14,
    color: "rgba(255,255,255,0.3)",
  },

  // ── Track info + playback controls ───────────────────────────────────────
  trackSection: {
    position: "absolute",
    left: 0,
    right: 0,
    // Sits between top bar and comments; centres in the usable space
    top: SH * 0.30,
    alignItems: "center",
    paddingHorizontal: 32,
  },
  trackName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
    marginBottom: 4,
  },
  trackArtist: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255,255,255,0.72)",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    marginBottom: 20,
  },
  // Thin progress bar (full width of section)
  progressTrack: {
    width: "100%",
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.22)",
    overflow: "hidden",
    marginBottom: 6,
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: "#fff",
  },
  progressTimes: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  progressTime: {
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
  },
  // Prev / Play-Pause / Next row
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 36,
  },
  // Circular play/pause button
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
});

// ─── Post Composer styles ─────────────────────────────────────────────────────

const csStyles = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(0,0,0,0.65)" },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0, height: "90%",
    backgroundColor: "#111113",
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    overflow: "hidden",
    borderTopWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)",
  },
  title: { fontSize: 16, fontWeight: "700", color: "#fff" },
  cancelBtn: { fontSize: 15, color: "rgba(255,255,255,0.5)" },
  postBtn: {
    backgroundColor: "#AB00FF", borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 7,
    minWidth: 56, alignItems: "center",
  },
  postBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },

  composeRow: { flexDirection: "row", alignItems: "flex-start", padding: 18, gap: 12 },
  avatar: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: "#AB00FF",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
    overflow: "hidden",
  },
  avatarInitials: { fontSize: 16, fontWeight: "800", color: "#fff" },
  textInput: {
    flex: 1, fontSize: 16, color: "#fff",
    lineHeight: 24, minHeight: 80,
    textAlignVertical: "top",
  },

  imageStrip: { paddingHorizontal: 18, paddingBottom: 16, gap: 10, flexDirection: "row", alignItems: "center" },
  thumbImage: { width: 88, height: 88, borderRadius: 12 },
  thumbRemove: {
    position: "absolute", top: 4, right: 4,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center", justifyContent: "center",
  },
  thumbRemoveText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  thumbAdd: {
    width: 88, height: 88, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    borderStyle: "dashed",
    alignItems: "center", justifyContent: "center",
  },

  pollSection: { paddingHorizontal: 18, paddingBottom: 12, gap: 10 },
  pollQuestion: {
    backgroundColor: "#1A1A1C", borderRadius: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    color: "#fff", fontSize: 16, fontWeight: "600",
    paddingHorizontal: 16, paddingVertical: 13,
  },
  pollOptionRow: { flexDirection: "row", alignItems: "center" },
  pollOptionInput: {
    flex: 1, backgroundColor: "#1A1A1C", borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    color: "#fff", fontSize: 14,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  addOptionBtn: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 10, paddingHorizontal: 4,
  },
  addOptionText: { fontSize: 14, color: "#AB00FF", fontWeight: "600" },

  toolbar: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.07)",
    gap: 4,
  },
  toolBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
  },
  toolBtnActive: { backgroundColor: "rgba(171,0,255,0.12)" },
  audienceChip: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  audienceText: { fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: "600" },

  // ─── Media source picker panel ──────────────────────────────────────────────
  mediaPicker: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.12)",
    paddingVertical: 16, paddingHorizontal: 16,
  },
  mediaPickerBtn: { flex: 1, alignItems: "center", gap: 7 },
  mediaPickerLabel: { color: "#fff", fontSize: 12, fontWeight: "600", opacity: 0.85 },
  mediaPickerDivider: {
    width: StyleSheet.hairlineWidth, height: 38,
    backgroundColor: "rgba(255,255,255,0.15)", marginHorizontal: 6,
  },
  mediaPickerClose: { paddingLeft: 14, paddingRight: 2, alignSelf: "center" },
});

const psStyles = StyleSheet.create({
  sheet: { position: "absolute", bottom: 0, left: 0, right: 0, height: "88%", backgroundColor: "#111113", borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden", borderTopWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  navBtn: { width: 32, alignItems: "center" },
  homeContent: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 40 },
  sectionLabel: { fontSize: 11, fontWeight: "700" as const, color: "rgba(255,255,255,0.3)", letterSpacing: 1, marginBottom: 14 },
  nowPlayingCard: { flexDirection: "row" as const, alignItems: "center" as const, gap: 12, backgroundColor: "rgba(29,185,84,0.08)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(29,185,84,0.2)", padding: 14 },
  npArt: { width: 52, height: 52, borderRadius: 10, flexShrink: 0 },
  npArtFallback: { backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center" as const, justifyContent: "center" as const },
  npTrack: { fontSize: 14, fontWeight: "700" as const, color: "#fff" },
  npArtist: { fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2 },
  pinBtn: { flexDirection: "row" as const, alignItems: "center" as const, gap: 5, backgroundColor: "#1DB954", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  pinBtnText: { fontSize: 12, fontWeight: "700" as const, color: "#000" },
  addSongBtn: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 10, backgroundColor: "#FF6C1A", borderRadius: 14, paddingVertical: 14 },
  addSongText: { fontSize: 15, fontWeight: "700" as const, color: "#fff" },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.07)", marginVertical: 24 },
  menuRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 14, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  menuIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center" as const, justifyContent: "center" as const },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: "600" as const, color: "#fff" },
  plArt: { width: 48, height: 48, borderRadius: 8, flexShrink: 0 },
  likedArt: { backgroundColor: "rgba(29,185,84,0.1)", alignItems: "center" as const, justifyContent: "center" as const },
  plArtFallback: { backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center" as const, justifyContent: "center" as const },
  // Preview step
  previewWrap: { flex: 1, alignItems: "center" as const, paddingHorizontal: 28, paddingTop: 20, paddingBottom: 28 },
  previewArt: { width: 190, height: 190, borderRadius: 18, marginBottom: 22 },
  previewArtFallback: { backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center" as const, justifyContent: "center" as const },
  previewTrack: { fontSize: 20, fontWeight: "800" as const, color: "#fff", textAlign: "center" as const, marginBottom: 6 },
  previewArtist: { fontSize: 14, color: "rgba(255,255,255,0.45)", textAlign: "center" as const, marginBottom: 24 },
  previewProgressTrack: { width: "100%", height: 4, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 2, marginBottom: 8 },
  previewProgressFill: { height: 4, backgroundColor: "#1DB954", borderRadius: 2 },
  previewTimes: { width: "100%", flexDirection: "row" as const, justifyContent: "space-between" as const, marginBottom: 20 },
  previewTime: { fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: "600" as const },
  noPreviewText: { fontSize: 13, color: "rgba(255,255,255,0.3)", marginVertical: 24, fontStyle: "italic" as const },
  playPauseBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#1DB954", alignItems: "center" as const, justifyContent: "center" as const, marginBottom: 28 },
  previewActions: { flexDirection: "row" as const, gap: 12, width: "100%", marginBottom: 14 },
  openBtn: { flex: 1, flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 7, height: 46, borderRadius: 14, backgroundColor: "rgba(29,185,84,0.12)", borderWidth: 1, borderColor: "rgba(29,185,84,0.3)" },
  openBtnText: { fontSize: 14, fontWeight: "700" as const, color: "#1DB954" },
  saveBtn: { flex: 1, flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 7, height: 46, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" },
  saveBtnSaved: { backgroundColor: "rgba(29,185,84,0.1)", borderColor: "rgba(29,185,84,0.28)" },
  saveBtnText: { fontSize: 14, fontWeight: "600" as const, color: "rgba(255,255,255,0.7)" },
  saveBtnTextSaved: { color: "#1DB954" },
  pinCTA: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 8, width: "100%", height: 52, borderRadius: 16, backgroundColor: "#FF6C1A" },
  pinCTAText: { fontSize: 16, fontWeight: "800" as const, color: "#000" },
});

const epOverlayStyles = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(0,0,0,0.70)" },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0, height: "92%",
    backgroundColor: "#111113",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    overflow: "hidden",
    borderTopWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  songSheet: {
    position: "absolute", bottom: 0, left: 0, right: 0, height: "75%",
    backgroundColor: "#111113",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    overflow: "hidden",
    borderTopWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    paddingBottom: 20,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", alignSelf: "center", marginTop: 10, marginBottom: 4 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" },
  sheetTitle: { fontSize: 16, fontWeight: "700", color: "#fff" },
  closeBtn: { fontSize: 16, color: "rgba(255,255,255,0.45)", fontWeight: "600" },
  cancelBtn: { fontSize: 15, color: "rgba(255,255,255,0.5)" },
  saveBtn: { fontSize: 15, fontWeight: "700", color: "#FF6C1A" },
  searchRow: { flexDirection: "row", alignItems: "center", margin: 16, backgroundColor: "#1A1A1C", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", paddingHorizontal: 14, paddingVertical: 11 },
  searchInput: { flex: 1, color: "#fff", fontSize: 15 },
  resultRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.04)" },
  resultArt: { width: 46, height: 46, borderRadius: 8 },
  resultArtFallback: { backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  resultTrack: { fontSize: 14, fontWeight: "600", color: "#fff" },
  resultArtist: { fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 },
  emptyText: { textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 14, marginTop: 32 },
  avatarSection: { alignItems: "center", paddingVertical: 24 },
  avatarWrap: { position: "relative", width: 94, height: 94 },
  avatarCircle: { width: 90, height: 90, borderRadius: 20, backgroundColor: "#FF6B35", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarLoading: { backgroundColor: "rgba(255,255,255,0.1)" },
  avatarInitials: { fontSize: 30, fontWeight: "800", color: "#fff" },
  avatarEditBadge: { position: "absolute", bottom: -4, right: -4, width: 26, height: 26, borderRadius: 13, backgroundColor: "#FF6C1A", borderWidth: 2, borderColor: "#111113", alignItems: "center", justifyContent: "center" },
  avatarHint: { marginTop: 10, fontSize: 12, color: "rgba(255,255,255,0.3)" },
  section: { paddingHorizontal: 20, marginBottom: 22 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1, color: "rgba(255,255,255,0.3)", marginBottom: 8 },
  input: { backgroundColor: "#1A1A1C", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 15, paddingHorizontal: 16, paddingVertical: 13 },
  inputMulti: { minHeight: 80, paddingTop: 13, textAlignVertical: "top" },
  songRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#1A1A1C", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", padding: 12, gap: 12 },
  songArt: { width: 44, height: 44, borderRadius: 8 },
  songArtFallback: { backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  songName: { fontSize: 14, fontWeight: "600", color: "#fff" },
  songArtist: { fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 },
  songPlaceholder: { fontSize: 14, color: "rgba(255,255,255,0.3)" },
  clearBtn: { marginTop: 8, alignSelf: "flex-start" },
  clearBtnText: { fontSize: 13, color: "rgba(255,100,80,0.7)" },
  linkRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#1A1A1C", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", paddingHorizontal: 14, paddingVertical: 11, marginBottom: 8, gap: 8 },
  linkText: { flex: 1, fontSize: 13, color: "rgba(255,255,255,0.65)" },
  linkInputRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  linkInput: { flex: 1, backgroundColor: "#1A1A1C", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 14, paddingHorizontal: 14, paddingVertical: 11 },
  addLinkBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: "#FF6C1A", alignItems: "center", justifyContent: "center" },
  socialRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  socialIconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  socialInput: { flex: 1, backgroundColor: "#1A1A1C", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 13, paddingHorizontal: 12, paddingVertical: 10 },
  bannerPreview: { height: 150, borderRadius: 14, overflow: "hidden", backgroundColor: "#1A1A1C", alignItems: "flex-end", justifyContent: "flex-end", padding: 10 },
  bannerEditBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(0,0,0,0.52)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  bannerEditText: { fontSize: 12, fontWeight: "700" as const, color: "#fff" },
  inputLocked: { opacity: 0.4 },
  cooldownBadge: { fontSize: 11, fontWeight: "600" as const, color: "#FF6C1A", letterSpacing: 0 },
  cooldownBadgeLocked: { fontSize: 11, fontWeight: "600" as const, color: "rgba(255,100,80,0.75)", letterSpacing: 0 },
});

const bcOverlayStyles = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: { position: "absolute", bottom: 0, left: 0, right: 0, height: "75%", backgroundColor: "#1A1A1C", borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden", borderTopWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", alignSelf: "center", marginTop: 10, marginBottom: 4 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" },
  title: { fontSize: 16, fontWeight: "700" as const, color: "#fff" },
  closeBtn: { fontSize: 16, color: "rgba(255,255,255,0.45)", fontWeight: "600" as const },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  imageBox: { height: 120, borderRadius: 16, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.15)", borderStyle: "dashed" as const, alignItems: "center", justifyContent: "center", gap: 8, overflow: "hidden", backgroundColor: "#1A1A1C" },
  imageOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", gap: 6 },
  imageBoxText: { fontSize: 14, color: "rgba(255,255,255,0.5)", fontWeight: "600" as const },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 22, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.08)" },
  dividerText: { fontSize: 12, color: "rgba(255,255,255,0.25)", fontWeight: "600" as const },
  colorRow: { flexDirection: "row" as const, justifyContent: "space-between" as const, marginBottom: 10 },
  colorSwatch: { borderRadius: 14, alignItems: "center" as const, justifyContent: "center" as const },
  colorSwatchSelected: { borderWidth: 2.5, borderColor: "#fff" },
});

const bsOverlayStyles = StyleSheet.create({
  sheet: { position: "absolute", bottom: 0, left: 0, right: 0, height: "78%", backgroundColor: "#1A1A1C", borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden", borderTopWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  sectionLabel: { fontSize: 11, fontWeight: "700" as const, color: "rgba(255,255,255,0.35)", letterSpacing: 1, marginBottom: 14 },
  shapeCell: { height: SWATCH_SIZE + 26, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.07)", alignItems: "center" as const, justifyContent: "center" as const },
  shapeCellSelected: { backgroundColor: "rgba(255,108,26,0.18)", borderWidth: 1.5, borderColor: "#FF6C1A" },
  shapeIconWrap: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const },
  shapeLabel: { fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: "600" as const, paddingBottom: 7 },
  shapeLabelSelected: { color: "#FF6C1A" },
  disabledHint: { fontSize: 12, color: "rgba(255,255,255,0.35)", textAlign: "center" as const, marginBottom: 14, fontStyle: "italic" as const },
});

// ─── Post Composer Sheet ──────────────────────────────────────────────────────

type ComposerUser = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

function PostComposerSheet({
  visible,
  onClose,
  currentUser,
  onPosted,
  initialText,
}: {
  visible: boolean;
  onClose: () => void;
  currentUser: ComposerUser | null;
  onPosted: (post: Post) => void;
  initialText?: string;
}) {
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [pollMode, setPollMode] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [posting, setPosting] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(SH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setText(initialText ?? ""); setImages([]); setPollMode(false); setMediaPickerOpen(false);
      setPollQuestion(""); setPollOptions(["", ""]);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 200 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SH, duration: 260, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const pickFromCamera = async () => {
    setMediaPickerOpen(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission needed", "Allow camera access to take a photo."); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: false });
    if (!result.canceled) {
      setImages((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 4));
      setPollMode(false);
    }
  };

  const pickFromLibrary = async () => {
    setMediaPickerOpen(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission needed", "Allow photo access to attach images."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"] as any,
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: 4,
    });
    if (!result.canceled) {
      setImages((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 4));
      setPollMode(false);
    }
  };

  const pickVideo = async () => {
    setMediaPickerOpen(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission needed", "Allow photo access to attach a video."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"] as any,
      allowsMultipleSelection: false,
      quality: 0.85,
    });
    if (!result.canceled) {
      setImages((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 4));
      setPollMode(false);
    }
  };

  const removeImage = (idx: number) => setImages((prev) => prev.filter((_, i) => i !== idx));

  const canPost =
    text.trim().length > 0 ||
    images.length > 0 ||
    (pollMode && pollQuestion.trim().length > 0 && pollOptions.filter((o) => o.trim()).length >= 2);

  const handlePost = async () => {
    if (!currentUser || !canPost || posting) return;
    setPosting(true);
    try {
      const VIDEO_EXTS = ["mp4", "mov", "m4v", "avi", "webm"];
      let type: "text" | "image" | "video" | "poll" = "text";
      let mediaUrls: string[] = [];

      if (images.length > 0) {
        const firstExt = (images[0].split(".").pop() ?? "").toLowerCase();
        type = VIDEO_EXTS.includes(firstExt) ? "video" : "image";
        for (const uri of images) {
          const ext = (uri.split(".").pop() ?? "jpg").toLowerCase();
          const isVideo = VIDEO_EXTS.includes(ext);
          const fileName = `${currentUser.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const resp = await fetch(uri);
          const blob = await resp.blob();
          const ab = await new Promise<ArrayBuffer>((res, rej) => {
            const reader = new FileReader();
            reader.onload = () => res(reader.result as ArrayBuffer);
            reader.onerror = rej;
            reader.readAsArrayBuffer(blob);
          });
          const contentType = isVideo
            ? `video/${ext === "mov" ? "quicktime" : ext}`
            : `image/${ext}`;
          const { error: upErr } = await supabase.storage
            .from("post-media")
            .upload(fileName, ab, { contentType, upsert: false });
          if (upErr) throw upErr;
          const { data: { publicUrl } } = supabase.storage.from("post-media").getPublicUrl(fileName);
          mediaUrls.push(publicUrl);
        }
      } else if (pollMode) {
        type = "poll";
      }

      const opts = pollMode
        ? pollOptions
            .filter((o) => o.trim())
            .map((o, i) => ({ id: `opt_${i}`, label: o.trim(), votes: 0 }))
        : null;

      const { data: newRow, error } = await supabase
        .from("posts")
        .insert({
          user_id: currentUser.id,
          type,
          text: text.trim() || null,
          media_urls: mediaUrls,
          poll_question: pollMode ? pollQuestion.trim() || null : null,
          poll_options: opts,
        })
        .select("id, type, text, media_urls, song_id, song_name, song_artist, song_album_art, poll_question, poll_options, created_at, likes_count, comments_count, users!user_id(id, username, display_name, avatar_url)")
        .single();

      if (error) throw error;
      onPosted(dbRowToPost(newRow));
      onClose();
    } catch (e: any) {
      Alert.alert("Post failed", e.message ?? "Could not create post.");
    } finally {
      setPosting(false);
    }
  };

  const initials = currentUser?.display_name
    ? currentUser.display_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : (currentUser?.username ?? "?")[0].toUpperCase();

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, csStyles.backdrop, { opacity: backdropAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[csStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          {/* Header */}
          <View style={csStyles.header}>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Text style={csStyles.cancelBtn}>Cancel</Text>
            </TouchableOpacity>
            <Text style={csStyles.title}>New Post</Text>
            <TouchableOpacity
              style={[csStyles.postBtn, !canPost && { opacity: 0.4 }]}
              disabled={!canPost || posting}
              onPress={handlePost}
            >
              {posting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={csStyles.postBtnText}>Post</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {/* Author + text */}
            <View style={csStyles.composeRow}>
              {currentUser?.avatar_url ? (
                <Image source={{ uri: currentUser.avatar_url }} style={csStyles.avatar} />
              ) : (
                <View style={csStyles.avatar}>
                  <Text style={csStyles.avatarInitials}>{initials}</Text>
                </View>
              )}
              <TextInput
                style={csStyles.textInput}
                placeholder="What's on your mind?"
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={text}
                onChangeText={setText}
                multiline
                autoFocus
              />
            </View>

            {/* Image thumbnails */}
            {images.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={csStyles.imageStrip}
              >
                {images.map((uri, idx) => (
                  <TouchableOpacity key={idx} onPress={() => removeImage(idx)} activeOpacity={0.8} style={{ position: "relative" }}>
                    <Image source={{ uri }} style={csStyles.thumbImage} />
                    <View style={csStyles.thumbRemove}>
                      <Text style={csStyles.thumbRemoveText}>✕</Text>
                    </View>
                  </TouchableOpacity>
                ))}
                {images.length < 4 && (
                  <TouchableOpacity style={csStyles.thumbAdd} onPress={() => setMediaPickerOpen(true)}>
                    <FontAwesome5 name="plus" size={18} color="rgba(255,255,255,0.4)" />
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}

            {/* Poll section */}
            {pollMode && (
              <View style={csStyles.pollSection}>
                <TextInput
                  style={csStyles.pollQuestion}
                  placeholder="Ask a question…"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={pollQuestion}
                  onChangeText={setPollQuestion}
                />
                {pollOptions.map((opt, idx) => (
                  <View key={idx} style={csStyles.pollOptionRow}>
                    <TextInput
                      style={csStyles.pollOptionInput}
                      placeholder={`Option ${idx + 1}${idx < 2 ? "" : " (optional)"}`}
                      placeholderTextColor="rgba(255,255,255,0.25)"
                      value={opt}
                      onChangeText={(t) =>
                        setPollOptions((prev) => prev.map((o, i) => (i === idx ? t : o)))
                      }
                    />
                    {idx > 1 && (
                      <TouchableOpacity
                        onPress={() => setPollOptions((prev) => prev.filter((_, i) => i !== idx))}
                        hitSlop={8}
                        style={{ marginLeft: 8 }}
                      >
                        <FontAwesome5 name="times" size={14} color="rgba(255,100,100,0.7)" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                {pollOptions.length < 4 && (
                  <TouchableOpacity style={csStyles.addOptionBtn} onPress={() => setPollOptions((p) => [...p, ""])}>
                    <FontAwesome5 name="plus" size={11} color="#AB00FF" style={{ marginRight: 6 }} />
                    <Text style={csStyles.addOptionText}>Add option</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </ScrollView>

          {/* Inline media source picker — appears above toolbar */}
          {mediaPickerOpen && (
            <View style={csStyles.mediaPicker}>
              <TouchableOpacity style={csStyles.mediaPickerBtn} onPress={pickFromCamera} activeOpacity={0.75}>
                <FontAwesome5 name="camera" size={20} color="#fff" />
                <Text style={csStyles.mediaPickerLabel}>Camera</Text>
              </TouchableOpacity>
              <View style={csStyles.mediaPickerDivider} />
              <TouchableOpacity style={csStyles.mediaPickerBtn} onPress={pickFromLibrary} activeOpacity={0.75}>
                <FontAwesome5 name="images" size={20} color="#fff" />
                <Text style={csStyles.mediaPickerLabel}>Photos</Text>
              </TouchableOpacity>
              <View style={csStyles.mediaPickerDivider} />
              <TouchableOpacity style={csStyles.mediaPickerBtn} onPress={pickVideo} activeOpacity={0.75}>
                <FontAwesome5 name="film" size={20} color="#fff" />
                <Text style={csStyles.mediaPickerLabel}>Video</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={csStyles.mediaPickerClose}
                onPress={() => setMediaPickerOpen(false)}
                hitSlop={12}
              >
                <FontAwesome5 name="times" size={16} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>
          )}

          {/* Bottom toolbar */}
          <View style={csStyles.toolbar}>
            <TouchableOpacity
              style={[csStyles.toolBtn, (images.length > 0 || mediaPickerOpen) && csStyles.toolBtnActive]}
              onPress={() => { setMediaPickerOpen((o) => !o); setPollMode(false); }}
              activeOpacity={0.7}
            >
              <FontAwesome5
                name="images"
                size={19}
                color={(images.length > 0 || mediaPickerOpen) ? "#AB00FF" : "rgba(255,255,255,0.45)"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[csStyles.toolBtn, pollMode && csStyles.toolBtnActive]}
              onPress={() => { setPollMode((p) => !p); setImages([]); }}
              disabled={images.length > 0}
              activeOpacity={0.7}
            >
              <FontAwesome5 name="poll-h" size={19} color={pollMode ? "#AB00FF" : "rgba(255,255,255,0.45)"} />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <View style={csStyles.audienceChip}>
              <FontAwesome5 name="globe" size={11} color="rgba(255,255,255,0.5)" style={{ marginRight: 5 }} />
              <Text style={csStyles.audienceText}>Public</Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function FeedScreen() {
  // Instantiate once at the top level so token cache + needsReconnect survive tab switches
  const nowPlaying = useNowPlaying();

  // Allow other screens (e.g. user-profile DM button) to open a specific tab / conversation
  const { openTab, openConvId, openConvUserId, openConvUserName, openConvAvatar, openMeetId } =
    useLocalSearchParams<{
      openTab?: string;
      openConvId?: string;
      openConvUserId?: string;
      openConvUserName?: string;
      openConvAvatar?: string;
      openMeetId?: string;
    }>();

  const [menuVisible, setMenuVisible] = useState(false);
  const [activeNav, setActiveNav] = useState(openTab ?? "Feed");
  const [quickReplyPost, setQuickReplyPost] = useState<Post | null>(null);
  const [detailPost, setDetailPost] = useState<Post | null>(null);
  const [openConv, setOpenConv]     = useState<ConversationInfo | null>(null);
  const [listenerMeetId, setListenerMeetId] = useState<string | null>(null);
  const [listenerMinimized, setListenerMinimized] = useState(false);
  const [listenerInfo, setListenerInfo] = useState<{ name: string; trackName: string | null; albumArt: string | null } | null>(null);
  const [listenerIsPublic, setListenerIsPublic] = useState(false);
  // Meet awaiting a public/private choice before the listener room opens.
  const [joinPromptMeetId, setJoinPromptMeetId] = useState<string | null>(null);

  // Host meet session — hoisted here (out of ProfileView) so the room and its
  // minimized mini-bar survive tab switches.
  const [hostMeetId,    setHostMeetId]    = useState<string | null>(null);
  const [hostMeetName,  setHostMeetName]  = useState("");
  const [hostMeetToken, setHostMeetToken] = useState<string | null>(null);
  const [hostMinimized, setHostMinimized] = useState(false);

  const openListenerMeet = (id: string, isPublic?: boolean) => {
    // Already in this room (e.g. minimized) → just restore it to fullscreen.
    // Never re-join or re-show the join prompt/guide for a room we're in.
    if (listenerMeetId === id) { setListenerMinimized(false); return; }
    // No choice yet → ask the joiner whether to join publicly or privately.
    if (isPublic === undefined) { setJoinPromptMeetId(id); return; }
    setListenerIsPublic(isPublic);
    setListenerMeetId(id);
    setListenerMinimized(false);
  };
  const openHostMeet = (meetId: string, name: string) => {
    setHostMeetId(meetId); setHostMeetName(name); setHostMinimized(false);
    if (currentUser?.id) getValidSpotifyToken(currentUser.id).then(setHostMeetToken);
  };

  // Auto-open the listener room when navigated here from a meet-incoming push
  useEffect(() => {
    if (openMeetId) openListenerMeet(String(openMeetId));
  }, [openMeetId]);

  // Auto-open a conversation when navigated here from user-profile DM button
  useEffect(() => {
    if (openConvId && openConvUserId && openConvUserName) {
      setOpenConv({
        conversationId: openConvId,
        otherUser: { id: openConvUserId, username: openConvUserName, display_name: null, avatar_url: openConvAvatar || null },
        last_message_at: null,
        last_message_preview: null,
      });
    }
  }, [openConvId]);
  const [keyboardUp, setKeyboardUp] = useState(false);
  const [feedScrollEnabled, setFeedScrollEnabled] = useState(true);
  const [feedRefreshing, setFeedRefreshing] = useState(false);
  const [feedPosts, setFeedPosts] = useState<Post[]>([]);
  const [currentUser, setCurrentUser] = useState<ComposerUser | null>(null);
  const [quickText, setQuickText] = useState("");
  const [attachedTrack, setAttachedTrack] = useState<NowPlayingTrack | null>(null);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());

  const fetchFeedPosts = async (userId?: string) => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("id, type, text, media_urls, song_id, song_name, song_artist, song_album_art, poll_question, poll_options, created_at, likes_count, comments_count, users!user_id(id, username, display_name, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      if (data) setFeedPosts(data.map(dbRowToPost));

      // Load which posts the current user has already liked
      if (userId) {
        const { data: likesData } = await supabase
          .from("post_likes")
          .select("post_id")
          .eq("user_id", userId);
        if (likesData) setLikedPostIds(new Set(likesData.map((r: any) => r.post_id)));
      }
    } catch (e) {
      console.error("fetchFeedPosts:", e);
    }
  };

  // Toggle like with optimistic UI + DB sync via toggle_post_like RPC
  const onToggleLike = async (postId: string) => {
    if (!currentUser) return;
    // Optimistic toggle
    setLikedPostIds((prev) => {
      const next = new Set(prev);
      next.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
    try {
      const { data, error } = await supabase.rpc("toggle_post_like", {
        p_post_id: postId,
        p_user_id: currentUser.id,
      });
      if (error) throw error;
      if (data) {
        // Sync actual like count from DB
        setFeedPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, likes: (data as any).likes_count } : p
          )
        );
        // Sync liked state from DB (source of truth)
        setLikedPostIds((prev) => {
          const next = new Set(prev);
          (data as any).liked ? next.add(postId) : next.delete(postId);
          return next;
        });
      }
    } catch (e) {
      // Revert optimistic toggle on failure
      setLikedPostIds((prev) => {
        const next = new Set(prev);
        next.has(postId) ? next.delete(postId) : next.add(postId);
        return next;
      });
      console.error("toggle_post_like:", e);
    }
  };

  // Post directly from the floating quick-field without opening the sheet.
  // If a track is attached the post type becomes "music" and song_data is stored.
  const handleQuickPost = async () => {
    const hasText  = quickText.trim().length > 0;
    const hasTrack = attachedTrack !== null;
    if (!currentUser || (!hasText && !hasTrack)) return;

    const textToPost   = quickText.trim();
    const trackToPost  = attachedTrack;
    setQuickText("");
    setAttachedTrack(null);
    Keyboard.dismiss();

    try {
      const payload: Record<string, any> = {
        user_id: currentUser.id,
        type: hasTrack ? "music" : "text",
        text: textToPost || null,
      };
      if (trackToPost) {
        payload.song_id        = trackToPost.id;
        payload.song_name      = trackToPost.name;
        payload.song_artist    = trackToPost.artist;
        payload.song_album_art = trackToPost.albumArt ?? null;
      }

      const { data: newRow, error } = await supabase
        .from("posts")
        .insert(payload)
        .select("id, type, text, media_urls, song_id, song_name, song_artist, song_album_art, poll_question, poll_options, created_at, likes_count, comments_count, users!user_id(id, username, display_name, avatar_url)")
        .single();
      if (error) throw error;
      setFeedPosts((prev) => [dbRowToPost(newRow), ...prev]);
    } catch (e: any) {
      Alert.alert("Post failed", e.message ?? "Could not create post.");
      setQuickText(textToPost);
      setAttachedTrack(trackToPost);
    }
  };

  // Load current user + initial posts on mount
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("users")
          .select("username, display_name, avatar_url")
          .eq("id", user.id)
          .single();
        if (data) setCurrentUser({ id: user.id, ...data });
        fetchFeedPosts(user.id);
      } else {
        fetchFeedPosts();
      }
    })();
  }, []);

  const onFeedRefresh = async () => {
    setFeedRefreshing(true);
    await fetchFeedPosts(currentUser?.id);
    setFeedRefreshing(false);
  };

  // Composer bottom animates between resting position (above nav) and above keyboard
  const composerBottom = useRef(new Animated.Value(COMPOSER_ABOVE_NAV)).current;

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvt, (e) => {
      setKeyboardUp(true);
      Animated.timing(composerBottom, {
        toValue: e.endCoordinates.height + 8,
        duration: Platform.OS === "ios" ? (e.duration ?? 260) : 260,
        useNativeDriver: false,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvt, (e) => {
      setKeyboardUp(false);
      Animated.timing(composerBottom, {
        toValue: COMPOSER_ABOVE_NAV,
        duration: Platform.OS === "ios" ? (e.duration ?? 260) : 260,
        useNativeDriver: false,
      }).start();
    });

    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const [keyboardVisible, setKeyboardVisible] = useState(false);

useEffect(() => {
  const showSub = Keyboard.addListener('keyboardDidShow', () => {
    setKeyboardVisible(true);
  });

  const hideSub = Keyboard.addListener('keyboardDidHide', () => {
    setKeyboardVisible(false);
  });

  return () => {
    showSub.remove();
    hideSub.remove();
  };
}, []);

  return (
    <NowPlayingCtx.Provider value={nowPlaying}>
    <FeedUserCtx.Provider value={{ currentUserId: currentUser?.id ?? null, likedPostIds, onToggleLike }}>
    <OpenMeetCtx.Provider value={openListenerMeet}>
    <HostMeetCtx.Provider value={openHostMeet}>
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {activeNav === "Profile" ? (
          <ProfileView />
        ) : activeNav === "Discover" ? (
          <DiscoverView />
        ) : activeNav === "Meets" ? (
          <MeetsView />
        ) : activeNav === "Messages" ? (
          <MessagesView onOpenChat={setOpenConv} />
        ) : (
          <FlatList
            data={feedPosts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.feedContent}
            showsVerticalScrollIndicator={false}
            scrollEnabled={feedScrollEnabled}
            keyboardShouldPersistTaps="handled"
            refreshControl={<RefreshControl refreshing={feedRefreshing} onRefresh={onFeedRefresh} tintColor="#AB00FF" />}
            ListHeaderComponent={
              <>
                <View style={styles.navbar}>
                  <View style={{ width: 40 }} />
                  <Text style={styles.navBrand}>trackmeet</Text>
                  <TouchableOpacity style={styles.notifBtn} activeOpacity={0.7}>
                    <Ionicons name="notifications-outline" size={22} color="#fff" />
                  </TouchableOpacity>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.storiesContent}
                  style={styles.storiesStrip}
                >
                  {NOW_PLAYING_STORIES.map((s) => <NowPlayingBubble key={s.id} item={s} />)}
                </ScrollView>
                <View style={styles.stripDivider} />
              </>
            }
            renderItem={({ item }) => (
              <SwipeablePost
                item={item}
                onQuickReply={setQuickReplyPost}
                onScrollLock={setFeedScrollEnabled}
                onPress={() => setDetailPost(item)}
              />
            )}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          />
        )}
      </SafeAreaView>

      {/* Floating composer — only on Feed tab */}
      {activeNav === "Feed" && (
        <Animated.View style={[styles.composerWrap, { bottom: composerBottom }]}>

          {/* Now-playing song card — tap "+" to attach the track to the post */}
          {keyboardVisible && (
            <View style={{ paddingHorizontal: 12 }}>
              <NowPlayingBanner
                onAttach={(t) => setAttachedTrack((prev) => prev?.id === t.id ? null : t)}
              />

              {/* Attached track chip — shown after user taps "+" */}
              {attachedTrack && (
                <View style={styles.attachedTrackChip}>
                  {attachedTrack.albumArt ? (
                    <Image source={{ uri: attachedTrack.albumArt }} style={styles.attachedTrackArt} />
                  ) : (
                    <View style={[styles.attachedTrackArt, { backgroundColor: "#1DB95422", alignItems: "center", justifyContent: "center" }]}>
                      <Ionicons name="musical-note" size={14} color="#1DB954" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.attachedTrackName} numberOfLines={1}>{attachedTrack.name}</Text>
                    <Text style={styles.attachedTrackArtist} numberOfLines={1}>{attachedTrack.artist}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setAttachedTrack(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.35)" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
          <View style={styles.composerGlass}>
            <TouchableOpacity
              style={styles.composerPlus}
              activeOpacity={0.8}
              onPress={() => setMenuVisible(true)}
            >
              <Text style={styles.composerPlusIcon}>+</Text>
            </TouchableOpacity>

            <TextInput
              style={styles.composerInput}
              placeholder="What's on your mind?"
              placeholderTextColor="rgba(255,255,255,0.3)"
              returnKeyType="send"
              value={quickText}
              onChangeText={setQuickText}
              onSubmitEditing={handleQuickPost}
            />

            <TouchableOpacity
              style={styles.composerSend}
              activeOpacity={0.8}
              onPress={handleQuickPost}
            >
              <Text style={styles.composerSendIcon}>↑</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Bottom nav — hidden when keyboard is up */}
      {!keyboardUp && <BottomNav active={activeNav} onPress={setActiveNav} />}

      {/* Modals */}
      <PostComposerSheet
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        currentUser={currentUser}
        initialText={quickText}
        onPosted={(post) => {
          setFeedPosts((prev) => [post, ...prev]);
          setQuickText(""); // clear quick field once posted via sheet
        }}
      />
      {quickReplyPost && (
        <QuickReplyOverlay
          post={quickReplyPost}
          onClose={() => setQuickReplyPost(null)}
          onOpenDetail={() => {
            const p = quickReplyPost;
            setQuickReplyPost(null);
            setDetailPost(p);
          }}
        />
      )}

      {/* Post detail — slides in from right over the whole feed */}
      {detailPost && (
        <PostDetailOverlay post={detailPost} onClose={() => setDetailPost(null)} />
      )}

      {/* Chat detail — slides in from right over everything */}
      {openConv && (
        <ChatDetailView conv={openConv} onClose={() => setOpenConv(null)} />
      )}

      {/* Join confirmation — pick public (shown on your profile) or private */}
      <JoinMeetPrompt
        visible={!!joinPromptMeetId}
        onCancel={() => setJoinPromptMeetId(null)}
        onChoose={(isPublic) => {
          const id = joinPromptMeetId;
          setJoinPromptMeetId(null);
          if (id) openListenerMeet(id, isPublic);
        }}
      />

      {/* Listener Meet room — opened from Meets tab Join or a meet-incoming push */}
      <MeetListenerScreen
        visible={!!listenerMeetId}
        meetId={listenerMeetId}
        userId={currentUser?.id ?? null}
        isPublic={listenerIsPublic}
        minimized={listenerMinimized}
        onMinimize={() => setListenerMinimized(true)}
        onExpand={() => setListenerMinimized(false)}
        onInfo={setListenerInfo}
        onClose={() => { setListenerMeetId(null); setListenerMinimized(false); setListenerInfo(null); }}
      />

      {/* Host Meet room — hoisted here so it (and the mini-bar) survives tab switches */}
      <MeetLiveScreen
        visible={!!hostMeetId}
        meetId={hostMeetId}
        meetName={hostMeetName}
        accessToken={hostMeetToken}
        userId={currentUser?.id ?? null}
        minimized={hostMinimized}
        onMinimize={() => setHostMinimized(true)}
        onClose={() => { setHostMeetId(null); setHostMinimized(false); setHostMeetToken(null); }}
      />

      {/* Persistent minimized-meet bar — shows on every tab while a meet runs */}
      {hostMeetId && hostMinimized && (
        <MeetMiniBar
          albumArt={nowPlaying.track?.albumArt ?? null}
          title={hostMeetName || "Your Meet"}
          subtitle={nowPlaying.track?.name ?? "Hosting"}
          onExpand={() => setHostMinimized(false)}
        />
      )}
      {listenerMeetId && listenerMinimized && (
        <MeetMiniBar
          albumArt={listenerInfo?.albumArt ?? null}
          title={listenerInfo?.name || "Meet"}
          subtitle={listenerInfo?.trackName ?? "Listening"}
          onExpand={() => setListenerMinimized(false)}
        />
      )}
    </View>
    </HostMeetCtx.Provider>
    </OpenMeetCtx.Provider>
    </FeedUserCtx.Provider>
    </NowPlayingCtx.Provider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },

  feedContent: { paddingBottom: NAVBAR_H + 64 + BOTTOM_INSET + 32 },

  // Top navbar
  navbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 12,
  },
  navTitle: { fontSize: 48, fontWeight: "900", color: "#ffffff", letterSpacing: -1, lineHeight: 52 },
  navBrand: {
    flex: 1,
    textAlign: "center",
    fontSize: 25,
    fontFamily: "Pacifico_400Regular",
    color: "#AB00FF",
  },
  notifBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
  },

  // Stories
  storiesStrip: { paddingBottom: 16 },
  storiesContent: { paddingHorizontal: 16, gap: 28 },
  storyItem: { alignItems: "center", width: 60 },
  storyRing: { width: 82, height: 82, borderRadius: 78, borderWidth: 5, alignItems: "center", justifyContent: "center", marginBottom: 5 },
  storyAvatar: { width: 76, height: 76, borderRadius: 78, alignItems: "center", justifyContent: "center" },
  storyInitials: { fontSize: 17, fontWeight: "800" },
  storyName: { fontSize: 10, color: "rgba(255,255,255,0.4)", textAlign: "center" },
  storyArtistSub: { fontSize: 9, color: "rgba(255,255,255,0.22)", textAlign: "center" },
  stripDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.07)", marginBottom: 12 },

  // Now-playing bubble (wider than storyItem to fit artist line)
  nowPlayingItem: { alignItems: "center", width: 72 },
  nowPlayingBadge: {
    position: "absolute", bottom: -2, right: -2,
    width: 18, height: 18, borderRadius: 9,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#0D0D0D",
  },

  // Now-playing composer banner
  nowPlayingBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(18,18,24,0.95)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(171,0,255,0.22)",
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 8,
    shadowColor: "#AB00FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  nowPlayingBarSwatch: {
    width: 32, height: 32, borderRadius: 9,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1,
  },
  nowPlayingBarSong:   { fontSize: 12, color: "#fff", fontWeight: "700" },
  nowPlayingBarArtist: { fontSize: 11, color: "rgba(255,255,255,0.38)", marginTop: 1 },
  nowPlayingWaves: { flexDirection: "row", alignItems: "center", gap: 2 },
  nowPlayingWaveBar: { width: 3, borderRadius: 2 },
  nowPlayingShareBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "rgba(171,0,255,0.12)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(171,0,255,0.3)",
  },

  // Attached-track chip (shown below the now-playing banner once "+" is tapped)
  attachedTrackChip: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "rgb(0,0,0)",
    borderRadius: 12, borderWidth: 1, borderColor: "rgba(29,185,84,0.25)",
    paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8,
  },
  attachedTrackArt:    { width: 36, height: 36, borderRadius: 8 },
  attachedTrackName:   { fontSize: 12, fontWeight: "700", color: "#fff" },
  attachedTrackArtist: { fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 1 },

  // Card shell
  card: { backgroundColor: "#ffffff0e", borderRadius: 20, marginHorizontal: 13, paddingTop: 16, overflow: "hidden" },

  // Post header
  postHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10, paddingHorizontal: 16 },
  postAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  postAvatarText: { fontSize: 17, fontWeight: "800" },
  postUser: { fontSize: 14, fontWeight: "700", color: "#fff", marginBottom: 2 },
  postBio: { fontSize: 12, color: "#888", lineHeight: 16 },
  postText: { fontSize: 18, color: "#fff", lineHeight: 24, paddingHorizontal: 16, marginBottom: 12, fontWeight: "300" },

  // Media
  mediaBlock: { width: "100%", height: 220, alignItems: "center", justifyContent: "center" },
  mediaImageFull: { width: SW - 26, height: 260 },
  mediaPlaceholder: { fontSize: 44, opacity: 0.25 },
  collageMoreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  collageMoreText: { color: "#fff", fontSize: 26, fontWeight: "800" },
  videoPlayCircle: { width: 54, height: 54, borderRadius: 27, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  videoPlayIcon: { fontSize: 20, color: "#fff", marginLeft: 3 },
  durationBadge: { position: "absolute", bottom: 10, right: 12, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  durationText: { fontSize: 12, color: "#fff", fontWeight: "600" },

  // Music player (visual only)
  musicPlayerCard: { width: "100%", overflow: "hidden" },
  musicArtArea: { width: "100%", height: 280, position: "relative" },
  musicArtFill: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  musicArtEmoji: { fontSize: 72, opacity: 0.25 },
  musicGradientOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, height: 110, opacity: 0.9 },
  musicTopRight: { position: "absolute", top: 14, right: 14, flexDirection: "row", gap: 8 },
  musicGlassBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  musicGlassBtnIcon: { fontSize: 16, color: "#fff" },
  musicInfoOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, height: 100 },
  musicInfoText: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 14, paddingBottom: 14 },
  musicSongTitle: { fontSize: 20, fontWeight: "700", color: "#ffffff", marginBottom: 2 },
  musicArtistName: { fontSize: 14, color: "rgba(255,255,255,0.65)" },
  musicProgressRow: { marginBottom: 4 },
  musicProgressTrack: { height: 3, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 2 },
  musicProgressFill: { height: 3, borderRadius: 2, position: "relative" },
  musicProgressThumb: { position: "absolute", right: -5, top: -4, width: 11, height: 11, borderRadius: 6, backgroundColor: "#fff" },
  musicTimestamps: { flexDirection: "row", justifyContent: "space-between" },
  musicTime: { fontSize: 11, color: "rgba(255,255,255,0.45)" },

  // Poll
  pollContainer: { paddingHorizontal: 16, paddingBottom: 4 },
  pollQuestion: { fontSize: 17, fontWeight: "700", color: "#ffffff", marginBottom: 14 },
  pollOptions: { gap: 9, marginBottom: 10 },
  pollOption: { borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", overflow: "hidden", position: "relative", backgroundColor: "rgba(255,255,255,0.05)", minHeight: 46, justifyContent: "center" },
  pollFillBar: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 13 },
  pollOptionInner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12 },
  pollOptionLabel: { fontSize: 14, color: "#ffffff", fontWeight: "500", flex: 1 },
  pollPct: { fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: "700", marginLeft: 8 },
  pollMeta: { fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 2 },

  // Action row
  actionRow: { flexDirection: "row", alignItems: "center", gap: 18, paddingHorizontal: 16, paddingVertical: 12 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionIcon: { fontSize: 30, color: "#555" },
  actionIconLiked: { color: "#FF3CAC" },
  actionCount: { fontSize: 13, color: "#888", fontWeight: "600" },
  actionCountLiked: { color: "#FF3CAC" },
  moreIcon: { fontSize: 18, color: "#bbb", letterSpacing: 2 },

  // Floating composer
  composerWrap: { position: "absolute", left: 16, right: 16 },
  composerGlass: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.70)",
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 16,
  },
  composerPlus: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  composerPlusIcon: { fontSize: 24, color: "#fff", lineHeight: 28 },
  composerInput: { flex: 1, fontSize: 15, color: "#ffffff", paddingVertical: 0, paddingHorizontal: 4, textAlignVertical: "center" },
  composerSend: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#AB00FF", alignItems: "center", justifyContent: "center" },
  composerSendIcon: { fontSize: 18, color: "#fff", fontWeight: "700" },

  // ─── Song card in PostDetailOverlay composer bar ──────────────────────────
  detailSongCard: {
    flexDirection: "row" as const, alignItems: "center" as const, gap: 10,
    backgroundColor: "rgba(29,185,84,0.10)",
    borderWidth: 1, borderColor: "rgba(29,185,84,0.25)",
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9,
    marginBottom: 8,
  },
  detailSongArt: { width: 38, height: 38, borderRadius: 8, backgroundColor: "#1a1a1c" },
  detailSongArtFallback: { alignItems: "center" as const, justifyContent: "center" as const },
  detailSongName: { fontSize: 13, fontWeight: "700" as const, color: "#fff" },
  detailSongArtist: { fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 1 },

  // ─── Song card embedded inside a comment bubble ───────────────────────────
  commentSongCard: {
    flexDirection: "row" as const, alignItems: "center" as const, gap: 9,
    marginTop: 7,
    backgroundColor: "rgba(29,185,84,0.10)",
    borderWidth: 1, borderColor: "rgba(29,185,84,0.22)",
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8,
  },
  commentSongArt: { width: 34, height: 34, borderRadius: 7, backgroundColor: "#1a1a1c" },
  commentSongArtFallback: { alignItems: "center" as const, justifyContent: "center" as const },
  commentSongName: { fontSize: 12, fontWeight: "700" as const, color: "#fff" },
  commentSongArtist: { fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 1 },

  // Bottom glass navbar
  navBarWrap: { position: "absolute", bottom: 0, left: 0, right: 0, paddingBottom: BOTTOM_INSET, paddingHorizontal: 12, paddingTop: 8 },
  navBarGlass: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", backgroundColor: "rgba(0,0,0,0.70)", borderRadius: 96, borderWidth: 1, borderColor: "rgba(255,255,255,0.09)", paddingVertical: 6, height: NAVBAR_H - 8 },
  navItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, paddingVertical: 4 },
  navIcon: { fontSize: 30, color: "rgba(255,255,255,0.3)" },
  navIconActive: { color: "#AB00FF" },
  navLabel: { fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: "500" },
  navLabelActive: { color: "#AB00FF", fontWeight: "700" },

  // Swipe container + reply indicator
  swipeContainer: { position: "relative" },
  replyIndicator: {
    position: "absolute",
    right: 22,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    gap: 3,
  },
  replyIndicatorArrow: { fontSize: 20, color: "#AB00FF" },
  replyIndicatorLabel: {
    fontSize: 11,
    color: "#AB00FF",
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },

  // Quick reply overlay
  qrBackdrop: { backgroundColor: "rgb(10, 10, 14)" },
  qrCardWrap: { position: "absolute", top: 60, left: 12, right: 12 },
  qrCloseBtn: { position: "absolute", top: -13, right: -13, zIndex: 20 },
  qrCloseBtnCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(35,35,40,0.98)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  qrCloseBtnIcon: { fontSize: 12, color: "#fff", fontWeight: "700" },
  qrInputRow: { position: "absolute", left: 16, right: 16 },
  qrInputGlass: { flexDirection: "row", alignItems: "center", backgroundColor: "#1c1c22", borderRadius: 28, paddingHorizontal: 8, paddingVertical: 6, gap: 10 },
  qrAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  qrAvatarText: { fontSize: 14, fontWeight: "800" },
  qrInputInner: { flex: 1 },
  qrReplyingTo: { fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 2 },
  qrInput: { fontSize: 15, color: "#ffffff", paddingVertical: 0 },
  qrSend: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#AB00FF", alignItems: "center", justifyContent: "center" },
  qrSendIcon: { fontSize: 17, color: "#fff", fontWeight: "700" },
  qrPlusBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  qrPlusBtnIcon: { fontSize: 22, color: "#fff", lineHeight: 26 },

  // Attached song card above the quick-reply input glass
  qrSongCard: {
    flexDirection: "row" as const, alignItems: "center" as const, gap: 10,
    backgroundColor: "rgba(29,185,84,0.12)",
    borderWidth: 1, borderColor: "rgba(29,185,84,0.28)",
    borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8,
    marginBottom: 8,
  },
  qrSongArt: { width: 36, height: 36, borderRadius: 8, backgroundColor: "#1a1a1c" },
  qrSongArtFallback: { alignItems: "center" as const, justifyContent: "center" as const },
  qrSongName: { fontSize: 13, fontWeight: "700" as const, color: "#fff" },
  qrSongArtist: { fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 1 },

  // Action menu sheet
  menuBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  menuSheet: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#111113", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  menuHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.18)", alignSelf: "center", marginTop: 10, marginBottom: 12 },

  menuHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14 },
  menuXBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  menuXBtnIcon: { fontSize: 12, color: "#fff", fontWeight: "700" },
  menuHeaderTitle: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "700", color: "#ffffff" },
  menuHeaderRight: { fontSize: 14, color: "#AB00FF", fontWeight: "600" },

  menuPhotoStrip: { paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  menuCameraBox: { width: 96, height: 96, borderRadius: 14, backgroundColor: "#1a1a1e", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  menuCameraIcon: { fontSize: 28 },
  menuCameraLabel: { fontSize: 12, color: "#fff", fontWeight: "600" },
  menuPhotoThumb: { width: 96, height: 96, borderRadius: 14, overflow: "hidden" },

  menuSectionDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.07)", marginHorizontal: 0, marginVertical: 2 },
  menuSection: { paddingHorizontal: 16 },
  menuRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, gap: 14 },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" },
  menuRowIconBox: { width: 30, alignItems: "center" },
  menuRowIconText: { fontSize: 18 },
  menuRowLabel: { flex: 1, fontSize: 15, color: "#ffffff", fontWeight: "400" },
  menuRowRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  menuRowRightText: { fontSize: 14, color: "rgba(255,255,255,0.4)" },
  menuRowChevron: { fontSize: 18, color: "rgba(255,255,255,0.25)", fontWeight: "300" },
  menuToggle: { marginLeft: "auto" as any },

  // Post detail overlay
  detailOverlay: { backgroundColor: "#0D0D0D", zIndex: 100 },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  detailBackBtn: { width: 40, height: 40, alignItems: "flex-start", justifyContent: "center" },
  detailBackIcon: { fontSize: 32, color: "#fff", fontWeight: "300", lineHeight: 36 },
  detailHeaderTitle: { fontSize: 16, fontWeight: "700", color: "#fff" },
  detailListContent: { paddingBottom: 120 },
  detailDivider: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
    marginBottom: 4,
  },
  detailDividerLabel: { fontSize: 13, color: "rgba(255,255,255,0.35)", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8 },

  // Comment rows
  commentWrap: { position: "relative" },
  commentReplyHint: { position: "absolute", right: 18, top: 0, bottom: 0, justifyContent: "center", alignItems: "center", gap: 2 },
  commentRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#0D0D0D" },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  commentAvatarText: { fontSize: 13, fontWeight: "800" },
  commentBody: { flex: 1, gap: 3 },
  commentMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  commentHandle: { fontSize: 13, fontWeight: "700", color: "#fff" },
  commentTime: { fontSize: 11, color: "rgba(255,255,255,0.3)" },
  commentText: { fontSize: 14, color: "rgba(255,255,255,0.82)", lineHeight: 20 },
  commentLikeBtn: { alignItems: "center", gap: 2, paddingLeft: 4, flexShrink: 0 },
  commentLikeIcon: { fontSize: 18, color: "rgba(255,255,255,0.3)" },
  commentLikeCount: { fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: "600" },
  commentSeparator: { height: 1, backgroundColor: "rgba(255,255,255,0.04)", marginHorizontal: 16 },

  // ── Threaded replies ────────────────────────────────────────────────────────
  repliesBlock: {
    flexDirection: "row",
    marginLeft: 52,        // align with bubble (avatar width + gap)
    marginTop: 2,
    marginBottom: 2,
  },
  threadLine: {
    width: 2,
    marginRight: 12,
    marginTop: 4,
    marginBottom: 4,
    borderRadius: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  replyRow: {
    flex: 1,
  },
  showMoreReplies: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 10,
    paddingBottom: 4,
  },
  showMoreDots: {
    flexDirection: "row",
    gap: 3,
    alignItems: "center",
  },
  showMoreDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(171,0,255,0.55)",
  },
  showMoreRepliesText: {
    fontSize: 12,
    color: "#AB00FF",
    fontWeight: "600",
  },

  // Detail reply bar
  detailReplyBarWrap: { position: "absolute", left: 16, right: 16 },
  detailReplyContext: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, paddingBottom: 6 },
  detailReplyContextText: { fontSize: 12, color: "#AB00FF", fontWeight: "600" },
  detailReplyContextX: { fontSize: 18, color: "rgba(255,255,255,0.4)", lineHeight: 20 },
});
