import { createContext, useContext } from "react";
import { useNowPlaying } from "../../hooks/useNowPlaying";

// Lets any component inside a post card open the detail view without prop-drilling through card types
export const OpenDetailCtx = createContext<(() => void) | undefined>(undefined);

// Lets the Meets tab (and notification deep links) open the listener room,
// which is mounted once at FeedScreen level.
// isPublic omitted → the listener room flow prompts the joiner to pick
// public/private; passed explicitly → join straight away with that choice.
export const OpenMeetCtx = createContext<((meetId: string, isPublic?: boolean) => void) | null>(null);
export const useOpenMeet = () => useContext(OpenMeetCtx);

// Lets ProfileView's "Start Meet" flow open the host room, which is mounted once
// at FeedScreen level so it (and the minimized mini-bar) survives tab switches.
export const HostMeetCtx = createContext<((meetId: string, name: string) => void) | null>(null);
export const useOpenHostMeet = () => useContext(HostMeetCtx);

// DM "Jam": opens the hostless, private co-listening room scoped to a DM. Like
// the host/listener rooms it's mounted at FeedScreen level so it (and its
// mini-bar) survives tab switches.
export type JamOther = { id: string; username: string; display_name: string | null; avatar_url: string | null };
export const JamCtx = createContext<((conversationId: string, other: JamOther) => void) | null>(null);
export const useOpenJam = () => useContext(JamCtx);

// ─── Now Playing context ──────────────────────────────────────────────────────
// The hook lives in FeedScreen (never unmounts) so tab switches don't destroy
// the token cache or needsReconnect state.
export type NowPlayingCtxValue = ReturnType<typeof useNowPlaying>;
export const NowPlayingCtx = createContext<NowPlayingCtxValue | null>(null);
export const useNowPlayingCtx = () => {
  const ctx = useContext(NowPlayingCtx);
  if (!ctx) throw new Error('useNowPlayingCtx must be used inside NowPlayingCtx.Provider');
  return ctx;
};

// ─── Feed user context (current-user liked-post IDs + toggle handler) ────────
// Passed down to ActionRow without prop-drilling through every card layer.
export type FeedUserCtxValue = {
  currentUserId: string | null;
  likedPostIds: Set<string>;
  onToggleLike: (postId: string) => void;
  repostedPostIds: Set<string>;
  onToggleRepost: (postId: string) => void;
  /** postId → optId for every poll the user has already voted on. Persists
   *  across mounts so the PollCard's selected state survives feed ↔ detail
   *  remounts (and prevents re-voting). */
  pollVotes: Map<string, string>;
  onVoteOnPoll: (postId: string, optId: string) => void;
};
export const FeedUserCtx = createContext<FeedUserCtxValue>({
  currentUserId: null,
  likedPostIds: new Set(),
  onToggleLike: () => {},
  repostedPostIds: new Set(),
  onToggleRepost: () => {},
  pollVotes: new Map(),
  onVoteOnPoll: () => {},
});

// ─── Full-screen video feed ───────────────────────────────────────────────────
// Lets a VideoCard open the TikTok-style vertical viewer across every video in
// the feed, starting at the tapped post. Only the main feed provides this; when
// it's null (profile, detail, communities) the card falls back to the
// single-post MediaViewer.
export const OpenVideoFeedCtx = createContext<((startPostId: string) => void) | null>(null);
export const useOpenVideoFeed = () => useContext(OpenVideoFeedCtx);

// ─── Post actions context ─────────────────────────────────────────────────────
// Lets the per-post "···" menu remove a post from the feed (delete / not
// interested) without prop-drilling a callback through every card layer.
export type PostActionsCtxValue = { onRemovePost: (postId: string) => void };
export const PostActionsCtx = createContext<PostActionsCtxValue>({ onRemovePost: () => {} });
export const usePostActions = () => useContext(PostActionsCtx);

// ─── Feed audio (mute + active card) ──────────────────────────────────────────
// `muted` controls song-preview audio (defaults off → previews are audible).
// `videosMuted` controls feed video audio (defaults on → videos are silent until
// the user explicitly unmutes any one of them, which unmutes all).
// `activePostId` is the post currently driving auto-play, used by cards both to
// know if they should run and to know if they should highlight their mute icon.
export type FeedAudioCtxValue = {
  muted: boolean;
  toggleMuted: () => void;
  videosMuted: boolean;
  toggleVideosMuted: () => void;
  activePostId: string | null;
};
export const FeedAudioCtx = createContext<FeedAudioCtxValue>({
  muted: false,
  toggleMuted: () => {},
  videosMuted: true,
  toggleVideosMuted: () => {},
  activePostId: null,
});
export const useFeedAudio = () => useContext(FeedAudioCtx);
