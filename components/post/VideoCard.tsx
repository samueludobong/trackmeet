import React, { useCallback, useEffect, useRef, useState } from "react";
import { PanResponder, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView, type VideoPlayer } from "expo-video";
import { styles } from "../../lib/feed/styles";
import { ActionRow } from "./ActionRow";
import { PostHeader } from "./PostHeader";
import { PostText } from "./TextCard";
import { AttachedSongChip } from "./AttachedSongChip";
import { MediaViewer } from "./MediaViewer";
import { useFeedAudio, useOpenVideoFeed } from "../../lib/feed/contexts";
import { videoPositionStore } from "../../lib/feed/videoPositions";
import { useCachedVideoUri } from "../../hooks/useCachedVideoUri";
import { CachedImage } from "../ui/CachedImage";
import { type Post } from "../../app/data/mock";

const fmt = (s: number) => {
  const sec = Math.max(0, Math.round(s));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
};

// Aspect ratio bounds: 16:9 cinematic on the short end, 9:16 TikTok on the tall
// end. Anything outside this range gets clamped so a freak 2.35:1 trailer or a
// 1:2 weird crop doesn't blow out the layout.
const MIN_ASPECT = 9 / 16;   // tallest (portrait)
const MAX_ASPECT = 16 / 9;   // shortest (landscape)
const DEFAULT_ASPECT = 16 / 9;

