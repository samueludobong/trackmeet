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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
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
  MEETS_STREAMS,
  NOW_PLAYING_STORIES,
  GROUP_CHATS, COMMUNITY_ITEMS, MESSAGES_UNREAD,
  PROFILE_TABS, PROFILE_POSTS, PROFILE_REPOSTS,
  DUMMY_PLAYLISTS, DUMMY_COMMUNITIES, ALL_SONGS, PLAYLIST_SONGS,
  fmtCount,
  type Post, type DummyComment, type DummyPlaylist, type DummySong,
  type DummyCommunity, type CarouselItem, type ProfileTab, type MeetStream,
  type NowPlayingStory,
  type GroupChat, type CommunityItem, type UserProfile,
} from "./data/mock";

import { openSpotifyLink, saveTrackToLiked, searchSpotifyTracks, type SpotifyTrackResult } from '../lib/spotify'
import { useNowPlaying, type NowPlayingTrack } from '../lib/useNowPlaying'
import { useLocalSearchParams, useRouter } from 'expo-router'
import {
  type ConversationInfo, type DbMessage,
  getConversations, getMessages,
  sendTextMessage, sendSpotifyTrackMessage,
} from '../lib/messages'
import { followUser, unfollowUser } from '../lib/follows'
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
  { key: "facebook",   label: "Facebook",    icon: "facebook",    color: "#ffffff", placeholder: "facebook.com/yourname" },
];

// Order in which platforms are shown on the profile banner (most relevant first)
const BANNER_PLATFORM_PRIORITY = ["instagram", "x", "youtube", "tiktok", "soundcloud", "facebook"];

// Lets any component inside a post card open the detail view without prop-drilling through card types
const OpenDetailCtx = createContext<(() => void) | undefined>(undefined);

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
    text:            row.text,
    likesCount:      row.likes_count    ?? 0,
    parentCommentId: row.parent_comment_id ?? null,
    time,
  };
}

