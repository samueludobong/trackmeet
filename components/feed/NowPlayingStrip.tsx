import React, { useContext, useEffect, useRef, useState } from "react";
import { Modal, PanResponder, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CachedImage } from "../ui/CachedImage";
import { NowPlayingCtx } from "../../lib/feed/contexts";
import { AddToPlaylistSheet } from "../AddToPlaylistSheet";
import { isTrackInAnyPlaylist } from "../../services/playlists";
import { supabase } from "../../lib/supabase";
import { seekPlayback, setPlayback } from "../../lib/spotify";
import { type NowPlayingTrack } from "../../hooks/useNowPlaying";
import { shareStyles, styles } from "../../assets/styles/feed/NowPlayingStrip";

/**
 * Sticky now-playing strip that sits below the stories row and pins to the top
 * of the feed as the user scrolls past it. Mirrors the lyrics-overlay header
 * chip (album art + title · artist; device line below) plus a save / post
 * action group, with a draggable progress bar pinned to the bottom edge.
 */
export function NowPlayingStrip({
  onShareAsPost,
}: {
  /** Opens the feed's PostComposerSheet with the now-playing track pre-attached.
   *  Provided by FeedList → app/feed.tsx so the strip doesn't need to own the
   *  composer's modal state. */
  onShareAsPost?: (track: NowPlayingTrack) => void;
}) {
  const np = useContext(NowPlayingCtx);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const track = np?.track;
  const live = np?.liveProgressMs ?? 0;
  const accessToken = np?.accessToken ?? null;
  const refresh = np?.refresh;

  const [pickerOpen, setPickerOpen] = useState(false);
  const [shareOpen,  setShareOpen]  = useState(false);
  const [saved, setSaved] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  /** Hand off to the feed's full-screen post composer with this track seeded. */
  const handleShareAsPost = () => {
    if (!track) return;
    setShareOpen(false);
    onShareAsPost?.(track);
  };

  /** Skip the song-selection screen — the song is already known, so jump
   *  straight to the card-type picker that the regular story flow ends at.
   *  Also pause the user's Spotify playback so the music doesn't compete with
   *  the story-creation UI / preview audio while they're composing. */
  const handleShareAsStory = () => {
    if (!track) return;
    setShareOpen(false);
    if (accessToken) {
      setPlayback(accessToken, false).then(() => refresh?.()).catch(() => {});
    }
    router.push({
      pathname: "/story-card-picker",
      params: {
        songId: track.id,
        songName: track.name,
        songArtist: track.artist,
        songAlbumArt: track.albumArt ?? "",
      },
    });
  };

  // Look up if this song is already in any of the viewer's curated playlists.
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      const uid = user?.id ?? null;
      setUserId(uid);
      if (uid && track?.id) {
        setSaved(await isTrackInAnyPlaylist(uid, track.id));
      } else {
        setSaved(false);
      }
    })();
    return () => { active = false; };
  }, [track?.id]);

  // ── Draggable seek on the progress bar ──────────────────────────────────────
  // Only claims a *horizontal* drag so vertical scrolling through the feed
  // still works when the user's finger happens to land on the strip. Seek API
  // fires only on release; during drag we just update `dragMs` visually.
  const trackWRef = useRef(0);
  const dragStartLocalX = useRef(0);
  const durRef = useRef<number>(track?.durationMs ?? 0);
  durRef.current = track?.durationMs ?? 0;
  const tokenRef = useRef<string | null>(accessToken);
  tokenRef.current = accessToken;

  const [dragMs, setDragMs] = useState<number | null>(null);
  const [holdMs, setHoldMs] = useState<number | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear the hold once the parent's live progress catches up (within ~1.5s of
  // the target), or after 2.5s as a hard fallback.
  useEffect(() => {
    if (holdMs == null) return;
    if (Math.abs(live - holdMs) < 1500) { setHoldMs(null); return; }
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => setHoldMs(null), 2500);
    return () => { if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; } };
  }, [holdMs, live]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_e, g) =>
        !!tokenRef.current && durRef.current > 0 &&
        Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (e, g) => {
        dragStartLocalX.current = e.nativeEvent.locationX - g.dx;
        setDragMs(msFromX(dragStartLocalX.current + g.dx, trackWRef.current, durRef.current));
      },
      onPanResponderMove: (_e, g) => {
        const x = dragStartLocalX.current + g.dx;
        setDragMs(msFromX(x, trackWRef.current, durRef.current));
      },
      onPanResponderRelease: async (_e, g) => {
        const dur = durRef.current;
        const w = trackWRef.current;
        const x = dragStartLocalX.current + g.dx;
        const target = Math.round(msFromX(x, w, dur));
        setDragMs(null);
        if (!w || dur <= 0) return;
        setHoldMs(target);
        const tok = tokenRef.current;
        if (!tok) return;
        try {
          await seekPlayback(tok, target);
          setTimeout(() => { refresh?.(); }, 350);
        } catch {}
      },
      onPanResponderTerminate: () => setDragMs(null),
    }),
  ).current;

  if (!track || !track.isPlaying) return null;

  const effectiveMs = dragMs ?? holdMs ?? live;
  const progress = track.durationMs > 0 ? Math.min(1, Math.max(0, effectiveMs / track.durationMs)) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.contentRow}>
        {/* Left: art + title line + device line */}
        <View style={styles.left}>
          {track.albumArt ? (
            <CachedImage source={{ uri: track.albumArt }} style={styles.art} />
          ) : (
            <View style={[styles.art, styles.artFallback]}>
              <FontAwesome5 name="music" size={12} color="rgba(255,255,255,0.6)" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.titleLine} numberOfLines={1}>
              <Text style={styles.title}>{track.name}</Text>
              {track.artist ? <Text style={styles.dot}> · </Text> : null}
              {track.artist ? <Text style={styles.artist}>{track.artist}</Text> : null}
            </Text>
            {track.deviceName ? (
              <View style={styles.deviceRow}>
                <Ionicons name={deviceIconFor(track.deviceType)} size={11} color="#1DB954" />
                <Text style={styles.deviceText} numberOfLines={1}>{track.deviceName}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Right: save + post (post is a "coming soon" placeholder) */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.75}
            onPress={() => { if (userId && track.id) setPickerOpen(true); }}
            hitSlop={6}
          >
            <Ionicons
              name={saved ? "checkmark-circle" : "add-circle-outline"}
              size={26}
              color={saved ? "#1DB954" : "#fff"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.7}
            onPress={() => setShareOpen(true)}
            hitSlop={6}
          >
            <Ionicons name="create-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress line — pinned to the bottom edge, draggable to seek. The
          outer wrapper is a tall invisible hit area so the 2px bar is easy to
          grab without the parent FlatList stealing the gesture. */}
      <View
        style={styles.progressHit}
        onLayout={(e) => { trackWRef.current = e.nativeEvent.layout.width; }}
        {...pan.panHandlers}
      >
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
        </View>
      </View>

      <AddToPlaylistSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        userId={userId}
        track={track.id ? {
          id: track.id, name: track.name, artist: track.artist, albumArt: track.albumArt,
        } : null}
        onSavedChange={setSaved}
      />

      {/* Share modal — pinned near the strip (just below the status bar + navbar
          area) so it always appears at the top of the screen, even when the
          feed is scrolled and the strip is sticky. `Modal` is its own portal so
          we can't read scroll position from here; anchoring to safe-area insets
          keeps it visually next to the strip in every scroll state. */}
      <Modal transparent visible={shareOpen} animationType="fade" onRequestClose={() => setShareOpen(false)}>
        <Pressable style={[shareStyles.overlay, { paddingTop: insets.top + 64 }]} onPress={() => setShareOpen(false)}>
          <Pressable style={shareStyles.menu} onPress={(e) => e.stopPropagation()}>
            <TouchableOpacity style={shareStyles.row} activeOpacity={0.8} onPress={handleShareAsPost}>
              <View style={shareStyles.icon}>
                <Ionicons name="create-outline" size={18} color="#FF6C1A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={shareStyles.title}>Share as Post</Text>
                <Text style={shareStyles.sub}>Compose a post with this song attached</Text>
              </View>
            </TouchableOpacity>

            <View style={shareStyles.divider} />

            <TouchableOpacity style={shareStyles.row} activeOpacity={0.8} onPress={handleShareAsStory}>
              <View style={shareStyles.icon}>
                <FontAwesome5 name="bolt" size={15} color="#FF6C1A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={shareStyles.title}>Share as Story</Text>
                <Text style={shareStyles.sub}>Pick a card style — song's already selected</Text>
              </View>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const msFromX = (x: number, trackW: number, durMs: number): number => {
  if (!trackW || durMs <= 0) return 0;
  const frac = Math.min(1, Math.max(0, x / trackW));
  return frac * durMs;
};

/** Pick an Ionicons name that suits the active Spotify device category. */
function deviceIconFor(deviceType: string | null): keyof typeof Ionicons.glyphMap {
  switch ((deviceType ?? "").toLowerCase()) {
    case "smartphone": return "phone-portrait-outline";
    case "computer":   return "laptop-outline";
    case "speaker":    return "volume-medium-outline";
    case "tv":         return "tv-outline";
    case "tablet":     return "tablet-portrait-outline";
    case "automobile": return "car-outline";
    case "avr":
    case "stb":        return "hardware-chip-outline";
    case "game_console": return "game-controller-outline";
    default: return "bluetooth-outline";
  }
}
