import { useRef, useState, useEffect } from "react";
import { Animated, PanResponder, Keyboard, FlatList } from "react-native";
import { supabase } from "../lib/supabase";
import { getMessages, sendTextMessage, type ConversationInfo, type DbMessage } from "../services/messages";
import { SW } from "../lib/feed/dimensions";

/** Chat thread state: load + realtime messages, typing indicator, reply target, send + swipe-to-close. */
export function useChatDetail(conv: ConversationInfo, onClose: () => void) {
  const slideX = useRef(new Animated.Value(SW)).current;
  const [msgText,       setMsgText]    = useState("");
  const [msgs,          setMsgs]       = useState<DbMessage[]>([]);
  const [currentUserId, setCurUid]     = useState<string | null>(null);
  const [loading,       setLoading]    = useState(true);
  const [isOtherTyping, setOtherTyping]= useState(false);
  const [replyTo, setReplyTo]          = useState<{ id: string; preview: string; senderName: string } | null>(null);

  const flatRef          = useRef<FlatList<DbMessage>>(null);
  const channelRef       = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const userIdRef        = useRef<string | null>(null);
  const typingOutRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const otherTypingOutRef= useRef<ReturnType<typeof setTimeout> | null>(null);

  // Slide in + load messages + subscribe to realtime + broadcast
  useEffect(() => {
    Animated.spring(slideX, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }).start();

    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      userIdRef.current = user?.id ?? null;
      setCurUid(user?.id ?? null);
      const loaded = await getMessages(conv.conversationId);
      if (!active) return;
      setMsgs(loaded);
      setLoading(false);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 60);
    })();

    const ch = supabase
      .channel(`conv:${conv.conversationId}`)
      // Real-time new messages
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conv.conversationId}` },
        (payload) => {
          const msg = payload.new as DbMessage;
          setMsgs(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
          setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 60);
        })
      // Typing indicator (broadcast — no DB write needed)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId === userIdRef.current) return;
        setOtherTyping(payload.isTyping);
        clearTimeout(otherTypingOutRef.current ?? undefined);
        if (payload.isTyping) {
          otherTypingOutRef.current = setTimeout(() => setOtherTyping(false), 4000);
        }
      })
      .subscribe();

    channelRef.current = ch;

    return () => {
      active = false;
      clearTimeout(typingOutRef.current ?? undefined);
      clearTimeout(otherTypingOutRef.current ?? undefined);
      ch.unsubscribe();
      channelRef.current = null;
    };
  }, [conv.conversationId]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const broadcastTyping = (isTyping: boolean) => {
    if (!channelRef.current || !userIdRef.current) return;
    channelRef.current.send({
      type: 'broadcast', event: 'typing',
      payload: { userId: userIdRef.current, isTyping },
    });
  };

  const handleTextChange = (v: string) => {
    setMsgText(v);
    broadcastTyping(v.length > 0);
    clearTimeout(typingOutRef.current ?? undefined);
    if (v.length > 0) {
      typingOutRef.current = setTimeout(() => broadcastTyping(false), 2000);
    }
  };

  const handleClose = () => {
    Keyboard.dismiss();
    broadcastTyping(false);
    clearTimeout(typingOutRef.current ?? undefined);
    Animated.timing(slideX, { toValue: SW, duration: 260, useNativeDriver: true }).start(onClose);
  };

  // Swipe right to dismiss whole chat
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) => dx > 10 && dx > Math.abs(dy) * 2,
      onShouldBlockNativeResponder: () => false,
      onPanResponderMove: (_, { dx }) => { if (dx > 0) slideX.setValue(dx); },
      onPanResponderRelease: (_, { dx, vx }) => {
        if (dx > SW * 0.35 || vx > 0.8) handleClose();
        else Animated.spring(slideX, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }).start();
      },
    })
  ).current;

  const sendMessage = async () => {
    const text = msgText.trim();
    if (!text) return;
    setMsgText("");
    broadcastTyping(false);
    clearTimeout(typingOutRef.current ?? undefined);
    const reply = replyTo;
    setReplyTo(null);

    const tempId = `pending-${Date.now()}`;
    const optimistic: DbMessage = {
      id: tempId, conversation_id: conv.conversationId,
      sender_id: currentUserId ?? '', body: text, type: 'text',
      spotify_track_id: null, spotify_track_name: null,
      spotify_track_artist: null, spotify_album_art: null,
      reply_to_id: reply?.id ?? null,
      reply_to_preview: reply?.preview ?? null,
      created_at: new Date().toISOString(),
    };
    setMsgs(prev => [...prev, optimistic]);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 60);
    const result = await sendTextMessage(conv.conversationId, text, reply ?? undefined);
    if (result) setMsgs(prev => [...prev.filter(m => m.id !== tempId), result]);
  };

  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const otherName = conv.otherUser.display_name || conv.otherUser.username;
  const otherInitials = otherName.trim().split(/\s+/).map(p => p[0]?.toUpperCase() ?? '').slice(0, 2).join('');

  return { slideX, msgText, setMsgText, msgs, setMsgs, currentUserId, setCurUid, loading, setLoading, isOtherTyping, setOtherTyping, replyTo, setReplyTo, flatRef, channelRef, userIdRef, typingOutRef, otherTypingOutRef, broadcastTyping, handleTextChange, handleClose, pan, sendMessage, fmtTime, otherName, otherInitials };
}
