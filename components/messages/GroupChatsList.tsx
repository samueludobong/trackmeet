import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getMyGroupChats, type GroupChat } from "../../services/groupChats";
import { s } from "../../assets/styles/messages/GroupChatsList";

const ACCENT = "#AB00FF";

const relTime = (iso: string | null) => {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d` : new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
};

export function GroupChatsList({
  onOpenGroup, refreshKey = 0,
}: {
  onOpenGroup?: (g: GroupChat) => void;
  /** Parent bumps this after a successful create so the list re-fetches. */
  refreshKey?: number;
}) {
  const [groups, setGroups] = useState<GroupChat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMyGroupChats().then(setGroups).finally(() => setLoading(false));
  }, [refreshKey]);

  return (
    <View>
      {loading ? (
        <ActivityIndicator color={ACCENT} style={{ marginTop: 24 }} />
      ) : groups.length === 0 ? (
        <View style={{ alignItems: "center", paddingTop: 30, gap: 8, paddingHorizontal: 30 }}>
          <Ionicons name="people-outline" size={40} color="rgba(255,255,255,0.2)" />
          <Text style={s.emptyTitle}>No group chats yet</Text>
          <Text style={s.emptySub}>Create one and add your people to start jamming together.</Text>
        </View>
      ) : (
        groups.map((gc) => (
          <TouchableOpacity key={gc.id} style={s.row} activeOpacity={0.75} onPress={() => onOpenGroup?.(gc)}>
            <View style={[s.avatar, { backgroundColor: (gc.color || ACCENT) + "33" }]}>
              <Text style={{ fontSize: 24 }}>{gc.emoji || "👥"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.topRow}>
                <Text style={s.name} numberOfLines={1}>{gc.name}</Text>
                <Text style={s.time}>{relTime(gc.last_message_at)}</Text>
              </View>
              <Text style={s.preview} numberOfLines={1}>
                {gc.last_message_preview || `${gc.member_count} member${gc.member_count === 1 ? "" : "s"}`}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      )}

    </View>
  );
}
