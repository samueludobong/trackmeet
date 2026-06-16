import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, PanResponder } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { openSpotifyLink, seekPlayback } from "../../lib/spotify";
import { profileStyles } from "../../assets/styles/feed/localStyles";
import { type NowPlayingTrack } from "../../hooks/useNowPlaying";
import { type Gradient } from "../../hooks/albumColors";
import { type ActiveMeetForUser } from "../../services/meets";
import { BroadcastRow } from "../../components/feed/BroadcastRow";
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

  // `dragMs` shows the finger's position during drag. `holdMs` keeps the bar
  // pinned at the seeked target after release, until the next poll catches up
  // (so it doesn't snap back to the old position briefly). Both are simple
  // state, no per-frame ticker — that was the source of the flicker.
  const [dragMs, setDragMs] = useState<number | null>(null);
  const [holdMs, setHoldMs] = useState<number | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-clear the hold once the parent's liveProgressMs catches up (within
  // ~1.5s of the target) or 2.5s have passed, whichever comes first.
  useEffect(() => {
    if (holdMs == null) return;
    if (Math.abs(liveProgressMs - holdMs) < 1500) { setHoldMs(null); return; }
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => setHoldMs(null), 2500);
    return () => { if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; } };
  }, [holdMs, liveProgressMs]);

  const pan = useRef(
    PanResponder.create({
      // Don't grab plain taps — only commit when the user is clearly dragging
      // horizontally. This means a vertical-dominant motion that happens to
      // start on the bar still scrolls the page.
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_e, g) =>
        !!tokenRef.current && durRef.current > 0 &&
        Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      // Once we own the gesture, never let the parent ScrollView reclaim it —
      // a vertical wiggle mid-drag must not cancel the seek into a scroll.
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (e, g) => {
        // Capture the touch position relative to the bar at grant time. From
        // here on we drive the visual from g.dx (gesture distance), which is
        // platform-reliable, instead of trusting per-event locationX (which
        // can flicker on some Android devices).
        dragStartLocalX.current = e.nativeEvent.locationX - g.dx;
        const x = dragStartLocalX.current + g.dx;
        setDragMs(msFromX(x, trackWRef.current, durRef.current));
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
        // Hold the bar at the seeked position until the next poll lands.
        setHoldMs(target);
        const tok = tokenRef.current;
        if (!tok) return;
        try {
          await seekPlayback(tok, target);
          // Re-poll so liveProgressMs catches up faster than the regular 3s tick.
          setTimeout(() => { refresh(); }, 350);
        } catch {}
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
            <View style={profileStyles.npProgressTrack}>
              <View style={[profileStyles.npProgressFill, { width: `${progress * 100}%` as any }]}>
                <View style={profileStyles.npProgressThumb} />
              </View>
            </View>
          </View>
          <View style={profileStyles.npTimestamps}>
            <Text style={profileStyles.npTime}>{fmt(effectiveMs)}</Text>
            <Text style={profileStyles.npTime}>{fmt(track.durationMs)}</Text>
          </View>
        </View>
      </View>

      {!inMeet && <BroadcastRow />}

      {isHosting ? (
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
      )}

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