const COMMENT_SELECT =
  "id, post_id, user_id, parent_comment_id, text, likes_count, created_at, users!user_id(id, username, display_name, avatar_url)";

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
          {comment.parentCommentId && (
            <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 2 }}>↩ reply</Text>
          )}
          <Text style={styles.commentText}>{comment.text}</Text>
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
  const [menuVisible, setMenuVisible] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ initials: string; avatarUrl: string | null } | null>(null);
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const inputBottomAnim = useRef(new Animated.Value(BOTTOM_INSET + 16)).current;

  useEffect(() => {
    // Fetch current user profile for avatar
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);
      const { data } = await supabase
        .from("users")
        .select("username, display_name, avatar_url")
        .eq("id", user.id)
        .single();
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
    if (!trimmed || !currentUserId || sending) return;
    setSending(true);
    const { error } = await supabase
      .from("post_comments")
      .insert({ post_id: post.id, user_id: currentUserId, text: trimmed });
    setSending(false);
    if (!error) {
      setText("");
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
        <Pressable style={styles.qrInputGlass} onPress={() => {}}>
          {/* + button — opens the same "Add to post" sheet */}
          <TouchableOpacity
            style={styles.qrPlusBtn}
            activeOpacity={0.8}
            onPress={() => setMenuVisible(true)}
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
            style={[styles.qrSend, (!text.trim() || sending) && { opacity: 0.35 }]}
            disabled={!text.trim() || sending}
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

      {/* Action sheet — opens on top of this overlay */}
      <ComposerActionMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
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
};

function DiscoverView() {
  const router = useRouter();
  const [activeFilter, setActiveFilter]       = useState("All");
  const [searchText, setSearchText]           = useState("");
  const [joinedMeets, setJoinedMeets]         = useState<Set<string>>(new Set());
  const [followedArtists, setFollowedArtists] = useState<Set<string>>(new Set());
  const [likedRecs, setLikedRecs]             = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing]           = useState(false);

  // ── People search ──────────────────────────────────────────────────────────
  const [userResults, setUserResults]   = useState<DiscoverUser[]>([]);
  const [userFollowing, setUserFollowing] = useState<Set<string>>(new Set());
  const [userLoading, setUserLoading]   = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    const q = searchText.trim();
    if (q.length < 2) { setUserResults([]); setUserLoading(false); return; }
    setUserLoading(true);
    searchDebounce.current = setTimeout(async () => {
      const { data: { user: me } } = await supabase.auth.getUser();
      const { data } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url, followers_count')
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
        .neq('id', me?.id ?? '')          // don't show yourself
        .order('followers_count', { ascending: false })
        .limit(20);
      const results = (data ?? []) as DiscoverUser[];
      setUserResults(results);
      // Batch-check which results are already followed
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
                <View key={u.id} style={pplStyles.row}>
                  <TouchableOpacity activeOpacity={0.85} onPress={() => router.push({ pathname: '/user-profile', params: { userId: u.id } })}>
                    {u.avatar_url ? (
                      <Image source={{ uri: u.avatar_url }} style={pplStyles.avatar} />
                    ) : (
                      <View style={[pplStyles.avatar, pplStyles.avatarFallback]}>
                        <Text style={pplStyles.avatarInitials}>{initials}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity style={{ flex: 1, minWidth: 0 }} activeOpacity={0.85} onPress={() => router.push({ pathname: '/user-profile', params: { userId: u.id } })}>
                    <Text style={pplStyles.name} numberOfLines={1}>{name}</Text>
                    <Text style={pplStyles.username} numberOfLines={1}>@{u.username}</Text>
                  </TouchableOpacity>
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

function StreamCard({ stream }: { stream: MeetStream }) {
  const photo = AVATAR_MAP[stream.user];
  const cardH = stream.tall ? 216 : 152;
  const iconColor = stream.accentColor === "#CAFF00" ? "#0D0D0D" : "#fff";

  return (
    <TouchableOpacity style={[ms.card, { height: cardH }]} activeOpacity={0.88}>
      {/* Background */}
      {stream.type === "video" && photo && (
        <Image source={photo} style={StyleSheet.absoluteFill} resizeMode="cover" />
      )}
      <LinearGradient
        colors={
          stream.type === "audio"
            ? [stream.color + "66", stream.color + "EE"]
            : ["rgba(0,0,0,0.05)", "rgba(0,0,0,0.72)"]
        }
        style={StyleSheet.absoluteFill}
      />

      {/* Audio waveform */}
      {stream.type === "audio" && (
        <View style={ms.waveWrap}>
          {WAVE_HEIGHTS.map((h, i) => (
            <View key={i} style={[ms.waveBar, { height: h, backgroundColor: stream.accentColor + "BB" }]} />
          ))}
        </View>
      )}

      {/* Top row: LIVE/Meet badge + viewer count */}
      <View style={ms.cardTop}>
        {stream.isLive ? (
          <View style={ms.liveBadge}>
            <View style={ms.liveDot} />
            <Text style={ms.liveBadgeText}>Live</Text>
          </View>
        ) : (
          <View style={ms.meetBadge}>
            <Text style={ms.meetBadgeText}>Meet</Text>
          </View>
        )}
        <View style={ms.viewerBadge}>
          <Ionicons name="eye-outline" size={9} color="rgba(255,255,255,0.85)" />
          <Text style={ms.viewerText}>{fmtCount(stream.viewers)}</Text>
        </View>
      </View>

      {/* Bottom: type dot + title + host */}
      <View style={ms.cardBottom}>
        <View style={[ms.typeTag, { backgroundColor: stream.accentColor }]}>
          <Ionicons
            name={stream.type === "video" ? "videocam" : "radio"}
            size={8}
            color={iconColor}
          />
        </View>
        <Text style={ms.cardTitle} numberOfLines={2}>{stream.title}</Text>
        <Text style={ms.cardHost}>@{stream.host}</Text>
      </View>
    </TouchableOpacity>
  );
}

type MeetsTab = "For You" | "Meets" | "Live";
const MEETS_TABS: MeetsTab[] = ["For You", "Meets", "Live"];

function MeetsView() {
  const [activeTab, setActiveTab]   = useState<MeetsTab>("For You");
  const [searchText, setSearchText] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    setSearchText("");
    setActiveTab("For You");
    setRefreshing(false);
  };

  const q = searchText.toLowerCase();
  const filtered = MEETS_STREAMS.filter((s) => {
    const matchSearch = !q || s.title.toLowerCase().includes(q) || s.host.toLowerCase().includes(q) || s.tags.some((t) => t.toLowerCase().includes(q));
    const matchTab = activeTab === "For You" ? true : activeTab === "Live" ? s.isLive : s.isMeet;
    return matchSearch && matchTab;
  });

  const leftCol  = filtered.filter((_, i) => i % 2 === 0);
  const rightCol = filtered.filter((_, i) => i % 2 === 1);

  return (
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
          placeholder="Search streams, meets, hosts…"
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

      {/* Tab toggles */}
      <View style={ms.tabRow}>
        {MEETS_TABS.map((tab) => {
          const active = tab === activeTab;
          return (
            <TouchableOpacity
              key={tab}
              style={[ms.tabPill, active && ms.tabPillActive]}
              activeOpacity={0.75}
              onPress={() => setActiveTab(tab)}
            >
              {tab === "Live" && (
                <View style={[ms.liveTabDot, active && ms.liveTabDotActive]} />
              )}
              <Text style={[ms.tabText, active && ms.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Masonry grid */}
      {filtered.length > 0 ? (
        <View style={ms.grid}>
          <View style={ms.col}>
            {leftCol.map((s) => <StreamCard key={s.id} stream={s} />)}
          </View>
          <View style={ms.col}>
            {rightCol.map((s) => <StreamCard key={s.id} stream={s} />)}
          </View>
        </View>
      ) : (
        <View style={ds.emptyState}>
          <Ionicons name="search-outline" size={40} color="rgba(255,255,255,0.15)" />
          <Text style={ds.emptyText}>No streams found</Text>
        </View>
      )}
    </ScrollView>
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
const pplStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  avatarFallback: { backgroundColor: "#AB00FF33", alignItems: "center", justifyContent: "center" },
  avatarInitials: { fontSize: 16, fontWeight: "800", color: "#AB00FF" },
  name: { fontSize: 14, fontWeight: "700", color: "#fff" },
  username: { fontSize: 12, color: "rgba(255,255,255,0.38)", marginTop: 2 },
  followBtn: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
    backgroundColor: "#fff",
  },
  followingBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  followBtnText: { fontSize: 13, fontWeight: "700", color: "#111" },
  followingBtnText: { color: "#fff" },
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
  const [menuVisible, setMenuVisible] = useState(false);
  const [comments,    setComments]    = useState<Comment[]>([]);
  const [sending,     setSending]     = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const replyBarBottom = useRef(new Animated.Value(BOTTOM_INSET + 8)).current;
  const listRef = useRef<FlatList>(null);

  // Load current user + comments on mount
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const { data } = await supabase
        .from("post_comments")
        .select(COMMENT_SELECT)
        .eq("post_id", post.id)
        .order("created_at", { ascending: true });
      if (data) setComments(data.map(rowToComment));
    })();
  }, [post.id]);

  const handleSend = async () => {
    if (!currentUserId || !replyText.trim() || sending) return;
    const text = replyText.trim();
    const parentId = replyingTo?.id ?? null;
    setReplyText("");
    setReplyingTo(null);
    setSending(true);
    try {
      const { data, error } = await supabase
        .from("post_comments")
        .insert({ post_id: post.id, user_id: currentUserId, text, parent_comment_id: parentId })
        .select(COMMENT_SELECT)
        .single();
      if (error) throw error;
      setComments((prev) => [...prev, rowToComment(data)]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    } catch (e: any) {
      Alert.alert("Comment failed", e.message ?? "Could not post comment.");
      setReplyText(text);
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
      <FlatList
        ref={listRef}
        data={comments}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.detailListContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            <PostCard item={post} />
            <View style={styles.detailDivider}>
              <Text style={styles.detailDividerLabel}>
                {comments.length === 0 ? "No comments yet" : `${comments.length} Comment${comments.length === 1 ? "" : "s"}`}
              </Text>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <CommentRow
            comment={item}
            currentUserId={currentUserId}
            onReply={(c) => setReplyingTo(c)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.commentSeparator} />}
      />

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
        <View style={styles.composerGlass}>
          <TouchableOpacity style={styles.composerPlus} activeOpacity={0.8} onPress={() => setMenuVisible(true)}>
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
            style={[styles.composerSend, (!replyText.trim() || sending) && { opacity: 0.4 }]}
            activeOpacity={0.8}
            onPress={handleSend}
            disabled={!replyText.trim() || sending}
          >
            {sending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.composerSendIcon}>↑</Text>}
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ComposerActionMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
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

// ─── Song row ─────────────────────────────────────────────────────────────────

function SongRow({ song, accent }: { song: DummySong; accent: string }) {
  return (
    <TouchableOpacity style={pdStyles.songRow} activeOpacity={0.75}>
      <View style={pdStyles.songInfo}>
        <Text style={pdStyles.songTitle} numberOfLines={1}>{song.title}</Text>
        <Text style={pdStyles.songArtist} numberOfLines={1}>{song.artist}</Text>
      </View>
      <View style={[pdStyles.songArt, { backgroundColor: song.color + "30" }]}>
        <Text style={{ fontSize: 13 }}>🎵</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Playlist detail overlay ──────────────────────────────────────────────────

function PlaylistDetailOverlay({ playlist, onClose }: { playlist: DummyPlaylist; onClose: () => void }) {
  const slideX = useRef(new Animated.Value(SW)).current;
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(2347);
  const [showOnProfile, setShowOnProfile] = useState(false);
  const songs = PLAYLIST_SONGS[playlist.id] ?? [];

  useEffect(() => {
    Animated.spring(slideX, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }).start();
  }, []);

  const handleClose = () => {
    Animated.timing(slideX, { toValue: SW, duration: 260, useNativeDriver: true }).start(onClose);
  };

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, { dx, dy }) => dx > 8 && dx > Math.abs(dy) * 2,
    onShouldBlockNativeResponder: () => false,
    onPanResponderMove: (_, { dx }) => { if (dx > 0) slideX.setValue(dx); },
    onPanResponderRelease: (_, { dx, vx }) => {
      if (dx > SW * 0.3 || vx > 0.8) handleClose();
      else Animated.spring(slideX, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }).start();
    },
    onPanResponderTerminate: () => {
      Animated.spring(slideX, { toValue: 0, useNativeDriver: true }).start();
    },
  })).current;

  const handleLike = () => {
    setLiked(prev => { setLikeCount(c => prev ? c - 1 : c + 1); return !prev; });
  };

  return (
    <Modal transparent animationType="none" statusBarTranslucent onRequestClose={handleClose}>
      <Animated.View style={[StyleSheet.absoluteFill, pdStyles.screen, { transform: [{ translateX: slideX }] }]} {...pan.panHandlers}>
        <FlatList
          data={songs}
          keyExtractor={s => s.id}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <>
              {/* ── Hero ── */}
              <View style={pdStyles.hero}>
                <LinearGradient
                  colors={[playlist.accent + "55", playlist.color, "#0D0D0D"]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                {/* Back button */}
                <SafeAreaView edges={["top"]}>
                  <TouchableOpacity style={pdStyles.backBtn} onPress={handleClose} activeOpacity={0.7}>
                    <Text style={pdStyles.backIcon}>‹</Text>
                  </TouchableOpacity>
                </SafeAreaView>

                {/* Art mosaic */}
                <View style={pdStyles.artMosaic}>
                  {songs.slice(0, 4).map(s => (
                    <View key={s.id} style={[pdStyles.mosaicCell, { backgroundColor: s.color + "55" }]} />
                  ))}
                </View>

                {/* Title block */}
                <View style={pdStyles.heroInfo}>
                  <Text style={pdStyles.heroTitle} numberOfLines={2}>{playlist.name}</Text>

                  {/* Source · songs · duration */}
                  <View style={pdStyles.heroMetaRow}>
                    <View style={[pdStyles.sourceIconBadge, { backgroundColor: playlist.sourceColor }]}>
                      <Text style={pdStyles.sourceIconText}>
                        {playlist.source === "Spotify" ? "S" : playlist.source === "Apple Music" ? "♪" : "T"}
                      </Text>
                    </View>
                    <Text style={pdStyles.heroMetaText}>{playlist.source}</Text>
                    <Text style={pdStyles.heroMetaDot}>·</Text>
                    <Text style={pdStyles.heroMetaText}>{playlist.tracks} Songs</Text>
                    <Text style={pdStyles.heroMetaDot}>·</Text>
                    <Text style={pdStyles.heroMetaText}>{playlist.duration}</Text>
                  </View>

                  {/* Show on profile toggle */}
                  <TouchableOpacity
                    style={[
                      pdStyles.showOnProfileBtn,
                      showOnProfile && { borderColor: playlist.accent, backgroundColor: playlist.accent + "18" },
                    ]}
                    onPress={() => setShowOnProfile(v => !v)}
                    activeOpacity={0.8}
                  >
                    {showOnProfile && <Text style={[pdStyles.showOnProfileText, { color: playlist.accent }]}>✓ </Text>}
                    <Text style={[pdStyles.showOnProfileText, showOnProfile && { color: playlist.accent }]}>
                      {showOnProfile ? "Showing on profile" : "Show on profile"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Play button */}
                <TouchableOpacity style={[pdStyles.playBtn, { backgroundColor: playlist.accent }]} activeOpacity={0.85}>
                  <Text style={pdStyles.playIcon}>▶</Text>
                </TouchableOpacity>
              </View>

              {/* ── Action bar ── */}
              <View style={pdStyles.actionBar}>
                <TouchableOpacity style={pdStyles.actionBtn} activeOpacity={0.7}>
                  <Text style={pdStyles.actionIcon}>↺</Text>
                </TouchableOpacity>
                <TouchableOpacity style={pdStyles.actionBtn} onPress={handleLike} activeOpacity={0.7}>
                  <Text style={[pdStyles.actionIcon, liked && { color: "#FF3CAC" }]}>{liked ? "♥" : "♡"}</Text>
                  <Text style={[pdStyles.actionCount, liked && { color: "#FF3CAC" }]}>{fmtCount(likeCount)}</Text>
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
          renderItem={({ item }) => <SongRow song={item} accent={playlist.accent} />}
          ItemSeparatorComponent={() => <View style={pdStyles.songDivider} />}
        />
      </Animated.View>
    </Modal>
  );
}

const pdStyles = StyleSheet.create({
  screen: { backgroundColor: "#0D0D0D" },
  hero: { height: 340, justifyContent: "flex-end", overflow: "hidden" },
  backBtn: { paddingHorizontal: 18, paddingTop: 6, paddingBottom: 0, alignSelf: "flex-start" },
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

// ─── Playlist list card ───────────────────────────────────────────────────────

function PlaylistCard({ pl, onPress }: { pl: DummyPlaylist; onPress: () => void }) {
  return (
    <TouchableOpacity style={profileStyles.playlistListItem} onPress={onPress} activeOpacity={0.82}>
      <View style={[profileStyles.playlistListArt, { backgroundColor: pl.color }]}>
        <View style={profileStyles.playlistListArtInner}>
          {[pl.accent + "55", pl.accent + "33"].map((bg, i) => (
            <View key={i} style={[profileStyles.playlistListMiniCell, { backgroundColor: bg }]} />
          ))}
        </View>
        <Text style={{ fontSize: 16, position: "absolute" }}>🎵</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={profileStyles.playlistListName} numberOfLines={1}>{pl.name}</Text>
        <Text style={profileStyles.playlistListMeta}>{pl.tracks} songs</Text>
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
  const [active, setActive] = useState<ProfileTab>("Posts");
  const [openPlaylist, setOpenPlaylist] = useState<DummyPlaylist | null>(null);
  const [myPosts, setMyPosts]           = useState<Post[]>(_myPostsCache ?? []);
  const [postsLoading, setPostsLoading] = useState(!_myPostsCache);
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const contentAnim   = useRef(new Animated.Value(1)).current;
  const activeRef     = useRef<ProfileTab>("Posts");
  const tabWidth = (SW - 32) / PROFILE_TABS.length;

  // Fetch this user's posts — skipped if already cached
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

  // Stable switcher — safe to call from both tap handlers and the PanResponder closure
  const switchTo = (tab: ProfileTab, index: number) => {
    activeRef.current = tab;
    setActive(tab);
    contentAnim.setValue(0.5);
    Animated.timing(contentAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    Animated.spring(indicatorAnim, { toValue: index * tabWidth, useNativeDriver: true, damping: 22, stiffness: 280 }).start();
  };

  // Swipe left/right to change tabs — uses activeRef so the closure never goes stale
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

  const renderContent = () => {
    if (active === "Posts") {
      if (postsLoading) {
        return <ActivityIndicator color="#FF6C1A" style={{ marginTop: 48 }} />;
      }
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
        <View style={{ gap: 8, paddingTop: 12 }}>
          {DUMMY_PLAYLISTS.map((pl) => (
            <PlaylistCard key={pl.id} pl={pl} onPress={() => setOpenPlaylist(pl)} />
          ))}
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

      {/* Content fades in on every tab switch */}
      <Animated.View style={{ opacity: contentAnim }}>
        {renderContent()}
      </Animated.View>

      {openPlaylist && (
        <PlaylistDetailOverlay playlist={openPlaylist} onClose={() => setOpenPlaylist(null)} />
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

// ─── Song Search Overlay ──────────────────────────────────────────────────────

type PinnedSong = { id: string; name: string; artist: string; albumArt: string | null };

function SongSearchOverlay({ visible, onClose, onSelect, accessToken }: {
  visible: boolean;
  onClose: () => void;
  onSelect: (song: PinnedSong) => void;
  accessToken: string | null;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyTrackResult[]>([]);
  const [searching, setSearching] = useState(false);
  const slideAnim = useRef(new Animated.Value(500)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      setQuery("");
      setResults([]);
    }
  }, [visible]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!query.trim() || !accessToken) { setResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      const res = await searchSpotifyTracks(accessToken, query.trim());
      setResults(res);
      setSearching(false);
    }, 450);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query, accessToken]);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, epOverlayStyles.backdrop, { opacity: backdropAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[epOverlayStyles.songSheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={epOverlayStyles.handle} />
        <View style={epOverlayStyles.sheetHeader}>
          <Text style={epOverlayStyles.sheetTitle}>Pin a Song</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Text style={epOverlayStyles.closeBtn}>✕</Text>
          </TouchableOpacity>
        </View>
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
          {results.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={epOverlayStyles.resultRow}
              activeOpacity={0.75}
              onPress={() => { onSelect({ id: item.id, name: item.name, artist: item.artist, albumArt: item.albumArt }); onClose(); }}
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
              <FontAwesome5 name="chevron-right" size={11} color="rgba(255,255,255,0.2)" />
            </TouchableOpacity>
          ))}
          {!searching && query.trim() && results.length === 0 && (
            <Text style={epOverlayStyles.emptyText}>No results for "{query}"</Text>
          )}
          {!query.trim() && <Text style={epOverlayStyles.emptyText}>Start typing to search tracks</Text>}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

// ─── Edit Profile Overlay ─────────────────────────────────────────────────────

type EditFormData = {
  display_name: string;
  username: string;
  bio: string;
  avatar_url: string | null;
  pinned_song_id: string | null;
  pinned_song_name: string | null;
  pinned_song_artist: string | null;
  pinned_song_album_art: string | null;
  profile_links: string[];
  social_links: Record<string, string>;
};

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

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("users").update({
        display_name: form.display_name.trim() || null,
        username: form.username.trim() || null,
        bio: form.bio.trim() || null,
        avatar_url: form.avatar_url,
        pinned_song_id: form.pinned_song_id,
        pinned_song_name: form.pinned_song_name,
        pinned_song_artist: form.pinned_song_artist,
        pinned_song_album_art: form.pinned_song_album_art,
        profile_links: form.profile_links,
        social_links: form.social_links,
      }).eq("id", userId);
      if (error) throw error;
      onSaved(form);
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
    <>
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
                <Text style={epOverlayStyles.sectionLabel}>DISPLAY NAME</Text>
                <TextInput
                  style={epOverlayStyles.input}
                  value={form.display_name}
                  onChangeText={(t) => setForm((f) => ({ ...f, display_name: t }))}
                  placeholder="Your name"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                />
              </View>

              {/* ── Username ── */}
              <View style={epOverlayStyles.section}>
                <Text style={epOverlayStyles.sectionLabel}>USERNAME</Text>
                <TextInput
                  style={epOverlayStyles.input}
                  value={form.username}
                  onChangeText={(t) => setForm((f) => ({ ...f, username: t.replace(/\s/g, "").toLowerCase() }))}
                  placeholder="@handle"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  autoCapitalize="none"
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
        </Animated.View>
      </Modal>

      <SongSearchOverlay
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
    </>
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
  onClose,
}: {
  profile: UserProfile | null;
  onClose: () => void;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const slideAnim   = useRef(new Animated.Value(400)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim,   { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 200 }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, []);

  const close = () => {
    Animated.parallel([
      Animated.timing(slideAnim,   { toValue: 400, duration: 200, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0,   duration: 180, useNativeDriver: true }),
    ]).start(onClose);
  };

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
          // De-duplicate by email, new account goes first
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

  return (
    <Modal transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.55)", opacity: backdropAnim }]}
        pointerEvents="none"
      />
      <Pressable style={StyleSheet.absoluteFill} onPress={close} />

      <Animated.View
        style={[settingsOverlayStyles.sheet, { transform: [{ translateY: slideAnim }] }]}
        pointerEvents="box-none"
      >
        <Pressable onPress={() => {}}>
          {/* Drag handle */}
          <View style={settingsOverlayStyles.handle} />

          <Text style={settingsOverlayStyles.title}>Settings</Text>

          {!showConfirm ? (
            <>
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

function ProfileView() {
  const { track, liveProgressMs, gradient, needsReconnect, reconnect } = useNowPlayingCtx();
  const router = useRouter();
  const [profile,     setProfile]     = useState<UserProfile | null>(_profileCache);
  const [refreshing,  setRefreshing]  = useState(false);
  const [editOpen,         setEditOpen]         = useState(false);
  const [linksSheetOpen,   setLinksSheetOpen]   = useState(false);
  const [socialLinksSheetOpen, setSocialLinksSheetOpen] = useState(false);
  const [settingsOpen,     setSettingsOpen]     = useState(false);
  const [userId,         setUserId]         = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const fetchProfile = async (force = false) => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Not authenticated");
      // Always resolve userId so ProfileTabs can load posts
      setUserId(user.id);

      if (_profileCache && !force) { setProfile(_profileCache); return; }

      const { data, error } = await supabase
        .from("users")
        .select("username, display_name, bio, is_verified, followers_count, following_count, avatar_url, pinned_song_id, pinned_song_name, pinned_song_artist, pinned_song_album_art, profile_links, social_links, spotify_access_token")
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
          <View style={profileStyles.bannerGlow} />

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
            <TouchableOpacity style={profileStyles.metaItem} activeOpacity={0.7} onPress={() => setEditOpen(true)}>
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
        return (
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={profileStyles.nowPlayingCard}
          >
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
                  <Text style={[profileStyles.npArtist, { textDecorationLine: "underline" }]} numberOfLines={1}>
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

            {/* Broadcast row */}
            <BroadcastRow />
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
        onClose={() => setSettingsOpen(false)}
      />
    )}
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

const epOverlayStyles = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(0,0,0,0.72)" },
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
  avatarWrap: { position: "relative" },
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
  const { openTab, openConvId, openConvUserId, openConvUserName, openConvAvatar } =
    useLocalSearchParams<{
      openTab?: string;
      openConvId?: string;
      openConvUserId?: string;
      openConvUserName?: string;
      openConvAvatar?: string;
    }>();

  const [menuVisible, setMenuVisible] = useState(false);
  const [activeNav, setActiveNav] = useState(openTab ?? "Feed");
  const [quickReplyPost, setQuickReplyPost] = useState<Post | null>(null);
  const [detailPost, setDetailPost] = useState<Post | null>(null);
  const [openConv, setOpenConv]     = useState<ConversationInfo | null>(null);

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
    </View>
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
    backgroundColor: "rgba(22, 22, 28, 0.9)",
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

  // Bottom glass navbar
  navBarWrap: { position: "absolute", bottom: 0, left: 0, right: 0, paddingBottom: BOTTOM_INSET, paddingHorizontal: 12, paddingTop: 8, backgroundColor: "rgba(13,13,13,0.85)", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" },
  navBarGlass: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 96, borderWidth: 1, borderColor: "rgba(255,255,255,0.09)", paddingVertical: 6, height: NAVBAR_H - 8 },
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

  // Detail reply bar
  detailReplyBarWrap: { position: "absolute", left: 16, right: 16 },
  detailReplyContext: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, paddingBottom: 6 },
  detailReplyContextText: { fontSize: 12, color: "#AB00FF", fontWeight: "600" },
  detailReplyContextX: { fontSize: 18, color: "rgba(255,255,255,0.4)", lineHeight: 20 },
});
