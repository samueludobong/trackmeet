import { useMemo, useState, useEffect, useCallback, startTransition, type ReactNode } from "react";
import { View, Animated, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import * as SecureStore from 'expo-secure-store'

// ─── Extracted shared foundation (see lib/feed/*) ─────────────────────────────
import { OpenMeetCtx, HostMeetCtx, JamCtx, NowPlayingCtx, FeedUserCtx, PostActionsCtx } from '../lib/feed/contexts';
import { styles } from '../assets/styles/feed/styles';

// FeedUserCtx is consumed by external screens via `import { FeedUserCtx } from "./feed"`.
import { QuickReplyOverlay } from "../components/post/QuickReplyOverlay";
import { ProfileView } from "../components/profile/ProfileView";
import { DiscoverView } from "../components/discover/DiscoverView";
import { MeetsView } from "../components/meets/MeetsView";
import { MessagesView } from "../components/messages/MessagesView";
import { BottomNav } from "../components/feed/BottomNav";
import { PostComposerSheet } from "../components/feed/PostComposerSheet";
import { PostDetailOverlay } from "../components/post/PostDetailOverlay";
import { ChatDetailView } from "../components/messages/ChatDetailView";
import { GroupChatDetailView } from "../components/messages/GroupChatDetailView";
import { type GroupChat } from "../services/groupChats";
import { JoinMeetPrompt } from "../components/meets/JoinMeetPrompt";
import { MeetListenerScreen } from "../components/meets/MeetListenerScreen";
import { MeetLiveScreen } from "../components/meets/MeetLiveScreen";
import { MeetMiniBar } from "../components/meets/MeetMiniBar";
import { FeedList } from '../components/feed/FeedList';
import { QuickComposer } from '../components/feed/QuickComposer';
import { type NowPlayingTrack } from '../hooks/useNowPlaying';

// ─── Spotify track card (shown inside chat when a track is shared) ───────────

import { useFeedScreen } from "../hooks/useFeedScreen";
export { FeedUserCtx }

// Keeps a tab's screen mounted but hidden when inactive, so its state and
// fetched data persist across tab switches (no remount = no reload).
//
// Hiding inactive tabs uses opacity + pointerEvents — NOT `display: none`.
// `display` toggling forces a native layout reflow of the *entire* destination
// subtree every time it becomes visible. With Profile's ~50 PostCards that
// reflow runs on the UI thread and shows up as a perceptible tab-swap hitch.
// Opacity-hidden tabs stay laid out; the swap is essentially free.
function TabScreen({ active, children }: { active: boolean; children: ReactNode }) {
  // Absolute children don't inherit the SafeAreaView's top padding, so apply the
  // top inset here — otherwise content draws under the status bar/notch.
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[StyleSheet.absoluteFill, { paddingTop: insets.top, opacity: active ? 1 : 0 }]}
      pointerEvents={active ? "auto" : "none"}
    >
      {children}
    </View>
  );
}

