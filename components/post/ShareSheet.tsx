import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, TouchableOpacity, Modal, Pressable, StyleSheet, Animated,
  Share, Linking, ActivityIndicator, ScrollView, Dimensions,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { CachedImage } from "../ui/CachedImage";
import { DragGrabber } from "../common/DragGrabber";
import { useSheetDragClose } from "../../hooks/useSheetDragClose";
import { getConversations, sendTextMessage, type ConversationInfo } from "../../services/messages";
import { getMyGroupChats, sendGroupTextMessage, type GroupChat } from "../../services/groupChats";
import { getFollowingSubset } from "../../services/discover";
import { postShareUrl, postShareText, isMusicPost } from "../../lib/postShare";
import { type Post } from "../../app/data/mock";

const SHEET_CLOSED = 600;

// ── Sheet chrome (slide-up bottom sheet) ──────────────────────────────────────
function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  const [rendered, setRendered] = useState(visible);
  const slideAnim    = useRef(new Animated.Value(SHEET_CLOSED)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setRendered(true);
      slideAnim.setValue(SHEET_CLOSED);
      backdropAnim.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 26, stiffness: 220 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else if (rendered) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SHEET_CLOSED, duration: 220, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished) setRendered(false); });
    }
  }, [visible, rendered, slideAnim, backdropAnim]);

  const { panHandlers, stretch } = useSheetDragClose({ slideAnim, onClose, closedValue: SHEET_CLOSED });
  const dragBackdrop = slideAnim.interpolate({ inputRange: [0, SHEET_CLOSED], outputRange: [1, 0], extrapolate: "clamp" });

  return (
    <Modal transparent visible={rendered} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.6)", opacity: Animated.multiply(backdropAnim, dragBackdrop) }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[st.sheet, { transform: [{ translateY: slideAnim }, { scaleY: stretch }] }]}>
        <DragGrabber panHandlers={panHandlers} />
        {children}
      </Animated.View>
    </Modal>
  );
}

