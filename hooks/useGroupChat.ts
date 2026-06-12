import { useRef, useState, useEffect } from "react";
import { Animated, PanResponder, Keyboard, FlatList } from "react-native";
import { supabase } from "../lib/supabase";
import {
  getGroupMessages, sendGroupTextMessage, getMyGroupRole,
  type GroupMessage, type GroupRole,
} from "../services/groupChats";
import { SW } from "../lib/feed/dimensions";

/** Group thread state: messages + realtime, role, reply target, send, swipe-to-close, autoscroll. */
export function useGroupChat(groupId: string, currentUserId: string | null, onClose: () => void) {
  const slideX = useRef(new Animated.Value(SW)).current;
  const [msgText, setMsgText] = useState("");
  const [msgs, setMsgs] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRole, setMyRole] = useState<GroupRole | null>(null);
  const [replyTo, setReplyTo] = useState<{ id: string; preview: string; senderName: string } | null>(null);

  const flatRef = useRef<FlatList<GroupMessage>>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const atBottomRef = useRef(true);

  const onScroll = (e: { nativeEvent: { layoutMeasurement: { height: number }; contentOffset: { y: number }; contentSize: { height: number } } }) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    atBottomRef.current = contentSize.height - (contentOffset.y + layoutMeasurement.height) < 120;
  };
  const scrollToBottom = (animated = true) => {
    atBottomRef.current = true;
    // Fire across a few frames — a freshly-added row isn't measured on the
    // first tick, so a single scrollToEnd lands short.
    requestAnimationFrame(() => flatRef.current?.scrollToEnd({ animated }));
    setTimeout(() => flatRef.current?.scrollToEnd({ animated }), 120);
  };
  // Stick to the newest message as content grows, only while at the bottom.
  const onContentSizeChange = () => {
    if (atBottomRef.current) flatRef.current?.scrollToEnd({ animated: false });
  };

  useEffect(() => {
    Animated.spring(slideX, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }).start();

    let active = true;
    (async () => {
      const [loaded, role] = await Promise.all([
        getGroupMessages(groupId),
        currentUserId ? getMyGroupRole(groupId, currentUserId) : Promise.resolve<GroupRole | null>(null),
      ]);
      if (!active) return;
      setMsgs(loaded);
      setMyRole(role);
      setLoading(false);
      // Pin to the newest message across a few frames as rows finish measuring.
      atBottomRef.current = true;
      [0, 120, 300].forEach((t) => setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), t));
    })();

    const ch = supabase
      .channel(`group:${groupId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "group_messages", filter: `group_id=eq.${groupId}` },
        (payload) => {
          const msg = payload.new as GroupMessage;
          // Realtime rows lack the joined sender — keep what we have; the roster
          // resolves names from members so a missing sender is fine.
          setMsgs((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
          if (atBottomRef.current) setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 60);
        })
      .on("postgres_changes",
        { event: "DELETE", schema: "public", table: "group_messages", filter: `group_id=eq.${groupId}` },
        (payload) => {
          const gone = payload.old as { id: string };
          setMsgs((prev) => prev.filter((m) => m.id !== gone.id));
        })
      .subscribe();
    channelRef.current = ch;

    return () => { active = false; ch.unsubscribe(); channelRef.current = null; };
  }, [groupId, currentUserId]);

  const handleClose = () => {
    Keyboard.dismiss();
    Animated.timing(slideX, { toValue: SW, duration: 260, useNativeDriver: true }).start(onClose);
  };

  // Edge swipe right to dismiss — tight left-edge band so a right-swipe further
  // into the screen replies to others' messages instead of closing.
  const wantsClose = (g: { dx: number; dy: number; moveX: number }) =>
    (g.moveX - g.dx) < 24 && g.dx > 6 && g.dx > Math.abs(g.dy) * 1.2;
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponderCapture: (_, g) => wantsClose(g),
      onMoveShouldSetPanResponder: (_, g) => wantsClose(g),
      onShouldBlockNativeResponder: () => false,
      onPanResponderMove: (_, { dx }) => { if (dx > 0) slideX.setValue(dx); },
      onPanResponderRelease: (_, { dx, vx }) => {
        if (dx > SW * 0.3 || vx > 0.45) handleClose();
        else Animated.spring(slideX, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }).start();
      },
    })
  ).current;

  const sendMessage = async () => {
    const text = msgText.trim();
    if (!text || !currentUserId) return;
    setMsgText("");
    const reply = replyTo;
    setReplyTo(null);

    const tempId = `pending-${Date.now()}`;
    const optimistic: GroupMessage = {
      id: tempId, group_id: groupId, sender_id: currentUserId, body: text, type: "text",
      spotify_track_id: null, spotify_track_name: null, spotify_track_artist: null, spotify_album_art: null,
      reply_to_id: reply?.id ?? null, reply_to_preview: reply?.preview ?? null,
      created_at: new Date().toISOString(),
    };
    setMsgs((prev) => [...prev, optimistic]);
    scrollToBottom();
    const result = await sendGroupTextMessage(groupId, text, reply ?? undefined);
    if (result) setMsgs((prev) => [...prev.filter((m) => m.id !== tempId), result]);
  };

  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return {
    slideX, msgText, setMsgText, msgs, setMsgs, loading, myRole, setMyRole,
    replyTo, setReplyTo, flatRef, atBottomRef, onScroll, scrollToBottom, onContentSizeChange,
    handleClose, pan, sendMessage, fmtTime,
  };
}