export default function FeedScreen() {
  // Instantiate once at the top level so token cache + needsReconnect survive tab switches
  const {
    nowPlaying, menuVisible, setMenuVisible, activeNav, setActiveNav, quickReplyPost, setQuickReplyPost, detailPost, setDetailPost, openConv, setOpenConv, listenerMeetId, setListenerMeetId, listenerMinimized, setListenerMinimized, listenerInfo, setListenerInfo, listenerIsPublic, setListenerIsPublic, joinPromptMeetId, setJoinPromptMeetId, hostMeetId, setHostMeetId, hostMeetName, setHostMeetName, hostMeetToken, setHostMeetToken, hostMinimized, setHostMinimized, openListenerMeet, openHostMeet, jamMeetId, jamOther, jamToken, jamMinimized, setJamMinimized, openJam, closeJam, keyboardUp, setKeyboardUp, feedScrollEnabled, setFeedScrollEnabled, feedRefreshing, setFeedRefreshing, feedPosts, setFeedPosts, currentUser, setCurrentUser, quickText, setQuickText, attachedTrack, setAttachedTrack, likedPostIds, setLikedPostIds, repostedPostIds, onToggleRepost, pollVotes, onVoteOnPoll, fetchFeedPosts, onToggleLike, handleQuickPost, handleVoicePost, onFeedRefresh, composerBottom, keyboardVisible, setKeyboardVisible, composerHeight, setComposerHeight
  } = useFeedScreen();

  // ── Tab switch perf ────────────────────────────────────────────────────────
  // `useFeedScreen` re-renders every second (live now-playing ticker), so the
  // context provider values below need stable identities — otherwise every
  // consumer in every tab re-renders on each tick, and tab switches pay for
  // that accumulated work synchronously, feeling laggy.
  const currentUserId = currentUser?.id ?? null;
  const feedUserCtxValue = useMemo(
    () => ({ currentUserId, likedPostIds, onToggleLike, repostedPostIds, onToggleRepost, pollVotes, onVoteOnPoll }),
    [currentUserId, likedPostIds, onToggleLike, repostedPostIds, onToggleRepost, pollVotes, onVoteOnPoll],
  );
  const onRemovePost = useCallback(
    (id: string) => setFeedPosts((prev) => prev.filter((p) => p.id !== id)),
    [setFeedPosts],
  );
  const postActionsCtxValue = useMemo(() => ({ onRemovePost }), [onRemovePost]);

  // Defer the (potentially heavy) tab swap re-render so the tap-press feedback
  // commits immediately. The new tab renders on the next idle slice instead of
  // blocking the press handler.
  const onTabChange = useCallback((label: string) => {
    startTransition(() => setActiveNav(label));
  }, [setActiveNav]);

  // Open group chat (mounted at root like the DM ChatDetailView to avoid clipping).
  const [openGroup, setOpenGroup] = useState<GroupChat | null>(null);

  // Track seeded into PostComposerSheet when the sticky now-playing strip's
  // "Share as Post" is tapped. Cleared when the composer closes so the next
  // FAB-triggered open isn't accidentally pre-attached.
  const [composerInitialTrack, setComposerInitialTrack] = useState<NowPlayingTrack | null>(null);

  // On the Feed tab, stack the minimized MeetMiniBar directly above the floating
  // quick-post composer: its bottom = composer bottom + composer height + gap.
  // Riding the same animated value means it rises with the composer (above the
  // now-playing banner) when the keyboard opens.
  const onFeed = activeNav === "Feed";
  const meetBarBottom = useMemo(
    () => Animated.add(composerBottom, composerHeight + 10),
    [composerBottom, composerHeight]
  );

  // Keep-alive: mount each tab the first time it's visited and keep it mounted
  // (hidden when inactive) so its state + fetched data survive tab switches.
  // Only the now-playing card refreshes, since it reads from the live context.
  const [visited, setVisited] = useState<Set<string>>(() => new Set([activeNav]));
  useEffect(() => {
    setVisited((prev) => (prev.has(activeNav) ? prev : new Set(prev).add(activeNav)));
  }, [activeNav]);

  return (
    <NowPlayingCtx.Provider value={nowPlaying}>
    <FeedUserCtx.Provider value={feedUserCtxValue}>
    <PostActionsCtx.Provider value={postActionsCtxValue}>
    <OpenMeetCtx.Provider value={openListenerMeet}>
    <HostMeetCtx.Provider value={openHostMeet}>
    <JamCtx.Provider value={openJam}>
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={[]}>
        {visited.has("Feed") && (
          <TabScreen active={onFeed}>
            <FeedList
              feedPosts={feedPosts}
              feedScrollEnabled={feedScrollEnabled}
              feedRefreshing={feedRefreshing}
              onFeedRefresh={onFeedRefresh}
              setQuickReplyPost={setQuickReplyPost}
              setFeedScrollEnabled={setFeedScrollEnabled}
              setDetailPost={setDetailPost}
              focused={onFeed}
              userId={currentUser?.id ?? null}
              onShareSongAsPost={(t) => { setComposerInitialTrack(t); setMenuVisible(true); }}
            />
          </TabScreen>
        )}
        {visited.has("Profile") && (
          <TabScreen active={activeNav === "Profile"}>
            <ProfileView />
          </TabScreen>
        )}
        {visited.has("Discover") && (
          <TabScreen active={activeNav === "Discover"}>
            <DiscoverView />
          </TabScreen>
        )}
        {visited.has("Meets") && (
          <TabScreen active={activeNav === "Meets"}>
            <MeetsView />
          </TabScreen>
        )}
        {visited.has("Messages") && (
          <TabScreen active={activeNav === "Messages"}>
            <MessagesView onOpenChat={setOpenConv} onOpenGroup={setOpenGroup} />
          </TabScreen>
        )}
      </SafeAreaView>
      {activeNav === "Feed" && (
        <QuickComposer
          composerBottom={composerBottom}
          keyboardVisible={keyboardVisible}
          attachedTrack={attachedTrack}
          setAttachedTrack={setAttachedTrack}
          setMenuVisible={setMenuVisible}
          quickText={quickText}
          setQuickText={setQuickText}
          handleQuickPost={handleQuickPost}
          handleVoicePost={handleVoicePost}
          onMeasure={setComposerHeight}
        />
      )}
      {!keyboardUp && <BottomNav active={activeNav} onPress={onTabChange} />}      <PostComposerSheet
        visible={menuVisible}
        onClose={() => { setMenuVisible(false); setComposerInitialTrack(null); }}
        currentUser={currentUser}
        initialText={quickText}
        initialTrack={composerInitialTrack}
        onPosted={(post) => {
          setFeedPosts((prev) => [post, ...prev]);
          setQuickText(""); // clear quick field once posted via sheet
          setComposerInitialTrack(null);
        }}
      />
      {quickReplyPost && (
        <QuickReplyOverlay
          post={quickReplyPost}
          onClose={() => setQuickReplyPost(null)}
          onOpenDetail={() => {
            const p = quickReplyPost;
            setQuickReplyPost(null);
            setDetailPost(p);
          }}
        />
      )}      {detailPost && (
        <PostDetailOverlay post={detailPost} onClose={() => setDetailPost(null)} />
      )}      {openConv && (
        <ChatDetailView conv={openConv} onClose={() => setOpenConv(null)} />
      )}
      {openGroup && (
        <GroupChatDetailView group={openGroup} userId={currentUser?.id ?? null} onClose={() => setOpenGroup(null)} />
      )}      <JoinMeetPrompt
        visible={!!joinPromptMeetId}
        onCancel={() => setJoinPromptMeetId(null)}
        onChoose={(isPublic) => {
          const id = joinPromptMeetId;
          setJoinPromptMeetId(null);
          if (id) openListenerMeet(id, isPublic);
        }}
      />      <MeetListenerScreen
        visible={!!listenerMeetId}
        meetId={listenerMeetId}
        userId={currentUser?.id ?? null}
        isPublic={listenerIsPublic}
        minimized={listenerMinimized}
        onMinimize={() => setListenerMinimized(true)}
        onExpand={() => setListenerMinimized(false)}
        onInfo={setListenerInfo}
        onClose={() => { setListenerMeetId(null); setListenerMinimized(false); setListenerInfo(null); }}
      />      <MeetLiveScreen
        visible={!!hostMeetId}
        meetId={hostMeetId}
        meetName={hostMeetName}
        accessToken={hostMeetToken}
        userId={currentUser?.id ?? null}
        minimized={hostMinimized}
        onMinimize={() => setHostMinimized(true)}
        onClose={() => { setHostMeetId(null); setHostMinimized(false); setHostMeetToken(null); }}
      />      {hostMeetId && hostMinimized && (
        <MeetMiniBar
          key={`hostbar-${quickReplyPost ? "q" : ""}${detailPost ? "d" : ""}${openConv ? "c" : ""}`}
          albumArt={nowPlaying.track?.albumArt ?? null}
          title={hostMeetName || "Your Meet"}
          subtitle={nowPlaying.track?.name ?? "Hosting"}
          onExpand={() => setHostMinimized(false)}
          bottom={onFeed ? meetBarBottom : undefined}
        />
      )}
      {listenerMeetId && listenerMinimized && (
        <MeetMiniBar
          key={`listenerbar-${quickReplyPost ? "q" : ""}${detailPost ? "d" : ""}${openConv ? "c" : ""}`}
          albumArt={listenerInfo?.albumArt ?? null}
          title={listenerInfo?.name || "Meet"}
          subtitle={listenerInfo?.trackName ?? "Listening"}
          onExpand={() => setListenerMinimized(false)}
          bottom={onFeed ? meetBarBottom : undefined}
        />
      )}
      {/* Private DM jam — hostless co-listening; reuses the meet control screen */}
      <MeetLiveScreen
        visible={!!jamMeetId}
        meetId={jamMeetId}
        accessToken={jamToken}
        userId={currentUser?.id ?? null}
        minimized={jamMinimized}
        jam={{ otherName: jamOther?.display_name || jamOther?.username || "Jam" }}
        onMinimize={() => setJamMinimized(true)}
        onClose={closeJam}
      />
      {jamMeetId && jamMinimized && (
        <MeetMiniBar
          key={`jambar-${quickReplyPost ? "q" : ""}${detailPost ? "d" : ""}${openConv ? "c" : ""}`}
          albumArt={nowPlaying.track?.albumArt ?? null}
          title={jamOther?.display_name || jamOther?.username || "Jam"}
          subtitle={nowPlaying.track?.name ?? "Jamming"}
          onExpand={() => setJamMinimized(false)}
          bottom={onFeed ? meetBarBottom : undefined}
        />
      )}
    </View>
    </JamCtx.Provider>
    </HostMeetCtx.Provider>
    </OpenMeetCtx.Provider>
    </PostActionsCtx.Provider>
    </FeedUserCtx.Provider>
    </NowPlayingCtx.Provider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
