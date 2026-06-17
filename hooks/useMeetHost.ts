import { useRef, useState, useEffect } from "react";
import { Keyboard, AppState } from "react-native";
import { supabase } from "../lib/supabase";
import { setPlayback, openSpotifyLink, playTrackAt } from "../lib/spotify";
import { cacheJamTrack, getCachedJamTrack, clearJamTrack } from "../lib/jamCache";
import { endMeet, getActiveListenerCount, getMeetMessages, sendMeetMessage, updateMeetTrack, setTalkMode, recordMeetTrack, getMeetTracks, getMeet, meetRowToTrackState, leaveMeet, setMeetDriver, endDmJamIfEmpty, meetSyncChannelName, type MeetMessage, type MeetSyncPayload, type MeetTrack, type MeetTrackState } from "../services/meets";
import { syncListenerToHost } from "../lib/meetSync";
import { useNowPlayingCtx } from "../lib/feed/contexts";
import { type FloatingReactionItem } from "../types/meets";
import { feedCache } from "../lib/feed/caches";

// Jam continuous-drift correction is kept gentle (close to the meet listener's
// 2s/4s) so steady playback doesn't thrash with micro-seeks — that's what makes
// it feel graceful. Track changes / play-pause / seeks are applied immediately
// via the realtime broadcast below (not gated by these), so they still feel
// snappy. A slightly tighter drift than the meet keeps positions honest.
const JAM_SYNC_OPTS = { driftMs: 1800, cooldownMs: 4000 };

/**
 * All host-side state and side effects for a live meet: chat + reactions
 * realtime channel, listener count, the now-playing heartbeat broadcast, and
 * the end-meet flow. `getApiToken` resolves the Spotify token used to pause the
 * host's own playback when the meet ends.
 */
