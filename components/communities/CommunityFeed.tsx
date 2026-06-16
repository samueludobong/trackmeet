import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ds, profileStyles } from "../../assets/styles/feed/localStyles";
import {
  getCommunityFeed, getJoinedCommunitiesWithUnread, getDiscoverCommunities,
  joinCommunity, getMyLikedCommunityPostIds, toggleCommunityPostLike,
  type CommunityFeedItem, type Community, type CommunityCard, type CommunityPost,
} from "../../services/communities";
import { CommunityPostCard } from "./CommunityPostCard";
import { CommunityCommentsSheet } from "./CommunityCommentsSheet";
import { CommunityDetailOverlay } from "./CommunityDetailOverlay";
import { JoinedCommunitiesRow } from "./JoinedCommunitiesRow";
import { DiscoverCommunityCard } from "./DiscoverCommunityCard";

// Module-level cache so switching sidebar sections doesn't refetch.
type Cache = {
  items: CommunityFeedItem[];
  joined: CommunityCard[];
  discover: CommunityCard[];
};
const _cache = new Map<string, Cache>();
const _inflight = new Map<string, Promise<Cache>>();
const _lastVisit: Record<string, number> = {}; // per-community last open time (ms).

async function load(userId: string): Promise<Cache> {
  const existing = _inflight.get(userId);
  if (existing) return existing;
  const job = (async () => {
    const [items, joined, discover] = await Promise.all([
      getCommunityFeed(userId),
      getJoinedCommunitiesWithUnread(userId, _lastVisit),
      getDiscoverCommunities(userId),
    ]);
    const cache: Cache = { items, joined, discover };
    _cache.set(userId, cache);
    return cache;
  })();
  _inflight.set(userId, job);
  job.finally(() => { if (_inflight.get(userId) === job) _inflight.delete(userId); });
  return job;
}

export function invalidateCommunityFeed(userId: string | null | undefined) {
  if (userId) _cache.delete(userId);
}