export function VideoCard({ post }: { post: Post }) {
  const videoUri = post.mediaUrls?.[0];
  const [open, setOpen] = useState(false);
  const { activePostId, videosMuted, toggleVideosMuted } = useFeedAudio();
  const isActive = activePostId === post.id;
  // In the main feed this opens the TikTok-style vertical viewer across every
  // feed video. Elsewhere (profile, detail, communities) there's no provider,
  // so we fall back to the single-post MediaViewer below.
  const openVideoFeed = useOpenVideoFeed();

  const openViewer = useCallback(() => {
    if (!videoUri) return;
    if (openVideoFeed) openVideoFeed(post.id);
    else setOpen(true);
  }, [videoUri, openVideoFeed, post.id]);

  // Player state is held here so InlinePreview (inside the touch target) and
  // the scrub bar (below the media block) share the same source of truth.
  const [pos, setPos] = useState(videoUri ? (videoPositionStore.get(post.id) ?? 0) : 0);
  const [dur, setDur] = useState(0);
  // Seed from the DB-persisted aspect so first paint is correct. The
  // player's statusChange will overwrite it later if the asset metadata
  // disagreed with the file (rare — would mean the picker reported wrong dims).
  const [aspect, setAspect] = useState<number | null>(post.mediaAspect ?? null);
  const playerRef = useRef<VideoPlayer | null>(null);

  const onPlayerReady = useCallback((p: VideoPlayer) => { playerRef.current = p; }, []);
  const onProgress = useCallback((p: number, d: number) => {
    setPos(p);
    if (d > 0) setDur((prev) => (prev === d ? prev : d));
  }, []);
  const onAspect = useCallback((a: number) => {
    if (!Number.isFinite(a) || a <= 0) return;
    setAspect((prev) => (prev === a ? prev : a));
  }, []);

  const cardAspect = aspect
    ? Math.max(MIN_ASPECT, Math.min(MAX_ASPECT, aspect))
    : DEFAULT_ASPECT;

  return (
    <View style={styles.card}>
      <PostHeader post={post} />
      {post.text && <PostText text={post.text} />}

      <TouchableOpacity
        activeOpacity={0.92}
        onPress={openViewer}
        style={[
          styles.mediaBlock,
          { backgroundColor: post.mediaColor ?? "#1a1a1a" },
          // For video posts, override the default fixed height with an aspect
          // ratio so portrait clips render as tall TikTok-style cards and
          // landscape clips stay short.
          videoUri ? { height: undefined, aspectRatio: cardAspect } : null,
        ]}
      >
        {videoUri ? (
          <InlinePreview
            postId={post.id}
            uri={videoUri}
            // Yield to the fullscreen viewer while it's open so we never have
            // two players running at once. Resumes when the modal closes.
            active={isActive && !open}
            muted={videosMuted}
            onPlayerReady={onPlayerReady}
            onProgress={onProgress}
            onAspect={onAspect}
          />
        ) : (
          <CachedImage source={{ uri: post.albumArt ?? undefined }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        )}

        {/* Play overlay — only when not running. */}
        {!isActive && (
          <View style={[styles.videoPlayCircle, { position: "absolute" }]}>
            <Text style={styles.videoPlayIcon}>▶</Text>
          </View>
        )}

        {/* Top-right: universal video mute. */}
        {videoUri && (
          <TouchableOpacity
            onPress={toggleVideosMuted}
            hitSlop={10}
            activeOpacity={0.7}
            style={[
              inline.muteBtn,
              { borderWidth: isActive ? 1 : 0, borderColor: "rgba(255,255,255,0.6)" },
            ]}
          >
            <Ionicons name={videosMuted ? "volume-mute" : "volume-high"} size={15} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Bottom-right counter: live mm:ss / mm:ss while running, static duration otherwise. */}
        {videoUri && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>
              {isActive && dur > 0 ? `${fmt(pos)} / ${fmt(dur)}` : (post.duration ?? (dur > 0 ? fmt(dur) : ""))}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Scrubbable progress bar — outside the touch target so dragging it
          never opens the modal. Renders once we know the duration. */}
      {videoUri && dur > 0 && (
        <ScrubBar
          dur={dur}
          isActive={isActive}
          playerRef={playerRef}
          onSeek={(secs) => {
            const player = playerRef.current;
            if (!player) return;
            try {
              player.currentTime = secs;
              videoPositionStore.set(post.id, secs);
            } catch {}
          }}
        />
      )}

      {post.song && (
        <AttachedSongChip
          songId={post.songId} songName={post.song} songArtist={post.artist} albumArt={post.albumArt}
        />
      )}

      <ActionRow post={post} />

      {open && videoUri && (
        <MediaViewer
          post={post}
          media={[{ type: "video", uri: videoUri }]}
          onClose={() => setOpen(false)}
        />
      )}
    </View>
  );
}

/** Inline video. Plays only while this card is the active one in the feed. */
function InlinePreview({
  postId, uri, active, muted, onPlayerReady, onProgress, onAspect,
}: {
  postId: string;
  uri: string;
  active: boolean;
  muted: boolean;
  onPlayerReady: (p: VideoPlayer) => void;
  onProgress: (pos: number, dur: number) => void;
  onAspect: (a: number) => void;
}) {
  // Play from the on-device cache when available; otherwise stream the remote
  // url and cache it in the background (once active) for the next view.
  const playUri = useCachedVideoUri(uri, active);
  const player = useVideoPlayer(playUri ?? uri, (p) => {
    p.muted = muted;
    p.loop = true;
    // Mix with other apps so an inline (muted-by-default) feed video doesn't
    // grab the audio session and pause the song-preview that's playing on a
    // neighbouring music card as the user scrolls past. Default 'auto' still
    // claims the session in some cases even when muted — 'mixWithOthers'
    // never does.
    p.audioMixingMode = "mixWithOthers";
    // Without this, the "timeUpdate" event never fires and the counter / scrub
    // bar are frozen. 0.25s is a good balance of smoothness vs. work.
    p.timeUpdateEventInterval = 0.25;
    p.pause();
    const cached = videoPositionStore.get(postId);
    if (cached && cached > 0) {
      try { p.currentTime = cached; } catch {}
    }
  });

  // Hand the player up so the card-level scrub bar can seek it.
  useEffect(() => { onPlayerReady(player); }, [player, onPlayerReady]);

  // posRef lets the cleanup effect read the latest position without depending on
  // pos state (which would re-run the effect every time progress updates).
  const posRef = useRef(videoPositionStore.get(postId) ?? 0);

  // Subscribe to player events. timeUpdate fires every 0.25s while playing.
  useEffect(() => {
    if (!player) return;
    const subs = [
      player.addListener("timeUpdate", (e: any) => {
        const t = e?.currentTime ?? 0;
        posRef.current = t;
        onProgress(t, player.duration ?? 0);
      }),
      player.addListener("statusChange", () => {
        if (player.duration > 0) onProgress(posRef.current, player.duration);
        // Pull the natural video size off the loaded track so the card can
        // size itself to match (portrait → tall card, landscape → short card).
        const tracks = (player as any).videoTracks;
        if (Array.isArray(tracks)) {
          const t = tracks.find((tr: any) => tr?.size?.width > 0 && tr?.size?.height > 0);
          if (t) onAspect(t.size.width / t.size.height);
        }
      }),
    ];
    return () => subs.forEach((s) => s.remove());
  }, [player, onProgress, onAspect]);

  // Resume / pause based on the active card. Save position on each pause.
  useEffect(() => {
    if (active) {
      try {
        const cached = videoPositionStore.get(postId);
        if (cached && cached > 0) player.currentTime = cached;
        player.play();
      } catch {}
    } else {
      try {
        videoPositionStore.set(postId, posRef.current);
        player.pause();
      } catch {}
    }
  }, [active, player, postId]);

  // Live mute response.
  useEffect(() => {
    try { player.muted = muted; } catch {}
  }, [muted, player]);

  // Save position on unmount (FlatList virtualisation).
  useEffect(() => {
    return () => {
      try { videoPositionStore.set(postId, posRef.current); } catch {}
    };
  }, [postId]);

  return (
    <VideoView
      player={player}
      style={{ width: "100%", height: "100%" }}
      contentFit="cover"
      nativeControls={false}
      pointerEvents="none"
    />
  );
}

/**
 * Thin scrubbable progress bar. Drag horizontally to seek. Doesn't claim taps
 * or vertical motion, so the FlatList still scrolls when the user touches it.
 *
 * Reads `player.currentTime` every frame via requestAnimationFrame so the bar
 * glides continuously — the `timeUpdate` event only fires every 0.25s, which
 * is what was causing the visible step. While dragging, the fill tracks the
 * finger directly.
 */
function ScrubBar({
  dur, isActive, playerRef, onSeek,
}: {
  dur: number;
  isActive: boolean;
  playerRef: React.MutableRefObject<VideoPlayer | null>;
  onSeek: (secs: number) => void;
}) {
  const trackWRef = useRef(0);
  const durRef = useRef(dur);
  durRef.current = dur;
  const [dragPos, setDragPos] = useState<number | null>(null);
  const [displayPos, setDisplayPos] = useState(0);
  const dragRef = useRef<number | null>(null);
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live tick — drives the bar from player.currentTime each frame.
  useEffect(() => {
    if (!isActive) return;
    let raf = 0;
    const tick = () => {
      const p = playerRef.current;
      if (p && dragRef.current === null) {
        try {
          const t = p.currentTime ?? 0;
          setDisplayPos((prev) => (Math.abs(prev - t) < 0.01 ? prev : t));
        } catch {}
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isActive, playerRef]);

  const seekFromX = (x: number) => {
    const w = trackWRef.current;
    if (!w || durRef.current <= 0) return;
    const frac = Math.min(1, Math.max(0, x / w));
    const secs = frac * durRef.current;
    dragRef.current = secs;
    setDragPos(secs);
    onSeek(secs);
  };

  useEffect(() => () => { if (releaseTimer.current) clearTimeout(releaseTimer.current); }, []);

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    // Only claim a *decisively* horizontal drag. A small/diagonal move stays
    // with the FlatList so the feed keeps scrolling — otherwise a scroll that
    // starts over this band gets grabbed as a seek and (because we refuse to
    // terminate) the vertical scroll locks up.
    onMoveShouldSetPanResponder: (_e, g) =>
      Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
    // Once we own a real horizontal seek, keep it (a vertical wiggle mid-scrub
    // shouldn't cancel the seek). The strict claim above is what protects scroll.
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => seekFromX(e.nativeEvent.locationX),
    onPanResponderMove:  (e) => seekFromX(e.nativeEvent.locationX),
    onPanResponderRelease: () => {
      // Brief grace so player.currentTime catches up before we hand display
      // back to the rAF reader — avoids a snap-back on release.
      if (releaseTimer.current) clearTimeout(releaseTimer.current);
      releaseTimer.current = setTimeout(() => {
        dragRef.current = null;
        setDragPos(null);
      }, 250);
    },
    onPanResponderTerminate: () => { dragRef.current = null; setDragPos(null); },
  })).current;

  const shown = dragPos !== null ? dragPos : displayPos;
  const progress = dur > 0 ? Math.min(1, shown / dur) : 0;

  return (
    <View
      style={scrub.row}
      onLayout={(e) => { trackWRef.current = e.nativeEvent.layout.width; }}
      {...pan.panHandlers}
    >
      <View style={[scrub.fill, { width: `${progress * 100}%` }]} />
    </View>
  );
}

const inline = StyleSheet.create({
  muteBtn: {
    position: "absolute", top: 10, right: 10,
    width: 30, height: 30, borderRadius: 15,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
});

const scrub = StyleSheet.create({
  // Tall hit area for easy thumbing. Negative marginBottom pulls the action row
  // back up so the *visible* gap between the video and the action row stays the
  // same — the extra hit area overlaps the action row invisibly. The icons up
  // there still catch their own taps (TouchableOpacity is on top in z-order;
  // our PanResponder only claims horizontal drags, not taps), so dragging
  // anywhere in this band scrubs and tapping an icon still triggers the icon.
  row: { height: 28, marginBottom: -14 },
  fill: { position: "absolute", top: 0, left: 0, height: 2, backgroundColor: "#fff" },
});
