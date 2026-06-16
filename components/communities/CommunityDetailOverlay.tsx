import React, { useEffect, useState } from "react";
import { Modal, View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Platform, KeyboardAvoidingView, StyleSheet, Alert } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  getCommunityPosts, createCommunityPost,
  joinCommunity, leaveCommunity, isMember, getMyRole,
  getActiveTodayCount, getBroadcastingMembers, getLiveCommunityMeet,
  getNotificationPref, setNotificationPref, slugify,
  getCommunityRules, getMyLikedCommunityPostIds, toggleCommunityPostLike,
  setCommunityPostPinned, setCommunityPostAnnouncement, deleteCommunityPost,
  requestToJoin, cancelJoinRequest, getMyJoinRequestStatus,
  type Community, type CommunityPost, type CommunityRole,
  type BroadcastingMember, type LiveCommunityMeet, type CommunityNotificationPref,
  type JoinRequestStatus,
} from "../../services/communities";
import { searchSpotifyTracks, getValidSpotifyToken, type SpotifyTrackResult } from "../../lib/spotify";
import { CommunityPostCard } from "./CommunityPostCard";
import { CommunityAdminPanel } from "./CommunityAdminPanel";
import { CommunityBanner } from "./CommunityBanner";
import { CommunityToast } from "./CommunityToast";
import { CommunityActionRow } from "./CommunityActionRow";
import { CommunityAvatar } from "./CommunityAvatar";
import { CommunityCommentsSheet } from "./CommunityCommentsSheet";
import { CommunityMembersSheet } from "./CommunityMembersSheet";
import { NowPlayingRow } from "./NowPlayingRow";
import { NowPlayingGrid } from "./NowPlayingGrid";
import { LiveMeetCard } from "./LiveMeetCard";
import { detailStyles as s } from "../../assets/styles/communities/communityDetail";
import { x } from "../../assets/styles/communities/CommunityDetailOverlay";

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
  const [welcomeToast, setWelcomeToast] = useState(false);
  const [memberCount, setMemberCount] = useState(community.member_count);
  const [activeToday, setActiveToday] = useState(0);
  const [broadcasting, setBroadcasting] = useState<BroadcastingMember[]>([]);
  const [liveMeet, setLiveMeet] = useState<LiveCommunityMeet | null>(null);
  const [myRole, setMyRole] = useState<CommunityRole | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [gridOpen, setGridOpen] = useState(false);
  const [live, setLive] = useState<Community>(community);

  // Phase 3: likes, comments, rules, members directory, private join requests.
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [commentsPost, setCommentsPost] = useState<CommunityPost | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [rules, setRules] = useState<string | null>(null);
  const [rulesExpanded, setRulesExpanded] = useState(false);
  const [joinReqStatus, setJoinReqStatus] = useState<JoinRequestStatus | null>(null);

  // Composer extras: attach a song + (admins) announcement flag.
  const [attachedSong, setAttachedSong] = useState<SpotifyTrackResult | null>(null);
  const [songSearchOpen, setSongSearchOpen] = useState(false);
  const [songQuery, setSongQuery] = useState("");
  const [songResults, setSongResults] = useState<SpotifyTrackResult[]>([]);
  const [songSearching, setSongSearching] = useState(false);
  const [isAnnouncement, setIsAnnouncement] = useState(false);

  const slug = live.slug || slugify(live.name);
  const isAdmin = myRole === "owner" || myRole === "moderator";
  const canPost = joined && (live.allow_anyone_to_post || isAdmin) && live.allow_posts && !!userId;
  const canComment = joined && live.allow_comments && !!userId;
  // Private + not a member → join goes through the request queue.
  const requestMode = live.is_private && !joined;

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
      getCommunityRules(community.id),
    ]).then(async ([p, m, r, np, at, br, lm, ru]) => {
      if (!active) return;
      setPosts(p); setJoined(m); setMyRole(r); setNotifPref(np);
      setActiveToday(at); setBroadcasting(br); setLiveMeet(lm); setRules(ru);
      if (userId) {
        const [likes, reqStatus] = await Promise.all([
          getMyLikedCommunityPostIds(userId, p.map((x) => x.id)),
          community.is_private && !m ? getMyJoinRequestStatus(community.id, userId) : Promise.resolve(null),
        ]);
        if (!active) return;
        setLikedIds(likes);
        setJoinReqStatus(reqStatus);
      }
    }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [community.id, userId]);

  const toggleJoined = async () => {
    if (!userId) return;
    // Private community: request / cancel-request instead of instant join.
    if (requestMode) {
      if (joinReqStatus === "pending") {
        setJoinReqStatus(null);
        try { await cancelJoinRequest(community.id, userId); }
        catch { setJoinReqStatus("pending"); }
      } else {
        setJoinReqStatus("pending");
        try { await requestToJoin(community.id, userId); }
        catch { setJoinReqStatus(null); }
      }
      return;
    }
    const next = !joined;
    setJoined(next); setMemberCount((c) => Math.max(0, c + (next ? 1 : -1)));
    try {
      if (next) {
        await joinCommunity(community.id, userId);
        if (live.welcome_message) setWelcomeToast(true);
      } else {
        await leaveCommunity(community.id, userId);
      }
    }
    catch { setJoined(!next); setMemberCount((c) => Math.max(0, c + (next ? -1 : 1))); }
  };

  const cyclePref = async (next: CommunityNotificationPref) => {
    if (!userId) return;
    const prev = notifPref; setNotifPref(next);
    try { await setNotificationPref(community.id, userId, next); } catch { setNotifPref(prev); }
  };

  const runSongSearch = async (q: string) => {
    setSongQuery(q);
    if (!userId || q.trim().length < 2) { setSongResults([]); return; }
    setSongSearching(true);
    try {
      const token = await getValidSpotifyToken(userId);
      if (token) setSongResults(await searchSpotifyTracks(token, q.trim(), 6));
    } catch { /* results stay empty */ }
    finally { setSongSearching(false); }
  };

  const handlePost = async () => {
    if (!userId || (!text.trim() && !attachedSong) || posting) return;
    setPosting(true);
    const body = text.trim(); setText("");
    const song = attachedSong; setAttachedSong(null);
    const announce = isAnnouncement; setIsAnnouncement(false);
    setSongSearchOpen(false); setSongQuery(""); setSongResults([]);
    try {
      const post = await createCommunityPost(community.id, userId, {
        text: body || null,
        song: song ? { id: song.id, name: song.name, artist: song.artist, albumArt: song.albumArt } : null,
        isAnnouncement: announce && isAdmin,
      });
      setPosts((prev) => [post, ...prev]);
    } catch (e: any) {
      setText(body); setAttachedSong(song); setIsAnnouncement(announce);
      Alert.alert("Couldn't post", e?.message ?? "Try again.");
    } finally { setPosting(false); }
  };

  // ── Per-post actions (likes, pins, announcements, delete) ────────────────────
  const toggleLike = async (post: CommunityPost) => {
    if (!userId) return;
    const isLiked = likedIds.has(post.id);
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (isLiked) next.delete(post.id); else next.add(post.id);
      return next;
    });
    setPosts((prev) => prev.map((p) =>
      p.id === post.id ? { ...p, likes_count: Math.max(0, p.likes_count + (isLiked ? -1 : 1)) } : p));
    try { await toggleCommunityPostLike(post.id, userId, !isLiked); }
    catch {
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (isLiked) next.add(post.id); else next.delete(post.id);
        return next;
      });
      setPosts((prev) => prev.map((p) =>
        p.id === post.id ? { ...p, likes_count: Math.max(0, p.likes_count + (isLiked ? 1 : -1)) } : p));
    }
  };

  const togglePin = async (post: CommunityPost) => {
    const pin = !post.pinned_at;
    try {
      await setCommunityPostPinned(post.id, pin);
      setPosts(await getCommunityPosts(community.id));
    } catch (e: any) { Alert.alert("Couldn't update pin", e?.message ?? "Try again."); }
  };

  const toggleAnnouncement = async (post: CommunityPost) => {
    const next = !post.is_announcement;
    setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, is_announcement: next } : p)));
    try { await setCommunityPostAnnouncement(post.id, next); }
    catch { setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, is_announcement: !next } : p))); }
  };

  const deletePost = (post: CommunityPost) => {
    Alert.alert("Delete post?", "This permanently removes the post.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await deleteCommunityPost(post.id);
            setPosts((prev) => prev.filter((p) => p.id !== post.id));
          } catch (e: any) { Alert.alert("Couldn't delete", e?.message ?? "Try again."); }
        },
      },
    ]);
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

        <CommunityToast visible={toastVisible && notifPref !== "muted" && !welcomeToast} slug={slug} onDismiss={() => setToastVisible(false)} />
        <CommunityToast
          visible={welcomeToast}
          slug={slug}
          icon="hand-left"
          message={live.welcome_message ?? `Welcome to /${slug}!`}
          onDismiss={() => setWelcomeToast(false)}
        />

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag">
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
              requestMode={requestMode} requested={joinReqStatus === "pending"}
              onToggleJoin={toggleJoined} onCyclePref={cyclePref} onOpenSettings={() => setAdminOpen(true)} />

            {!!live.description && <Text style={s.description}>{live.description}</Text>}

            {!!rules && (
              <TouchableOpacity style={x.rulesCard} activeOpacity={0.85} onPress={() => setRulesExpanded((v) => !v)}>
                <View style={x.rulesHead}>
                  <Ionicons name="shield-checkmark-outline" size={15} color="#AB00FF" />
                  <Text style={x.rulesTitle}>Community Rules</Text>
                  <Ionicons name={rulesExpanded ? "chevron-up" : "chevron-down"} size={15} color="rgba(255,255,255,0.4)" />
                </View>
                {rulesExpanded && <Text style={x.rulesBody}>{rules}</Text>}
              </TouchableOpacity>
            )}

            {live.genres?.length > 0 && (
              <View style={s.genreRow}>
                {live.genres.map((g) => (
                  <View key={g} style={s.genrePill}><Text style={s.genrePillText}>{g}</Text></View>
                ))}
              </View>
            )}

            <View style={s.statsRow}>
              <TouchableOpacity style={s.stat} activeOpacity={0.7} onPress={() => setMembersOpen(true)}>
                <Text style={s.statNumber} numberOfLines={1}>{fmtCount(memberCount)}</Text>
                <Text style={s.statLabel}>Members ›</Text>
              </TouchableOpacity>
              <View style={s.statDivider} />
              <Stat number={fmtCount(live.post_count || posts.length)} label="Posts" />
              <View style={s.statDivider} />
              <Stat number={fmtCount(activeToday)} label="Active Today" />
            </View>

            <NowPlayingRow members={broadcasting} onSeeAll={() => setGridOpen(true)} />

            {canPost && (
              <View>
                <View style={s.composer}>
                  <TextInput style={s.composerInput}
                    placeholder={`Share something in /${slug}…`}
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    value={text} onChangeText={setText} multiline />
                  <TouchableOpacity
                    style={x.composerIconBtn}
                    onPress={() => setSongSearchOpen((v) => !v)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="musical-notes" size={16} color={attachedSong || songSearchOpen ? "#1DB954" : "rgba(255,255,255,0.6)"} />
                  </TouchableOpacity>
                  {isAdmin && (
                    <TouchableOpacity
                      style={x.composerIconBtn}
                      onPress={() => setIsAnnouncement((v) => !v)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="megaphone" size={16} color={isAnnouncement ? "#FFD24A" : "rgba(255,255,255,0.6)"} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[s.postBtn, ((!text.trim() && !attachedSong) || posting) && { opacity: 0.5 }]}
                    onPress={handlePost} disabled={(!text.trim() && !attachedSong) || posting} activeOpacity={0.85}>
                    {posting ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={16} color="#fff" />}
                  </TouchableOpacity>
                </View>

                {isAnnouncement && (
                  <Text style={x.announceNote}>📢 Posting as an announcement</Text>
                )}

                {attachedSong && (
                  <View style={x.attachedChip}>
                    {attachedSong.albumArt
                      ? <CachedImage source={{ uri: attachedSong.albumArt }} style={x.attachedArt} />
                      : <View style={[x.attachedArt, { backgroundColor: "rgba(29,185,84,0.18)" }]} />}
                    <View style={{ flex: 1 }}>
                      <Text style={x.attachedName} numberOfLines={1}>{attachedSong.name}</Text>
                      <Text style={x.attachedArtist} numberOfLines={1}>{attachedSong.artist}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setAttachedSong(null)} hitSlop={8}>
                      <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.5)" />
                    </TouchableOpacity>
                  </View>
                )}

                {songSearchOpen && !attachedSong && (
                  <View style={x.songSearch}>
                    <View style={x.songSearchRow}>
                      <Ionicons name="search" size={14} color="rgba(255,255,255,0.35)" />
                      <TextInput
                        style={x.songSearchInput}
                        placeholder="Search a song to attach…"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        value={songQuery}
                        onChangeText={runSongSearch}
                        autoCapitalize="none"
                      />
                      {songSearching && <ActivityIndicator size="small" color="#1DB954" />}
                    </View>
                    {songResults.map((t) => (
                      <TouchableOpacity
                        key={t.id}
                        style={x.songResult}
                        activeOpacity={0.8}
                        onPress={() => { setAttachedSong(t); setSongSearchOpen(false); setSongQuery(""); setSongResults([]); }}
                      >
                        {t.albumArt
                          ? <CachedImage source={{ uri: t.albumArt }} style={x.attachedArt} />
                          : <View style={[x.attachedArt, { backgroundColor: "rgba(29,185,84,0.18)" }]} />}
                        <View style={{ flex: 1 }}>
                          <Text style={x.attachedName} numberOfLines={1}>{t.name}</Text>
                          <Text style={x.attachedArtist} numberOfLines={1}>{t.artist}</Text>
                        </View>
                        <Ionicons name="add-circle-outline" size={18} color="#1DB954" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
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
                  {posts.map((p) => (
                    <CommunityPostCard
                      key={p.id}
                      post={p}
                      userId={userId}
                      liked={likedIds.has(p.id)}
                      onToggleLike={userId ? () => toggleLike(p) : undefined}
                      onOpenComments={() => setCommentsPost(p)}
                      canModerate={isAdmin}
                      onTogglePin={isAdmin ? () => togglePin(p) : undefined}
                      onToggleAnnouncement={isAdmin ? () => toggleAnnouncement(p) : undefined}
                      onDelete={(isAdmin || p.author?.id === userId) ? () => deletePost(p) : undefined}
                    />
                  ))}
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
        {membersOpen && (
          <CommunityMembersSheet communityId={live.id} communityName={live.name} onClose={() => setMembersOpen(false)} />
        )}
        {commentsPost && (
          <CommunityCommentsSheet
            post={commentsPost}
            userId={userId}
            canComment={canComment}
            canModerate={isAdmin}
            onClose={() => setCommentsPost(null)}
            onCountChange={(delta) =>
              setPosts((prev) => prev.map((p) =>
                p.id === commentsPost.id
                  ? { ...p, comments_count: Math.max(0, p.comments_count + delta) }
                  : p))}
          />
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

// Local styles for the phase-3 additions (rules card, composer extras).
