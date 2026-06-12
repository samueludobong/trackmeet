import { useRef, useState, useEffect } from "react";
import { Keyboard } from "react-native";
import { supabase } from "../lib/supabase";
import { setPlayback } from "../lib/spotify";
import { endMeet, getActiveListenerCount, getMeetMessages, sendMeetMessage, updateMeetTrack, setTalkMode, recordMeetTrack, getMeetTracks, getMeet, meetRowToTrackState, leaveMeet, setMeetDriver, endDmJamIfEmpty, type MeetMessage, type MeetTrack, type MeetTrackState } from "../services/meets";
import { syncListenerToHost } from "../lib/meetSync";
import { useNowPlayingCtx } from "../lib/feed/contexts";
import { type FloatingReactionItem } from "../types/meets";
import { feedCache } from "../lib/feed/caches";

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
  const lastWrittenRef = useRef<string | null>(null);

  // ── Co-control (jam) state ───────────────────────────────────────────────────
  const jamUserId = jam?.userId ?? null;
  const isJam = jamUserId != null;
  const [driverId, setDriverId] = useState<string | null>(null);
  const [followState, setFollowState] = useState<MeetTrackState | null>(null);
  const isDriver = !isJam || driverId === jamUserId;
  const isDriverRef = useRef(isDriver);
  isDriverRef.current = isDriver;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Claim the driver role — called before any local playback action so the
  // partner's client starts following us.
  const becomeDriver = () => {
    if (!isJam || !meetId) return;
    setDriverId(jamUserId);
    setMeetDriver(meetId, jamUserId!);
  };

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

  useEffect(() => {
    if (!visible || !meetId) return;
    let active = true;
    getMeetMessages(meetId).then((m) => { if (active) setMessages(m); });
    getActiveListenerCount(meetId).then((c) => { if (active) setListenerCount(Math.max(c, 1)); });
    // Seed the current driver + partner track for jams.
    if (isJam) getMeet(meetId).then((m) => {
      if (!active || !m) return;
      setDriverId(m.driver_id);
      setFollowState(meetRowToTrackState(m));
    });

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

    // Jam: follow the meet row so we learn who's driving + what they're playing.
    if (isJam) channel = channel.on("postgres_changes",
      { event: "UPDATE", schema: "public", table: "meets", filter: `id=eq.${meetId}` },
      ({ new: row }: any) => {
        if (!active) return;
        setDriverId(row.driver_id);
        setFollowState(meetRowToTrackState(row));
        if (row.is_live === false) onCloseRef.current();
      });

    channel.subscribe();
    reactChannelRef.current = channel;
    return () => { active = false; reactChannelRef.current = null; supabase.removeChannel(channel); };
  }, [visible, meetId, isJam]);

  useEffect(() => {
    if (!visible || !meetId || summary) return;
    const write = () => {
      // In a jam, only the current driver broadcasts their now-playing.
      if (isJam && !isDriverRef.current) return;
      const t = trackRef.current;
      if (!t) return;
      updateMeetTrack(meetId, {
        id: t.id, name: t.name, artist: t.artist, albumArt: t.albumArt,
        durationMs: t.durationMs, positionMs: progressRef.current, isPlaying: t.isPlaying,
      });
    };
    const id = setInterval(write, 2_000);
    return () => clearInterval(id);
  }, [visible, meetId, summary]);

  useEffect(() => {
    if (!visible || !meetId || summary || !track) return;
    // Jam: only the driver writes; when I become driver this re-runs (driverId
    // dep) and immediately takes over with my current track.
    if (isJam && driverId !== jamUserId) return;
    updateMeetTrack(meetId, {
      id: track.id, name: track.name, artist: track.artist, albumArt: track.albumArt,
      durationMs: track.durationMs, positionMs: liveProgressMs, isPlaying: track.isPlaying,
    });
    // Tracklist/summary is host-meet only — jams are personal, not recorded.
    if (!isJam && track.isPlaying && lastWrittenRef.current !== track.id) {
      lastWrittenRef.current = track.id;
      recordMeetTrack(meetId, { id: track.id, name: track.name, artist: track.artist, albumArt: track.albumArt });
    }
  }, [visible, meetId, summary, track?.id, track?.isPlaying, driverId]);

  // Jam follow: when I'm NOT the driver, match my Spotify to the partner's
  // playback (same mechanism the meet listener uses). Re-runs on every meet-row
  // update because followState changes.
  useEffect(() => {
    if (!isJam || !visible || summary) return;
    if (driverId === jamUserId) return; // I'm driving — don't follow
    const tok = getApiToken();
    if (!tok || !followState) return;
    syncListenerToHost(tok, followState);
  }, [isJam, visible, summary, driverId, followState?.id, followState?.isPlaying, followState?.positionUpdatedAt]);

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
    onClose();
  };

  return {
    track, liveProgressMs,
    listenerCount, messages, chatInput, setChatInput, talkOn, ending, summary, reactions,
    sendReaction, removeReaction, handleSendChat, handleToggleTalk, handleEndMeet, closeAll,
    // Jam co-control
    isJam, isDriver, becomeDriver,
  };
}
