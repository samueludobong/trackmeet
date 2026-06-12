import React, { useCallback } from "react";
import { useChatDetail } from "../../hooks/useChatDetail";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Animated, TextInput, Platform, Image, KeyboardAvoidingView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { sendSpotifyTrackMessage, type ConversationInfo, type DbMessage } from "../../services/messages";
import { chatStyles } from "../../lib/feed/localStyles";
import { useOpenJam } from "../../lib/feed/contexts";
import { NowPlayingBanner } from "../../components/feed/NowPlayingBanner";
import { SpotifyTrackCard } from "../../components/messages/SpotifyTrackCard";
import { SwipeToReply } from "../../components/messages/SwipeToReply";
import { TypingBubble } from "../../components/messages/TypingBubble";

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

  // Start/join the private co-listening "jam" with this person.
  const openJam = useOpenJam();



  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, {
        transform: [{ translateX: slideX }],
        backgroundColor: "#0D0D0D",
        zIndex: 200,
        elevation: 200,
      }]}
      {...pan.panHandlers}
    >
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={chatStyles.header}>
          <TouchableOpacity onPress={handleClose} style={chatStyles.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>

          <View style={chatStyles.headerCenter}>
            {conv.otherUser.avatar_url ? (
              <Image source={{ uri: conv.otherUser.avatar_url }} style={{ width: 36, height: 36, borderRadius: 18 }} />
            ) : (
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#AB00FF33", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "800", color: "#AB00FF" }}>{otherInitials}</Text>
              </View>
            )}
            <View style={{ gap: 1, flex: 1 }}>
              <Text style={chatStyles.headerName} numberOfLines={1}>{otherName}</Text>
              <Text style={[chatStyles.headerStatus, { color: "rgba(255,255,255,0.35)" }]}>@{conv.otherUser.username}</Text>
            </View>
          </View>

          <TouchableOpacity style={chatStyles.jamBtn} activeOpacity={0.8} onPress={() => openJam?.(conv.conversationId, conv.otherUser)}>
            <Ionicons name="musical-notes" size={12} color="#0D0D0D" />
            <Text style={chatStyles.jamBtnText}>Jam</Text>
          </TouchableOpacity>
          <TouchableOpacity style={chatStyles.headerIconBtn} activeOpacity={0.7}>
            <Ionicons name="call-outline" size={17} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={chatStyles.headerIconBtn} activeOpacity={0.7}>
            <Ionicons name="videocam-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          {loading ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator color="#AB00FF" />
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

                // ── Spotify track card ──────────────────────────────────────
                if (msg.type === "spotify_track" && msg.spotify_track_id) {
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
                          track={{ id: msg.spotify_track_id, name: msg.spotify_track_name ?? "Unknown", artist: msg.spotify_track_artist ?? "Unknown", albumArt: msg.spotify_album_art }}
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
                              {!!repliedArt && <Image source={{ uri: repliedArt }} style={chatStyles.replyQuoteArt} />}
                              <Text style={[chatStyles.replyQuoteText, fromMe && chatStyles.replyQuoteTextMe, !!repliedArt && { flex: 1 }]} numberOfLines={2}>
                                {repliedArt ? msg.reply_to_preview.replace(/^🎵\s*/, "") : msg.reply_to_preview}
                              </Text>
                            </View>
                          </View>
                        </>
                      )}
                      <View style={[chatStyles.bubble, fromMe ? chatStyles.bubbleMe : chatStyles.bubbleThem, fromMe ? chatStyles.bubbleSelfEnd : chatStyles.bubbleSelfStart]}>
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
          <View style={{ paddingHorizontal: 12 }}>
            <NowPlayingBanner onShare={async (t) => {
              const tempId = `pending-sp-${Date.now()}`;
              const optimistic: DbMessage = {
                id: tempId, conversation_id: conv.conversationId,
                sender_id: currentUserId ?? '', body: null, type: 'spotify_track',
                spotify_track_id: t.id, spotify_track_name: t.name,
                spotify_track_artist: t.artist, spotify_album_art: t.albumArt,
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
          {!!replyTo && (
            <View style={chatStyles.replyBar}>
              <View style={chatStyles.replyBarAccent} />
              {replyTo.kind === "song" && !!replyTo.albumArt && (
                <Image source={{ uri: replyTo.albumArt }} style={chatStyles.replyBarArt} />
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
          <View style={chatStyles.inputBar}>
            <TouchableOpacity style={chatStyles.inputPlusBtn} activeOpacity={0.7}>
              <Ionicons name="add-circle-outline" size={35} color="rgba(255,255,255,0.38)" />
            </TouchableOpacity>
            <View style={chatStyles.inputWrap}>
              <TextInput
                style={chatStyles.input}
                placeholder="Message..."
                placeholderTextColor="rgba(255,255,255,0.28)"
                value={msgText}
                onChangeText={handleTextChange}
                multiline
                maxLength={500}
                returnKeyType="default"
              />
              {msgText.length === 0 ? (
                <TouchableOpacity style={chatStyles.inputAction} activeOpacity={0.7}>
                  <Ionicons name="mic-outline" size={18} color="rgba(255,255,255,0.38)" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[chatStyles.inputAction, chatStyles.sendBtn]} activeOpacity={0.8} onPress={sendMessage}>
                  <Ionicons name="send" size={14} color="#0D0D0D" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Animated.View>
  );
}

// ─── Bottom glass navbar ──────────────────────────────────────────────────────
