import React, { useEffect, useRef, useState } from "react";
import { useSlideInPanel } from "../../hooks/useSlideInPanel";
import { useViewer } from "../../hooks/useViewer";
import {
  getCuratedPlaylistSongs,
  setPlaylistShowOnProfile,
  deleteCuratedPlaylistSong,
  reorderCuratedPlaylistSongs,
} from "../../services/playlists";
import { openSpotifyLink, playTracks, getValidSpotifyToken, setPlayback } from "../../lib/spotify";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Modal, ActivityIndicator, Alert, PanResponder, Easing } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type CuratedPlaylist, type CuratedSong } from "../../lib/feed/types";
import { useNowPlayingCtx } from "../../lib/feed/contexts";
import { AddSongDialog } from "./AddSongDialog";
import { EditPlaylistOverlay } from "./EditPlaylistOverlay";
import { PlaylistOptionsOverlay } from "./PlaylistOptionsOverlay";

const ACCENT = "#1DB954"; // Spotify-green accent, matches the inspiration shot.

// Used by the reorderable list — must stay in sync with the row's actual
// visual height (paddingY + content + outer 8px gap).
const ROW_H = 70;
const ROW_GAP = 8;
const ROW_TOTAL = ROW_H + ROW_GAP;

/** Open a Spotify track in the app if installed, falling back to web. */
const openTrackInSpotify = (spotifyTrackId: string) =>
  openSpotifyLink(`spotify:track:${spotifyTrackId}`, `https://open.spotify.com/track/${spotifyTrackId}`);

const formatDuration = (totalMs: number) => {
  const totalMin = Math.floor(totalMs / 60_000);
  if (totalMin < 60) return `${totalMin} min`;
  const hr = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  return min === 0 ? `${hr} hr` : `${hr} hr ${min} min`;
};

