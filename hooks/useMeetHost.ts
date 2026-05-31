import { useRef, useState, useEffect } from "react";
import { Keyboard } from "react-native";
import { supabase } from "../lib/supabase";
import { setPlayback } from "../lib/spotify";
import { endMeet, getActiveListenerCount, getMeetMessages, sendMeetMessage, updateMeetTrack, setTalkMode, recordMeetTrack, getMeetTracks, type MeetMessage, type MeetTrack } from "../services/meets";
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
  visible, meetId, accessToken, getApiToken, onClose,
}: {
  visible: boolean;
  meetId: string | null;
  accessToken: string | null;
  getApiToken: () => string | null;
  onClose: () => void;
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

    const channel = supabase
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
      })
      .subscribe();

    reactChannelRef.current = channel;
    return () => { active = false; reactChannelRef.current = null; supabase.removeChannel(channel); };
  }, [visible, meetId]);

  useEffect(() => {
    if (!visible || !meetId || summary) return;
    const write = () => {
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
    updateMeetTrack(meetId, {
      id: track.id, name: track.name, artist: track.artist, albumArt: track.albumArt,
      durationMs: track.durationMs, positionMs: liveProgressMs, isPlaying: track.isPlaying,
    });
    if (track.isPlaying && lastWrittenRef.current !== track.id) {
      lastWrittenRef.current = track.id;
      recordMeetTrack(meetId, { id: track.id, name: track.name, artist: track.artist, albumArt: track.albumArt });
    }
  }, [visible, meetId, summary, track?.id, track?.isPlaying]);

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
  };
}
