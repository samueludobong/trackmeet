import { useMemo } from "react";
import { View, Animated } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";

import * as SecureStore from 'expo-secure-store'

// ─── Extracted shared foundation (see lib/feed/*) ─────────────────────────────
import { OpenMeetCtx, HostMeetCtx, NowPlayingCtx, FeedUserCtx } from '../lib/feed/contexts';
import { styles } from '../lib/feed/styles';

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
import { JoinMeetPrompt } from "../components/meets/JoinMeetPrompt";
import { MeetListenerScreen } from "../components/meets/MeetListenerScreen";
import { MeetLiveScreen } from "../components/meets/MeetLiveScreen";
import { MeetMiniBar } from "../components/meets/MeetMiniBar";
import { FeedList } from '../components/feed/FeedList';
import { QuickComposer } from '../components/feed/QuickComposer';

// ─── Spotify track card (shown inside chat when a track is shared) ───────────

import { useFeedScreen } from "../hooks/useFeedScreen";
export { FeedUserCtx }

export default function FeedScreen() {
  // Instantiate once at the top level so token cache + needsReconnect survive tab switches
  const {
    nowPlaying, menuVisible, setMenuVisible, activeNav, setActiveNav, quickReplyPost, setQuickReplyPost, detailPost, setDetailPost, openConv, setOpenConv, listenerMeetId, setListenerMeetId, listenerMinimized, setListenerMinimized, listenerInfo, setListenerInfo, listenerIsPublic, setListenerIsPublic, joinPromptMeetId, setJoinPromptMeetId, hostMeetId, setHostMeetId, hostMeetName, setHostMeetName, hostMeetToken, setHostMeetToken, hostMinimized, setHostMinimized, openListenerMeet, openHostMeet, keyboardUp, setKeyboardUp, feedScrollEnabled, setFeedScrollEnabled, feedRefreshing, setFeedRefreshing, feedPosts, setFeedPosts, currentUser, setCurrentUser, quickText, setQuickText, attachedTrack, setAttachedTrack, likedPostIds, setLikedPostIds, fetchFeedPosts, onToggleLike, handleQuickPost, onFeedRefresh, composerBottom, keyboardVisible, setKeyboardVisible, composerHeight, setComposerHeight
  } = useFeedScreen();

  // On the Feed tab, stack the minimized MeetMiniBar directly above the floating
  // quick-post composer: its bottom = composer bottom + composer height + gap.
  // Riding the same animated value means it rises with the composer (above the
  // now-playing banner) when the keyboard opens.
  const onFeed = activeNav === "Feed";
  const meetBarBottom = useMemo(
    () => Animated.add(composerBottom, composerHeight + 10),
    [composerBottom, composerHeight]
  );

  return (
    <NowPlayingCtx.Provider value={nowPlaying}>
    <FeedUserCtx.Provider value={{ currentUserId: currentUser?.id ?? null, likedPostIds, onToggleLike }}>
    <OpenMeetCtx.Provider value={openListenerMeet}>
    <HostMeetCtx.Provider value={openHostMeet}>
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {activeNav === "Profile" ? (
          <ProfileView />
        ) : activeNav === "Discover" ? (
          <DiscoverView />
        ) : activeNav === "Meets" ? (
          <MeetsView />
        ) : activeNav === "Messages" ? (
          <MessagesView onOpenChat={setOpenConv} />
        ) : (
          <FeedList
            feedPosts={feedPosts}
            feedScrollEnabled={feedScrollEnabled}
            feedRefreshing={feedRefreshing}
            onFeedRefresh={onFeedRefresh}
            setQuickReplyPost={setQuickReplyPost}
            setFeedScrollEnabled={setFeedScrollEnabled}
            setDetailPost={setDetailPost}
          />
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
          onMeasure={setComposerHeight}
        />
      )}
      {!keyboardUp && <BottomNav active={activeNav} onPress={setActiveNav} />}      <PostComposerSheet
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        currentUser={currentUser}
        initialText={quickText}
        onPosted={(post) => {
          setFeedPosts((prev) => [post, ...prev]);
          setQuickText(""); // clear quick field once posted via sheet
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
    </View>
    </HostMeetCtx.Provider>
    </OpenMeetCtx.Provider>
    </FeedUserCtx.Provider>
    </NowPlayingCtx.Provider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
