import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  listMembers, setMemberRole, removeMember, transferOwnership,
  type CommunityMember, type CommunityRole,
} from "../../services/communities";
import { adminStyles as a } from "./adminPanel.styles";

export function AdminPanelMembers({
  communityId, viewerId, myRole,
}: { communityId: string; viewerId: string; myRole: CommunityRole }) {
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listMembers(communityId).then(setMembers).finally(() => setLoading(false));
  }, [communityId]);

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
    Alert.alert("Remove member?", `${m.user.display_name || m.user.username || "This user"} will be removed.`, [
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

  if (loading) return <ActivityIndicator color="#AB00FF" style={{ marginTop: 24 }} />;
  return (
    <View style={{ gap: 10 }}>
      <Text style={a.helper}>{members.length} member{members.length === 1 ? "" : "s"}</Text>
      {members.map((m) => {
        const isSelf = m.user_id === viewerId;
        return (
          <View key={m.user_id} style={a.memberRow}>
            {m.user?.avatar_url ? <Image source={{ uri: m.user.avatar_url }} style={a.memberAvatar} />
              : <View style={[a.memberAvatar, a.chipFallback]}><Ionicons name="person" size={16} color="#AB00FF" /></View>}
            <View style={{ flex: 1 }}>
              <Text style={a.memberName} numberOfLines={1}>
                {m.user?.display_name || m.user?.username || "User"}
                {isSelf && <Text style={a.youTag}>  · you</Text>}
              </Text>
              <Text style={a.memberRole}>{m.role.toUpperCase()}</Text>
            </View>
            {!isSelf && (
              <MemberActions member={m} canTransfer={myRole === "owner"} onChangeRole={changeRole} onKick={kick} />
            )}
          </View>
        );
      })}
    </View>
  );
}

function MemberActions({ member, canTransfer, onChangeRole, onKick }: {
  member: CommunityMember; canTransfer: boolean;
  onChangeRole: (m: CommunityMember, role: CommunityRole) => void;
  onKick: (m: CommunityMember) => void;
}) {
  const openMenu = () => {
    const options: any[] = [];
    if (member.role !== "moderator") options.push({ text: "Make moderator", onPress: () => onChangeRole(member, "moderator") });
    if (member.role !== "member") options.push({ text: "Demote to member", onPress: () => onChangeRole(member, "member") });
    if (canTransfer && member.role !== "owner") options.push({ text: "Transfer ownership", onPress: () => onChangeRole(member, "owner") });
    options.push({ text: "Remove from community", style: "destructive", onPress: () => onKick(member) });
    options.push({ text: "Cancel", style: "cancel" });
    Alert.alert(member.user?.display_name || member.user?.username || "Member", undefined, options);
  };
  return (
    <TouchableOpacity style={a.memberMenu} onPress={openMenu} hitSlop={8}>
      <Ionicons name="ellipsis-horizontal" size={18} color="rgba(255,255,255,0.7)" />
    </TouchableOpacity>
  );
}
