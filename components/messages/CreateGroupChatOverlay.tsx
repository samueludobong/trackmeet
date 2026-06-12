import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Modal, Pressable,
  TextInput, Platform, Image, KeyboardAvoidingView, ActivityIndicator, Alert, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSheetDragClose } from "../../hooks/useSheetDragClose";
import { DragGrabber } from "../common/DragGrabber";
import { searchUsersForGroup, createGroupChat, type GroupUser, type GroupChat } from "../../services/groupChats";
import { useKeyboardHeight } from "../../hooks/useKeyboardHeight";
import { SH } from "../../lib/feed/dimensions";

// Keep the sheet header (with Create) above the keyboard on tall content.
const TOP_GAP = 60;

const ACCENT = "#AB00FF";

/** Bottom sheet to spin up a new group: name + searchable member picker + create. */
export function CreateGroupChatOverlay({
  onClose, onCreated,
}: {
  onClose: () => void;
  onCreated: (group: GroupChat) => void;
}) {
  const slideAnim = useRef(new Animated.Value(SH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const kb = useKeyboardHeight();

  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GroupUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<GroupUser[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, []);

  // Debounced user search, excluding already-selected members.
  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try { setResults(await searchUsersForGroup(q, selected.map((u) => u.id))); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query, selected]);

  const close = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: SH, duration: 220, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(onClose);
  };

  const { panHandlers, stretch } = useSheetDragClose({ slideAnim, onClose: close, closedValue: SH });
  const dragBackdrop = slideAnim.interpolate({ inputRange: [0, SH], outputRange: [1, 0], extrapolate: "clamp" });

  const toggle = (u: GroupUser) => {
    setSelected((prev) => prev.some((x) => x.id === u.id) ? prev.filter((x) => x.id !== u.id) : [...prev, u]);
    setQuery("");
    setResults([]);
  };

  const canCreate = !!name.trim() && selected.length >= 1 && !creating;

  const create = async () => {
    if (!canCreate) return;
    setCreating(true);
    try {
      const group = await createGroupChat(name, selected.map((u) => u.id));
      if (!group) { Alert.alert("Couldn't create group", "Please try again."); return; }
      onCreated(group);
    } catch (e: any) {
      Alert.alert("Couldn't create group", e?.message ?? "Try again.");
    } finally { setCreating(false); }
  };

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
        <Animated.View style={[s.sheet, kb > 0 && { maxHeight: SH - kb - TOP_GAP }, { transform: [{ translateY: slideAnim }, { scaleY: stretch }] }]}>
          <DragGrabber panHandlers={panHandlers} />

          <View style={s.headerRow}>
            <TouchableOpacity onPress={close} hitSlop={12}><Text style={s.cancel}>Cancel</Text></TouchableOpacity>
            <Text style={s.title}>New Group</Text>
            <TouchableOpacity onPress={create} disabled={!canCreate} hitSlop={12}>
              {creating ? <ActivityIndicator size="small" color={ACCENT} />
                : <Text style={[s.create, !canCreate && { opacity: 0.4 }]}>Create</Text>}
            </TouchableOpacity>
          </View>

          <Text style={s.label}>GROUP NAME</Text>
          <TextInput
            style={s.input}
            placeholder="e.g. Web Design Team"
            placeholderTextColor="rgba(255,255,255,0.28)"
            value={name}
            onChangeText={setName}
            maxLength={50}
          />

          {selected.length > 0 && (
            <View style={s.chipRow}>
              {selected.map((u) => (
                <TouchableOpacity key={u.id} style={s.chip} activeOpacity={0.8} onPress={() => toggle(u)}>
                  {u.avatar_url
                    ? <Image source={{ uri: u.avatar_url }} style={s.chipAvatar} />
                    : <View style={[s.chipAvatar, s.chipFallback]}><Ionicons name="person" size={11} color={ACCENT} /></View>}
                  <Text style={s.chipText} numberOfLines={1}>{u.display_name || u.username}</Text>
                  <Ionicons name="close" size={13} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={s.label}>ADD MEMBERS</Text>
          <View style={s.searchWrap}>
            <Ionicons name="search" size={16} color="rgba(255,255,255,0.35)" />
            <TextInput
              style={s.searchInput}
              placeholder="Search people…"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searching && <ActivityIndicator size="small" color={ACCENT} />}
          </View>

          <ScrollView
            style={{ maxHeight: SH * 0.34 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 8, paddingBottom: 8, gap: 6 }}
          >
            {results.map((u) => (
              <TouchableOpacity key={u.id} style={s.resultRow} activeOpacity={0.8} onPress={() => toggle(u)}>
                {u.avatar_url
                  ? <Image source={{ uri: u.avatar_url }} style={s.resultAvatar} />
                  : <View style={[s.resultAvatar, s.chipFallback]}><Ionicons name="person" size={16} color={ACCENT} /></View>}
                <View style={{ flex: 1 }}>
                  <View style={s.nameRow}>
                    <Text style={s.resultName} numberOfLines={1}>{u.display_name || u.username}</Text>
                    {u.is_verified && <Ionicons name="checkmark-circle" size={13} color="#1DB954" />}
                  </View>
                  <Text style={s.resultHandle}>@{u.username}</Text>
                </View>
                <Ionicons name="add-circle-outline" size={22} color={ACCENT} />
              </TouchableOpacity>
            ))}
            {!searching && query.trim().length > 0 && results.length === 0 && (
              <Text style={s.noResults}>No people found.</Text>
            )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  sheet: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    maxHeight: "88%",
    backgroundColor: "#161618",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderTopWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 20, paddingBottom: 24,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  cancel: { color: "rgba(255,255,255,0.55)", fontSize: 15, fontWeight: "600" },
  title: { color: "#fff", fontSize: 16, fontWeight: "800" },
  create: { color: ACCENT, fontSize: 15, fontWeight: "800" },

  label: { fontSize: 11, fontWeight: "800", letterSpacing: 0.9, color: "rgba(255,255,255,0.4)", marginBottom: 8, marginTop: 6 },
  input: {
    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#fff",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(171,0,255,0.16)", borderRadius: 20,
    paddingLeft: 4, paddingRight: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: "rgba(171,0,255,0.4)", maxWidth: 160,
  },
  chipAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#222" },
  chipFallback: { backgroundColor: "rgba(171,0,255,0.18)", alignItems: "center", justifyContent: "center" },
  chipText: { fontSize: 13, fontWeight: "700", color: "#fff", flexShrink: 1 },

  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, paddingHorizontal: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  searchInput: { flex: 1, height: 44, color: "#fff", fontSize: 15 },

  resultRow: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 4 },
  resultAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#222" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  resultName: { fontSize: 14, fontWeight: "700", color: "#fff", flexShrink: 1 },
  resultHandle: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 1 },
  noResults: { fontSize: 13, color: "rgba(255,255,255,0.35)", textAlign: "center", marginTop: 16 },
});
