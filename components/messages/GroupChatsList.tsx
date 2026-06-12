import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getMyGroupChats, type GroupChat } from "../../services/groupChats";
import { CreateGroupChatOverlay } from "./CreateGroupChatOverlay";

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

export function GroupChatsList({ onOpenGroup }: { onOpenGroup?: (g: GroupChat) => void }) {
  const [groups, setGroups] = useState<GroupChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const load = () => getMyGroupChats().then(setGroups).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  return (
    <View>
      <TouchableOpacity style={s.newRow} activeOpacity={0.8} onPress={() => setCreateOpen(true)}>
        <View style={[s.newIcon, { backgroundColor: ACCENT }]}>
          <Ionicons name="add" size={22} color="#fff" />
        </View>
        <Text style={s.newText}>New group chat</Text>
      </TouchableOpacity>

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

      {createOpen && (
        <CreateGroupChatOverlay
          onClose={() => setCreateOpen(false)}
          onCreated={(g) => {
            setGroups((prev) => [g, ...prev]);
            setCreateOpen(false);
            onOpenGroup?.(g);
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  newRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 12 },
  newIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  newText: { fontSize: 15, fontWeight: "800", color: "#fff" },

  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 11 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  name: { fontSize: 15, fontWeight: "800", color: "#fff", flex: 1 },
  time: { fontSize: 12, color: "rgba(255,255,255,0.35)" },
  preview: { fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 2 },

  emptyTitle: { fontSize: 16, fontWeight: "700", color: "rgba(255,255,255,0.45)" },
  emptySub: { fontSize: 13, color: "rgba(255,255,255,0.3)", textAlign: "center", lineHeight: 18 },
});
