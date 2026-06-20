import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, PanResponder, Pressable } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { openSpotifyLink, seekPlayback } from "../../lib/spotify";
import { profileStyles } from "../../assets/styles/feed/localStyles";
import { type NowPlayingTrack } from "../../hooks/useNowPlaying";
import { type Gradient } from "../../hooks/albumColors";
import { type ActiveMeetForUser } from "../../services/meets";
import { BroadcastRow } from "../../components/feed/BroadcastRow";
import { MEETS_ENABLED } from "../../constants/featureFlags";
import { LyricsOverlay } from "./LyricsOverlay";
import { useNowPlayingCtx } from "../../lib/feed/contexts";

const fmt = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** Convert a tap/drag x-position on the progress track to a playback ms. */
const msFromX = (x: number, trackW: number, durMs: number): number => {
  if (!trackW || durMs <= 0) return 0;
  const frac = Math.min(1, Math.max(0, x / trackW));
  return frac * durMs;
};

/** The signed-in user's now-playing card on their profile, with meet-aware variants. */
export function ProfileNowPlayingCard({
  track, liveProgressMs, gradient, activeMeet, userId, accessToken, openHostMeet, openMeet, onStartMeet,
}: {
  track: NowPlayingTrack;
  liveProgressMs: number;
  gradient: Gradient;
  activeMeet: ActiveMeetForUser | null;
  userId: string | null;
  accessToken: string | null;
  openHostMeet?: ((id: string, name: string) => void) | null;
  openMeet?: ((id: string, isPublic?: boolean) => void) | null;
  onStartMeet: () => void;
}) {
  const [lyricsOpen, setLyricsOpen] = useState(false);

  // ── Draggable seek on the progress bar ──────────────────────────────────────
  // The PanResponder only claims a *horizontal* drag — vertical motion stays
  // with the page scroll. Once we own the gesture we never give it back, so
  // accidental vertical scrolling is impossible mid-drag. The seek API only
  // fires on release; during drag we just update the visual `dragMs`.
  const { refresh } = useNowPlayingCtx();
  const trackWRef = useRef(0);
  const dragStartLocalX = useRef(0);
  const durRef = useRef(track.durationMs);
  durRef.current = track.durationMs;
  const tokenRef = useRef(accessToken);
  tokenRef.current = accessToken;

  // `dragMs` shows the finger's position during drag/tap.
  // `holdMs` keeps the bar pinned at the seeked target until Spotify's
  // currently-playing endpoint catches up — that endpoint is eventually
  // consistent and can return the OLD progress for several seconds after a
  // seek, so we can't trust `liveProgressMs` immediately. We clear hold only
  // when `liveProgressMs` has actually arrived within ~1.5s of the target, or
  // after a generous 6s ceiling (in case the seek silently failed).
  const [dragMs, setDragMs] = useState<number | null>(null);
  const [holdMs, setHoldMs] = useState<number | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdStartedAt = useRef(0);

  useEffect(() => {
    if (holdMs == null) return;
    // Spotify reported a position close to where we asked — release the hold.
    if (Math.abs(liveProgressMs - holdMs) < 1500) {
      if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
      setHoldMs(null);
      return;
    }
    // Ceiling so the bar doesn't pin forever if Spotify never catches up.
    if (holdTimer.current) clearTimeout(holdTimer.current);
    const elapsed = Date.now() - holdStartedAt.current;
    holdTimer.current = setTimeout(() => setHoldMs(null), Math.max(0, 6000 - elapsed));
    return () => { if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; } };
  }, [holdMs, liveProgressMs]);

  // Compute target ms from the *current* X on the bar — used by both grant
  // (initial press) and release (final position).
  const targetMsAt = (x: number) => {
    const w = trackWRef.current;
    const dur = durRef.current;
    if (!w || dur <= 0) return 0;
    return Math.round(msFromX(x, w, dur));
  };

  const commitSeek = async (target: number) => {
    if (!trackWRef.current || durRef.current <= 0) return;
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
    holdStartedAt.current = Date.now();
    setHoldMs(target);
    const tok = tokenRef.current;
    if (!tok) return;
    try {
      await seekPlayback(tok, target);
      // Re-poll so liveProgressMs catches up faster than the regular 3s tick.
      setTimeout(() => { refresh(); }, 350);
    } catch {}
  };

  // Drag-to-seek. Plain taps go through to the inner <Pressable> below.
  // Vertical scrolls starting on the bar stay with the parent ScrollView
  // because we only claim on horizontal-dominant Move motion.
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_e, g) =>
        !!tokenRef.current && durRef.current > 0 &&
        Math.abs(g.dx) > 3 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
      // Once we claim the drag, never give it back — a vertical wiggle mid-drag
      // must not cancel into a scroll.
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (e, g) => {
        // Grant fires from Move here, so `locationX` is the current finger
        // position and `g.dx` is the cumulative motion since touch-down.
        // Reconstruct the original press point so subsequent Moves stay
        // anchored to it.
        dragStartLocalX.current = e.nativeEvent.locationX - g.dx;
        setDragMs(targetMsAt(e.nativeEvent.locationX));
      },
      onPanResponderMove: (_e, g) => {
        const x = dragStartLocalX.current + g.dx;
        setDragMs(targetMsAt(x));
      },
      onPanResponderRelease: async (_e, g) => {
        const x = dragStartLocalX.current + g.dx;
        const target = targetMsAt(x);
        setDragMs(null);
        await commitSeek(target);
      },
      onPanResponderTerminate: () => setDragMs(null),
    }),
  ).current;

  // Display priority: drag (finger) → hold (just-seeked) → live (real progress).
  const effectiveMs = dragMs ?? holdMs ?? liveProgressMs;
  const progress = track.durationMs > 0 ? Math.min(1, Math.max(0, effectiveMs / track.durationMs)) : 0;

  // Open the overlay immediately — the overlay handles its own load state, and
  // crucially the first-time-discovery celebration only fires inside that flow,
  // so deferring the open would skip it.
  const handleOpenLyrics = () => setLyricsOpen(true);

  const isHosting = !!activeMeet && activeMeet.meet.host_id === userId;
  const meetHost = activeMeet && !isHosting ? (activeMeet.host.display_name || activeMeet.host.username) : null;
  const inMeet = isHosting || !!meetHost;

  return (
    <LinearGradient
      colors={inMeet ? ["#2A0C3D", "#1A0820", "#0E070F"] : gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[profileStyles.nowPlayingCard, inMeet && profileStyles.nowPlayingCardMeet]}
    >
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
      <View style={profileStyles.npTopRow}>
        {track.albumArt ? (
          <CachedImage source={{ uri: track.albumArt }} style={profileStyles.npArt} />
        ) : (
          <View style={[profileStyles.npArt, profileStyles.npArtFallback]}>
            <Text style={profileStyles.npArtEmoji}>🎵</Text>
          </View>
        )}
        <View style={profileStyles.npInfo}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={[profileStyles.npTitle, { flex: 1 }]} numberOfLines={1}>{track.name}</Text>
            <TouchableOpacity
              onPress={handleOpenLyrics}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="chevron-expand-outline"
                size={20}
                color="rgba(255,255,255,0.7)"
              />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => openSpotifyLink(`spotify:artist:${track.artistId}`, `https://open.spotify.com/artist/${track.artistId}`)}
          >
            <Text style={[profileStyles.npArtist]} numberOfLines={1}>{track.artist}</Text>
          </TouchableOpacity>
          {/* Outer wrapper provides a tall invisible hit area so the 3px bar is
              easy to grab. Negative margins keep the visible layout the same.
              Visible track lives inside, untouched, at its original thickness. */}
          <View
            style={{ paddingVertical: 8, marginVertical: -8, justifyContent: "center" }}
            onLayout={(e) => { trackWRef.current = e.nativeEvent.layout.width; }}
            {...pan.panHandlers}
          >
            {/* Tap-to-seek. Drag is handled by the parent PanResponder, which
                claims on horizontal-dominant Move and overrides this press. */}
            <Pressable
              onPress={(e) => {
                if (!tokenRef.current || durRef.current <= 0) return;
                commitSeek(targetMsAt(e.nativeEvent.locationX));
              }}
            >
              <View style={profileStyles.npProgressTrack}>
                <View style={[profileStyles.npProgressFill, { width: `${progress * 100}%` as any }]}>
                  <View style={profileStyles.npProgressThumb} />
                </View>
              </View>
            </Pressable>
          </View>
          <View style={profileStyles.npTimestamps}>
            <Text style={profileStyles.npTime}>{fmt(effectiveMs)}</Text>
            <Text style={profileStyles.npTime}>{fmt(track.durationMs)}</Text>
          </View>
        </View>
      </View>

      {!inMeet && <BroadcastRow />}

      {MEETS_ENABLED && (isHosting ? (
        <TouchableOpacity style={profileStyles.startMeetBtn} activeOpacity={0.85} onPress={() => activeMeet && openHostMeet?.(activeMeet.meet.id, activeMeet.meet.name)}>
          <Ionicons name="headset" size={15} color="#fff" />
          <Text style={profileStyles.startMeetBtnText}>Return to your Meet</Text>
        </TouchableOpacity>
      ) : meetHost ? (
        <TouchableOpacity style={profileStyles.startMeetBtn} activeOpacity={0.85} onPress={() => activeMeet && openMeet?.(activeMeet.meet.id, activeMeet.isPublic)}>
          <Ionicons name="headset" size={15} color="#fff" />
          <Text style={profileStyles.startMeetBtnText}>Return to Meet</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={profileStyles.startMeetBtn} activeOpacity={0.85} onPress={onStartMeet}>
          <FontAwesome5 name="broadcast-tower" size={14} color="#fff" />
          <Text style={profileStyles.startMeetBtnText}>Start Meet</Text>
        </TouchableOpacity>
      ))}

      <LyricsOverlay
        visible={lyricsOpen}
        onClose={() => setLyricsOpen(false)}
        isOwner
        accessToken={accessToken}
        viewerId={userId}
        song={{
          id: track.id,
          name: track.name,
          artist: track.artist,
          albumArt: track.albumArt,
          durationMs: track.durationMs,
          progressMs: liveProgressMs,
          updatedAt: new Date().toISOString(),
        }}
      />
    </LinearGradient>
  );
}
