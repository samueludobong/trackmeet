import React, { useRef, useState } from "react";
import {
  FlatList, Modal, PanResponder, Pressable,
  Text, TouchableOpacity, View, ViewToken,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView } from "expo-video";
import { useSafeAreaInsets, type EdgeInsets } from "react-native-safe-area-context";
import { type Post } from "../../app/data/mock";
import { useVideoControls } from "./useVideoControls";
import { openSpotifyLink } from "../../lib/spotify";
import { videoPositionStore } from "../../lib/feed/videoPositions";
import { useCachedVideoUri } from "../../hooks/useCachedVideoUri";
import { CachedImage } from "../ui/CachedImage";
import { RailButton } from "./MediaViewer";
import { mvStyles as s, SW, SH } from "../../assets/styles/post/MediaViewer";

// A page has to be the dominant one on screen before it becomes the playing card.
const VIEWABILITY = { itemVisiblePercentThreshold: 80 };

/**
 * TikTok-style full-screen viewer: vertically-paged feed of video posts. Swipe
 * up/down to move between videos; only the page that's snapped into view plays.
 * Playback position is shared with the inline feed cards via `videoPositionStore`.
 */
export function VideoFeedViewer({
  posts, startIndex = 0, onClose,
}: {
  posts: Post[];
  startIndex?: number;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(startIndex);

  // Track the snapped page so exactly one player runs at a time.
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const top = viewableItems.find((v) => v.isViewable && v.index != null);
    if (top?.index != null) setActiveIndex(top.index);
  }).current;

  // Right-swipe anywhere to dismiss. The list itself only owns vertical motion,
  // so a clear horizontal drag is unambiguous.
  const wantsClose = (g: { dx: number; dy: number }) =>
    g.dx > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6;
  const closePan = useRef(PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_e, g) => wantsClose(g),
    onMoveShouldSetPanResponder: (_e, g) => wantsClose(g),
    onPanResponderTerminationRequest: () => false,
    onPanResponderRelease: (_e, g) => { if (g.dx > 80) onClose(); },
  })).current;

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={s.root} {...closePan.panHandlers}>
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          initialScrollIndex={startIndex}
          getItemLayout={(_, i) => ({ length: SH, offset: SH * i, index: i })}
          // Keep the window tight so we never have more than a couple of decoded
          // videos alive at once.
          windowSize={3}
          maxToRenderPerBatch={2}
          initialNumToRender={1}
          removeClippedSubviews
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={VIEWABILITY}
          renderItem={({ item, index }) => (
            <VideoPage post={item} active={index === activeIndex} insets={insets} onClose={onClose} />
          )}
        />
      </View>
    </Modal>
  );
}

