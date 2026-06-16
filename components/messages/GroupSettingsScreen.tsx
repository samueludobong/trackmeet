import React, { useEffect, useState } from "react";
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Switch, TextInput, Platform, KeyboardAvoidingView } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { openSpotifyLink } from "../../lib/spotify";
import {
  getGroupMembers, getGroupMessages, updateGroupChat,
  setGroupMemberRole, removeGroupMember, addGroupMembers, searchUsersForGroup,
  leaveGroupChat, deleteGroupChat,
  type GroupChat, type GroupMember, type GroupRole, type GroupUser, type GroupMessage,
} from "../../services/groupChats";

const EMOJI_CHOICES = ["🎧", "🎵", "🔥", "🐶", "🚀", "⭐", "💜", "🎉", "📚", "🍕", "🏀", "🌙"];
const COLOR_CHOICES = ["#AB00FF", "#FF3CAC", "#FF6C1A", "#1DB954", "#1B6CF5", "#FFD23F", "#00E5A0"];

export function GroupSettingsScreen({
  group, userId, myRole, onClose, onUpdated, onLeft,
}: {
  group: GroupChat;
  userId: string | null;
  myRole: GroupRole | null;
  onClose: () => void;
  onUpdated: (g: GroupChat) => void;
  onLeft: () => void;
}) {
  const insets = useSafeAreaInsets();
  const isAdmin = myRole === "admin" || group.created_by === userId;
  const isOwner = group.created_by === userId;

  const [name, setName] = useState(group.name);
  const [emoji, setEmoji] = useState(group.emoji ?? "");
  const [color, setColor] = useState(group.color ?? "#AB00FF");
  const [lock, setLock] = useState(group.lock_messages);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [media, setMedia] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // Add-member search (admins).
  const [addQuery, setAddQuery] = useState("");
  const [addResults, setAddResults] = useState<GroupUser[]>([]);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    Promise.all([getGroupMembers(group.id), getGroupMessages(group.id)])
      .then(([m, msgs]) => {
        setMembers(m);
        setMedia(msgs.filter((x) => x.type === "spotify_track" && x.spotify_album_art));
      })
      .finally(() => setLoading(false));
  }, [group.id]);

  useEffect(() => {
    const q = addQuery.trim();
    if (!q) { setAddResults([]); return; }
    const t = setTimeout(async () => {
      setAddResults(await searchUsersForGroup(q, members.map((m) => m.user_id)));
    }, 300);
    return () => clearTimeout(t);
  }, [addQuery, members]);

  const persist = async (patch: Parameters<typeof updateGroupChat>[1]) => {
    const updated = await updateGroupChat(group.id, patch);
    if (updated) onUpdated(updated);
  };

  const saveName = () => { if (name.trim() && name.trim() !== group.name) persist({ name }); };
  const pickEmoji = (e: string) => { const v = emoji === e ? "" : e; setEmoji(v); persist({ emoji: v || null }); };
  const pickColor = (c: string) => { setColor(c); persist({ color: c }); };
  const toggleLock = (v: boolean) => { setLock(v); persist({ lockMessages: v }); };

  const addMember = async (u: GroupUser) => {
    setAddResults((prev) => prev.filter((x) => x.id !== u.id));
    setAddQuery("");
    await addGroupMembers(group.id, [u.id]);
    setMembers(await getGroupMembers(group.id));
  };

  const memberMenu = (m: GroupMember) => {
    if (m.user_id === userId) return;
    const opts: any[] = [];
    if (m.role !== "admin") opts.push({ text: "Make admin", onPress: () => changeRole(m, "admin") });
    else if (isOwner && m.user_id !== group.created_by) opts.push({ text: "Remove admin", onPress: () => changeRole(m, "member") });
    opts.push({ text: "Remove from group", style: "destructive", onPress: () => kick(m) });
    opts.push({ text: "Cancel", style: "cancel" });
    Alert.alert(m.user?.display_name || m.user?.username || "Member", undefined, opts);
  };
  const changeRole = async (m: GroupMember, role: GroupRole) => {
    try { await setGroupMemberRole(group.id, m.user_id, role); setMembers(await getGroupMembers(group.id)); }
    catch (e: any) { Alert.alert("Couldn't update", e?.message ?? "Try again."); }
  };
  const kick = async (m: GroupMember) => {
    try { await removeGroupMember(group.id, m.user_id); setMembers((prev) => prev.filter((x) => x.user_id !== m.user_id)); }
    catch (e: any) { Alert.alert("Couldn't remove", e?.message ?? "Try again."); }
  };

  const leave = () => {
    Alert.alert("Leave group?", "You'll stop receiving messages from this group.", [
      { text: "Cancel", style: "cancel" },
      { text: "Leave", style: "destructive", onPress: async () => { if (userId) await leaveGroupChat(group.id, userId); onLeft(); } },
    ]);
  };
  const destroy = () => {
    Alert.alert("Delete group?", "This permanently removes the group, its messages, events, and polls.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { try { await deleteGroupChat(group.id); onLeft(); } catch (e: any) { Alert.alert("Couldn't delete", e?.message ?? "Try again."); } } },
    ]);
  };

  return (
    <Modal visible animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={s.screen}>
        <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={s.iconCircle} onPress={onClose} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={s.topTitle}>Group Info</Text>
          <View style={{ width: 38 }} />
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Identity */}
            <View style={s.identity}>
              <View style={[s.avatar, { backgroundColor: (color || "#AB00FF") + "33" }]}>
                <Text style={{ fontSize: 30 }}>{emoji || "👥"}</Text>
              </View>
              {isAdmin ? (
                <TextInput
                  style={s.nameInput}
                  value={name}
                  onChangeText={setName}
                  onBlur={saveName}
                  maxLength={50}
                  textAlign="center"
                />
              ) : (
                <Text style={s.nameStatic}>{group.name}</Text>
              )}
              <Text style={s.sub}>{group.member_count} member{group.member_count === 1 ? "" : "s"}</Text>
            </View>

            {/* Call / Video (parity with chat-screen pills) */}
            <View style={s.callRow}>
              <TouchableOpacity style={s.callBtn} activeOpacity={0.85}>
                <Ionicons name="call" size={16} color={color} />
                <Text style={[s.callText, { color }]}>Call Group</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.callBtn} activeOpacity={0.85}>
                <Ionicons name="videocam" size={17} color={color} />
                <Text style={[s.callText, { color }]}>Video Call</Text>
              </TouchableOpacity>
            </View>

            {/* Appearance — admins only */}
            {isAdmin && (
              <>
                <Text style={s.section}>CHANGE COLOR</Text>
                <View style={s.swatchRow}>
                  {COLOR_CHOICES.map((c) => (
                    <TouchableOpacity key={c} onPress={() => pickColor(c)} activeOpacity={0.8}
                      style={[s.swatch, { backgroundColor: c }, color === c && s.swatchActive]} />
                  ))}
                </View>

                <Text style={s.section}>CHANGE EMOJI</Text>
                <View style={s.emojiRow}>
                  {EMOJI_CHOICES.map((e) => (
                    <TouchableOpacity key={e} onPress={() => pickEmoji(e)} activeOpacity={0.8}
                      style={[s.emojiChip, emoji === e && { borderColor: color, backgroundColor: color + "22" }]}>
                      <Text style={{ fontSize: 20 }}>{e}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={s.lockRow}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={s.lockLabel}>Admins only can post</Text>
                    <Text style={s.lockSub}>Mute new messages from non-admins</Text>
                  </View>
                  <Switch value={lock} onValueChange={toggleLock}
                    trackColor={{ false: "rgba(255,255,255,0.15)", true: color }} thumbColor="#fff" ios_backgroundColor="rgba(255,255,255,0.15)" />
                </View>
              </>
            )}

            {/* Shared media (shared songs) */}
            <Text style={s.section}>SHARED MEDIA</Text>
            {loading ? (
              <ActivityIndicator color={color} style={{ marginVertical: 16 }} />
            ) : media.length === 0 ? (
              <Text style={s.empty}>No shared songs yet.</Text>
            ) : (
              <View style={s.mediaGrid}>
                {media.slice(0, 8).map((m) => (
                  <TouchableOpacity
                    key={m.id} style={s.mediaCell} activeOpacity={0.85}
                    onPress={() => m.spotify_track_id && openSpotifyLink(`spotify:track:${m.spotify_track_id}`, `https://open.spotify.com/track/${m.spotify_track_id}`)}
                  >
                    <CachedImage source={{ uri: m.spotify_album_art! }} style={s.mediaImg} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Members */}
            <View style={s.memberHead}>
              <Text style={s.section}>MEMBERS · {members.length}</Text>
              {isAdmin && (
                <TouchableOpacity onPress={() => setAddOpen((v) => !v)} hitSlop={8} style={s.addMemberBtn}>
                  <Ionicons name={addOpen ? "close" : "person-add"} size={15} color={color} />
                  <Text style={[s.addMemberText, { color }]}>{addOpen ? "Close" : "Add"}</Text>
                </TouchableOpacity>
              )}
            </View>

            {addOpen && isAdmin && (
              <View style={s.addBox}>
                <View style={s.searchWrap}>
                  <Ionicons name="search" size={15} color="rgba(255,255,255,0.35)" />
                  <TextInput style={s.searchInput} placeholder="Search people…" placeholderTextColor="rgba(255,255,255,0.3)"
                    value={addQuery} onChangeText={setAddQuery} autoCapitalize="none" />
                </View>
                {addResults.map((u) => (
                  <TouchableOpacity key={u.id} style={s.memberRow} activeOpacity={0.8} onPress={() => addMember(u)}>
                    {u.avatar_url ? <CachedImage source={{ uri: u.avatar_url }} style={s.memberAvatar} />
                      : <View style={[s.memberAvatar, s.fallback]}><Ionicons name="person" size={15} color={color} /></View>}
                    <Text style={s.memberName} numberOfLines={1}>{u.display_name || u.username}</Text>
                    <Ionicons name="add-circle-outline" size={20} color={color} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {members.map((m) => (
              <TouchableOpacity key={m.user_id} style={s.memberRow} activeOpacity={isAdmin ? 0.7 : 1} onPress={() => isAdmin && memberMenu(m)}>
                {m.user?.avatar_url ? <CachedImage source={{ uri: m.user.avatar_url }} style={s.memberAvatar} />
                  : <View style={[s.memberAvatar, s.fallback]}><Ionicons name="person" size={15} color={color} /></View>}
                <View style={{ flex: 1 }}>
                  <Text style={s.memberName} numberOfLines={1}>
                    {m.user?.display_name || m.user?.username || "User"}
                    {m.user_id === userId && <Text style={s.you}>  · you</Text>}
                  </Text>
                  {!!m.user?.username && <Text style={s.memberHandle}>@{m.user.username}</Text>}
                </View>
                {(m.role === "admin" || m.user_id === group.created_by) && (
                  <View style={[s.roleChip, { backgroundColor: color + "22" }]}>
                    <Text style={[s.roleText, { color }]}>{m.user_id === group.created_by ? "Owner" : "Admin"}</Text>
                  </View>
                )}
                {isAdmin && m.user_id !== userId && <Ionicons name="ellipsis-horizontal" size={18} color="rgba(255,255,255,0.4)" style={{ marginLeft: 8 }} />}
              </TouchableOpacity>
            ))}

            {/* Danger */}
            <View style={{ marginTop: 24, paddingHorizontal: 16, gap: 10 }}>
              <TouchableOpacity style={s.leaveBtn} onPress={leave} activeOpacity={0.85}>
                <Ionicons name="exit-outline" size={18} color="#FF4757" />
                <Text style={s.leaveText}>Leave group</Text>
              </TouchableOpacity>
              {isOwner && (
                <TouchableOpacity style={s.deleteBtn} onPress={destroy} activeOpacity={0.85}>
                  <Ionicons name="trash" size={17} color="#fff" />
                  <Text style={s.deleteText}>Delete group</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0D0D0D" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingBottom: 10 },
  iconCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  topTitle: { flex: 1, fontSize: 15, fontWeight: "800", color: "#fff", textAlign: "center", marginHorizontal: 8 },

  identity: { alignItems: "center", paddingTop: 8, paddingBottom: 18, gap: 6 },
  avatar: { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  nameInput: { fontSize: 22, fontWeight: "800", color: "#fff", minWidth: 160, paddingVertical: 2 },
  nameStatic: { fontSize: 22, fontWeight: "800", color: "#fff" },
  sub: { fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: "600" },

  callRow: { flexDirection: "row", gap: 12, paddingHorizontal: 16, marginBottom: 8 },
  callBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14, paddingVertical: 13,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  callText: { fontSize: 14, fontWeight: "800" },

  section: { fontSize: 11, fontWeight: "800", letterSpacing: 0.9, color: "rgba(255,255,255,0.4)", paddingHorizontal: 16, marginTop: 22, marginBottom: 10 },
  swatchRow: { flexDirection: "row", gap: 12, paddingHorizontal: 16 },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: "transparent" },
  swatchActive: { borderColor: "#fff" },
  emojiRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 16 },
  emojiChip: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.1)" },

  lockRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginTop: 20, paddingVertical: 6 },
  lockLabel: { fontSize: 15, fontWeight: "700", color: "#fff" },
  lockSub: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 },

  empty: { fontSize: 13, color: "rgba(255,255,255,0.35)", paddingHorizontal: 16 },
  mediaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16 },
  mediaCell: { width: "22%", aspectRatio: 1, borderRadius: 10, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.06)" },
  mediaImg: { width: "100%", height: "100%" },

  memberHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingRight: 16 },
  addMemberBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 12 },
  addMemberText: { fontSize: 13, fontWeight: "800" },
  addBox: { paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12, paddingHorizontal: 12 },
  searchInput: { flex: 1, height: 42, color: "#fff", fontSize: 14 },

  memberRow: { flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 16, paddingVertical: 7 },
  memberAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#222" },
  fallback: { backgroundColor: "rgba(171,0,255,0.18)", alignItems: "center", justifyContent: "center" },
  memberName: { fontSize: 14, fontWeight: "700", color: "#fff" },
  memberHandle: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 1 },
  you: { fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: "600" },
  roleChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  roleText: { fontSize: 11, fontWeight: "800" },

  leaveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,71,87,0.4)" },
  leaveText: { fontSize: 15, fontWeight: "800", color: "#FF4757" },
  deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: "#FF4757" },
  deleteText: { fontSize: 15, fontWeight: "800", color: "#fff" },
});
