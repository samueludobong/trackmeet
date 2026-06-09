import React, { useEffect, useRef, useState } from "react";
import {
  Image, Modal, PanResponder, Pressable, ScrollView,
  Text, TouchableOpacity, View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView } from "expo-video";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type Post } from "../../app/data/mock";
import { useVideoControls } from "./useVideoControls";
import { openSpotifyLink } from "../../lib/spotify";
import { mvStyles as s, SW, SH } from "./mediaViewer.styles";

type Media = { type: "image" | "video"; uri: string };

const fmtN = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`.replace(".0M", "M");
  if (n >= 1_000) return `${(n / 1_000).toFixed(n < 10_000 ? 1 : 0)}K`.replace(".0K", "K");
  return String(n);
};

/** TikTok-style immersive viewer: full-bleed media + right action rail + bottom info overlay. */
export function MediaViewer({
  post, media, startIndex = 0, onClose,
}: {
  post: Post;
  media: Media[];
  startIndex?: number;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(startIndex);
  const scrollRef = useRef<ScrollView>(null);
  const [expandedCaption, setExpandedCaption] = useState(false);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [following, setFollowing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const videoUri = media.find((m) => m.type === "video")?.uri ?? null;
  const videoRef = useRef<VideoView>(null);
  const player = useVideoPlayer(videoUri, (p) => {
    p.loop = true;
    p.timeUpdateEventInterval = 0.25;
    if (videoUri) p.play();
  });
  const controls = useVideoControls(player);

  useEffect(() => {
    if (startIndex > 0) {
      const t = setTimeout(() => scrollRef.current?.scrollTo({ x: startIndex * SW, animated: false }), 30);
      return () => clearTimeout(t);
    }
  }, [startIndex]);

  // Right-swipe to dismiss, without stealing horizontal swipes that should page through multi-media.
  const indexRef = useRef(index);
  useEffect(() => { indexRef.current = index; }, [index]);
  const wantsClose = (g: { dx: number; dy: number }) => {
    const horizontal = Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6;
    if (!horizontal || g.dx <= 0) return false;
    if (media.length > 1 && indexRef.current > 0) return false;
    return true;
  };
  const closePan = useRef(PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_e, g) => wantsClose(g),
    onMoveShouldSetPanResponder:        (_e, g) => wantsClose(g),
    onPanResponderTerminationRequest: () => false,
    onPanResponderRelease: (_e, g) => { if (g.dx > 80) onClose(); },
  })).current;

  const progress = controls.duration > 0 ? Math.min(1, controls.current / controls.duration) : 0;
  const captionLong = (post.text ?? "").length > 80;
  const tagLabel = post.communityName;

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={s.root} {...closePan.panHandlers}>
        {/* ── Full-bleed media (horizontal pager for multi-media posts) ── */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={media.length > 1}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / SW))}
          style={s.pager}
        >
          {media.map((m, i) => (
            <View key={i} style={s.page}>
              {m.type === "image" ? (
                <Image source={{ uri: m.uri }} style={s.media} resizeMode="contain" />
              ) : (
                <Pressable style={s.media} onPress={controls.togglePlay}>
                  <VideoView
                    ref={videoRef}
                    player={player}
                    style={s.media}
                    nativeControls={isFullscreen}
                    contentFit="contain"
                    allowsFullscreen
                    allowsPictureInPicture
                    onFullscreenEnter={() => setIsFullscreen(true)}
                    onFullscreenExit={() => setIsFullscreen(false)}
                  />
                  {!controls.playing && (
                    <View style={s.playOverlay} pointerEvents="none">
                      <View style={s.playBadge}>
                        <Ionicons name="play" size={36} color="#fff" />
                      </View>
                    </View>
                  )}
                </Pressable>
              )}
            </View>
          ))}
        </ScrollView>

        {/* ── Top dimming so back/dots stay readable over bright media ── */}
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(0,0,0,0.55)", "transparent"]}
          style={[s.topScrim, { height: insets.top + 70 }]}
        />

        {/* ── Bottom dimming for the caption / handle / music block ── */}
        <LinearGradient
          pointerEvents="none"
          colors={["transparent", "rgba(0,0,0,0.65)", "rgba(0,0,0,0.85)"]}
          style={s.bottomScrim}
        />

        {/* ── Top bar: back · pager dots · search ── */}
        <View style={[s.topBar, { paddingTop: insets.top + 6 }]}>
          <TouchableOpacity style={s.topBtn} onPress={onClose} hitSlop={10}>
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>
          {media.length > 1 ? (
            <View style={s.dotsRow}>
              {media.map((_, i) => <View key={i} style={[s.dot, i === index && s.dotActive]} />)}
            </View>
          ) : <View />}
          <TouchableOpacity style={s.topBtn} hitSlop={10}>
            <Ionicons name="search" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ── Right rail: avatar+follow, like, comment, bookmark, share ── */}
        <View style={[s.rail, { bottom: insets.bottom + 28 }]}>
          <View style={s.profileWrap}>
            {post.avatarUrl ? (
              <Image source={{ uri: post.avatarUrl }} style={s.railAvatar} />
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
            icon={liked ? "heart" : "heart"}
            color={liked ? "#FF3B6F" : "#fff"}
            count={post.likes + (liked ? 1 : 0)}
            onPress={() => setLiked((v) => !v)}
          />
          <RailButton icon="chatbubble-ellipses" count={post.comments} />
          <RailButton
            icon={saved ? "bookmark" : "bookmark"}
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
              <Image source={{ uri: post.avatarUrl }} style={s.handleAvatar} />
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

          {videoUri && (
            <View style={s.progressOuter}>
              <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function RailButton({
  icon, count, color, onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  count: number;
  color?: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={s.railBtn} activeOpacity={0.7} onPress={onPress} hitSlop={4}>
      <Ionicons name={icon} size={32} color={color || "#fff"} />
      {count > 0 && <Text style={s.railCount}>{fmtN(count)}</Text>}
    </TouchableOpacity>
  );
}
