import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ViewToken } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../../lib/feed/styles";
import { type Post } from "../../app/data/mock";
import { FeedStoriesStrip } from "./FeedStoriesStrip";
import { SwipeablePost } from "../post/SwipeablePost";
import { FeedAudioCtx, OpenVideoFeedCtx } from "../../lib/feed/contexts";
import { useFeedPreviewPlayer } from "../../hooks/useFeedPreviewPlayer";
import { useUserSettings } from "../../hooks/useUserSettings";
import { VideoFeedViewer } from "../post/VideoFeedViewer";
import { NowPlayingStrip } from "./NowPlayingStrip";
import { type NowPlayingTrack } from "../../hooks/useNowPlaying";

// A virtual feed row that renders the now-playing strip; lets us mix it with
// posts in the FlatList data so we can set its index in stickyHeaderIndices.
type StripRow = { __strip: true };
type FeedRow = Post | StripRow;
const isStripRow = (r: FeedRow): r is StripRow => "__strip" in r;

// Viewability — a card has to be majority-visible before we treat it as active.
const VIEWABILITY = { itemVisiblePercentThreshold: 60, minimumViewTime: 150 };
// How many neighbours to keep warm in the pool (counted on either side of the active card).
const PRELOAD_RADIUS = 2;

/** The main feed: now-playing stories header + a virtualized list of posts. */
export function FeedList({
  feedPosts, feedScrollEnabled, feedRefreshing, onFeedRefresh,
  setQuickReplyPost, setFeedScrollEnabled, setDetailPost,
  focused = true,
  userId = null,
  onShareSongAsPost,
}: {
  feedPosts: Post[];
  feedScrollEnabled: boolean;
  feedRefreshing: boolean;
  onFeedRefresh: () => void;
  setQuickReplyPost: (p: Post) => void;
  setFeedScrollEnabled: (v: boolean) => void;
  setDetailPost: (p: Post) => void;
  /** False while the user has switched to another tab — pauses all feed
   *  audio + video. Picks up where it left off when this goes back to true. */
  focused?: boolean;
  /** Current user id — used to load the mute-on-start preference. */
  userId?: string | null;
  /** Opens the feed's PostComposerSheet with the now-playing track pre-attached.
   *  Wired by app/feed.tsx and forwarded to the sticky NowPlayingStrip. */
  onShareSongAsPost?: (track: NowPlayingTrack) => void;
}) {
  const { settings, loading: settingsLoading } = useUserSettings(userId);

  // Initialize from DB preference once it loads. Until then, default to the
  // safe (unmuted for songs, muted for videos) state so playback isn't blocked.
  const [muted, setMuted] = useState(false);
  const [videosMuted, setVideosMuted] = useState(true);

  useEffect(() => {
    if (settingsLoading) return;
    if (settings.muteAudioOnStart) {
      setMuted(true);
      setVideosMuted(true);
    }
    // If false, keep current defaults — songs play, videos stay muted by default.
  }, [settingsLoading, settings.muteAudioOnStart]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Full-screen TikTok-style video viewer. Holds the post id we opened on; the
  // viewer pages through every video post in the feed starting there.
  const [videoViewerId, setVideoViewerId] = useState<string | null>(null);
  const videoPosts = useMemo(
    () => feedPosts.filter((p) => p.type === "video" && p.mediaUrls?.[0]),
    [feedPosts],
  );
  const videoStartIndex = useMemo(() => {
    if (videoViewerId == null) return 0;
    const i = videoPosts.findIndex((p) => p.id === videoViewerId);
    return i < 0 ? 0 : i;
  }, [videoViewerId, videoPosts]);
  const viewerOpen = videoViewerId != null;

  // Compute the warm pool: PRELOAD_RADIUS neighbours either side of the active card
  // (the active card itself loads via setActive). Keeps the post-id list stable
  // unless the active actually changes so the hook's effect doesn't churn.
  const preloadIds = useMemo(() => {
    if (activeIndex == null) return [];
    const out: { postId: string; previewUrl: string }[] = [];
    for (let i = activeIndex - PRELOAD_RADIUS; i <= activeIndex + PRELOAD_RADIUS; i++) {
      if (i < 0 || i >= feedPosts.length || i === activeIndex) continue;
      const p = feedPosts[i];
      if (p?.previewUrl) out.push({ postId: p.id, previewUrl: p.previewUrl });
    }
    return out;
  }, [feedPosts, activeIndex]);

  // Pause all feed playback while the full-screen viewer owns the screen, so we
  // never have the inline card and the viewer running at once.
  const { activePostId, setActive } = useFeedPreviewPlayer({ muted, paused: !focused || viewerOpen, preloadIds });

  // While the feed is blurred (or the full-screen viewer is up), hide the active
  // id from consumers so VideoCards see `isActive === false` and pause too. The
  // audio hook keeps the id around internally so the same sound resumes after.
  const exposedActiveId = focused && !viewerOpen ? activePostId : null;

  // FlatList's onViewableItemsChanged identity must be stable, so route through
  // a ref that always points at the latest setActive (avoids stale closures).
  const setActiveRef = useRef(setActive);
  useEffect(() => { setActiveRef.current = setActive; }, [setActive]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    // Skip the strip pseudo-row; only real posts drive preview audio activation.
    const top = viewableItems
      .filter((v) => v.isViewable && v.item && !(v.item as FeedRow as any).__strip)
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))[0];
    if (!top) { setActiveRef.current(null); setActiveIndex(null); return; }
    const post = top.item as Post;
    // FlatList indices include the strip row at 0, so subtract 1 to get the
    // index into feedPosts (used by preloadIds).
    setActiveIndex((top.index ?? 1) - 1);
    setActiveRef.current({ postId: post.id, previewUrl: post.previewUrl ?? null });
  }).current;

  const toggleMuted = useCallback(() => setMuted((m) => !m), []);
  const toggleVideosMuted = useCallback(() => setVideosMuted((m) => !m), []);

  // The strip lives at FlatList index 1 (right after the ListHeaderComponent's
  // navbar+stories block) and is marked as a sticky header — so navbar+stories
  // scroll away normally and the strip pins to the top, at full height, once
  // the user scrolls past it.
  const feedRows: FeedRow[] = useMemo(() => [{ __strip: true }, ...feedPosts], [feedPosts]);

  return (
    <FeedAudioCtx.Provider value={{ muted, toggleMuted, videosMuted, toggleVideosMuted, activePostId: exposedActiveId }}>
     <OpenVideoFeedCtx.Provider value={setVideoViewerId}>
      <FlatList
        data={feedRows}
        keyExtractor={(item) => (isStripRow(item) ? "__strip" : item.id)}
        contentContainerStyle={styles.feedContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={feedScrollEnabled}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={feedRefreshing} onRefresh={onFeedRefresh} tintColor="#AB00FF" />}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={VIEWABILITY}
        // Sticky header index 1 = the strip row (index 0 is ListHeaderComponent,
        // which scrolls away normally; data rows are 1+). Once the user scrolls
        // past the strip's natural position, FlatList pins it to the top.
        stickyHeaderIndices={[1]}
        ListHeaderComponent={
          <>
            <View style={styles.navbar}>
              <View style={{ width: 40 }} />
              <Text style={styles.navBrand}>trackmeet</Text>
              <TouchableOpacity style={styles.notifBtn} activeOpacity={0.7}>
                <Ionicons name="notifications-outline" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
            <FeedStoriesStrip />
            <View style={styles.stripDivider} />
          </>
        }
        renderItem={({ item }) => {
          if (isStripRow(item)) return <NowPlayingStrip onShareAsPost={onShareSongAsPost} />;
          return (
            <SwipeablePost item={item} onQuickReply={setQuickReplyPost} onScrollLock={setFeedScrollEnabled} onPress={() => setDetailPost(item)} />
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />

      {viewerOpen && videoPosts.length > 0 && (
        <VideoFeedViewer
          posts={videoPosts}
          startIndex={videoStartIndex}
          onClose={() => setVideoViewerId(null)}
        />
      )}
     </OpenVideoFeedCtx.Provider>
    </FeedAudioCtx.Provider>
  );
}
