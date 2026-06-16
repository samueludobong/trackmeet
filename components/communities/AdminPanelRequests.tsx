import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { Ionicons } from "@expo/vector-icons";
import {
  listJoinRequests, approveJoinRequest, denyJoinRequest,
  type CommunityJoinRequest,
} from "../../services/communities";
import { adminStyles as a } from "./adminPanel.styles";
import { relTime } from "./CommunityPostCard";

/** Pending join requests for private communities — approve adds membership atomically. */
export function AdminPanelRequests({
  communityId, onCountChange,
}: {
  communityId: string;
  /** Lets the parent update the tab badge as requests get resolved. */
  onCountChange?: (count: number) => void;
}) {
  const [requests, setRequests] = useState<CommunityJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = async () => {
    const r = await listJoinRequests(communityId);
    setRequests(r);
    onCountChange?.(r.length);
  };

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [communityId]);

  const resolve = async (r: CommunityJoinRequest, approve: boolean) => {
    if (busy) return;
    setBusy(r.user_id);
    try {
      if (approve) await approveJoinRequest(communityId, r.user_id);
      else await denyJoinRequest(communityId, r.user_id);
      setRequests((prev) => {
        const next = prev.filter((x) => x.user_id !== r.user_id);
        onCountChange?.(next.length);
        return next;
      });
    } catch (e: any) {
      Alert.alert("Couldn't update request", e?.message ?? "Try again.");
    } finally { setBusy(null); }
  };

  if (loading) return <ActivityIndicator color="#AB00FF" style={{ marginTop: 24 }} />;
  if (requests.length === 0) {
    return (
      <View style={{ alignItems: "center", paddingTop: 28, gap: 8 }}>
        <Ionicons name="checkmark-done-circle-outline" size={38} color="rgba(255,255,255,0.2)" />
        <Text style={a.helper}>No pending requests.</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      <Text style={a.helper}>{requests.length} pending request{requests.length === 1 ? "" : "s"}</Text>
      {requests.map((r) => (
        <View key={r.user_id} style={a.memberRow}>
          {r.user?.avatar_url ? (
            <CachedImage source={{ uri: r.user.avatar_url }} style={a.memberAvatar} />
          ) : (
            <View style={[a.memberAvatar, a.chipFallback]}><Ionicons name="person" size={16} color="#AB00FF" /></View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={a.memberName} numberOfLines={1}>
              {r.user?.display_name || r.user?.username || "User"}
            </Text>
            <Text style={a.memberRole}>{relTime(r.created_at)}</Text>
            {!!r.message && <Text style={rq.message} numberOfLines={2}>"{r.message}"</Text>}
          </View>
          {busy === r.user_id ? (
            <ActivityIndicator size="small" color="#AB00FF" />
          ) : (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity style={rq.approveBtn} onPress={() => resolve(r, true)} hitSlop={6}>
                <Ionicons name="checkmark" size={17} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={rq.denyBtn} onPress={() => resolve(r, false)} hitSlop={6}>
                <Ionicons name="close" size={17} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const rq = StyleSheet.create({
  message: { fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 3, fontStyle: "italic" },
  approveBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "#1DB954",
    alignItems: "center", justifyContent: "center",
  },
  denyBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "rgba(255,71,87,0.85)",
    alignItems: "center", justifyContent: "center",
  },
});
