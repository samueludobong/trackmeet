import React, { useEffect, useState } from "react";
import {
  Modal, View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Platform, KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  getCommunityPosts, createCommunityPost,
  joinCommunity, leaveCommunity, isMember, getMyRole,
  getActiveTodayCount, getBroadcastingMembers, getLiveCommunityMeet,
  getNotificationPref, setNotificationPref, slugify,
  type Community, type CommunityPost, type CommunityRole,
  type BroadcastingMember, type LiveCommunityMeet, type CommunityNotificationPref,
} from "../../services/communities";
import { CommunityPostCard } from "./CommunityPostCard";
import { CommunityAdminPanel } from "./CommunityAdminPanel";
import { CommunityBanner } from "./CommunityBanner";
import { CommunityToast } from "./CommunityToast";
import { CommunityActionRow } from "./CommunityActionRow";
import { CommunityAvatar } from "./CommunityAvatar";
import { NowPlayingRow } from "./NowPlayingRow";
import { NowPlayingGrid } from "./NowPlayingGrid";
import { LiveMeetCard } from "./LiveMeetCard";
import { detailStyles as s } from "./communityDetail.styles";

const fmtCount = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`.replace(".0M", "M");
  if (n >= 1_000) return `${(n / 1_000).toFixed(n < 10_000 ? 1 : 0)}K`.replace(".0K", "K");
  return n.toLocaleString();
};

export function CommunityDetailOverlay({
  community, userId, onClose,
}: { community: Community; userId: string | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [joined, setJoined] = useState(false);
  const [notifPref, setNotifPref] = useState<CommunityNotificationPref>("all");
  const [toastVisible, setToastVisible] = useState(true);
  const [memberCount, setMemberCount] = useState(community.member_count);
  const [activeToday, setActiveToday] = useState(0);
  const [broadcasting, setBroadcasting] = useState<BroadcastingMember[]>([]);
  const [liveMeet, setLiveMeet] = useState<LiveCommunityMeet | null>(null);
  const [myRole, setMyRole] = useState<CommunityRole | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [gridOpen, setGridOpen] = useState(false);
  const [live, setLive] = useState<Community>(community);

  const slug = live.slug || slugify(live.name);
  const canPost = joined && live.allow_anyone_to_post && live.allow_posts && !!userId;
  const isAdmin = myRole === "owner" || myRole === "moderator";

  useEffect(() => {
    let active = true;
    Promise.all([
      getCommunityPosts(community.id),
      userId ? isMember(community.id, userId) : Promise.resolve(false),
      userId ? getMyRole(community.id, userId) : Promise.resolve(null),
      userId ? getNotificationPref(community.id, userId) : Promise.resolve<CommunityNotificationPref>("all"),
      getActiveTodayCount(community.id),
      getBroadcastingMembers(community.id),
      getLiveCommunityMeet(community.id),
    ]).then(([p, m, r, np, at, br, lm]) => {
      if (!active) return;
      setPosts(p); setJoined(m); setMyRole(r); setNotifPref(np);
      setActiveToday(at); setBroadcasting(br); setLiveMeet(lm);
    }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [community.id, userId]);

  const toggleJoined = async () => {
    if (!userId) return;
    const next = !joined;
    setJoined(next); setMemberCount((c) => Math.max(0, c + (next ? 1 : -1)));
    try { if (next) await joinCommunity(community.id, userId); else await leaveCommunity(community.id, userId); }
    catch { setJoined(!next); setMemberCount((c) => Math.max(0, c + (next ? -1 : 1))); }
  };
  const cyclePref = async (next: CommunityNotificationPref) => {
    if (!userId) return;
    const prev = notifPref; setNotifPref(next);
    try { await setNotificationPref(community.id, userId, next); } catch { setNotifPref(prev); }
  };
  const handlePost = async () => {
    if (!userId || !text.trim() || posting) return;
    setPosting(true); const body = text.trim(); setText("");
    try {
      const post = await createCommunityPost(community.id, userId, { text: body });
      setPosts((prev) => [post, ...prev]);
    } catch { setText(body); } finally { setPosting(false); }
  };

  return (
    <Modal visible animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={s.screen}>
        <View style={[s.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={s.iconCircle} onPress={onClose} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={s.topTitle} numberOfLines={1}>/{slug}</Text>
          <View style={{ width: 38 }} />
        </View>

        <CommunityToast visible={toastVisible && notifPref !== "muted"} slug={slug} onDismiss={() => setToastVisible(false)} />

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
            keyboardShouldPersistTaps="handled">
            {liveMeet && (
              <LiveMeetCard meet={liveMeet} onJoin={() => router.push({ pathname: "/feed", params: { openMeetId: liveMeet.id } })} />
            )}

            <CommunityBanner bannerUrl={live.banner_url} bannerColor={live.banner_color} isPrivate={live.is_private} />

            <View style={s.nameBlock}>
              <CommunityAvatar uri={live.avatar_url} name={live.name} color={live.banner_color} size={56} radius={14} />
              <View style={{ flex: 1 }}>
                <Text style={s.communityName} numberOfLines={2}>{live.name}</Text>
                <Text style={s.communityHandle}>/{slug}</Text>
              </View>
            </View>

            <CommunityActionRow joined={joined} notifPref={notifPref} isAdmin={isAdmin} canJoin={!!userId}
              slug={slug} communityName={live.name}
              onToggleJoin={toggleJoined} onCyclePref={cyclePref} onOpenSettings={() => setAdminOpen(true)} />

            {!!live.description && <Text style={s.description}>{live.description}</Text>}

            {live.genres?.length > 0 && (
              <View style={s.genreRow}>
                {live.genres.map((g) => (
                  <View key={g} style={s.genrePill}><Text style={s.genrePillText}>{g}</Text></View>
                ))}
              </View>
            )}

            <View style={s.statsRow}>
              <Stat number={fmtCount(memberCount)} label="Members" />
              <View style={s.statDivider} />
              <Stat number={fmtCount(live.post_count || posts.length)} label="Posts" />
              <View style={s.statDivider} />
              <Stat number={fmtCount(activeToday)} label="Active Today" />
            </View>

            <NowPlayingRow members={broadcasting} onSeeAll={() => setGridOpen(true)} />

            {canPost && (
              <View style={s.composer}>
                <TextInput style={s.composerInput}
                  placeholder={`Share something in /${slug}…`}
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={text} onChangeText={setText} multiline />
                <TouchableOpacity style={[s.postBtn, (!text.trim() || posting) && { opacity: 0.5 }]}
                  onPress={handlePost} disabled={!text.trim() || posting} activeOpacity={0.85}>
                  {posting ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={16} color="#fff" />}
                </TouchableOpacity>
              </View>
            )}

            {loading ? <ActivityIndicator color="#AB00FF" style={{ marginTop: 28 }} />
              : posts.length === 0 ? (
                <View style={s.empty}>
                  <Ionicons name="chatbubbles-outline" size={42} color="rgba(255,255,255,0.2)" />
                  <Text style={s.emptyText}>No posts yet{canPost ? " — be the first!" : ""}</Text>
                </View>
              ) : (
                <View style={{ gap: 12, paddingHorizontal: 16, marginTop: 12 }}>
                  {posts.map((p) => <CommunityPostCard key={p.id} post={p} />)}
                </View>
              )}
          </ScrollView>
        </KeyboardAvoidingView>

        {adminOpen && userId && isAdmin && (
          <CommunityAdminPanel community={live} userId={userId} myRole={myRole as CommunityRole}
            onClose={() => setAdminOpen(false)} onUpdated={(c) => setLive(c)}
            onDeleted={() => { setAdminOpen(false); onClose(); }} />
        )}
        {gridOpen && (
          <NowPlayingGrid members={broadcasting} communityName={live.name} viewerId={userId} onClose={() => setGridOpen(false)} />
        )}
      </View>
    </Modal>
  );
}

function Stat({ number, label }: { number: string; label: string }) {
  return (
    <View style={s.stat}>
      <Text style={s.statNumber} numberOfLines={1}>{number}</Text><Text style={s.statLabel}>{label}</Text>
    </View>
  );
}