export function CommunityFeed({ userId }: { userId: string | null }) {
  const cached = userId ? _cache.get(userId) : undefined;
  const [items, setItems] = useState<CommunityFeedItem[]>(cached?.items ?? []);
  const [joined, setJoined] = useState<CommunityCard[]>(cached?.joined ?? []);
  const [discover, setDiscover] = useState<CommunityCard[]>(cached?.discover ?? []);
  const [joining, setJoining] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(!cached && !!userId);
  const [refreshing, setRefreshing] = useState(false);
  const [openCommunity, setOpenCommunity] = useState<Community | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  // Post whose comment thread is open + its community (for the allow_comments gate).
  const [commentsFor, setCommentsFor] = useState<{ post: CommunityPost; community: Community } | null>(null);

  // Hydrate which visible posts the viewer already liked.
  useEffect(() => {
    if (!userId || !items.length) return;
    let active = true;
    getMyLikedCommunityPostIds(userId, items.map((i) => i.post.id))
      .then((set) => { if (active) setLikedIds(set); });
    return () => { active = false; };
  }, [userId, items]);

  const toggleLike = async (post: CommunityPost) => {
    if (!userId) return;
    const isLiked = likedIds.has(post.id);
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (isLiked) next.delete(post.id); else next.add(post.id);
      return next;
    });
    setItems((prev) => prev.map((it) => it.post.id === post.id
      ? { ...it, post: { ...it.post, likes_count: Math.max(0, it.post.likes_count + (isLiked ? -1 : 1)) } }
      : it));
    try { await toggleCommunityPostLike(post.id, userId, !isLiked); }
    catch {
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (isLiked) next.add(post.id); else next.delete(post.id);
        return next;
      });
      setItems((prev) => prev.map((it) => it.post.id === post.id
        ? { ...it, post: { ...it.post, likes_count: Math.max(0, it.post.likes_count + (isLiked ? 1 : -1)) } }
        : it));
    }
  };

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    const c = _cache.get(userId);
    if (c) { setItems(c.items); setJoined(c.joined); setDiscover(c.discover); setLoading(false); return; }
    let active = true;
    load(userId)
      .then((cache) => { if (!active) return; setItems(cache.items); setJoined(cache.joined); setDiscover(cache.discover); })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [userId]);

  const onRefresh = async () => {
    if (!userId) return;
    setRefreshing(true);
    try {
      _cache.delete(userId);
      const c = await load(userId);
      setItems(c.items); setJoined(c.joined); setDiscover(c.discover);
    } finally { setRefreshing(false); }
  };

  const openCommunityScreen = useCallback((c: Community) => {
    _lastVisit[c.id] = Date.now();
    setJoined((prev) => prev.map((j) => j.id === c.id ? { ...j, unread: false } : j));
    setOpenCommunity(c);
  }, []);

  const joinDiscovered = async (c: CommunityCard) => {
    if (!userId || joining[c.id]) return;
    setJoining((s) => ({ ...s, [c.id]: true }));
    try {
      await joinCommunity(c.id, userId);
      setDiscover((prev) => prev.filter((x) => x.id !== c.id));
      setJoined((prev) => [{ ...c, unread: false }, ...prev]);
    } catch { /* ignore */ }
    finally { setJoining((s) => ({ ...s, [c.id]: false })); }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#AB00FF" />}
      >
        <View style={ds.header}>
          <Text style={ds.headerTitle}>Communities</Text>
          <TouchableOpacity style={ds.iconBtn} activeOpacity={0.7}>
            <Ionicons name="options-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <JoinedCommunitiesRow communities={joined} onOpen={openCommunityScreen} />

        {discover.length > 0 && (
          <View style={{ marginBottom: 18 }}>
            <Text style={sectionHeaderStyle}>Discover Communities</Text>
            <View style={{ paddingHorizontal: 16, gap: 10 }}>
              {discover.map((c) => (
                <DiscoverCommunityCard
                  key={c.id}
                  community={c}
                  joined={!!joining[c.id]}
                  onJoin={() => joinDiscovered(c)}
                  onOpen={() => openCommunityScreen(c)}
                />
              ))}
            </View>
          </View>
        )}

        {loading ? (
          <ActivityIndicator color="#AB00FF" style={{ marginTop: 32 }} />
        ) : items.length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: 24, gap: 10, paddingHorizontal: 30 }}>
            <Ionicons name="people-outline" size={44} color="rgba(255,255,255,0.2)" />
            <Text style={{ fontSize: 16, fontWeight: "700", color: "rgba(255,255,255,0.4)" }}>No community posts yet</Text>
            <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
              Join or create a community to see posts here.
            </Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, gap: 14 }}>
            {items.map(({ post, community }) => (
              <View key={post.id}>
                <TouchableOpacity style={profileStyles.repostLabel} activeOpacity={0.7} onPress={() => openCommunityScreen(community)}>
                  <Ionicons name="people" size={13} color="rgba(255,255,255,0.5)" style={{ marginRight: 6 }} />
                  <Text style={profileStyles.repostLabelText}>From /{community.slug ?? community.name}</Text>
                </TouchableOpacity>
                <CommunityPostCard
                  post={post}
                  userId={userId}
                  liked={likedIds.has(post.id)}
                  onToggleLike={userId ? () => toggleLike(post) : undefined}
                  onOpenComments={() => setCommentsFor({ post, community })}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {openCommunity && (
        <CommunityDetailOverlay
          community={openCommunity}
          userId={userId}
          onClose={() => setOpenCommunity(null)}
        />
      )}
      {commentsFor && (
        <CommunityCommentsSheet
          post={commentsFor.post}
          userId={userId}
          // This feed only shows communities the viewer joined, so membership holds.
          canComment={!!userId && commentsFor.community.allow_comments}
          canModerate={false}
          onClose={() => setCommentsFor(null)}
          onCountChange={(delta) =>
            setItems((prev) => prev.map((it) => it.post.id === commentsFor.post.id
              ? { ...it, post: { ...it.post, comments_count: Math.max(0, it.post.comments_count + delta) } }
              : it))}
        />
      )}
    </View>
  );
}

const sectionHeaderStyle = {
  fontSize: 14,
  fontWeight: "800" as const,
  color: "#fff",
  paddingHorizontal: 20,
  marginBottom: 10,
  letterSpacing: -0.2,
};
