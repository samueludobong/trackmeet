import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View, StyleSheet } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { Ionicons } from "@expo/vector-icons";
import {
  listMembers, setMemberRole, removeMember, transferOwnership,
  banMember, unbanMember, listBans,
  type CommunityMember, type CommunityRole, type CommunityBan,
} from "../../services/communities";
import { adminStyles as a } from "../../assets/styles/communities/adminPanel";
import { mb } from "../../assets/styles/communities/AdminPanelMembers";

export function AdminPanelMembers({
  communityId, viewerId, myRole,
}: { communityId: string; viewerId: string; myRole: CommunityRole }) {
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [bans, setBans] = useState<CommunityBan[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([listMembers(communityId), listBans(communityId)])
      .then(([m, b]) => { setMembers(m); setBans(b); })
      .finally(() => setLoading(false));
  }, [communityId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) =>
      (m.user?.display_name ?? "").toLowerCase().includes(q) ||
      (m.user?.username ?? "").toLowerCase().includes(q));
  }, [members, query]);

  const changeRole = (m: CommunityMember, role: CommunityRole) => {
    Alert.alert(
      role === "owner" ? "Transfer ownership?" : `Set role to ${role}?`,
      role === "owner"
        ? `${m.user.display_name || m.user.username || "This user"} will become the owner. You'll be demoted to moderator.`
        : `${m.user.display_name || m.user.username || "This user"} will be a ${role}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              if (role === "owner") await transferOwnership(communityId, viewerId, m.user_id);
              else await setMemberRole(communityId, m.user_id, role);
              setMembers(await listMembers(communityId));
            } catch (e: any) { Alert.alert("Couldn't update", e?.message ?? "Try again."); }
          },
        },
      ],
    );
  };

  const kick = (m: CommunityMember) => {
    Alert.alert("Remove member?", `${m.user.display_name || m.user.username || "This user"} will be removed. They can rejoin later.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive",
        onPress: async () => {
          try {
            await removeMember(communityId, m.user_id);
            setMembers((prev) => prev.filter((x) => x.user_id !== m.user_id));
          } catch (e: any) { Alert.alert("Couldn't remove", e?.message ?? "Try again."); }
        },
      },
    ]);
  };

  const ban = (m: CommunityMember) => {
    Alert.alert(
      "Ban member?",
      `${m.user.display_name || m.user.username || "This user"} will be removed and can't rejoin or post until unbanned.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Ban", style: "destructive",
          onPress: async () => {
            try {
              await banMember(communityId, m.user_id);
              setMembers((prev) => prev.filter((x) => x.user_id !== m.user_id));
              setBans(await listBans(communityId));
            } catch (e: any) { Alert.alert("Couldn't ban", e?.message ?? "Try again."); }
          },
        },
      ],
    );
  };

  const unban = (b: CommunityBan) => {
    Alert.alert("Unban user?", `${b.user?.display_name || b.user?.username || "This user"} will be able to join again.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unban",
        onPress: async () => {
          try {
            await unbanMember(communityId, b.user_id);
            setBans((prev) => prev.filter((x) => x.user_id !== b.user_id));
          } catch (e: any) { Alert.alert("Couldn't unban", e?.message ?? "Try again."); }
        },
      },
    ]);
  };

  if (loading) return <ActivityIndicator color="#AB00FF" style={{ marginTop: 24 }} />;
  return (
    <View style={{ gap: 10 }}>
      <View style={mb.searchWrap}>
        <Ionicons name="search" size={15} color="rgba(255,255,255,0.35)" />
        <TextInput
          style={mb.searchInput}
          placeholder="Search members…"
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
      </View>

      <Text style={a.helper}>{filtered.length} member{filtered.length === 1 ? "" : "s"}</Text>
      {filtered.map((m) => {
        const isSelf = m.user_id === viewerId;
        return (
          <View key={m.user_id} style={a.memberRow}>
            {m.user?.avatar_url ? <CachedImage source={{ uri: m.user.avatar_url }} style={a.memberAvatar} />
              : <View style={[a.memberAvatar, a.chipFallback]}><Ionicons name="person" size={16} color="#AB00FF" /></View>}
            <View style={{ flex: 1 }}>
              <Text style={a.memberName} numberOfLines={1}>
                {m.user?.display_name || m.user?.username || "User"}
                {isSelf && <Text style={a.youTag}>  · you</Text>}
              </Text>
              <Text style={a.memberRole}>{m.role.toUpperCase()}</Text>
            </View>
            {!isSelf && (
              <MemberActions member={m} canTransfer={myRole === "owner"}
                onChangeRole={changeRole} onKick={kick} onBan={ban} />
            )}
          </View>
        );
      })}

      {bans.length > 0 && (
        <>
          <Text style={[a.sectionTitle, { marginTop: 16 }]}>BANNED ({bans.length})</Text>
          {bans.map((b) => (
            <View key={b.user_id} style={a.memberRow}>
              {b.user?.avatar_url ? <CachedImage source={{ uri: b.user.avatar_url }} style={[a.memberAvatar, { opacity: 0.5 }]} />
                : <View style={[a.memberAvatar, a.chipFallback, { opacity: 0.5 }]}><Ionicons name="person" size={16} color="#AB00FF" /></View>}
              <View style={{ flex: 1 }}>
                <Text style={[a.memberName, { color: "rgba(255,255,255,0.55)" }]} numberOfLines={1}>
                  {b.user?.display_name || b.user?.username || "User"}
                </Text>
                {!!b.reason && <Text style={a.memberRole} numberOfLines={1}>{b.reason}</Text>}
              </View>
              <TouchableOpacity style={mb.unbanBtn} onPress={() => unban(b)} hitSlop={6}>
                <Text style={mb.unbanText}>Unban</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

function MemberActions({ member, canTransfer, onChangeRole, onKick, onBan }: {
  member: CommunityMember; canTransfer: boolean;
  onChangeRole: (m: CommunityMember, role: CommunityRole) => void;
  onKick: (m: CommunityMember) => void;
  onBan: (m: CommunityMember) => void;
}) {
  const openMenu = () => {
    const options: any[] = [];
    if (member.role !== "moderator") options.push({ text: "Make moderator", onPress: () => onChangeRole(member, "moderator") });
    if (member.role !== "member") options.push({ text: "Demote to member", onPress: () => onChangeRole(member, "member") });
    if (canTransfer && member.role !== "owner") options.push({ text: "Transfer ownership", onPress: () => onChangeRole(member, "owner") });
    options.push({ text: "Remove from community", style: "destructive", onPress: () => onKick(member) });
    options.push({ text: "Ban from community", style: "destructive", onPress: () => onBan(member) });
    options.push({ text: "Cancel", style: "cancel" });
    Alert.alert(member.user?.display_name || member.user?.username || "Member", undefined, options);
  };
  return (
    <TouchableOpacity style={a.memberMenu} onPress={openMenu} hitSlop={8}>
      <Ionicons name="ellipsis-horizontal" size={18} color="rgba(255,255,255,0.7)" />
    </TouchableOpacity>
  );
}
