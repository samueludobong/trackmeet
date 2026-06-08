import React, { useEffect, useRef, useState } from "react";
import {
  Animated, Dimensions, Image, Modal, PanResponder, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { type Post } from "../../app/data/mock";
import { AttachedSongChip } from "./AttachedSongChip";

const { width: SW, height: SH } = Dimensions.get("window");
const SHEET_PEEK = 90;             // visible sheet height when collapsed
const SHEET_EXPANDED = SH * 0.62;  // expanded sheet height

const fmtN = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`.replace(".0M", "M");
  if (n >= 1_000) return `${(n / 1_000).toFixed(n < 10_000 ? 1 : 0)}K`.replace(".0K", "K");
  return String(n);
};

type Media = { type: "image" | "video"; uri: string };

/** X/Twitter-style media viewer: media on a black canvas + draggable post sheet. */
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
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const sheetY = useRef(new Animated.Value(SHEET_EXPANDED - SHEET_PEEK)).current;

  useEffect(() => {
    if (startIndex > 0) {
      const t = setTimeout(() => scrollRef.current?.scrollTo({ x: startIndex * SW, animated: false }), 30);
      return () => clearTimeout(t);
    }
  }, [startIndex]);

  const animateSheet = (expanded: boolean) => {
    setSheetExpanded(expanded);
    Animated.spring(sheetY, {
      toValue: expanded ? 0 : SHEET_EXPANDED - SHEET_PEEK,
      useNativeDriver: true, bounciness: 4,
    }).start();
  };

  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 8,
    onPanResponderMove: (_e, g) => {
      const base = sheetExpanded ? 0 : SHEET_EXPANDED - SHEET_PEEK;
      const next = Math.min(SHEET_EXPANDED - SHEET_PEEK, Math.max(0, base + g.dy));
      sheetY.setValue(next);
    },
    onPanResponderRelease: (_e, g) => animateSheet(g.dy < -40 ? true : g.dy > 40 ? false : sheetExpanded),
  })).current;

  const cur = media[index];
  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={s.root}>
        <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={s.iconBtn} onPress={onClose} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} hitSlop={8}>
            <Ionicons name="ellipsis-horizontal" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / SW))}
          style={s.pager}
        >
          {media.map((m, i) => (
            <View key={i} style={s.page}>
              {m.type === "image" ? (
                <Image source={{ uri: m.uri }} style={s.fullImage} resizeMode="contain" />
              ) : (
                <InlineVideo uri={m.uri} active={i === index} />
              )}
            </View>
          ))}
        </ScrollView>

        {media.length > 1 && (
          <View style={s.pageDots}>
            {media.map((_, i) => (
              <View key={i} style={[s.dot, i === index && s.dotActive]} />
            ))}
          </View>
        )}

        <Animated.View style={[s.sheet, { transform: [{ translateY: sheetY }], paddingBottom: insets.bottom + 8 }]} {...pan.panHandlers}>
          <View style={s.grabber} />
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            <View style={s.headRow}>
              {post.avatarUrl ? (
                <Image source={{ uri: post.avatarUrl }} style={s.avatar} />
              ) : (
                <View style={[s.avatar, { backgroundColor: (post.avatarColor || "#AB00FF") + "33", alignItems: "center", justifyContent: "center" }]}>
                  <Text style={{ color: post.avatarColor || "#AB00FF", fontWeight: "800" }}>{post.initials}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.author} numberOfLines={1}>{post.bio || post.user}</Text>
                <Text style={s.handle} numberOfLines={1}>{post.handle}</Text>
              </View>
              <TouchableOpacity style={s.followBtn} activeOpacity={0.85}>
                <Text style={s.followText}>Follow</Text>
              </TouchableOpacity>
            </View>

            {!!post.text && <Text style={s.body}>{post.text}</Text>}

            {(post.song || post.songId) && (
              <AttachedSongChip songId={post.songId} songName={post.song} songArtist={post.artist} albumArt={post.albumArt} />
            )}

            <Text style={s.timeMeta}>{post.time}</Text>

            <View style={s.statsRow}>
              <Stat icon="chatbubble-outline" n={post.comments} />
              <Stat icon="repeat-outline" n={post.shares} />
              <Stat icon="heart-outline" n={post.likes} />
              <Stat icon="bookmark-outline" n={0} />
              <Stat icon="share-outline" n={0} />
            </View>
          </ScrollView>

          <View style={[s.replyBar, { paddingBottom: insets.bottom + 8 }]}>
            {post.avatarUrl
              ? <Image source={{ uri: post.avatarUrl }} style={s.replyAvatar} />
              : <View style={[s.replyAvatar, { backgroundColor: "#222" }]} />}
            <TextInput
              style={s.replyInput} placeholder="Post your reply"
              placeholderTextColor="rgba(255,255,255,0.4)"
            />
          </View>
        </Animated.View>

        {/* Bottom scrim so collapsed sheet has readable contrast over media */}
        {!sheetExpanded && (
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.75)"]}
            style={[s.scrim, { height: SHEET_PEEK + insets.bottom + 30 }]}
            pointerEvents="none"
          />
        )}
      </View>
    </Modal>
  );
}

function Stat({ icon, n }: { icon: keyof typeof Ionicons.glyphMap; n: number }) {
  return (
    <View style={s.stat}>
      <Ionicons name={icon} size={18} color="rgba(255,255,255,0.7)" />
      {n > 0 && <Text style={s.statText}>{fmtN(n)}</Text>}
    </View>
  );
}

function InlineVideo({ uri, active }: { uri: string; active: boolean }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = false; if (active) p.play(); });
  useEffect(() => { active ? player.play() : player.pause(); }, [active, player]);
  return <VideoView player={player} style={s.fullImage} nativeControls contentFit="contain" />;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  topBar: {
    position: "absolute", top: 0, left: 0, right: 0, zIndex: 5,
    flexDirection: "row", justifyContent: "space-between",
    paddingHorizontal: 12, paddingBottom: 10,
  },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  pager: { flex: 1 },
  page: { width: SW, height: SH, alignItems: "center", justifyContent: "center" },
  fullImage: { width: SW, height: SH * 0.7 },
  pageDots: { position: "absolute", top: SH * 0.46, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.35)" },
  dotActive: { backgroundColor: "#fff", width: 18 },

  sheet: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    height: SHEET_EXPANDED, backgroundColor: "#000",
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    borderTopWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.1)",
  },
  grabber: { alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.3)", marginTop: 6, marginBottom: 10 },
  headRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#222" },
  author: { fontSize: 15, fontWeight: "800", color: "#fff" },
  handle: { fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 1 },
  followBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: "#fff" },
  followText: { color: "#000", fontWeight: "800", fontSize: 13 },

  body: { fontSize: 16, color: "#fff", lineHeight: 23, marginTop: 4, fontWeight: "500" },
  timeMeta: { fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 14 },

  statsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.12)" },
  stat: { flexDirection: "row", alignItems: "center", gap: 6 },
  statText: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: "700" },

  replyBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.1)",
  },
  replyAvatar: { width: 30, height: 30, borderRadius: 15 },
  replyInput: { flex: 1, color: "#fff", fontSize: 15, paddingVertical: 8 },

  scrim: { position: "absolute", left: 0, right: 0, bottom: 0 },
});
