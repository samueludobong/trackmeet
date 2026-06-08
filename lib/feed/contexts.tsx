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
};
export const FeedUserCtx = createContext<FeedUserCtxValue>({
  currentUserId: null,
  likedPostIds: new Set(),
  onToggleLike: () => {},
});

// ─── Post actions context ─────────────────────────────────────────────────────
// Lets the per-post "···" menu remove a post from the feed (delete / not
// interested) without prop-drilling a callback through every card layer.
export type PostActionsCtxValue = { onRemovePost: (postId: string) => void };
export const PostActionsCtx = createContext<PostActionsCtxValue>({ onRemovePost: () => {} });
export const usePostActions = () => useContext(PostActionsCtx);
