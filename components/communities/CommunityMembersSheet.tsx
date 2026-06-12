import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, ScrollView, Image, Animated, Pressable,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSheetDragClose } from "../../hooks/useSheetDragClose";
import { DragGrabber } from "../common/DragGrabber";
import { listMembers, type CommunityMember, type CommunityRole } from "../../services/communities";
import { SH } from "../../lib/feed/dimensions";

const ACCENT = "#AB00FF";

const ROLE_LABEL: Record<CommunityRole, string> = {
  owner: "Owner", moderator: "Mod", member: "",
};

/** Read-only member directory, open to everyone (tap the Members stat).
 *  Draggable bottom sheet so the search field + results stay above the keyboard. */
export function CommunityMembersSheet({
  communityId, communityName, onClose,
}: {
  communityId: string;
  communityName: string;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    listMembers(communityId).then(setMembers).finally(() => setLoading(false));
  }, [communityId]);

  const close = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: SH, duration: 220, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(onClose);
  };

  const { panHandlers, stretch } = useSheetDragClose({ slideAnim, onClose: close, closedValue: SH });
  const dragBackdrop = slideAnim.interpolate({ inputRange: [0, SH], outputRange: [1, 0], extrapolate: "clamp" });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const weight = (r: CommunityRole) => (r === "owner" ? 0 : r === "moderator" ? 1 : 2);
    const sorted = [...members].sort((a, b) => weight(a.role) - weight(b.role));
    if (!q) return sorted;
    return sorted.filter((m) =>
      (m.user?.display_name ?? "").toLowerCase().includes(q) ||
      (m.user?.username ?? "").toLowerCase().includes(q));
  }, [members, query]);

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
          style={[s.sheet, { paddingBottom: insets.bottom + 8 },
            { transform: [{ translateY: slideAnim }, { scaleY: stretch }] }]}
        >
          <DragGrabber panHandlers={panHandlers} />
          <Text style={s.title} numberOfLines={1}>{communityName} · Members</Text>

          <View style={s.searchWrap}>
            <Ionicons name="search" size={16} color="rgba(255,255,255,0.35)" />
            <TextInput
              style={s.searchInput}
              placeholder="Search members…"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
            />
          </View>

          {loading ? (
            <ActivityIndicator color={ACCENT} style={{ marginVertical: 32 }} />
          ) : (
            <ScrollView
              style={{ maxHeight: SH * 0.5 }}
              contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 8, gap: 12 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={s.count}>{filtered.length} member{filtered.length === 1 ? "" : "s"}</Text>
              {filtered.map((m) => (
                <View key={m.user_id} style={s.row}>
                  {m.user?.avatar_url ? (
                    <Image source={{ uri: m.user.avatar_url }} style={s.avatar} />
                  ) : (
                    <View style={[s.avatar, s.avatarFallback]}>
                      <Ionicons name="person" size={15} color={ACCENT} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <View style={s.nameRow}>
                      <Text style={s.name} numberOfLines={1}>
                        {m.user?.display_name || m.user?.username || "User"}
                      </Text>
                      {m.user?.is_verified && <Ionicons name="checkmark-circle" size={13} color="#1DB954" />}
                    </View>
                    {!!m.user?.username && <Text style={s.handle}>@{m.user.username}</Text>}
                  </View>
                  {ROLE_LABEL[m.role] !== "" && (
                    <View style={[s.roleChip, m.role === "owner" && s.roleChipOwner]}>
                      <Text style={[s.roleText, m.role === "owner" && { color: "#FFD24A" }]}>{ROLE_LABEL[m.role]}</Text>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  sheet: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    maxHeight: "85%",
    backgroundColor: "#1a1a1f",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  title: { fontSize: 16, fontWeight: "800", color: "#fff", paddingHorizontal: 18, marginBottom: 12 },

  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14, paddingHorizontal: 12,
  },
  searchInput: { flex: 1, height: 42, color: "#fff", fontSize: 14 },

  count: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.4)", marginBottom: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: 11 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#222" },
  avatarFallback: { backgroundColor: "rgba(171,0,255,0.18)", alignItems: "center", justifyContent: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  name: { fontSize: 14, fontWeight: "700", color: "#fff", flexShrink: 1 },
  handle: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 1 },
  roleChip: {
    backgroundColor: "rgba(171,0,255,0.14)", borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  roleChipOwner: { backgroundColor: "rgba(255,210,74,0.12)" },
  roleText: { fontSize: 11, fontWeight: "800", color: ACCENT },
});