export function useMeetHost({
  visible, meetId, accessToken, getApiToken, onClose, jam,
}: {
  visible: boolean;
  meetId: string | null;
  accessToken: string | null;
  getApiToken: () => string | null;
  onClose: () => void;
  // Set for a co-controlled DM jam: `userId` is the viewer. In jam mode we only
  // write the heartbeat while we're the driver and otherwise follow the partner.
  jam?: { userId: string };
}) {
  const { track, liveProgressMs } = useNowPlayingCtx();
  const [listenerCount, setListenerCount] = useState(1);
  const [messages, setMessages] = useState<MeetMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [talkOn, setTalkOn] = useState(false);
  const [ending, setEnding] = useState(false);
  const [summary, setSummary] = useState<MeetTrack[] | null>(null);
  const [reactions, setReactions] = useState<FloatingReactionItem[]>([]);
  const reactChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  // Separate broadcast channel used by meet hosts (not jams) to push live sync
  // events to listeners with no DB round-trip. Jams keep using the jam-sync
  // event on reactChannelRef instead.
  const syncChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastWrittenRef = useRef<string | null>(null);

  // ── Co-control (jam) state ───────────────────────────────────────────────────
  const jamUserId = jam?.userId ?? null;
  const isJam = jamUserId != null;
  const [driverId, setDriverId] = useState<string | null>(null);
  const [followState, setFollowState] = useState<MeetTrackState | null>(null);
  // Set once we've opened Spotify to make THIS phone the active device — without
  // it the Web-API sync below can't play anything here (it 404s, no device).
  const [jamLaunched, setJamLaunched] = useState(false);
  // Last-good track frame, cached so the jam survives Spotify dropping to a
  // "no device" state (after pause). cachedTrackRef tracks it live; cachedTrack
  // (state) only holds it for display once the live device is gone.
  const [cachedTrack, setCachedTrack] = useState<MeetTrackState | null>(null);
  const cachedTrackRef = useRef<MeetTrackState | null>(null);
  const pendingResumeRef = useRef<{ id: string; positionMs: number } | null>(null);
  const isDriver = !isJam || driverId === jamUserId;
  const isDriverRef = useRef(isDriver);
  isDriverRef.current = isDriver;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  // Live refs so the foreground re-sync reads current values without re-subscribing.
  const driverIdRef = useRef(driverId);    driverIdRef.current = driverId;
  const followStateRef = useRef(followState); followStateRef.current = followState;
  // Once we've ever driven, our Spotify is the active device, so we can follow
  // without re-opening Spotify (avoids yanking the starter to Spotify on handoff).
  const hasDrivenRef = useRef(false);
  useEffect(() => { if (isJam && isDriver) hasDrivenRef.current = true; }, [isJam, isDriver]);

  // ── Stage control ────────────────────────────────────────────────────────────
  // Exactly one person holds the "stage" (= the driver) and can control playback.
  // It's a plain boolean handoff: take it only when it's free; the other can't
  // take it until the holder drops it.
  const setStage = (holder: string | null) => {
    setDriverId(holder);
    if (meetId) setMeetDriver(meetId, holder);
  };
  const takeStage = () => {
    if (!isJam || !meetId) return;
    if (driverId && driverId !== jamUserId) return; // held by the other person
    setStage(jamUserId);
  };
  const dropStage = () => {
    if (!isJam || !meetId || driverId !== jamUserId) return;
    setStage(null);
  };
  // Force-claim the stage (used by resume-from-cache, only reachable when I hold it).
  const becomeDriver = () => { if (isJam && meetId) setStage(jamUserId); };

  const spawnReaction = (emoji: string) =>
    setReactions((prev) => [...prev.slice(-24), { id: ++feedCache.reactionSeq, emoji }]);
  const sendReaction = (emoji: string) => {
    spawnReaction(emoji);
    reactChannelRef.current?.send({ type: "broadcast", event: "reaction", payload: { emoji } });
  };

  const trackRef = useRef(track);
  const progressRef = useRef(liveProgressMs);
  trackRef.current = track;
  progressRef.current = liveProgressMs;

  // Push a track state to the partner over the realtime channel — instant,
  // unlike the DB write → postgres_changes path (~seconds).
  const broadcastState = (state: MeetTrackState) => {
    reactChannelRef.current?.send({ type: "broadcast", event: "jam-sync", payload: state });
  };
  // Meet (non-jam) host → listeners broadcast. `sentAtMs` lets the listener
  // compensate for one-way channel latency when computing its seek target.
  const broadcastMeetSync = () => {
    const t = trackRef.current;
    if (!t || !syncChannelRef.current) return;
    const payload: MeetSyncPayload = {
      id: t.id, name: t.name, artist: t.artist, albumArt: t.albumArt,
      durationMs: t.durationMs, positionMs: progressRef.current,
      isPlaying: t.isPlaying, talkMode: false, sentAtMs: Date.now(),
    };
    syncChannelRef.current.send({ type: "broadcast", event: "sync", payload });
  };
  const liveState = (): MeetTrackState | null => {
    const t = trackRef.current;
    if (!t) return null;
    return {
      id: t.id, name: t.name, artist: t.artist, albumArt: t.albumArt,
      durationMs: t.durationMs, positionMs: progressRef.current,
      isPlaying: t.isPlaying, positionUpdatedAt: new Date().toISOString(), talkMode: false,
    };
  };

  useEffect(() => {
    if (!visible || !meetId) return;
    let active = true;
    getMeetMessages(meetId).then((m) => { if (active) setMessages(m); });
    getActiveListenerCount(meetId).then((c) => { if (active) setListenerCount(Math.max(c, 1)); });
    // Seed the current driver + partner track for jams, and recover any cached
    // last-good frame (e.g. the app was reopened while the device was idle).
    if (isJam) {
      getMeet(meetId).then((m) => {
        if (!active || !m) return;
        setDriverId(m.driver_id);
        setFollowState(meetRowToTrackState(m));
      });
      getCachedJamTrack().then((c) => {
        if (!active || !c) return;
        cachedTrackRef.current = c;
        if (!trackRef.current) setCachedTrack(c);
      });
    }

    let channel = supabase
      .channel(`meet-host-${meetId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "meet_messages", filter: `meet_id=eq.${meetId}` },
        async ({ new: row }: any) => {
          const { data: author } = await supabase
            .from("users").select("username, display_name, avatar_url").eq("id", row.user_id).single();
          if (active) setMessages((prev) =>
            prev.some((x) => x.id === row.id) ? prev : [...prev, { ...row, author: author ?? undefined }]);
        })
      .on("postgres_changes",
        { event: "*", schema: "public", table: "meet_participants", filter: `meet_id=eq.${meetId}` },
        () => { getActiveListenerCount(meetId).then((c) => { if (active) setListenerCount(Math.max(c, 1)); }); })
      .on("broadcast", { event: "reaction" }, ({ payload }: any) => {
        if (active && payload?.emoji) spawnReaction(payload.emoji);
      });

    // Jam: follow the meet row so we learn who's driving + meet lifecycle. The
    // driver_id change (control handoff) is authoritative here.
    if (isJam) channel = channel.on("postgres_changes",
      { event: "UPDATE", schema: "public", table: "meets", filter: `id=eq.${meetId}` },
      ({ new: row }: any) => {
        if (!active) return;
        setDriverId(row.driver_id);
        setFollowState(meetRowToTrackState(row)); // reliable fallback if a broadcast is dropped
        if (row.is_live === false) onCloseRef.current();
      });

    // Jam: the driver's live track/position arrives instantly via broadcast (no
    // DB round-trip), which is what makes the follower's playback feel in-sync.
    if (isJam) channel = channel.on("broadcast", { event: "jam-sync" }, ({ payload }: any) => {
      if (active && payload) setFollowState(payload as MeetTrackState);
    });

    channel.subscribe();
    reactChannelRef.current = channel;

    // Meets only: open a dedicated sync channel so we can push playback state
    // (track change / play-pause / 10s heartbeat) to listeners instantly. Jams
    // already do this over reactChannelRef via the jam-sync event.
    let syncCh: ReturnType<typeof supabase.channel> | null = null;
    if (!isJam) {
      syncCh = supabase.channel(meetSyncChannelName(meetId));
      syncCh.subscribe();
      syncChannelRef.current = syncCh;
    }

    return () => {
      active = false;
      reactChannelRef.current = null;
      supabase.removeChannel(channel);
      if (syncCh) { syncChannelRef.current = null; supabase.removeChannel(syncCh); }
    };
  }, [visible, meetId, isJam]);

  useEffect(() => {
    if (!visible || !meetId || summary) return;

    if (isJam) {
      // Jam: 2s cadence — broadcasts the driver's live frame to the partner over
      // jam-sync, and caches a last-good frame for the resume-from-idle path.
      const write = () => {
        if (!isDriverRef.current) return;
        const live = liveState();
        if (live) {
          updateMeetTrack(meetId, live);
          cachedTrackRef.current = live;
          broadcastState(live);
        } else if (cachedTrackRef.current) {
          // Device gone (e.g. paused → idle) → hold the jam on the last cached
          // frame, marked paused, so neither side drifts or goes blank.
          const paused: MeetTrackState = { ...cachedTrackRef.current, isPlaying: false };
          updateMeetTrack(meetId, paused);
          broadcastState(paused);
        }
      };
      const id = setInterval(write, 2_000);
      return () => clearInterval(id);
    }

    // Meet (non-jam): listeners' Spotify is ticking forward at 1x on its own,
    // so we don't need a fast heartbeat — events (track / play-pause) push
    // instantly via broadcastMeetSync in the effect below. This 10s loop is
    // just a slow safety net: refreshes the DB row (for late joiners reading a
    // snapshot) and emits a tick (for the listener's drift checker to anchor on).
    const tick = () => {
      const t = trackRef.current;
      if (!t) return;
      updateMeetTrack(meetId, {
        id: t.id, name: t.name, artist: t.artist, albumArt: t.albumArt,
        durationMs: t.durationMs, positionMs: progressRef.current, isPlaying: t.isPlaying,
      });
      broadcastMeetSync();
    };
    const id = setInterval(tick, 10_000);
    return () => clearInterval(id);
  }, [visible, meetId, summary, isJam]);

  useEffect(() => {
    if (!visible || !meetId || summary || !track) return;
    // Jam: only the driver writes; when I become driver this re-runs (driverId
    // dep) and immediately takes over with my current track.
    if (isJam && driverId !== jamUserId) return;
    updateMeetTrack(meetId, {
      id: track.id, name: track.name, artist: track.artist, albumArt: track.albumArt,
      durationMs: track.durationMs, positionMs: liveProgressMs, isPlaying: track.isPlaying,
    });
    if (isJam) {
      const live = liveState();
      if (live) { cachedTrackRef.current = live; broadcastState(live); } // lands on partner immediately
    } else {
      // Meet host: push the event over the sync channel so every listener can
      // re-anchor in ~100ms instead of waiting for the postgres_changes round-trip.
      broadcastMeetSync();
    }
    // Tracklist/summary is host-meet only — jams are personal, not recorded.
    if (!isJam && track.isPlaying && lastWrittenRef.current !== track.id) {
      lastWrittenRef.current = track.id;
      recordMeetTrack(meetId, { id: track.id, name: track.name, artist: track.artist, albumArt: track.albumArt });
    }
  }, [visible, meetId, summary, track?.id, track?.isPlaying, driverId]);

  // Jam activate: the FOLLOWER opens Spotify once to the current track so this
  // phone becomes the active device. Until this happens nothing plays here and
  // the Web-API sync below is a no-op (this is the "nothing happens on the
  // connecting device" fix). The driver never needs this — their own playback
  // is the source.
  useEffect(() => {
    if (!isJam || !visible || jamLaunched || hasDrivenRef.current) return;
    if (driverId === jamUserId) return;     // I'm the driver
    if (!followState?.id) return;            // nothing to play yet
    setJamLaunched(true);
    openSpotifyLink(
      `spotify:track:${followState.id}`,
      `https://open.spotify.com/track/${followState.id}`,
    );
  }, [isJam, visible, jamLaunched, driverId, followState?.id]);

  // Jam follow: once our device is active, match our Spotify to the driver's
  // playback (same mechanism the meet listener uses). Re-runs on every meet-row
  // update because followState changes.
  useEffect(() => {
    if (!isJam || !visible || summary) return;
    if (!jamLaunched && !hasDrivenRef.current) return; // no active device yet
    if (driverId === jamUserId) return; // I'm driving — don't follow
    const tok = getApiToken();
    if (!tok || !followState) return;
    syncListenerToHost(tok, followState, JAM_SYNC_OPTS);
  }, [isJam, visible, summary, jamLaunched, driverId, followState?.id, followState?.isPlaying, followState?.positionUpdatedAt]);

  // On returning from the Spotify app: a driver resuming from cache seeks to the
  // cached point (now that the device is active again); a follower re-snaps to
  // the driver's position.
  useEffect(() => {
    if (!isJam || !visible) return;
    const sub = AppState.addEventListener("change", (next) => {
      if (next !== "active") return;
      const tok = getApiToken();
      const pend = pendingResumeRef.current;
      if (pend) {
        pendingResumeRef.current = null;
        // Give Spotify a beat to register the device, then seek to the cached spot.
        if (tok) setTimeout(() => playTrackAt(tok, `spotify:track:${pend.id}`, pend.positionMs), 800);
        return;
      }
      if (driverIdRef.current === jamUserId) return;
      if (tok && followStateRef.current) syncListenerToHost(tok, followStateRef.current, JAM_SYNC_OPTS);
    });
    return () => sub.remove();
  }, [isJam, visible]);

  // Snapshot the last-good frame to storage the moment the device drops, and
  // reset it once a live track resumes — so storage only ever holds the frame
  // from just before the device left (never stale).
  useEffect(() => {
    if (!isJam) return;
    if (track) {
      setCachedTrack(null);
      clearJamTrack();
    } else if (cachedTrackRef.current) {
      setCachedTrack(cachedTrackRef.current);
      cacheJamTrack(cachedTrackRef.current);
    }
  }, [isJam, !!track]);

  // Resume a paused jam whose device went idle: reactivate Spotify on the cached
  // track and seek to the cached position (the AppState handler above finishes
  // the seek once Spotify is foregrounded). Becomes the driver so the partner
  // follows back into playback.
  const resumeFromCache = () => {
    // Driver uses their own cached frame; a follower (no local cache) falls back
    // to the partner's last state.
    const c = cachedTrackRef.current ?? cachedTrack ?? followStateRef.current;
    if (!c?.id) return;
    becomeDriver();
    pendingResumeRef.current = { id: c.id, positionMs: c.positionMs ?? 0 };
    openSpotifyLink(`spotify:track:${c.id}`, `https://open.spotify.com/track/${c.id}`);
  };

  const handleSendChat = async () => {
    const body = chatInput.trim();
    if (!body || !meetId) return;
    setChatInput("");
    Keyboard.dismiss();
    const sent = await sendMeetMessage(meetId, body);
    if (sent) setMessages((prev) => prev.some((x) => x.id === sent.id) ? prev : [...prev, sent]);
  };

  const handleToggleTalk = async () => {
    if (!meetId) return;
    const next = !talkOn;
    setTalkOn(next);
    await setTalkMode(meetId, next);
  };

  const handleEndMeet = async () => {
    if (!meetId || ending) return;
    setEnding(true);
    // Jam: "End" just leaves the jam (no summary). The jam ends for good only
    // once both members have left.
    if (isJam) {
      await leaveMeet(meetId);
      await endDmJamIfEmpty(meetId);
      setEnding(false);
      closeAll();
      return;
    }
    const tracks = await getMeetTracks(meetId);
    await endMeet(meetId);
    const endTok = getApiToken() ?? accessToken;
    if (endTok && track?.isPlaying) await setPlayback(endTok, false);
    setSummary(tracks);
    setEnding(false);
  };

  const removeReaction = (id: number) => setReactions((prev) => prev.filter((r) => r.id !== id));

  const closeAll = () => {
    setSummary(null);
    setTalkOn(false);
    setMessages([]);
    setJamLaunched(false);
    setDriverId(null);
    setFollowState(null);
    setCachedTrack(null);
    cachedTrackRef.current = null;
    pendingResumeRef.current = null;
    clearJamTrack();
    hasDrivenRef.current = false;
    onClose();
  };

  // What to show on screen: the live now-playing, else (in a jam) the cached
  // last-good frame — or the partner's state for a follower — so the room never
  // goes blank when a device idles.
  const displayTrack = track ?? (isJam ? (cachedTrack ?? followState) : null);

  return {
    track, liveProgressMs,
    listenerCount, messages, chatInput, setChatInput, talkOn, ending, summary, reactions,
    sendReaction, removeReaction, handleSendChat, handleToggleTalk, handleEndMeet, closeAll,
    // Jam co-control (stage)
    isJam, isDriver, driverId, takeStage, dropStage, becomeDriver,
    // Jam cache / resume
    cachedTrack, displayTrack, resumeFromCache,
  };
}
