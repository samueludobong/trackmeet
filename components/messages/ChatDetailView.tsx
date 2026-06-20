import React, { useCallback, useState, useEffect } from "react";
import { useChatDetail } from "../../hooks/useChatDetail";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Animated, TextInput, Platform, KeyboardAvoidingView, ActivityIndicator } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { sendSpotifyTrackMessage, sendSongMessage, sendTextMessage, getConversationSettings, type ConversationInfo, type ConversationSettings, type DbMessage } from "../../services/messages";
import { getActiveDmJam } from "../../services/meets";
import { supabase } from "../../lib/supabase";
import { useMusicLinkAttach } from "../../hooks/useMusicLinkAttach";
import { MEETS_ENABLED, SPOTIFY_ENABLED } from "../../constants/featureFlags";
import { chatStyles } from "../../assets/styles/feed/localStyles";
import { useOpenJam } from "../../lib/feed/contexts";
import { NowPlayingBanner } from "../../components/feed/NowPlayingBanner";
import { ParsedLinkChip } from "../../components/feed/ParsedLinkChip";
import { SpotifyTrackCard } from "../../components/messages/SpotifyTrackCard";
import { SwipeToReply } from "../../components/messages/SwipeToReply";
import { TypingBubble } from "../../components/messages/TypingBubble";
import { ChatSettingsScreen } from "./ChatSettingsScreen";

