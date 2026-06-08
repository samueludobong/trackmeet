import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ds, profileStyles } from "../../lib/feed/localStyles";
import {
  getCommunityFeed, getJoinedCommunitiesWithUnread, getDiscoverCommunities,
  joinCommunity,
  type CommunityFeedItem, type Community, type CommunityCard,
} from "../../services/communities";
import { CommunityPostCard } from "./CommunityPostCard";
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
                <CommunityPostCard post={post} />
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
