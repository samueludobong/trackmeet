import React from "react";
import { Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { CommunityNotificationPref } from "../../services/communities";

const NEXT_PREF: Record<CommunityNotificationPref, CommunityNotificationPref> = {
  all: "meets",
  meets: "muted",
  muted: "all",
};

const PREF_ICON: Record<CommunityNotificationPref, keyof typeof Ionicons.glyphMap> = {
  all: "notifications",
  meets: "radio",
  muted: "notifications-off",
};

/** Action row: Join/Joined • bell-tri-state • share • settings (admins only).
 *  Private communities use request mode: Request to Join → Requested (tap to cancel). */
export function CommunityActionRow({
  joined, notifPref, isAdmin, canJoin, slug, communityName,
  requestMode = false, requested = false,
  onToggleJoin, onCyclePref, onOpenSettings,
}: {
  joined: boolean;
  notifPref: CommunityNotificationPref;
  isAdmin: boolean;
  canJoin: boolean;
  slug: string;
  communityName: string;
  /** Private community + viewer not a member → join goes through a request. */
  requestMode?: boolean;
  /** Viewer has a pending join request. */
  requested?: boolean;
  onToggleJoin: () => void;
  onCyclePref: (next: CommunityNotificationPref) => void;
  onOpenSettings: () => void;
}) {
  const share = () => {
    Share.share({ message: `Check out ${communityName} on Track Meet — /${slug}` }).catch(() => {});
  };
  const joinLabel = requestMode
    ? (requested ? "Requested ✓" : "Request to Join")
    : (joined ? "Joined" : "Join");
  const joinActive = requestMode ? requested : joined;
  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.joinPill, joinActive && styles.joinPillActive]}
        activeOpacity={0.85}
        onPress={onToggleJoin}
        disabled={!canJoin}
      >
        <Text style={[styles.joinText, joinActive && styles.joinTextActive]}>
          {joinLabel}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.iconBtn, notifPref !== "muted" && styles.iconBtnActive]}
        activeOpacity={0.85}
        onPress={() => onCyclePref(NEXT_PREF[notifPref])}
      >
        <Ionicons
          name={PREF_ICON[notifPref]}
          size={18}
          color={notifPref === "muted" ? "rgba(255,255,255,0.6)" : "#AB00FF"}
        />
      </TouchableOpacity>

      <TouchableOpacity style={styles.iconBtn} activeOpacity={0.85} onPress={share}>
        <Ionicons name="share-outline" size={18} color="rgba(255,255,255,0.8)" />
      </TouchableOpacity>

      {isAdmin && (
        <TouchableOpacity
          style={[styles.iconBtn, styles.iconBtnAdmin]}
          activeOpacity={0.85}
          onPress={onOpenSettings}
        >
          <Ionicons name="settings-outline" size={18} color="#AB00FF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, marginTop: 14 },
  joinPill: {
    paddingHorizontal: 22, paddingVertical: 11, borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
  },
  joinPillActive: { backgroundColor: "rgba(171,0,255,0.18)", borderColor: "rgba(171,0,255,0.5)" },
  joinText: { fontSize: 14, fontWeight: "800", color: "#fff" },
  joinTextActive: { color: "#AB00FF" },

  iconBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  iconBtnActive: { backgroundColor: "rgba(171,0,255,0.12)", borderColor: "rgba(171,0,255,0.45)" },
  iconBtnAdmin: { backgroundColor: "rgba(171,0,255,0.18)", borderColor: "rgba(171,0,255,0.45)" },
});
