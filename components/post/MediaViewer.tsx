import React, { useEffect, useRef, useState } from "react";
import {
  Animated, Image, Modal, PanResponder, Pressable, ScrollView,
  Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type Post } from "../../app/data/mock";
import { AttachedSongChip } from "./AttachedSongChip";
import { useVideoControls } from "./useVideoControls";
import { VideoControlBar } from "./VideoControlBar";
import { Action } from "./MediaViewerActions";
import { mvStyles as s, EXPANDED, SW, SH } from "./mediaViewer.styles";

const MEDIA_GAP = 12; // breathing room between media bottom and sheet top

// Component heights used to size the collapsed PEEK to its actual content.
const H_GRAB = 15;       // grabZone (paddingTop 7 + grabber 4 + paddingBottom 4)
const H_HEAD = 48;       // headRow avatar 40 + marginBottom 8
const H_BODY_LINE = 21;  // body lineHeight
const H_SONG = 64;       // song chip 56 + marginTop 8
const H_ACTIONS = 46;    // actions 36 + marginTop 10
const H_SCRUB_BASE = 66; // scrubInline marginTop 4 + bar without safe-area pad (paddingTop 6 + track 20 + mb 4 + row 24 + 8)

type Media = { type: "image" | "video"; uri: string };

/** X/Twitter-style media viewer: media on black + draggable post sheet + bottom playback bar. */
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
  const [expanded, setExpanded] = useState(false);

  // Lifted video player — drives both the in-frame VideoView and the bottom bar.
  const videoUri = media.find((m) => m.type === "video")?.uri ?? null;

  // Size the collapsed sheet to fit its content exactly so there's no dead space below the scrub bar.
  const hasSong = !!(post.song || post.songId);
  const text = post.text ?? "";
  const bodyLines = text
    ? Math.min(2, (text.match(/\n/g)?.length ?? 0) + 1 + (text.split("\n").reduce((m, l) => Math.max(m, l.length), 0) > 35 ? 1 : 0))
    : 0;
  const PEEK =
    H_GRAB +
    H_HEAD +
    bodyLines * H_BODY_LINE +
    (hasSong ? H_SONG : 0) +
    H_ACTIONS +
    (videoUri ? H_SCRUB_BASE + insets.bottom : 8);
  const mediaH = SH - PEEK - MEDIA_GAP;
  const COLLAPSED_Y = EXPANDED - PEEK;
  const sheetY = useRef(new Animated.Value(COLLAPSED_Y)).current;
  const restY = useRef(COLLAPSED_Y);
  const videoRef = useRef<VideoView>(null);
  const player = useVideoPlayer(videoUri, (p) => {
    p.loop = false;
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

  const animateSheet = (toExpanded: boolean) => {
    setExpanded(toExpanded);
    restY.current = toExpanded ? 0 : COLLAPSED_Y;
    Animated.spring(sheetY, { toValue: restY.current, useNativeDriver: true, bounciness: 3 }).start();
  };

  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 6,
    onPanResponderMove: (_e, g) => sheetY.setValue(Math.min(COLLAPSED_Y, Math.max(0, restY.current + g.dy))),
    onPanResponderRelease: (_e, g) => animateSheet(g.dy < -40 ? true : g.dy > 40 ? false : restY.current === 0),
  })).current;

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ flex: 1 }}>
        {/* ── Top bar ── */}
        <View style={[s.topBar, { paddingTop: insets.top + 6 }]}>
          <TouchableOpacity style={s.iconBtn} onPress={onClose} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} hitSlop={8}>
            <Ionicons name="ellipsis-horizontal" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ── Media — sized to the area above the sheet so it never clips ── */}
        <ScrollView
          ref={scrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          scrollEnabled={media.length > 1}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / SW))}
          style={[s.pager, { height: mediaH }]}
        >
          {media.map((m, i) => (
            <View key={i} style={[s.page, { height: mediaH }]}>
              {m.type === "image" ? (
                <Image source={{ uri: m.uri }} style={s.media} resizeMode="contain" />
              ) : (
                <Pressable style={s.media} onPress={controls.togglePlay}>
                  <VideoView
                    ref={videoRef}
                    player={player}
                    style={s.media}
                    nativeControls={false}
                    contentFit="contain"
                    allowsFullscreen
                    allowsPictureInPicture
                  />
                  {!controls.playing && (
                    <View style={s.centerPlayOverlay} pointerEvents="none">
                      <View style={s.centerPlayBtn}>
                        <Ionicons name="play" size={30} color="#fff" />
                      </View>
                    </View>
                  )}
                </Pressable>
              )}
            </View>
          ))}
        </ScrollView>

        {media.length > 1 && (
          <View style={[s.dots, { top: mediaH - 14 }]}>
            {media.map((_, i) => <View key={i} style={[s.dot, i === index && s.dotActive]} />)}
          </View>
        )}

        {/* ── Draggable post sheet ── */}
        <Animated.View style={[s.sheet, { transform: [{ translateY: sheetY }] }]}>
          <View {...pan.panHandlers} style={s.grabZone}>
            <View style={s.grabber} />
          </View>

          <ScrollView
            scrollEnabled={expanded}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
          >
            <View style={s.headRow}>
              {post.avatarUrl ? (
                <Image source={{ uri: post.avatarUrl }} style={s.avatar} />
              ) : (
                <View style={[s.avatar, { backgroundColor: (post.avatarColor || "#AB00FF") + "33", alignItems: "center", justifyContent: "center" }]}>
                  <Text style={{ color: post.avatarColor || "#AB00FF", fontWeight: "800", fontSize: 16 }}>{post.initials}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View style={s.nameRow}>
                  <Text style={s.author} numberOfLines={1}>{post.bio || post.user}</Text>
                  {post.isVerified && <Ionicons name="checkmark-circle" size={15} color="#1DB954" />}
                </View>
                <Text style={s.handle} numberOfLines={1}>{post.handle}</Text>
              </View>
              <TouchableOpacity style={s.followBtn} activeOpacity={0.85}>
                <Text style={s.followText}>Follow</Text>
              </TouchableOpacity>
            </View>

            {!!post.text && (
              <Text style={s.body} numberOfLines={expanded ? undefined : 2}>{post.text}</Text>
            )}

            {(post.song || post.songId) && (
              <AttachedSongChip songId={post.songId} songName={post.song} songArtist={post.artist} albumArt={post.albumArt} />
            )}

            {expanded && <Text style={s.timeMeta}>{post.time}</Text>}

            <View style={[s.actions, expanded && s.actionsFlat]}>
              <Action icon="chatbubble-outline" n={post.comments} flat={expanded} />
              <Action icon="repeat-outline" n={post.shares} flat={expanded} />
              <Action icon="heart-outline" n={post.likes} flat={expanded} />
              <Action icon="bookmark-outline" n={expanded ? Math.round(post.likes * 0.5) : 0} flat={expanded} />
              <Action icon="share-outline" n={0} flat={expanded} />
            </View>

            {/* Inline scrub bar (collapsed video posts) — flush with actions, cancels the ScrollView's horizontal padding. */}
            {videoUri && !expanded && (
              <View style={s.scrubInline}>
                <VideoControlBar
                  controls={controls}
                  bottomInset={insets.bottom}
                  onFullscreen={() => videoRef.current?.enterFullscreen()}
                  onPip={() => videoRef.current?.startPictureInPicture?.()}
                />
              </View>
            )}
          </ScrollView>

          {expanded && (
            <View style={[s.replyBar, { paddingBottom: insets.bottom + 8 }]}>
              {post.avatarUrl
                ? <Image source={{ uri: post.avatarUrl }} style={s.replyAvatar} />
                : <View style={[s.replyAvatar, { backgroundColor: "#222" }]} />}
              <TextInput style={s.replyInput} placeholder="Post your reply" placeholderTextColor="rgba(255,255,255,0.45)" />
            </View>
          )}
        </Animated.View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