/** One full-screen video page with its own player + TikTok chrome. */
function VideoPage({
  post, active, insets, onClose,
}: {
  post: Post;
  active: boolean;
  insets: EdgeInsets;
  onClose: () => void;
}) {
  const uri = post.mediaUrls?.[0] ?? null;
  const playUri = useCachedVideoUri(uri ?? undefined, active);
  const player = useVideoPlayer(playUri ?? null, (p) => {
    p.loop = true;
    p.timeUpdateEventInterval = 0.25;
    const cached = videoPositionStore.get(post.id);
    if (cached && cached > 0) { try { p.currentTime = cached; } catch {} }
  });
  const controls = useVideoControls(player);

  // Play only the snapped page. Persist position on pause so the inline feed
  // card (and neighbouring pages) resume from the same spot.
  React.useEffect(() => {
    if (!player) return;
    if (active) {
      try { player.play(); } catch {}
    } else {
      try { videoPositionStore.set(post.id, player.currentTime ?? 0); player.pause(); } catch {}
    }
  }, [active, player, post.id]);

  // Save on unmount (scrolled out of the window) for the same continuity.
  React.useEffect(() => () => {
    try { videoPositionStore.set(post.id, player.currentTime ?? 0); } catch {}
  }, [player, post.id]);

  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [following, setFollowing] = useState(false);
  const [expandedCaption, setExpandedCaption] = useState(false);

  const progress = controls.duration > 0 ? Math.min(1, controls.current / controls.duration) : 0;
  const captionLong = (post.text ?? "").length > 80;
  const tagLabel: string | null = null;

  return (
    <View style={{ width: SW, height: SH, backgroundColor: "#000" }}>
      <Pressable style={s.media} onPress={controls.togglePlay}>
        <VideoView player={player} style={s.media} contentFit="contain" nativeControls={false} />
        {!controls.playing && (
          <View style={s.playOverlay} pointerEvents="none">
            <View style={s.playBadge}>
              <Ionicons name="play" size={36} color="#fff" />
            </View>
          </View>
        )}
      </Pressable>

      {/* ── Top + bottom dimming ── */}
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0.55)", "transparent"]}
        style={[s.topScrim, { height: insets.top + 70 }]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={["transparent", "rgba(0,0,0,0.65)", "rgba(0,0,0,0.85)"]}
        style={s.bottomScrim}
      />

      {/* ── Top bar: back + mute ── */}
      <View style={[s.topBar, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity style={s.topBtn} onPress={onClose} hitSlop={10}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <View />
        <TouchableOpacity style={s.topBtn} hitSlop={10} onPress={controls.toggleMute}>
          <Ionicons name={controls.muted ? "volume-mute" : "volume-high"} size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── Right action rail ── */}
      <View style={[s.rail, { bottom: insets.bottom + 28 }]}>
        <View style={s.profileWrap}>
          {post.avatarUrl ? (
            <CachedImage source={{ uri: post.avatarUrl }} style={s.railAvatar} />
          ) : (
            <View style={[s.railAvatar, { backgroundColor: (post.avatarColor || "#AB00FF") + "55", alignItems: "center", justifyContent: "center" }]}>
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>{post.initials}</Text>
            </View>
          )}
          {!following && (
            <TouchableOpacity style={s.followPlus} activeOpacity={0.8} onPress={() => setFollowing(true)} hitSlop={8}>
              <Ionicons name="add" size={14} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        <RailButton
          icon="heart"
          color={liked ? "#FF3B6F" : "#fff"}
          count={post.likes + (liked ? 1 : 0)}
          onPress={() => setLiked((v) => !v)}
        />
        <RailButton icon="chatbubble-ellipses" count={post.comments} />
        <RailButton
          icon="bookmark"
          color={saved ? "#FFC93C" : "#fff"}
          count={Math.max(0, Math.round(post.likes * 0.18)) + (saved ? 1 : 0)}
          onPress={() => setSaved((v) => !v)}
        />
        <RailButton icon="arrow-redo" count={post.shares} />
      </View>

      {/* ── Bottom info overlay ── */}
      <View style={[s.bottom, { paddingBottom: insets.bottom + 14 }]}>
        {!!tagLabel && (
          <TouchableOpacity style={s.tag} activeOpacity={0.85}>
            <Ionicons name="pricetag" size={11} color="#FFD24A" />
            <Text style={s.tagText}>{tagLabel}</Text>
          </TouchableOpacity>
        )}

        <View style={s.handleRow}>
          {post.avatarUrl ? (
            <CachedImage source={{ uri: post.avatarUrl }} style={s.handleAvatar} />
          ) : (
            <View style={[s.handleAvatar, { backgroundColor: (post.avatarColor || "#AB00FF") + "55" }]} />
          )}
          <Text style={s.handle} numberOfLines={1}>{post.handle}</Text>
          {post.isVerified && <Ionicons name="checkmark-circle" size={14} color="#1DB954" />}
        </View>

        {!!post.text && (
          <Text
            style={s.caption}
            numberOfLines={expandedCaption ? undefined : 2}
            onPress={() => captionLong && setExpandedCaption((v) => !v)}
          >
            {post.text}
            {!expandedCaption && captionLong && <Text style={s.seeMore}>  See more</Text>}
          </Text>
        )}

        {(post.song || post.songId) && (
          <TouchableOpacity
            style={s.musicRow}
            activeOpacity={0.85}
            onPress={() => post.songId && openSpotifyLink(`spotify:track:${post.songId}`, `https://open.spotify.com/track/${post.songId}`)}
          >
            <Ionicons name="musical-notes" size={14} color="#fff" />
            <Text style={s.musicText} numberOfLines={1}>
              {[post.artist, post.song].filter(Boolean).join(" - ")}
            </Text>
          </TouchableOpacity>
        )}

        <View style={s.progressOuter}>
          <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>
    </View>
  );
}
