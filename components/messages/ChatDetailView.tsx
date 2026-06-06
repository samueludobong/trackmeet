import React from "react";
import { useChatDetail } from "../../hooks/useChatDetail";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Animated, TextInput, Platform, Image, KeyboardAvoidingView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { sendSpotifyTrackMessage, type ConversationInfo, type DbMessage } from "../../services/messages";
import { chatStyles } from "../../lib/feed/localStyles";
import { NowPlayingBanner } from "../../components/feed/NowPlayingBanner";
import { SpotifyTrackCard } from "../../components/messages/SpotifyTrackCard";
import { SwipeToReply } from "../../components/messages/SwipeToReply";
import { TypingBubble } from "../../components/messages/TypingBubble";

export function ChatDetailView({ conv, onClose }: { conv: ConversationInfo; onClose: () => void }) {
  const {
    slideX, msgText, setMsgText, msgs, setMsgs, currentUserId, setCurUid, loading, setLoading, isOtherTyping, setOtherTyping, replyTo, setReplyTo, flatRef, channelRef, userIdRef, typingOutRef, otherTypingOutRef, broadcastTyping, handleTextChange, handleClose, pan, sendMessage, fmtTime, otherName, otherInitials
  } = useChatDetail(conv, onClose);

  

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

          <TouchableOpacity style={chatStyles.jamBtn} activeOpacity={0.8}>
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
              style={{ gap: 14 }}
              keyExtractor={(m) => m.id}
              contentContainerStyle={chatStyles.messagesContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
              renderItem={({ item: msg, index }) => {
                const fromMe = msg.sender_id === currentUserId;
                const prev = msgs[index - 1];
                const next = msgs[index + 1];
                const firstInGroup = !prev || (prev.sender_id === currentUserId) !== fromMe;
                const lastInGroup  = !next || (next.sender_id === currentUserId) !== fromMe;
                const senderName   = fromMe ? "You" : otherName;

                // ── Spotify track card ──────────────────────────────────────
                if (msg.type === "spotify_track" && msg.spotify_track_id) {
                  return (
                    <SwipeToReply onReply={() => setReplyTo({
                      id: msg.id,
                      preview: `🎵 ${msg.spotify_track_name ?? "Track"}`,
                      senderName,
                    })}>
                      <View style={[chatStyles.msgWrap, fromMe && chatStyles.msgWrapMe, { marginTop: firstInGroup ? 12 : 3 }]}>
                        <SpotifyTrackCard
                          track={{ id: msg.spotify_track_id, name: msg.spotify_track_name ?? "Unknown", artist: msg.spotify_track_artist ?? "Unknown", albumArt: msg.spotify_album_art }}
                          fromMe={fromMe}
                        />
                        <Text style={[chatStyles.bubbleTime, fromMe && chatStyles.bubbleTimeMe, { paddingHorizontal: 4, marginTop: 3 }]}>
                          {fmtTime(msg.created_at)}
                        </Text>
                      </View>
                    </SwipeToReply>
                  );
                }

                // ── Regular text bubble ─────────────────────────────────────
                const bubbleRadius = fromMe
                  ? { borderTopRightRadius: firstInGroup ? 6 : 18, borderBottomRightRadius: lastInGroup ? 18 : 6 }
                  : { borderTopLeftRadius:  firstInGroup ? 6 : 18, borderBottomLeftRadius:  lastInGroup ? 18 : 6 };
                return (
                  <SwipeToReply onReply={() => setReplyTo({
                    id: msg.id,
                    preview: msg.body ?? "",
                    senderName,
                  })}>
                    <View style={[chatStyles.msgWrap, fromMe && chatStyles.msgWrapMe, { marginTop: firstInGroup ? 12 : 3 }]}>
                      {!!msg.reply_to_preview && (
                        <View style={[chatStyles.replyQuote, fromMe && chatStyles.replyQuoteMe]}>
                          <View style={chatStyles.replyQuoteAccent} />
                          <Text style={chatStyles.replyQuoteText} numberOfLines={2}>{msg.reply_to_preview}</Text>
                        </View>
                      )}
                      <View style={[chatStyles.bubble, fromMe ? chatStyles.bubbleMe : chatStyles.bubbleThem, bubbleRadius]}>
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
              setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 60);
              const result = await sendSpotifyTrackMessage(conv.conversationId, {
                id: t.id, name: t.name, artist: t.artist, albumArt: t.albumArt,
              });
              if (result) setMsgs(prev => [...prev.filter(m => m.id !== tempId), result]);
            }} />
          </View>
          {!!replyTo && (
            <View style={chatStyles.replyBar}>
              <View style={chatStyles.replyBarAccent} />
              <View style={{ flex: 1 }}>
                <Text style={chatStyles.replyBarName}>{replyTo.senderName}</Text>
                <Text style={chatStyles.replyBarPreview} numberOfLines={1}>{replyTo.preview}</Text>
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