export function CuratedPlaylistDetailOverlay({
  playlist, userId, onClose, onUpdated, onDeleted,
}: {
  playlist: CuratedPlaylist;
  userId: string;
  onClose: () => void;
  onUpdated: (updated: CuratedPlaylist) => void;
  /** Called after the playlist is deleted so the parent can drop it from its
   *  list. Falls back to onClose if not provided. */
  onDeleted?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { slideX, panHandlers, close } = useSlideInPanel(onClose);
  const { currentUserId } = useViewer();
  const isOwner = !!currentUserId && currentUserId === playlist.user_id;

  const [songs, setSongs] = useState<CuratedSong[]>([]);
  const [songsLoading, setSongsLoading] = useState(true);
  const [showOnProfile, setShowOnProfile] = useState(playlist.show_on_profile);
  const [showAddSong, setShowAddSong] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [starting, setStarting] = useState(false);
  const [shuffleOn, setShuffleOn] = useState(false);
  // Becomes true while a drag is in progress so the outer ScrollView lets the
  // drag PanResponder steal the vertical gesture instead of scrolling.
  const [scrollLocked, setScrollLocked] = useState(false);

  // Detect whether a song from THIS playlist is the one Spotify is currently
  // playing. Used to swap the play→pause icon and to highlight the active row
  // with a gradient + waveform.
  const { track: nowPlaying } = useNowPlayingCtx();
  const activeSongId = nowPlaying?.isPlaying
    ? songs.find((s) => s.spotify_track_id === nowPlaying.id)?.id ?? null
    : null;
  const isThisPlaylistPlaying = !!activeSongId;

  useEffect(() => { loadSongs(); }, []);

  const loadSongs = async () => {
    setSongsLoading(true);
    setSongs(await getCuratedPlaylistSongs(playlist.id));
    setSongsLoading(false);
  };

  const toggleShowOnProfile = async () => {
    if (!isOwner) return;
    const newVal = !showOnProfile;
    setShowOnProfile(newVal);
    await setPlaylistShowOnProfile(playlist.id, newVal);
    onUpdated({ ...playlist, show_on_profile: newVal });
  };

  const deleteSong = async (songId: string) => {
    await deleteCuratedPlaylistSong(songId);
    setSongs(prev => prev.filter(s => s.id !== songId));
  };

  const handleReorder = async (next: CuratedSong[]) => {
    setSongs(next);
    await reorderCuratedPlaylistSongs(playlist.id, next.map(s => s.id));
  };

  /**
   * Play/pause toggle:
   *   - If a track from this playlist is currently playing → pause it.
   *   - Else → start the playlist. Shuffles URIs first if shuffle is on.
   */
  const handlePlayOrPause = async () => {
    if (starting) return;
    if (songs.length === 0) { Alert.alert("Nothing to play", "Add some songs first."); return; }
    setStarting(true);
    try {
      const token = await getValidSpotifyToken(currentUserId ?? userId);
      if (!token) {
        openSpotifyLink("spotify:", "https://open.spotify.com/");
        return;
      }
      if (isThisPlaylistPlaying) {
        await setPlayback(token, false);
        return;
      }
      let uris = songs.map(s => `spotify:track:${s.spotify_track_id}`);
      if (shuffleOn) {
        // Fisher–Yates so the first track is uniformly random — Spotify starts
        // from uris[0] so this controls which song plays first.
        uris = [...uris];
        for (let i = uris.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [uris[i], uris[j]] = [uris[j], uris[i]];
        }
      }
      const result = await playTracks(token, uris);
      if (!result.ok) {
        if (result.reason === "no-device") {
          openSpotifyLink("spotify:", "https://open.spotify.com/");
        } else {
          Alert.alert("Couldn't start playback", result.message ?? "Try opening Spotify and try again.");
        }
      }
    } finally {
      setStarting(false);
    }
  };

  const totalMs = songs.reduce((acc, s) => acc + (s.duration_ms ?? 0), 0);

  return (
    <Modal transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.screen, { transform: [{ translateX: slideX }] }]}
        {...panHandlers}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          scrollEnabled={!scrollLocked}
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        >
          {/* ── Full-bleed hero ── */}
          <View style={[styles.hero, { paddingTop: insets.top }]}>
            {playlist.image_url ? (
              <CachedImage source={{ uri: playlist.image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : songs.length > 0 ? (
              <View style={[StyleSheet.absoluteFill, { flexDirection: "row", flexWrap: "wrap" }]}>
                {songs.slice(0, 4).map((s, i) =>
                  s.album_art ? (
                    <CachedImage key={s.id} source={{ uri: s.album_art }} style={styles.mosaicCell} resizeMode="cover" />
                  ) : (
                    <View key={s.id} style={[styles.mosaicCell, { backgroundColor: i % 2 ? "#2a2a2a" : "#1a1a1a" }]} />
                  )
                )}
              </View>
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: "#1a1a1a" }]} />
            )}

            <LinearGradient
              colors={["transparent", "rgba(15,20,26,0.4)", "#0F141A"]}
              locations={[0, 0.75, 1]}
              style={styles.heroGradient}
              pointerEvents="none"
            />

            <View style={[styles.heroTopBar, { top: insets.top + 8 }]}>
              <TouchableOpacity style={styles.iconCircle} onPress={close} activeOpacity={0.8}>
                <Ionicons name="chevron-back" size={20} color="#fff" />
              </TouchableOpacity>
              {isOwner && (
                <TouchableOpacity
                  style={styles.iconCircle}
                  onPress={() => setShowEdit(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="pencil" size={16} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ── Title + meta ── */}
          <View style={styles.metaBlock}>
            <Text style={styles.bigTitle} numberOfLines={2}>{playlist.name}</Text>
            {playlist.description ? (
              <Text style={styles.description} numberOfLines={3}>{playlist.description}</Text>
            ) : null}
            <View style={styles.metaRow}>
              <FontAwesome5 name="spotify" size={12} color={ACCENT} />
              <Text style={styles.metaText}>
                Spotify  |  {songs.length} Song{songs.length !== 1 ? "s" : ""}
                {totalMs > 0 ? `  |  ${formatDuration(totalMs)}` : ""}
              </Text>
            </View>

            {isOwner && (
              <TouchableOpacity
                style={[styles.profileBtn, showOnProfile && styles.profileBtnOn]}
                onPress={toggleShowOnProfile}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={showOnProfile ? "checkmark-circle" : "ellipse-outline"}
                  size={14}
                  color={showOnProfile ? ACCENT : "rgba(255,255,255,0.55)"}
                />
                <Text style={[styles.profileBtnText, showOnProfile && { color: ACCENT }]}>
                  {showOnProfile ? "Showing on profile" : "Show on profile"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Action row ── */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              activeOpacity={0.7}
              onPress={() => setShuffleOn(v => !v)}
            >
              <Ionicons
                name="shuffle"
                size={22}
                color={shuffleOn ? ACCENT : "rgba(255,255,255,0.85)"}
              />
              {shuffleOn && <View style={styles.shuffleDot} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
              <Ionicons name="heart-outline" size={22} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
              <Ionicons name="arrow-down-circle-outline" size={22} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
            {isOwner && (
              <TouchableOpacity
                style={styles.actionBtn}
                activeOpacity={0.7}
                onPress={() => setShowAddSong(true)}
              >
                <Ionicons name="add-circle-outline" size={24} color="rgba(255,255,255,0.85)" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.actionBtn}
              activeOpacity={0.7}
              onPress={() => setShowOptions(true)}
            >
              <Ionicons name="ellipsis-vertical" size={20} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
          </View>

          {/* ── Song list (reorderable for owner) ── */}
          {songsLoading ? (
            <ActivityIndicator color={ACCENT} style={{ marginTop: 32 }} />
          ) : songs.length === 0 ? (
            <View style={{ alignItems: "center", paddingTop: 40 }}>
              <Text style={styles.emptyTitle}>No songs yet</Text>
              {isOwner && <Text style={styles.emptySub}>Tap + above to add tracks</Text>}
            </View>
          ) : (
            <ReorderableSongList
              songs={songs}
              isOwner={isOwner}
              activeSongId={activeSongId}
              onReorder={handleReorder}
              onOpenTrack={(s) => openTrackInSpotify(s.spotify_track_id)}
              onDelete={(s) => deleteSong(s.id)}
              setScrollLocked={setScrollLocked}
            />
          )}
        </ScrollView>

      </Animated.View>

      {/* Floating play / pause — direct child of the Modal so nothing scrolls
          it. Positioned in screen-space; uses insets so it sits relative to
          the hero (height 380) without drifting on tall vs. short devices. */}
      <TouchableOpacity
        style={[
          styles.floatingPlay,
          { top: insets.top + 320 },
        ]}
        activeOpacity={0.85}
        onPress={handlePlayOrPause}
        disabled={starting || songs.length === 0}
      >
        {starting
          ? <ActivityIndicator size="small" color="#fff" />
          : <Ionicons
              name={isThisPlaylistPlaying ? "pause" : "play"}
              size={24}
              color="#fff"
              style={{ marginLeft: isThisPlaylistPlaying ? 0 : 3 }}
            />}
      </TouchableOpacity>

      {showAddSong && (
        <AddSongDialog
          playlistId={playlist.id}
          userId={userId}
          onClose={() => { setShowAddSong(false); loadSongs(); }}
          onAdded={loadSongs}
        />
      )}

      {showEdit && isOwner && (
        <EditPlaylistOverlay
          playlist={playlist}
          userId={currentUserId ?? userId}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => { onUpdated(updated); setShowEdit(false); }}
        />
      )}

      {showOptions && (
        <PlaylistOptionsOverlay
          playlist={playlist}
          isOwner={isOwner}
          onClose={() => setShowOptions(false)}
          onEdit={() => { setShowOptions(false); setShowEdit(true); }}
          onDeleted={() => { setShowOptions(false); (onDeleted ?? onClose)(); }}
        />
      )}
    </Modal>
  );
}

/**
 * Reorderable song list. Each row has a drag handle on the right (≡ icon)
 * that only the owner sees. When the owner drags the handle:
 *   - the row "lifts" (scales + raises z-index)
 *   - other rows shift out of the way to indicate the drop slot
 *   - on release, the array is permuted and persisted
 *
 * Implementation:
 *   - List rendered as absolute-positioned children inside a sized View, so we
 *     can shift them precisely with translateY without disrupting native layout.
 *   - PanResponder lives on the drag handle, not the whole row, so taps on the
 *     row (to open Spotify) and on the trash icon (to delete) still work.
 *   - `setScrollLocked(true)` while dragging so the parent ScrollView doesn't
 *     steal the vertical gesture.
 */
function ReorderableSongList({
  songs, isOwner, activeSongId, onReorder, onOpenTrack, onDelete, setScrollLocked,
}: {
  songs: CuratedSong[];
  isOwner: boolean;
  activeSongId: string | null;
  onReorder: (next: CuratedSong[]) => void;
  onOpenTrack: (s: CuratedSong) => void;
  onDelete: (s: CuratedSong) => void;
  setScrollLocked: (v: boolean) => void;
}) {
  // Local mirror so we can permute on the fly without waiting for the parent
  // round-trip to settle.
  const [list, setList] = useState(songs);
  useEffect(() => { setList(songs); }, [songs]);

  // All drag state lives in refs so PanResponder callbacks (captured once via
  // useRef) read fresh values. Storing draggingId / hoverIdx in state alone
  // gave us stale-closure bugs: the responder captured an old empty `list`
  // at first render and findIndex returned -1 forever after.
  const listRef = useRef(list);
  useEffect(() => { listRef.current = list; }, [list]);

  const dragStateRef = useRef<{
    id: string; originalIdx: number; currentHover: number;
  } | null>(null);
  const dragOffsetY = useRef(new Animated.Value(0)).current;

  // Bump this to force a re-render whenever the drag visual needs to update
  // (start, hover-change, end). Ref-only state wouldn't paint.
  const [, setDragVersion] = useState(0);
  const bump = () => setDragVersion(v => v + 1);

  const startDrag = (id: string) => {
    const originalIdx = listRef.current.findIndex(s => s.id === id);
    if (originalIdx < 0) return;
    dragStateRef.current = { id, originalIdx, currentHover: originalIdx };
    dragOffsetY.setValue(0);
    setScrollLocked(true);
    bump();
  };

  const moveDrag = (dy: number) => {
    const drag = dragStateRef.current;
    if (!drag) return;
    dragOffsetY.setValue(dy);
    const next = Math.min(
      listRef.current.length - 1,
      Math.max(0, drag.originalIdx + Math.round(dy / ROW_TOTAL))
    );
    if (next !== drag.currentHover) {
      drag.currentHover = next;
      bump();
    }
  };

  const endDrag = () => {
    const drag = dragStateRef.current;
    setScrollLocked(false);
    if (!drag) return;
    if (drag.currentHover !== drag.originalIdx) {
      const next = [...listRef.current];
      const [moved] = next.splice(drag.originalIdx, 1);
      next.splice(drag.currentHover, 0, moved);
      setList(next);
      onReorder(next);
    }
    dragStateRef.current = null;
    dragOffsetY.setValue(0);
    bump();
  };

  const drag = dragStateRef.current;

  return (
    <View style={{ height: list.length * ROW_TOTAL }}>
      {list.map((song, idx) => {
        const isDragging = drag?.id === song.id;

        // For non-dragging rows, compute their visual shift to make room for
        // the dragged row at `currentHover`. Natural top is idx * ROW_TOTAL.
        let shiftY = 0;
        if (drag && !isDragging) {
          const { originalIdx: orig, currentHover: hover } = drag;
          if (hover > orig && idx > orig && idx <= hover) shiftY = -ROW_TOTAL;
          else if (hover < orig && idx < orig && idx >= hover) shiftY = ROW_TOTAL;
        }

        return (
          <Animated.View
            key={song.id}
            style={[
              styles.rowWrap,
              { top: idx * ROW_TOTAL, height: ROW_H },
              isDragging
                ? {
                    transform: [{ translateY: dragOffsetY }, { scale: 1.03 }],
                    zIndex: 50, elevation: 12,
                  }
                : { transform: [{ translateY: shiftY }], zIndex: 1 },
            ]}
          >
            <SongRow
              song={song}
              isOwner={isOwner}
              isDragging={isDragging}
              isActive={song.id === activeSongId}
              onPress={() => onOpenTrack(song)}
              onDelete={() => onDelete(song)}
              onDragStart={() => startDrag(song.id)}
              onDragMove={moveDrag}
              onDragEnd={endDrag}
            />
          </Animated.View>
        );
      })}
    </View>
  );
}

function SongRow({
  song, isOwner, isDragging, isActive, onPress, onDelete, onDragStart, onDragMove, onDragEnd,
}: {
  song: CuratedSong;
  isOwner: boolean;
  isDragging: boolean;
  isActive: boolean;
  onPress: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragMove: (dy: number) => void;
  onDragEnd: () => void;
}) {
  // PanResponder is created once via useRef so the iOS responder system has
  // a stable identity. To avoid stale closures, we route through a ref that
  // always holds the latest callbacks from the most recent render.
  const cbs = useRef({ onDragStart, onDragMove, onDragEnd });
  cbs.current.onDragStart = onDragStart;
  cbs.current.onDragMove = onDragMove;
  cbs.current.onDragEnd = onDragEnd;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => cbs.current.onDragStart(),
      onPanResponderMove: (_e, g) => cbs.current.onDragMove(g.dy),
      onPanResponderRelease: () => cbs.current.onDragEnd(),
      onPanResponderTerminate: () => cbs.current.onDragEnd(),
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  return (
    <TouchableOpacity
      style={[
        styles.songCard,
        isActive && styles.songCardActive,
        isDragging && styles.songCardDragging,
      ]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      {/* Active-state band: rendered FIRST so it paints BEHIND the text and
          album art. The gradient + waveform act as a background tint; the
          actual row content stays fully readable on top. */}
      {isActive && (
        <View pointerEvents="none" style={styles.activeBand}>
          <LinearGradient
            colors={["rgba(29,185,84,0)", "rgba(29,185,84,0.25)", "rgba(29, 185, 84, 0.15)"]}
            locations={[0, 0.35, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.gradientZone}
          />
          <View style={styles.waveSlot}>
            <TetrisWaveform />
          </View>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.songTitle} numberOfLines={1}>{song.track_name}</Text>
        <Text style={styles.songArtist} numberOfLines={1}>{song.track_artist}</Text>
      </View>
      <View style={styles.artWrap}>
        {song.album_art ? (
          <CachedImage source={{ uri: song.album_art }} style={styles.songArt} />
        ) : (
          <View style={[styles.songArt, styles.songArtFallback]}>
            <FontAwesome5 name="music" size={14} color="rgba(255,255,255,0.3)" />
          </View>
        )}
      </View>
      {isOwner && (
        <TouchableOpacity
          onPress={onDelete}
          hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}
          style={{ marginLeft: 6 }}
        >
          <Ionicons name="trash-outline" size={18} color="rgba(255,255,255,0.25)" />
        </TouchableOpacity>
      )}
      {isOwner && (
        <View {...pan.panHandlers} style={styles.dragHandle}>
          <Ionicons name="reorder-three" size={22} color="rgba(255,255,255,0.4)" />
        </View>
      )}

    </TouchableOpacity>
  );
}

/**
 * Tetris-style waveform — rotated 90° clockwise from a classic EQ meter, so
 * each "bar" is a horizontal row of square blocks growing left-to-right. The
 * leftmost block of each row is the base (loud, bright neon), the rightmost
 * is the peak (light → white). Five rows stack vertically.
 *
 * The base column (left edge) is meant to sit flush against the bright tip
 * of the gradient — the waveform reads as the gradient "continuing" into the
 * physical bars instead of being a separate decoration.
 */
const TOTAL_BLOCKS = 6;
const BLOCK_W = 9;
const BLOCK_H = 12;
const BLOCK_GAP = 2;

// Colour per block index counted from the BASE (left). Lower indices are the
// loud / bright part of the signal, higher are the peak.
const BLOCK_COLOURS = [
  "#004d176b", // 0 — base, bright neon
  "#1db95465", // mid spotify green
  "#3fcc7565", // brighter mid
  "#005c1dda", // light mint
  "#00250ba6", // pale
  "#01942dc7", // near white
  "#ffffff7c", // peak
];

function TetrisWaveform() {
  return (
    <View style={styles.waveformStack} pointerEvents="none">
      <WaveBarH minLevel={3} maxLevel={6} period={620} delay={40} />
      <WaveBarH minLevel={2} maxLevel={5} period={580} delay={180} />
      <WaveBarH minLevel={4} maxLevel={7} period={700} delay={60} />
      <WaveBarH minLevel={2} maxLevel={4} period={540} delay={120} />
      <WaveBarH minLevel={1} maxLevel={3} period={640} delay={0} />
    </View>
  );
}

// Sine-eased at both endpoints so there's no abrupt reversal at min/max —
// velocity tapers to zero before flipping direction.
const SIN_INOUT = Easing.inOut(Easing.sin);

function WaveBarH({ minLevel, maxLevel, period, delay }: {
  minLevel: number; maxLevel: number; period: number; delay: number;
}) {
  // Smoothly oscillates between min and max. The block opacity interpolation
  // below is widened (5-point curve over ±1 around each index) so adjacent
  // blocks overlap in their fade ramps — no popping when the level crosses
  // an integer boundary.
  const level = useRef(new Animated.Value(minLevel)).current;
  useEffect(() => {
    const half = period / 2;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(level, {
          toValue: maxLevel, duration: half,
          easing: SIN_INOUT, useNativeDriver: false,
        }),
        Animated.timing(level, {
          toValue: minLevel, duration: half,
          easing: SIN_INOUT, useNativeDriver: false,
        }),
      ])
    );
    const t = setTimeout(() => loop.start(), delay);
    return () => { clearTimeout(t); loop.stop(); };
  }, []);

  return (
    <View style={styles.waveRowH}>
      {Array.from({ length: TOTAL_BLOCKS }).map((_, idx) => {
        // 5-point ease over ±1 around each index — blocks ramp through
        // neighbouring states gradually instead of toggling on at idx.
        const opacity = level.interpolate({
          inputRange: [idx - 1, idx - 0.5, idx, idx + 0.5, idx + 1],
          outputRange: [0, 0.25, 0.55, 0.85, 1],
          extrapolate: "clamp",
        });
        return (
          <Animated.View
            key={idx}
            style={{
              width: BLOCK_W,
              height: BLOCK_H,
              marginRight: BLOCK_GAP,
              backgroundColor: BLOCK_COLOURS[idx],
              opacity,
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#0F141A" },

  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: {
    width: "100%", height: 380,
    backgroundColor: "#1a1a1a",
    position: "relative", overflow: "hidden",
  },
  mosaicCell: { width: "50%", height: "50%" },
  heroGradient: { position: "absolute", left: 0, right: 0, bottom: 0, height: 140 },
  heroTopBar: {
    position: "absolute", left: 16, right: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  iconCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  floatingPlay: {
    position: "absolute", right: 18,
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: ACCENT,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 8,
    zIndex: 9999, elevation: 30,
  },

  // ── Title + meta ──────────────────────────────────────────────────────────
  metaBlock: { paddingHorizontal: 22, paddingTop: 38, paddingBottom: 14 },
  bigTitle: { fontSize: 26, fontWeight: "800", color: "#fff", letterSpacing: -0.3, marginBottom: 6 },
  description: { fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 18, marginBottom: 10 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  metaText: { fontSize: 13, color: "rgba(255,255,255,0.55)", fontWeight: "500" },
  profileBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    marginTop: 12,
  },
  profileBtnOn: {
    backgroundColor: "rgba(29,185,84,0.14)",
    borderColor: "rgba(29,185,84,0.55)",
  },
  profileBtnText: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.7)" },

  // ── Action row ────────────────────────────────────────────────────────────
  actionRow: { flexDirection: "row", paddingHorizontal: 14, paddingVertical: 14, marginBottom: 8 },
  actionBtn: { flex: 1, alignItems: "center", justifyContent: "center" },

  // ── Song row ──────────────────────────────────────────────────────────────
  rowWrap: { position: "absolute", left: 0, right: 0 },
  songCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    paddingLeft: 16, paddingRight: 8, paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#1B232B",
    borderWidth: 1.5, borderColor: "transparent",
    gap: 12,
    height: ROW_H,
  },
  songCardDragging: {
    borderColor: "rgba(29,185,84,0.6)",
    backgroundColor: "#1F2A33",
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 12,
  },
  // The card itself stays a base dark — the green band + waveform paint over.
  songCardActive: {
    borderColor: ACCENT,
    overflow: "hidden",
  },
  // ── Active-state band: paints on top of everything in the row ──
  // Spans from roughly the middle of the row out to just before the drag
  // handle, so the gradient sits on the right half of the text/art area and
  // the waveform overlays the album art.
  activeBand: {
    position: "absolute",
    top: 0, bottom: 0,
    right: 64,     // ends just past the album art, before the trash/drag area
    width: 200,
  },
  // Gradient fills the left ~50% of the band, fading transparent → green.
  gradientZone: {
    position: "absolute",
    top: 0, bottom: 0,
    left: 0,
    right: 76,     // leaves a 76px slot for the waveform on the right
  },
  // Waveform sits on the right side of the band, overlapping the album art.
  // Its LEFT edge (the rotated "bottom") sits at the gradient's bright tip.
  waveSlot: {
    position: "absolute",
    top: 0, bottom: 0,
    right: 6,
    width: 70,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  // Dark scrim behind the waveform bars — they need contrast against bright
  // album art to remain readable.
  waveScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 6,
  },
  waveformStack: {
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "center",
  },
  // One horizontal bar of blocks.
  waveRowH: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: BLOCK_GAP,
    height: BLOCK_H,
  },
  // Tiny dot under the shuffle icon when active, to make the on-state obvious.
  shuffleDot: {
    position: "absolute",
    bottom: 6,
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: ACCENT,
  },
  songTitle: { fontSize: 15, fontWeight: "700", color: "#fff", marginBottom: 3 },
  songArtist: { fontSize: 12, color: "rgba(255,255,255,0.5)" },
  artWrap: { width: 50, height: 50, position: "relative" },
  songArt: { width: 50, height: 50, borderRadius: 8 },
  songArtFallback: {
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center", justifyContent: "center",
  },
  dragHandle: {
    paddingHorizontal: 6, paddingVertical: 12,
    alignItems: "center", justifyContent: "center",
  },

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyTitle: { color: "rgba(255,255,255,0.45)", fontSize: 15, fontWeight: "600" },
  emptySub: { color: "rgba(255,255,255,0.25)", fontSize: 13, marginTop: 6 },
});

// ─── Spotify playlist detail overlay ─────────────────────────────────────────
