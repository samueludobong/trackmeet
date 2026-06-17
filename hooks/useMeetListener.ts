import { useRef, useState, useEffect } from "react";
import { Animated, Keyboard, AppState } from "react-native";
import * as SecureStore from "expo-secure-store";
import { supabase } from "../lib/supabase";
import { openSpotifyLink, getValidSpotifyToken, setPlayback } from "../lib/spotify";
import { joinMeet, leaveMeet, getMeet, getActiveListenerCount, getMeetMessages, sendMeetMessage, meetRowToTrackState, getMeetTracks, meetSyncChannelName, type MeetMessage, type MeetSyncPayload, type MeetTrack, type MeetTrackState, type MeetRow } from "../services/meets";
import { syncListenerToHost, sanityCheckSync, expectedHostPosition, registerMeetSync, unregisterMeetSync, startTalkAudio, stopTalkAudio, restoreVolumeIfDucked } from "../lib/meetSync";
import { isTrackInAnyPlaylist } from "../services/playlists";
import { MEET_GUIDE_KEY } from "../constants/meets";
import { SH } from "../lib/feed/dimensions";
import { type FloatingReactionItem } from "../types/meets";
import { feedCache } from "../lib/feed/caches";

/** All listener-side state + realtime sync for joining and following a live meet. */
export function useMeetListener({ visible, onClose, meetId, userId, isPublic = false, minimized = false, onInfo, onExpand }: {
  visible: boolean; onClose: () => void; meetId: string | null; userId: string | null;
  isPublic?: boolean; minimized?: boolean; onExpand?: () => void;
  onInfo?: (info: { name: string; trackName: string | null; albumArt: string | null }) => void;
}) {
  const slideAnim = useRef(new Animated.Value(SH)).current;

  const [accessToken,   setAccessToken]   = useState<string | null>(null);
  const [meet,          setMeet]          = useState<MeetRow | null>(null);
  const [trackState,    setTrackState]    = useState<MeetTrackState | null>(null);
  const [host,          setHost]          = useState<{ username: string; display_name: string | null; avatar_url: string | null } | null>(null);
  const [listenerCount, setListenerCount] = useState(1);
  const [messages,      setMessages]      = useState<MeetMessage[]>([]);
  const [chatInput,     setChatInput]     = useState('');
  const [livePos,       setLivePos]       = useState(0);
  const [savedId,       setSavedId]       = useState<string | null>(null);
  const [pickerOpen,    setPickerOpen]    = useState(false);
  const [ended,         setEnded]         = useState(false);
  const [summary,       setSummary]       = useState<MeetTrack[] | null>(null);
  const [reactions,     setReactions]     = useState<FloatingReactionItem[]>([]);
  const reactChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const spawnReaction = (emoji: string) =>
    setReactions((prev) => [...prev.slice(-24), { id: ++feedCache.reactionSeq, emoji }]);
  const sendReaction = (emoji: string) => {
    spawnReaction(emoji);
    reactChannelRef.current?.send({ type: 'broadcast', event: 'reaction', payload: { emoji } });
  };
  const [showGuide,     setShowGuide]     = useState(false);
  const [dontShowGuide, setDontShowGuide] = useState(false);
  // Becomes true once the listener has kicked off playback in Spotify (by tapping
  // "Got it"). Until then we don't drive playback via the Web API — there's no
  // active device yet, so Web API play calls would 404.
  const [launched,      setLaunched]      = useState(false);

  // ── Slide in/out ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 180 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: SH, useNativeDriver: true, duration: 280 }).start();
    }
  }, [visible]);

  // Resolve a valid Spotify token for sync + save on open.
  useEffect(() => {
    if (!visible || !userId) return;
    getValidSpotifyToken(userId).then((t) => setAccessToken(t));
  }, [visible, userId]);

  // On open, decide whether to show the "we'll briefly open Spotify" explainer.
  // If the user previously checked "don't show again", skip straight to launch.
  useEffect(() => {
    if (!visible) return;
    let active = true;
    (async () => {
      const dismissed = await SecureStore.getItemAsync(MEET_GUIDE_KEY);
      if (!active) return;
      if (dismissed === '1') { setShowGuide(false); setLaunched(true); }
      else                   { setShowGuide(true);  setLaunched(false); }
    })();
    return () => { active = false; };
  }, [visible]);

  // Open Spotify to the host's current track exactly once per join, once we've
  // both passed the explainer (launched) and know what's playing. Opening the
  // app makes it the active Spotify device so the Web API can keep it in sync
  // when the user returns.
  const openedOnceRef = useRef(false);
  useEffect(() => {
    if (!visible) { openedOnceRef.current = false; return; }
    if (!launched || showGuide || !trackState?.id) return;
    if (openedOnceRef.current) return;
    openedOnceRef.current = true;
    openSpotifyLink(
      `spotify:track:${trackState.id}`,
      `https://open.spotify.com/track/${trackState.id}`,
    );
  }, [visible, launched, showGuide, trackState?.id]);

  const handleGotIt = async () => {
    if (dontShowGuide) { try { await SecureStore.setItemAsync(MEET_GUIDE_KEY, '1'); } catch {} }
    setShowGuide(false);
    setLaunched(true);
  };

  // ── Join + load + subscribe ────────────────────────────────────────────────
  useEffect(() => {
    if (!visible || !meetId) return;
    let active = true;

    (async () => {
      await joinMeet(meetId, isPublic);
      await registerMeetSync();
      const m = await getMeet(meetId);
      if (!active) return;
      if (m) {
        setMeet(m);
        setTrackState(meetRowToTrackState(m));
        const { data: h } = await supabase
          .from('users').select('username, display_name, avatar_url').eq('id', m.host_id).single();
        if (active) setHost(h ?? null);
      }
      getMeetMessages(meetId).then((msgs) => { if (active) setMessages(msgs); });
      getActiveListenerCount(meetId).then((c) => { if (active) setListenerCount(Math.max(c, 1)); });
    })();

    const channel = supabase
      .channel(`meet-listener-${meetId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'meets', filter: `id=eq.${meetId}` },
        ({ new: row }: any) => {
          if (!active) return;
          setMeet(row);
          setTrackState(meetRowToTrackState(row));
          if (row.is_live === false) setEnded(true);
        })
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'meet_messages', filter: `meet_id=eq.${meetId}` },
        async ({ new: row }: any) => {
          const { data: author } = await supabase
            .from('users').select('username, display_name, avatar_url').eq('id', row.user_id).single();
          if (active) setMessages((prev) =>
            prev.some((x) => x.id === row.id) ? prev : [...prev, { ...row, author: author ?? undefined }]);
        })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'meet_participants', filter: `meet_id=eq.${meetId}` },
        () => { getActiveListenerCount(meetId).then((c) => { if (active) setListenerCount(Math.max(c, 1)); }); })
      .on('broadcast', { event: 'reaction' }, ({ payload }: any) => {
        if (active && payload?.emoji) spawnReaction(payload.emoji);
      })
      .subscribe();

    reactChannelRef.current = channel;

    // Dedicated sync channel: the host pushes track-change / play-pause / 10s
    // tick events here without paying the DB write → postgres_changes round-trip
    // (~1s). On receive we extrapolate by (now - sentAtMs) so the position we
    // hand to the seeker matches where the host actually is right now, not
    // where it was when the broadcast left.
    const syncCh = supabase
      .channel(meetSyncChannelName(meetId))
      .on('broadcast', { event: 'sync' }, ({ payload }: any) => {
        if (!active || !payload) return;
        const p = payload as MeetSyncPayload;
        const elapsed = Math.max(0, Date.now() - p.sentAtMs);
        const adjustedPos = p.positionMs != null && p.isPlaying
          ? p.positionMs + elapsed
          : p.positionMs;
        // positionUpdatedAt = now (not p.sentAtMs) so the local progress ticker
        // and any downstream extrapolation start clean from this anchor.
        setTrackState({
          id: p.id, name: p.name, artist: p.artist, albumArt: p.albumArt,
          durationMs: p.durationMs, positionMs: adjustedPos,
          isPlaying: p.isPlaying, positionUpdatedAt: new Date().toISOString(),
          talkMode: p.talkMode,
        });
      })
      .subscribe();

    return () => {
      active = false;
      reactChannelRef.current = null;
      supabase.removeChannel(channel);
      supabase.removeChannel(syncCh);
    };
  }, [visible, meetId]);

  // Refs holding the freshest token + host state so the steady 5s sanity-check
  // interval below reads live values instead of a stale closure snapshot.
  const syncTokenRef = useRef(accessToken);
  const syncStateRef = useRef(trackState);
  syncTokenRef.current = accessToken;
  syncStateRef.current = trackState;
  const [inSync, setInSync] = useState(true);

  // If the viewer is actually this meet's host (e.g. they tapped their own meet
  // in the Meets list), NEVER run listener sync — it would seek the host's own
  // Spotify to match the row the host itself writes, fighting any manual seek
  // and rewinding playback in a loop. The host is the source of truth.
  const isHostViewer = !!meet && !!userId && meet.host_id === userId;

  // ── Event-driven sync ───────────────────────────────────────────────────────
  // Re-runs whenever trackState changes — and trackState now changes the moment
  // a host sync broadcast arrives (~100ms after the host's action), not on the
  // DB write round-trip (~1s). Drift-only + cooldown logic in sanityCheckSync
  // still prevents seek thrash on minor extrapolation noise.
  // Only runs after the listener has launched Spotify (so a device is active).
  useEffect(() => {
    if (!visible || !launched || ended || isHostViewer || !accessToken || !trackState) return;
    syncListenerToHost(accessToken, trackState);
  }, [visible, launched, ended, isHostViewer, accessToken, trackState?.id, trackState?.isPlaying, trackState?.talkMode, trackState?.positionUpdatedAt]);

  // ── Drift safety net (every 10s) ───────────────────────────────────────────
  // Steady-state sync is event-driven (broadcasts on track / play-pause re-anchor
  // immediately, then Spotify ticks forward at 1x on its own). This interval is
  // just a low-frequency backstop for the edge cases — throttled JS thread, a
  // dropped broadcast, a Spotify position hiccup. Threshold is 5s (set in
  // meetSync.ts), so normal clock skew + Spotify jitter never trips it.
  useEffect(() => {
    if (!visible || !launched || ended || isHostViewer) return;
    const check = async () => {
      const tok = syncTokenRef.current;
      const st  = syncStateRef.current;
      if (!tok || !st) return;
      const status = await sanityCheckSync(tok, st);
      setInSync(status.inSync);
      if (!status.inSync) {
        console.log(`[MeetSync] drift check — out of sync (${status.reason}` +
          (status.driftMs != null ? `, drift ${Math.round(status.driftMs)}ms` : '') +
          `)${status.corrected ? ' → corrected' : ''}`);
      }
    };
    const id = setInterval(check, 10_000);
    return () => clearInterval(id);
  }, [visible, launched, ended]);

  // ── Re-sync the moment the user returns to the app from Spotify ─────────────
  // This is what "comes back here and we'll handle the rest" means: when the app
  // foregrounds, snap the listener to the host's current position.
  useEffect(() => {
    if (!visible || !launched || ended || isHostViewer) return;
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && accessToken && trackState) {
        syncListenerToHost(accessToken, trackState);
      }
    });
    return () => sub.remove();
  }, [visible, launched, ended, isHostViewer, accessToken, trackState?.id, trackState?.isPlaying, trackState?.talkMode, trackState?.positionUpdatedAt]);

  // ── Talk-mode voice channel ─────────────────────────────────────────────────
  useEffect(() => {
    if (!visible || !meetId) return;
    if (trackState?.talkMode) startTalkAudio(meetId, false);
    else stopTalkAudio();
  }, [visible, meetId, trackState?.talkMode]);

  // ── Local progress ticker (extrapolates host position) ──────────────────────
  useEffect(() => {
    if (!visible || !trackState) return;
    const tick = () => setLivePos(expectedHostPosition(trackState));
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [visible, trackState?.id, trackState?.isPlaying, trackState?.positionUpdatedAt, trackState?.positionMs]);

  // When the host ends the meet: stop the listener's music (restoring volume
  // first in case the host was mid-talk), surface the room if it was minimized,
  // and load the tracklist so the listener gets the same end-of-meet summary.
  useEffect(() => {
    if (!ended || !meetId) return;
    onExpand?.();
    if (accessToken) {
      (async () => {
        await restoreVolumeIfDucked(accessToken);
        await setPlayback(accessToken, false);
      })();
    }
    getMeetTracks(meetId).then(setSummary);
  }, [ended, meetId, accessToken]);

  // Report lightweight display info up to the persistent mini-bar.
  useEffect(() => {
    if (!visible) return;
    onInfo?.({
      name: host?.display_name || host?.username || meet?.name || "Meet",
      trackName: trackState?.name ?? null,
      albumArt: trackState?.albumArt ?? null,
    });
  }, [visible, host?.username, host?.display_name, meet?.name, trackState?.name, trackState?.albumArt]);

  const handleSendChat = async () => {
    const body = chatInput.trim();
    if (!body || !meetId) return;
    setChatInput('');
    Keyboard.dismiss();
    const sent = await sendMeetMessage(meetId, body);
    if (sent) setMessages((prev) => prev.some((x) => x.id === sent.id) ? prev : [...prev, sent]);
  };

  // Reflect whether the currently-playing meet track is already in one of the
  // viewer's playlists.
  useEffect(() => {
    if (!userId || !trackState?.id) return;
    const id = trackState.id;
    let active = true;
    isTrackInAnyPlaylist(userId, id).then(v => { if (active && v) setSavedId(id); });
    return () => { active = false; };
  }, [userId, trackState?.id]);

  const handleSaveSong = () => {
    if (!trackState?.id || !userId) return;
    setPickerOpen(true);
  };

  const handleLeave = async () => {
    if (meetId) await leaveMeet(meetId);
    if (accessToken) await restoreVolumeIfDucked(accessToken);
    await unregisterMeetSync();
    await stopTalkAudio();
    setMeet(null); setTrackState(null); setMessages([]); setEnded(false); setSummary(null);
    setShowGuide(false); setLaunched(false); setDontShowGuide(false);
    openedOnceRef.current = false;
    onClose();
  };

  return { slideAnim, accessToken, setAccessToken, meet, setMeet, trackState, setTrackState, host, setHost, listenerCount, setListenerCount, messages, setMessages, chatInput, setChatInput, livePos, setLivePos, savedId, setSavedId, pickerOpen, setPickerOpen, ended, setEnded, summary, setSummary, reactions, setReactions, reactChannelRef, spawnReaction, sendReaction, showGuide, setShowGuide, dontShowGuide, setDontShowGuide, launched, setLaunched, openedOnceRef, handleGotIt, syncTokenRef, syncStateRef, inSync, setInSync, isHostViewer, handleSendChat, handleSaveSong, handleLeave };
}