export function ChatDetailView({ conv, onClose }: { conv: ConversationInfo; onClose: () => void }) {
  const {
    slideX, msgText, setMsgText, msgs, setMsgs, currentUserId, setCurUid, loading, setLoading, isOtherTyping, setOtherTyping, replyTo, setReplyTo, flatRef, channelRef, userIdRef, typingOutRef, otherTypingOutRef, onScroll, scrollToBottom, onContentSizeChange, broadcastTyping, handleTextChange, handleClose, pan, sendMessage, fmtTime, otherName, otherInitials
  } = useChatDetail(conv, onClose);

  // Freeze the list's vertical scroll while a reply-swipe is in flight. Done
  // imperatively via the ref (no setState) so toggling it doesn't re-render the
  // whole list and hitch the very first frame of the swipe.
  const setSwiping = useCallback((active: boolean) => {
    flatRef.current?.setNativeProps({ scrollEnabled: !active });
  }, [flatRef]);

  // Paste-a-link song attachment (shared parser).
  const link = useMusicLinkAttach();

  // Send a pasted-link song as a chat song card (with any caption as a
  // follow-up text message); otherwise fall through to the normal text send.
  const handleChatSend = async () => {
    const al = link.attachedLink;
    if (!al) { sendMessage(); return; }
    const caption = msgText.trim();
    link.reset();
    setMsgText("");
    broadcastTyping(false);

    const tempId = `pending-song-${Date.now()}`;
    const optimistic: DbMessage = {
      id: tempId, conversation_id: conv.conversationId,
      sender_id: currentUserId ?? "", body: null, type: "spotify_track",
      spotify_track_id: al.spotifyId, spotify_track_name: al.name,
      spotify_track_artist: al.artist, spotify_album_art: al.albumArt,
      song_url: al.url, song_provider: al.provider, song_links: al.links,
      reply_to_id: null, reply_to_preview: null,
      created_at: new Date().toISOString(),
    };
    setMsgs((prev) => [...prev, optimistic]);
    scrollToBottom();
    const result = await sendSongMessage(conv.conversationId, {
      id: al.spotifyId, name: al.name, artist: al.artist, albumArt: al.albumArt,
      url: al.url, provider: al.provider, links: al.links,
    });
    if (result) setMsgs((prev) => [...prev.filter((m) => m.id !== tempId), result]);

    if (caption) {
      const capTemp = `pending-cap-${Date.now()}`;
      const capOpt: DbMessage = {
        id: capTemp, conversation_id: conv.conversationId,
        sender_id: currentUserId ?? "", body: caption, type: "text",
        spotify_track_id: null, spotify_track_name: null, spotify_track_artist: null, spotify_album_art: null,
        song_url: null, song_provider: null, song_links: null,
        reply_to_id: null, reply_to_preview: null,
        created_at: new Date().toISOString(),
      };
      setMsgs((prev) => [...prev, capOpt]);
      scrollToBottom();
      const capRes = await sendTextMessage(conv.conversationId, caption);
      if (capRes) setMsgs((prev) => [...prev.filter((m) => m.id !== capTemp), capRes]);
    }
  };

  // Start/join the private co-listening "jam" with this person.
  const openJam = useOpenJam();
  // Whether a live jam exists for this conversation (so the other person can
  // connect), and a loading flag while we start/join one.
  const [jamId, setJamId] = useState<string | null>(null);
  const [startingJam, setStartingJam] = useState(false);

  // Learn about the conversation's jam in real time: the moment either person
  // starts one the other sees it here and can join; it clears when it ends.
  useEffect(() => {
    let active = true;
    getActiveDmJam(conv.conversationId).then((id) => { if (active) setJamId(id); });
    const ch = supabase
      .channel(`conv-jam-${conv.conversationId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "meets", filter: `conversation_id=eq.${conv.conversationId}` },
        (payload: any) => {
          if (!active) return;
          const row = payload.new;
          if (payload.eventType === "DELETE") { setJamId(null); return; }
          if (row?.is_personal && row?.is_live) setJamId(row.id);
          else setJamId((cur) => (row && cur === row.id ? null : cur));
        })
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [conv.conversationId]);

  const handleJam = async () => {
    if (startingJam) return;
    setStartingJam(true);
    try { await openJam?.(conv.conversationId, conv.otherUser); }
    finally { setStartingJam(false); }
  };

  // Per-DM personalization (nickname / accent / background). Loaded once;
  // re-read after the settings sheet saves so the header reflects the change.
  const [settings, setSettings] = useState<ConversationSettings | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => {
    let active = true;
    getConversationSettings(conv.conversationId).then((s) => { if (active) setSettings(s); });
    return () => { active = false; };
  }, [conv.conversationId]);

  const headerName = settings?.nickname || otherName;
  const accent = settings?.accent_color ?? "#AB00FF";
  const bgColor = settings?.background_color ?? "#0D0D0D";
  const bgImage = settings?.background_image_url ?? null;



  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, {
        transform: [{ translateX: slideX }],
        backgroundColor: bgColor,
        zIndex: 200,
        elevation: 200,
      }]}
      {...pan.panHandlers}
    >
      {bgImage && (
        <CachedImage
          source={{ uri: bgImage }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      )}
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={chatStyles.header}>
          <TouchableOpacity onPress={handleClose} style={chatStyles.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={chatStyles.headerCenter}
            activeOpacity={0.7}
            onPress={() => setSettingsOpen(true)}
          >
            {conv.otherUser.avatar_url ? (
              <CachedImage source={{ uri: conv.otherUser.avatar_url }} style={{ width: 36, height: 36, borderRadius: 18 }} />
            ) : (
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: accent + "33", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "800", color: accent }}>{otherInitials}</Text>
              </View>
            )}
            <View style={{ gap: 1, flex: 1 }}>
              <Text style={chatStyles.headerName} numberOfLines={1}>{headerName}</Text>
              <Text style={[chatStyles.headerStatus, { color: "rgba(255,255,255,0.35)" }]}>@{conv.otherUser.username}</Text>
            </View>
          </TouchableOpacity>

          {MEETS_ENABLED && (
            <TouchableOpacity style={[chatStyles.jamBtn, jamId && chatStyles.jamBtnActive, jamId && { backgroundColor: accent }]} activeOpacity={0.8} onPress={handleJam} disabled={startingJam}>
              {startingJam
                ? <ActivityIndicator size="small" color="#0D0D0D" />
                : <Ionicons name="musical-notes" size={12} color="#0D0D0D" />}
              <Text style={chatStyles.jamBtnText}>{jamId ? "Live" : "Jam"}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={chatStyles.headerIconBtn} activeOpacity={0.7}>
            <Ionicons name="call-outline" size={17} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={chatStyles.headerIconBtn} activeOpacity={0.7}>
            <Ionicons name="videocam-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* A live jam in this conversation — tap to connect / resume. */}
        {MEETS_ENABLED && jamId && (
          <TouchableOpacity style={chatStyles.jamBanner} activeOpacity={0.85} onPress={handleJam} disabled={startingJam}>
            <View style={chatStyles.jamBannerDot} />
            <Ionicons name="musical-notes" size={15} color="#fff" />
            <Text style={chatStyles.jamBannerText} numberOfLines={1}>
              {startingJam ? "Connecting…" : `Jam in progress with ${otherName}`}
            </Text>
            {startingJam
              ? <ActivityIndicator size="small" color="#fff" />
              : <View style={chatStyles.jamBannerJoin}><Text style={chatStyles.jamBannerJoinText}>Join</Text></View>}
          </TouchableOpacity>
        )}

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          {loading ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator color={accent} />
            </View>
          ) : (
            <FlatList
              ref={flatRef}
              data={msgs}
              keyExtractor={(m) => m.id}
              style={{ flex: 1 }}
              contentContainerStyle={chatStyles.messagesContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              onScroll={onScroll}
              scrollEventThrottle={16}
              onContentSizeChange={onContentSizeChange}
              renderItem={({ item: msg, index }) => {
                const fromMe = msg.sender_id === currentUserId;
                const prev = msgs[index - 1];
                const next = msgs[index + 1];
                const firstInGroup = !prev || (prev.sender_id === currentUserId) !== fromMe;
                const lastInGroup  = !next || (next.sender_id === currentUserId) !== fromMe;
                const senderName   = fromMe ? "You" : otherName;
                // One consistent vertical rhythm for every content type: a clear
                // gap when the sender changes, a tight gap within a run.
                const topGap = firstInGroup ? 14 : 6;

                // ── Song card (Spotify or pasted multi-provider link) ───────
                if (msg.type === "spotify_track") {
                  return (
                    <SwipeToReply fromMe={fromMe} onActiveChange={setSwiping} onReply={() => setReplyTo({
                      id: msg.id,
                      // Stored quote text stays self-describing even without the
                      // rich UI (e.g. once persisted on the replying message).
                      preview: `🎵 ${msg.spotify_track_name ?? "Track"}${msg.spotify_track_artist ? ` — ${msg.spotify_track_artist}` : ""}`,
                      senderName,
                      kind: "song",
                      subtitle: msg.spotify_track_artist ?? undefined,
                      albumArt: msg.spotify_album_art,
                    })}>
                      <View style={[chatStyles.msgWrap, fromMe && chatStyles.msgWrapMe, { marginTop: topGap }]}>
                        <SpotifyTrackCard
                          track={{ id: msg.spotify_track_id, name: msg.spotify_track_name ?? "Unknown", artist: msg.spotify_track_artist ?? "Unknown", albumArt: msg.spotify_album_art, url: msg.song_url, provider: msg.song_provider, links: msg.song_links }}
                          fromMe={fromMe}
                        />
                        <Text style={[chatStyles.bubbleTime, fromMe && chatStyles.bubbleTimeMe, { paddingHorizontal: 4, marginTop: 4 }]}>
                          {fmtTime(msg.created_at)}
                        </Text>
                      </View>
                    </SwipeToReply>
                  );
                }

                // ── Regular text bubble ─────────────────────────────────────
                // Who the quoted message is from — derived from the thread so we
                // don't need to persist a sender name on every reply.
                const repliedMsg = msg.reply_to_id ? msgs.find((m) => m.id === msg.reply_to_id) : null;
                const repliedToMe = !!repliedMsg && repliedMsg.sender_id === currentUserId;
                const repliedName = repliedMsg ? (repliedToMe ? "You" : otherName) : null;
                // Album art of the replied-to message, if it was a song — shown
                // as a thumbnail in the quote instead of just the 🎵 text.
                const repliedArt = repliedMsg?.type === "spotify_track" ? repliedMsg.spotify_album_art : null;
                return (
                  <SwipeToReply fromMe={fromMe} onActiveChange={setSwiping} onReply={() => setReplyTo({
                    id: msg.id,
                    preview: msg.body ?? "",
                    senderName,
                    kind: "text",
                  })}>
                    <View style={[chatStyles.msgWrap, fromMe && chatStyles.msgWrapMe, { marginTop: topGap }]}>
                      {!!msg.reply_to_preview && (
                        <>
                          {!!repliedName && (
                            <View style={[chatStyles.replyHeader, fromMe && chatStyles.replyHeaderMe]}>
                              <Ionicons name="arrow-undo" size={12} color="rgba(255,255,255,0.4)" />
                              <Text style={chatStyles.replyHeaderName} numberOfLines={1}>{repliedName}</Text>
                            </View>
                          )}
                          <View style={[chatStyles.replyQuote, chatStyles.replyQuoteDetached, fromMe && chatStyles.replyQuoteDetachedMe, repliedToMe && chatStyles.replyQuoteDetachedSelf]}>
                            <View style={[chatStyles.replyQuoteBody, chatStyles.replyQuoteBodyDetached, !!repliedArt && chatStyles.replyQuoteBodyRow]}>
                              {!!repliedArt && <CachedImage source={{ uri: repliedArt }} style={chatStyles.replyQuoteArt} />}
                              <Text style={[chatStyles.replyQuoteText, fromMe && chatStyles.replyQuoteTextMe, !!repliedArt && { flex: 1 }]} numberOfLines={2}>
                                {repliedArt ? msg.reply_to_preview.replace(/^🎵\s*/, "") : msg.reply_to_preview}
                              </Text>
                            </View>
                          </View>
                        </>
                      )}
                      <View style={[chatStyles.bubble, fromMe ? chatStyles.bubbleMe : chatStyles.bubbleThem, fromMe ? chatStyles.bubbleSelfEnd : chatStyles.bubbleSelfStart, fromMe && { backgroundColor: accent }]}>
                        <Text style={[chatStyles.bubbleText, fromMe && chatStyles.bubbleTextMe]}>{msg.body}</Text>
                        <Text style={[chatStyles.bubbleTime, fromMe && chatStyles.bubbleTimeMe]}>{fmtTime(msg.created_at)}</Text>
                      </View>
                    </View>
                  </SwipeToReply>
                );
              }}
            />
          )}
          {isOtherTyping && <TypingBubble name={otherName} />}
          {SPOTIFY_ENABLED && (
          <View style={{ paddingHorizontal: 12 }}>
            <NowPlayingBanner onShare={async (t) => {
              const tempId = `pending-sp-${Date.now()}`;
              const optimistic: DbMessage = {
                id: tempId, conversation_id: conv.conversationId,
                sender_id: currentUserId ?? '', body: null, type: 'spotify_track',
                spotify_track_id: t.id, spotify_track_name: t.name,
                spotify_track_artist: t.artist, spotify_album_art: t.albumArt,
                song_url: null, song_provider: null, song_links: null,
                reply_to_id: null, reply_to_preview: null,
                created_at: new Date().toISOString(),
              };
              setMsgs(prev => [...prev, optimistic]);
              scrollToBottom();
              const result = await sendSpotifyTrackMessage(conv.conversationId, {
                id: t.id, name: t.name, artist: t.artist, albumArt: t.albumArt,
              });
              if (result) setMsgs(prev => [...prev.filter(m => m.id !== tempId), result]);
            }} />
          </View>
          )}
          {!!replyTo && (
            <View style={chatStyles.replyBar}>
              <View style={[chatStyles.replyBarAccent, { backgroundColor: accent }]} />
              {replyTo.kind === "song" && !!replyTo.albumArt && (
                <CachedImage source={{ uri: replyTo.albumArt }} style={chatStyles.replyBarArt} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={chatStyles.replyBarName} numberOfLines={1}>
                  {replyTo.kind === "song" ? `Replying to ${replyTo.senderName}'s song` : `Replying to ${replyTo.senderName}`}
                </Text>
                {replyTo.kind === "song" ? (
                  <View style={chatStyles.replyBarSongRow}>
                    <Text style={chatStyles.replyBarSongTitle} numberOfLines={1}>{replyTo.preview.replace(/^🎵\s*/, "").split(" — ")[0]}</Text>
                    {!!replyTo.subtitle && (
                      <Text style={chatStyles.replyBarSongArtist} numberOfLines={1}> · {replyTo.subtitle}</Text>
                    )}
                  </View>
                ) : (
                  <Text style={chatStyles.replyBarPreview} numberOfLines={1}>{replyTo.preview}</Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setReplyTo(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={16} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>
          )}
          {(link.parsingLink || link.attachedLink) && (
            <View style={{ paddingHorizontal: 12 }}>
              <ParsedLinkChip parsingLink={link.parsingLink} attachedLink={link.attachedLink} onRemove={link.removeAttachedLink} />
            </View>
          )}
          <View style={[chatStyles.inputBar, link.parsingLink && { opacity: 0.5 }]}>
            <TouchableOpacity style={chatStyles.inputPlusBtn} activeOpacity={0.7} disabled={link.parsingLink}>
              <Ionicons name="add-circle-outline" size={35} color="rgba(255,255,255,0.38)" />
            </TouchableOpacity>
            <View style={chatStyles.inputWrap}>
              <TextInput
                style={chatStyles.input}
                placeholder={link.parsingLink ? "Parsing link…" : link.attachedLink ? "Add a caption..." : "Message..."}
                placeholderTextColor="rgba(255,255,255,0.28)"
                value={msgText}
                onChangeText={(t) => { handleTextChange(t); link.detect(t, setMsgText); }}
                multiline
                maxLength={500}
                returnKeyType="default"
                editable={!link.parsingLink}
              />
              {msgText.length === 0 && !link.attachedLink ? (
                <TouchableOpacity style={chatStyles.inputAction} activeOpacity={0.7}>
                  <Ionicons name="mic-outline" size={18} color="rgba(255,255,255,0.38)" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[chatStyles.inputAction, chatStyles.sendBtn, { backgroundColor: accent }]} activeOpacity={0.8} onPress={handleChatSend} disabled={link.parsingLink}>
                  <Ionicons name="send" size={14} color="#0D0D0D" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {settingsOpen && (
        <ChatSettingsScreen
          conv={conv}
          viewerId={currentUserId}
          onClose={() => setSettingsOpen(false)}
          onSaved={(next) => setSettings(next)}
        />
      )}
    </Animated.View>
  );
}

// ─── Bottom glass navbar ──────────────────────────────────────────────────────
