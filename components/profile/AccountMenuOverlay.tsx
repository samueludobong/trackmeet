import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Modal, Pressable, StyleSheet, Animated, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";
import { CachedImage } from "../ui/CachedImage";
import { supabase } from "../../lib/supabase";
import { SAVED_ACCOUNTS_KEY } from "../../constants/profile";
import { type SavedAccount } from "../../types/profile";

type ProfileLite = { username?: string | null; display_name?: string | null; avatar_url?: string | null } | null;

const initialsOf = (name: string) =>
  name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";

/**
 * Account dropdown anchored under the profile top bar. Shows the signed-in
 * account, any other saved accounts to switch to, and a log-out action.
 *
 * Switching/adding/logging out all save the current account to the saved list
 * and sign out to `/signup`, where the quick-login picker lets the user pick the
 * target account (Supabase has a single session, so a re-auth is required).
 */
export function AccountMenuOverlay({
  visible, onClose, profile,
}: {
  visible: boolean;
  onClose: () => void;
  profile: ProfileLite;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [others, setOthers] = useState<SavedAccount[]>([]);
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(anim, { toValue: 1, duration: 160, useNativeDriver: true }).start();
      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setEmail(user?.email ?? null);
        const raw = await SecureStore.getItemAsync(SAVED_ACCOUNTS_KEY);
        const accs: SavedAccount[] = raw ? JSON.parse(raw) : [];
        setOthers(accs.filter((a) => a.email !== user?.email));
      })().catch(() => {});
    } else {
      anim.setValue(0);
    }
  }, [visible, anim]);

  // Save the current account so it appears in the quick-login picker, then sign
  // out to /signup (used for switch / add / log out).
  const leaveToAuth = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (email && profile) {
        const account: SavedAccount = {
          email,
          displayName: profile.display_name ?? profile.username ?? "",
          username: profile.username ?? "",
          avatarUrl: profile.avatar_url ?? null,
        };
        const raw = await SecureStore.getItemAsync(SAVED_ACCOUNTS_KEY);
        const existing: SavedAccount[] = raw ? JSON.parse(raw) : [];
        const merged = [account, ...existing.filter((a) => a.email !== account.email)];
        await SecureStore.setItemAsync(SAVED_ACCOUNTS_KEY, JSON.stringify(merged));
      }
      await supabase.auth.signOut();
      onClose();
      router.replace("/signup");
    } catch (e) {
      console.error("[AccountMenu] leave error", e);
      setBusy(false);
    }
  };

  const name = profile?.display_name || profile?.username || "You";

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.45)", opacity: anim }]} />
      </Pressable>
      <Animated.View
        style={[
          st.card,
          {
            top: insets.top + 52,
            opacity: anim,
            transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
          },
        ]}
      >
        {/* Current account */}
        <View style={st.currentRow}>
          {profile?.avatar_url ? (
            <CachedImage source={{ uri: profile.avatar_url }} style={st.avatar} />
          ) : (
            <View style={[st.avatar, st.avatarFallback]}><Text style={st.avatarText}>{initialsOf(name)}</Text></View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={st.name} numberOfLines={1}>{name}</Text>
            {!!profile?.username && <Text style={st.handle} numberOfLines={1}>@{profile.username}</Text>}
          </View>
          <Ionicons name="checkmark-circle" size={20} color="#1DB954" />
        </View>

        {/* Other saved accounts — switch targets */}
        {others.length > 0 && (
          <>
            <View style={st.divider} />
            {others.map((a) => (
              <TouchableOpacity key={a.email} style={st.row} activeOpacity={0.7} onPress={leaveToAuth} disabled={busy}>
                {a.avatarUrl ? (
                  <CachedImage source={{ uri: a.avatarUrl }} style={st.avatarSm} />
                ) : (
                  <View style={[st.avatarSm, st.avatarFallback]}><Text style={st.avatarTextSm}>{initialsOf(a.displayName || a.username)}</Text></View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={st.rowName} numberOfLines={1}>{a.displayName || a.username}</Text>
                  <Text style={st.handle} numberOfLines={1}>@{a.username}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        <View style={st.divider} />
        <TouchableOpacity style={st.actionRow} activeOpacity={0.7} onPress={leaveToAuth} disabled={busy}>
          <Ionicons name="person-add-outline" size={19} color="#fff" />
          <Text style={st.actionText}>Add account</Text>
        </TouchableOpacity>
        <TouchableOpacity style={st.actionRow} activeOpacity={0.7} onPress={leaveToAuth} disabled={busy}>
          {busy ? (
            <ActivityIndicator size="small" color="#FF453A" />
          ) : (
            <Ionicons name="log-out-outline" size={19} color="#FF453A" />
          )}
          <Text style={[st.actionText, { color: "#FF453A" }]}>Log out</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const st = StyleSheet.create({
  card: {
    position: "absolute", left: 14, right: 14,
    backgroundColor: "#1B1320",
    borderRadius: 18, padding: 8,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },
  currentRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 10, paddingVertical: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 10, paddingVertical: 9 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarSm: { width: 36, height: 36, borderRadius: 18 },
  avatarFallback: { backgroundColor: "#AB00FF22", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#AB00FF", fontWeight: "700", fontSize: 15 },
  avatarTextSm: { color: "#AB00FF", fontWeight: "700", fontSize: 13 },
  name: { fontSize: 15, fontWeight: "700", color: "#fff" },
  rowName: { fontSize: 14, fontWeight: "600", color: "#fff" },
  handle: { fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 1 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(255,255,255,0.1)", marginVertical: 4, marginHorizontal: 8 },
  actionText: { fontSize: 15, fontWeight: "600", color: "#fff" },
});
