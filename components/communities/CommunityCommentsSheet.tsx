import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Modal, Pressable,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  Image, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSheetDragClose } from "../../hooks/useSheetDragClose";
import { DragGrabber } from "../common/DragGrabber";
import {
  getCommunityPostComments, addCommunityPostComment, deleteCommunityPostComment,
  type CommunityPost, type CommunityPostComment,
} from "../../services/communities";
import { relTime } from "./CommunityPostCard";
import { SH } from "../../lib/feed/dimensions";

const ACCENT = "#AB00FF";

/**
 * Bottom-sheet comment thread for a community post. Members can comment when
 * the community allows it (RLS enforces it server-side); authors + admins can
 * delete via long-press.
 */
export function CommunityCommentsSheet({
  post, userId, canComment, canModerate, onClose, onCountChange,
}: {
  post: CommunityPost;
  userId: string | null;
  /** Member of a community with comments enabled. */
  canComment: boolean;
  /** Owner/moderator — may delete any comment. */
  canModerate: boolean;
  onClose: () => void;
  /** Notifies the parent so the card's count chip stays in sync. */
  onCountChange: (delta: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  const [comments, setComments] = useState<CommunityPostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    getCommunityPostComments(post.id).then(setComments).finally(() => setLoading(false));
  }, [post.id]);

  const close = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: SH, duration: 220, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(onClose);
  };

  const { panHandlers, stretch } = useSheetDragClose({ slideAnim, onClose: close, closedValue: SH });
  const dragBackdrop = slideAnim.interpolate({ inputRange: [0, SH], outputRange: [1, 0], extrapolate: "clamp" });

  const send = async () => {
    if (!userId || !text.trim() || sending) return;
    setSending(true);
    const body = text.trim();
    setText("");
    try {
      const c = await addCommunityPostComment(post.id, userId, body);
      setComments((prev) => [...prev, c]);
      onCountChange(1);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    } catch (e: any) {
      setText(body);
      Alert.alert("Couldn't comment", e?.message ?? "Try again.");
    } finally { setSending(false); }
  };

  const confirmDelete = (c: CommunityPostComment) => {
    const mine = c.author?.id === userId;
    if (!mine && !canModerate) return;
    Alert.alert("Delete comment?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await deleteCommunityPostComment(c.id);
            setComments((prev) => prev.filter((x) => x.id !== c.id));
            onCountChange(-1);
          } catch (e: any) { Alert.alert("Couldn't delete", e?.message ?? "Try again."); }
        },
      },
    ]);
  };

  return (
    <Modal transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.55)" },
          { opacity: Animated.multiply(backdropAnim, dragBackdrop) }]}
        pointerEvents="none"
      />
      <Pressable style={StyleSheet.absoluteFill} onPress={close} />

      <KeyboardAvoidingView
        style={StyleSheet.absoluteFill}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[s.sheet, { paddingBottom: insets.bottom + 10 },
            { transform: [{ translateY: slideAnim }, { scaleY: stretch }] }]}
        >
          <DragGrabber panHandlers={panHandlers} />
          <Text style={s.title}>Comments</Text>

          <ScrollView
            ref={scrollRef}
            style={{ maxHeight: SH * 0.45 }}
            contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 8, gap: 14 }}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <ActivityIndicator color={ACCENT} style={{ marginVertical: 24 }} />
            ) : comments.length === 0 ? (
              <Text style={s.empty}>No comments yet{canComment ? " — start the conversation." : "."}</Text>
            ) : (
              comments.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  activeOpacity={0.85}
                  onLongPress={() => confirmDelete(c)}
                  delayLongPress={350}
                  style={s.row}
                >
                  {c.author?.avatar_url ? (
                    <Image source={{ uri: c.author.avatar_url }} style={s.avatar} />
                  ) : (
                    <View style={[s.avatar, s.avatarFallback]}>
                      <Ionicons name="person" size={13} color={ACCENT} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <View style={s.nameRow}>
                      <Text style={s.name} numberOfLines={1}>
                        {c.author?.display_name || c.author?.username || "User"}
                      </Text>
                      <Text style={s.time}>{relTime(c.created_at)}</Text>
                    </View>
                    <Text style={s.body}>{c.text}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          {canComment ? (
            <View style={s.inputRow}>
              <TextInput
                style={s.input}
                placeholder="Add a comment…"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={text}
                onChangeText={setText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[s.sendBtn, (!text.trim() || sending) && { opacity: 0.4 }]}
                onPress={send}
                disabled={!text.trim() || sending}
                activeOpacity={0.85}
              >
                {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="arrow-up" size={17} color="#fff" />}
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={s.lockedNote}>
              {userId ? "Comments are limited in this community." : "Sign in to comment."}
            </Text>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  sheet: {
    // Anchored to the bottom and capped so it lifts cleanly above the keyboard
    // (the KeyboardAvoidingView pads its frame; an absolute bottom child rides
    // that padding up) and never grows tall enough to clip the input.
    position: "absolute", left: 0, right: 0, bottom: 0,
    maxHeight: "85%",
    backgroundColor: "#1a1a1f",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  title: { fontSize: 16, fontWeight: "800", color: "#fff", paddingHorizontal: 18, marginBottom: 12 },
  empty: { fontSize: 13, color: "rgba(255,255,255,0.35)", textAlign: "center", marginVertical: 24 },

  row: { flexDirection: "row", gap: 10 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#222" },
  avatarFallback: { backgroundColor: "rgba(171,0,255,0.18)", alignItems: "center", justifyContent: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { fontSize: 13, fontWeight: "800", color: "#fff", flexShrink: 1 },
  time: { fontSize: 11, color: "rgba(255,255,255,0.35)" },
  body: { fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 19, marginTop: 2 },

  inputRow: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    paddingHorizontal: 14, paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(255,255,255,0.08)",
  },
  input: {
    flex: 1, minHeight: 40, maxHeight: 100,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10,
    color: "#fff", fontSize: 14,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: ACCENT,
    alignItems: "center", justifyContent: "center",
  },
  lockedNote: {
    fontSize: 12, color: "rgba(255,255,255,0.35)", textAlign: "center",
    paddingTop: 12, paddingHorizontal: 18,
  },
});