// ── Song card (mirrors the profile now-playing bar) ───────────────────────────
function SongCard({ post }: { post: Post }) {
  return (
    <LinearGradient
      colors={[post.albumColor ?? "#2A0C3D", "#160a1f"]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={st.songCard}
    >
      {post.albumArt ? (
        <CachedImage source={{ uri: post.albumArt }} style={st.songArt} />
      ) : (
        <View style={[st.songArt, { backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" }]}>
          <Text style={{ fontSize: 22 }}>🎵</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={st.songTitle} numberOfLines={1}>{post.song ?? "Unknown"}</Text>
        <Text style={st.songArtist} numberOfLines={1}>{post.artist ?? ""}</Text>
      </View>
      <Ionicons name="musical-notes" size={18} color="rgba(255,255,255,0.5)" />
    </LinearGradient>
  );
}

function SocialBtn({ children, label, onPress }: { children: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={st.socialBtn} activeOpacity={0.75} onPress={onPress}>
      <View style={st.socialIcon}>{children}</View>
      <Text style={st.socialLabel} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── "Share to" page (people + groups) — rendered inside the same sheet ─────────
function ShareToContent({
  meId, shareText, onBack,
}: {
  meId: string | null;
  shareText: string;
  onBack: () => void;
}) {
  const [convos, setConvos] = useState<ConversationInfo[]>([]);
  const [groups, setGroups] = useState<GroupChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      const [cs, gs] = await Promise.all([getConversations(), getMyGroupChats()]);
      if (!active) return;
      // "Users you follow that you've messaged": DM conversations whose other
      // participant the viewer follows.
      const ids = cs.map((c) => c.otherUser.id);
      const followed = meId && ids.length ? await getFollowingSubset(meId, ids) : new Set<string>();
      if (!active) return;
      setConvos(cs.filter((c) => followed.has(c.otherUser.id)));
      setGroups(gs);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [meId]);

  const shareToConvo = async (c: ConversationInfo) => {
    const key = `c:${c.conversationId}`;
    if (busy || sent.has(key)) return;
    setBusy(key);
    await sendTextMessage(c.conversationId, shareText);
    setSent((p) => new Set(p).add(key));
    setBusy(null);
  };
  const shareToGroup = async (g: GroupChat) => {
    const key = `g:${g.id}`;
    if (busy || sent.has(key)) return;
    setBusy(key);
    await sendGroupTextMessage(g.id, shareText);
    setSent((p) => new Set(p).add(key));
    setBusy(null);
  };

  const initials = (name: string) => name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <>
      <View style={st.headerRow}>
        <TouchableOpacity onPress={onBack} hitSlop={10} style={st.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={st.title}>Share to</Text>
        <View style={{ width: 34 }} />
      </View>

      {loading ? (
        <ActivityIndicator color="#AB00FF" style={{ marginVertical: 28 }} />
      ) : (
        <ScrollView style={{ maxHeight: Dimensions.get("window").height * 0.55 }} showsVerticalScrollIndicator={false}>
          <Text style={st.sectionLabel}>People</Text>
          {convos.length === 0 ? (
            <Text style={st.empty}>No messaged people you follow yet.</Text>
          ) : convos.map((c) => {
            const name = c.otherUser.display_name || c.otherUser.username;
            const key = `c:${c.conversationId}`;
            return (
              <TouchableOpacity key={c.conversationId} style={st.row} activeOpacity={0.7} onPress={() => shareToConvo(c)} disabled={!!busy}>
                {c.otherUser.avatar_url ? (
                  <CachedImage source={{ uri: c.otherUser.avatar_url }} style={st.rowAvatar} />
                ) : (
                  <View style={[st.rowAvatar, st.rowAvatarFallback]}><Text style={st.rowAvatarText}>{initials(name)}</Text></View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={st.rowName} numberOfLines={1}>{name}</Text>
                  <Text style={st.rowSub} numberOfLines={1}>@{c.otherUser.username}</Text>
                </View>
                {busy === key ? <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" />
                  : <SendPill sent={sent.has(key)} />}
              </TouchableOpacity>
            );
          })}

          <Text style={[st.sectionLabel, { marginTop: 14 }]}>Groups</Text>
          {groups.length === 0 ? (
            <Text style={st.empty}>{"You're not in any groups yet."}</Text>
          ) : groups.map((g) => {
            const key = `g:${g.id}`;
            return (
              <TouchableOpacity key={g.id} style={st.row} activeOpacity={0.7} onPress={() => shareToGroup(g)} disabled={!!busy}>
                {g.avatar_url ? (
                  <CachedImage source={{ uri: g.avatar_url }} style={st.rowAvatar} />
                ) : (
                  <View style={[st.rowAvatar, { backgroundColor: (g.color ?? "#AB00FF") + "33", alignItems: "center", justifyContent: "center" }]}>
                    <Text style={{ fontSize: 18 }}>{g.emoji ?? "👥"}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={st.rowName} numberOfLines={1}>{g.name}</Text>
                  <Text style={st.rowSub} numberOfLines={1}>{g.member_count} member{g.member_count === 1 ? "" : "s"}</Text>
                </View>
                {busy === key ? <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" />
                  : <SendPill sent={sent.has(key)} />}
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 16 }} />
        </ScrollView>
      )}
    </>
  );
}

function SendPill({ sent }: { sent: boolean }) {
  return sent ? (
    <View style={[st.sendPill, { backgroundColor: "rgba(29,185,84,0.18)" }]}>
      <Ionicons name="checkmark" size={14} color="#1DB954" />
      <Text style={[st.sendPillText, { color: "#1DB954" }]}>Sent</Text>
    </View>
  ) : (
    <View style={st.sendPill}>
      <Text style={st.sendPillText}>Send</Text>
    </View>
  );
}

// ── Main share sheet ──────────────────────────────────────────────────────────
export function ShareSheet({ post, currentUserId, onClose }: { post: Post; currentUserId: string | null; onClose: () => void }) {
  const [shareToOpen, setShareToOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const music = isMusicPost(post);
  const link = postShareUrl(post.id);
  const text = postShareText(post, link);

  const copyLink = async () => {
    await Clipboard.setStringAsync(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  const open = (url: string) => Linking.openURL(url).catch(() => {});
  const systemShare = () => { Share.share({ message: text }).catch(() => {}); };
  const socialTitle = music ? [post.song, post.artist].filter(Boolean).join(" — ") : (post.text ?? "Post");

  // One sheet, two pages — swapping content (rather than stacking a second
  // Modal) so the "Share to" page reliably shows on iOS and Android.
  return (
    <Sheet visible onClose={onClose}>
      {shareToOpen ? (
        <ShareToContent meId={currentUserId} shareText={text} onBack={() => setShareToOpen(false)} />
      ) : (
        <>
          <Text style={st.title}>Share</Text>

          {music && (
            <>
              <SongCard post={post} />
              {post.songUrl && (
                <TouchableOpacity style={st.linkRow} activeOpacity={0.75} onPress={() => open(post.songUrl!)}>
                  <Ionicons name="link-outline" size={16} color="#AB00FF" />
                  <View style={{ flex: 1 }}>
                    <Text style={st.linkLabel}>Original upload</Text>
                    <Text style={st.linkUrl} numberOfLines={1}>{post.songUrl.replace(/^https?:\/\//, "")}</Text>
                  </View>
                  <Ionicons name="open-outline" size={15} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              )}
            </>
          )}

          <TouchableOpacity style={st.shareToBtn} activeOpacity={0.85} onPress={() => setShareToOpen(true)}>
            <Ionicons name="paper-plane" size={17} color="#fff" />
            <Text style={st.shareToBtnText}>Share to…</Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          <View style={st.socialRow}>
            <SocialBtn label={copied ? "Copied!" : "Copy link"} onPress={copyLink}>
              <Ionicons name={copied ? "checkmark" : "copy-outline"} size={20} color={copied ? "#1DB954" : "#fff"} />
            </SocialBtn>
            <SocialBtn label="WhatsApp" onPress={() => open(`whatsapp://send?text=${encodeURIComponent(text)}`)}>
              <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
            </SocialBtn>
            <SocialBtn label="X" onPress={() => open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`)}>
              <Ionicons name="logo-twitter" size={20} color="#fff" />
            </SocialBtn>
            <SocialBtn label="Telegram" onPress={() => open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(socialTitle)}`)}>
              <FontAwesome5 name="telegram-plane" size={20} color="#2AABEE" />
            </SocialBtn>
            <SocialBtn label="More" onPress={systemShare}>
              <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
            </SocialBtn>
          </View>
        </>
      )}
    </Sheet>
  );
}

const st = StyleSheet.create({
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#161018",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 18, paddingBottom: 34,
    borderTopWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  title: { fontSize: 18, fontWeight: "800", color: "#fff", textAlign: "center", marginBottom: 14 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  backBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)" },

  songCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, marginBottom: 10 },
  songArt: { width: 52, height: 52, borderRadius: 10 },
  songTitle: { fontSize: 15, fontWeight: "700", color: "#fff" },
  songArtist: { fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 2 },

  linkRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14,
  },
  linkLabel: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: 0.5 },
  linkUrl: { fontSize: 13, color: "#fff", marginTop: 1 },

  shareToBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#AB00FF", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
    marginBottom: 16,
  },
  shareToBtnText: { flex: 1, fontSize: 15, fontWeight: "700", color: "#fff" },

  socialRow: { flexDirection: "row", justifyContent: "space-between", gap: 6 },
  socialBtn: { flex: 1, alignItems: "center", gap: 6 },
  socialIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.07)", alignItems: "center", justifyContent: "center" },
  socialLabel: { fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: "600" },

  sectionLabel: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6, marginTop: 4 },
  empty: { fontSize: 13, color: "rgba(255,255,255,0.35)", paddingVertical: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9 },
  rowAvatar: { width: 44, height: 44, borderRadius: 22 },
  rowAvatarFallback: { backgroundColor: "#AB00FF22", alignItems: "center", justifyContent: "center" },
  rowAvatarText: { color: "#AB00FF", fontWeight: "700", fontSize: 14 },
  rowName: { fontSize: 15, fontWeight: "600", color: "#fff" },
  rowSub: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 1 },
  sendPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.1)" },
  sendPillText: { fontSize: 13, fontWeight: "700", color: "#fff" },
});
