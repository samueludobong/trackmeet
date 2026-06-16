import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Modal, Pressable, TextInput, Platform, KeyboardAvoidingView, ActivityIndicator, Alert, ScrollView } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { Ionicons } from "@expo/vector-icons";
import { useSheetDragClose } from "../../hooks/useSheetDragClose";
import { useKeyboardHeight } from "../../hooks/useKeyboardHeight";
import { DragGrabber } from "../common/DragGrabber";
import { getFollowedUsers, type FollowedUser } from "../../services/follows";
import { searchUsersForGroup, type GroupUser } from "../../services/groupChats";
import { getOrCreateConversation } from "../../services/messages";
import { SH } from "../../lib/feed/dimensions";
import { s } from "../../assets/styles/messages/NewDirectMessageOverlay";

const TOP_GAP = 60;
const ACCENT = "#AB00FF";

/**
 * Bottom sheet for starting a new DM. Defaults to the list of people the
 * viewer follows; an optional search box lets them message anyone else.
 * On select, resolves (or creates) the 1:1 conversation and hands the
 * other-user details back to the parent so it can navigate into the chat.
 */
export function NewDirectMessageOverlay({
  onClose, onPicked,
}: {
  onClose: () => void;
  onPicked: (otherUser: { id: string; username: string; display_name: string | null; avatar_url: string | null }, conversationId: string) => void;
}) {
  const slideAnim = useRef(new Animated.Value(SH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const kb = useKeyboardHeight();

  const [following, setFollowing] = useState<FollowedUser[]>([]);
  const [loadingFollowing, setLoadingFollowing] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GroupUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    getFollowedUsers().then(setFollowing).finally(() => setLoadingFollowing(false));
  }, []);

  // Debounced server search — only when the viewer types.
  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try { setResults(await searchUsersForGroup(q)); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const close = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: SH, duration: 220, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(onClose);
  };

  const { panHandlers, stretch } = useSheetDragClose({ slideAnim, onClose: close, closedValue: SH });
  const dragBackdrop = slideAnim.interpolate({ inputRange: [0, SH], outputRange: [1, 0], extrapolate: "clamp" });

  const pick = async (u: FollowedUser | GroupUser) => {
    if (opening) return;
    setOpening(u.id);
    try {
      const convId = await getOrCreateConversation(u.id);
      if (!convId) { Alert.alert("Couldn't start chat", "Please try again."); return; }
      onPicked({ id: u.id, username: u.username, display_name: u.display_name, avatar_url: u.avatar_url }, convId);
    } catch (e: any) {
      Alert.alert("Couldn't start chat", e?.message ?? "Try again.");
    } finally {
      setOpening(null);
    }
  };

  const searching_active = query.trim().length > 0;
  const list: (FollowedUser | GroupUser)[] = searching_active ? results : following;

  return (
    <Modal transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.6)" },
          { opacity: Animated.multiply(backdropAnim, dragBackdrop) }]}
        pointerEvents="none"
      />
      <Pressable style={StyleSheet.absoluteFill} onPress={close} />

      <KeyboardAvoidingView
        style={StyleSheet.absoluteFill}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        pointerEvents="box-none"
      >
        <Animated.View style={[s.sheet, kb > 0 && { bottom: kb + 12, maxHeight: SH - kb - TOP_GAP }, { transform: [{ translateY: slideAnim }, { scaleY: stretch }] }]}>
          <DragGrabber panHandlers={panHandlers} />

          <View style={s.headerRow}>
            <TouchableOpacity onPress={close} hitSlop={12}><Text style={s.cancel}>Cancel</Text></TouchableOpacity>
            <Text style={s.title}>New Message</Text>
            <View style={{ width: 44 }} />
          </View>

          <View style={s.searchWrap}>
            <Ionicons name="search" size={16} color="rgba(255,255,255,0.35)" />
            <TextInput
              style={s.searchInput}
              placeholder="Search people"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searching && <ActivityIndicator size="small" color={ACCENT} />}
          </View>

          {!searching_active && (
            <Text style={s.sectionLabel}>FOLLOWING</Text>
          )}

          <ScrollView
            style={{ maxHeight: SH * 0.5 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 4, paddingBottom: 12, gap: 4 }}
          >
            {!searching_active && loadingFollowing && (
              <ActivityIndicator color={ACCENT} style={{ marginVertical: 24 }} />
            )}

            {!searching_active && !loadingFollowing && following.length === 0 && (
              <Text style={s.empty}>
                You're not following anyone yet. Search to message anyone.
              </Text>
            )}

            {list.map((u) => (
              <TouchableOpacity
                key={u.id}
                style={s.row}
                activeOpacity={0.8}
                onPress={() => pick(u)}
                disabled={!!opening}
              >
                {u.avatar_url
                  ? <CachedImage source={{ uri: u.avatar_url }} style={s.avatar} />
                  : <View style={[s.avatar, s.avatarFallback]}>
                      <Ionicons name="person" size={16} color={ACCENT} />
                    </View>}
                <View style={{ flex: 1 }}>
                  <View style={s.nameRow}>
                    <Text style={s.name} numberOfLines={1}>{u.display_name || u.username}</Text>
                    {u.is_verified && <Ionicons name="checkmark-circle" size={13} color="#1DB954" />}
                  </View>
                  <Text style={s.handle}>@{u.username}</Text>
                </View>
                {opening === u.id
                  ? <ActivityIndicator size="small" color={ACCENT} />
                  : <Ionicons name="chatbubble-ellipses-outline" size={20} color={ACCENT} />}
              </TouchableOpacity>
            ))}

            {searching_active && !searching && results.length === 0 && (
              <Text style={s.empty}>No people found.</Text>
            )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
