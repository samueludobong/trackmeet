import { useRef, useState, useEffect, useCallback } from "react";
import { useLocalSearchParams } from "expo-router";
import { getFeedPosts, getLikedPostIds, togglePostLike, createPost, getRepostedPostIds, togglePostRepost, getMyPollVotes, voteOnPoll } from "../services/posts";
import { Animated, Platform, Keyboard, Alert } from "react-native";
import { supabase } from "../lib/supabase";
import { getValidSpotifyToken, getOrCacheSongPreviewUrl } from "../lib/spotify";
import { type ConversationInfo } from "../services/messages";
import { joinOrStartDmJam } from "../services/meets";
import { type JamOther } from "../lib/feed/contexts";
import { useNowPlaying, type NowPlayingTrack } from "../hooks/useNowPlaying";
import { COMPOSER_ABOVE_NAV } from "../lib/feed/dimensions";
import { type ComposerUser } from "../types/composer";
import { ProfileView } from "../components/profile/ProfileView";
import { type Post } from "../app/data/mock";

export function useFeedScreen() {
  const nowPlaying = useNowPlaying();

  // Allow other screens (e.g. user-profile DM button) to open a specific tab / conversation
  const { openTab, openConvId, openConvUserId, openConvUserName, openConvAvatar, openMeetId } =
    useLocalSearchParams<{
      openTab?: string;
      openConvId?: string;
      openConvUserId?: string;
      openConvUserName?: string;
      openConvAvatar?: string;
      openMeetId?: string;
    }>();

  const [menuVisible, setMenuVisible] = useState(false);
  const [activeNav, setActiveNav] = useState(openTab ?? "Feed");
  const [quickReplyPost, setQuickReplyPost] = useState<Post | null>(null);
  const [detailPost, setDetailPost] = useState<Post | null>(null);
  const [openConv, setOpenConv]     = useState<ConversationInfo | null>(null);
  const [listenerMeetId, setListenerMeetId] = useState<string | null>(null);
  const [listenerMinimized, setListenerMinimized] = useState(false);
  const [listenerInfo, setListenerInfo] = useState<{ name: string; trackName: string | null; albumArt: string | null } | null>(null);
  const [listenerIsPublic, setListenerIsPublic] = useState(false);
  // Meet awaiting a public/private choice before the listener room opens.
  const [joinPromptMeetId, setJoinPromptMeetId] = useState<string | null>(null);

  // Host meet session — hoisted here (out of ProfileView) so the room and its
  // minimized mini-bar survive tab switches.
  const [hostMeetId,    setHostMeetId]    = useState<string | null>(null);
  const [hostMeetName,  setHostMeetName]  = useState("");
  const [hostMeetToken, setHostMeetToken] = useState<string | null>(null);
  const [hostMinimized, setHostMinimized] = useState(false);

  const openListenerMeet = (id: string, isPublic?: boolean) => {
    // Already in this room (e.g. minimized) → just restore it to fullscreen.
    // Never re-join or re-show the join prompt/guide for a room we're in.
    if (listenerMeetId === id) { setListenerMinimized(false); return; }
    // No choice yet → ask the joiner whether to join publicly or privately.
    if (isPublic === undefined) { setJoinPromptMeetId(id); return; }
    setListenerIsPublic(isPublic);
    setListenerMeetId(id);
    setListenerMinimized(false);
  };
  const openHostMeet = (meetId: string, name: string) => {
    setHostMeetId(meetId); setHostMeetName(name); setHostMinimized(false);
    if (currentUser?.id) getValidSpotifyToken(currentUser.id).then(setHostMeetToken);
  };

  // ── DM Jam (hostless, private co-listening scoped to a conversation) ──────────
  const [jamMeetId,    setJamMeetId]    = useState<string | null>(null);
  const [jamConvId,    setJamConvId]    = useState<string | null>(null);
  const [jamOther,     setJamOther]     = useState<JamOther | null>(null);
  const [jamToken,     setJamToken]     = useState<string | null>(null);
  const [jamMinimized, setJamMinimized] = useState(false);

  const openJam = async (conversationId: string, other: JamOther) => {
    // Already in this conversation's jam (e.g. minimized) → just restore it.
    if (jamConvId === conversationId && jamMeetId) { setJamMinimized(false); return; }
    setJamOther(other);
    setJamConvId(conversationId);
    if (currentUser?.id) getValidSpotifyToken(currentUser.id).then(setJamToken);
    const { meetId } = await joinOrStartDmJam(conversationId);
    if (meetId) { setJamMeetId(meetId); setJamMinimized(false); }
  };
  const closeJam = () => { setJamMeetId(null); setJamConvId(null); setJamOther(null); setJamToken(null); setJamMinimized(false); };

  // Auto-open the listener room when navigated here from a meet-incoming push
  useEffect(() => {
    if (openMeetId) openListenerMeet(String(openMeetId));
  }, [openMeetId]);

  // Auto-open a conversation when navigated here from user-profile DM button
  useEffect(() => {
    if (openConvId && openConvUserId && openConvUserName) {
      setOpenConv({
        conversationId: openConvId,
        otherUser: { id: openConvUserId, username: openConvUserName, display_name: null, avatar_url: openConvAvatar || null },
        last_message_at: null,
        last_message_preview: null,
      });
    }
  }, [openConvId]);
  const [keyboardUp, setKeyboardUp] = useState(false);
  const [feedScrollEnabled, setFeedScrollEnabled] = useState(true);
  const [feedRefreshing, setFeedRefreshing] = useState(false);
  const [feedPosts, setFeedPosts] = useState<Post[]>([]);
  const [currentUser, setCurrentUser] = useState<ComposerUser | null>(null);
  const [quickText, setQuickText] = useState("");
  const [attachedTrack, setAttachedTrack] = useState<NowPlayingTrack | null>(null);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [repostedPostIds, setRepostedPostIds] = useState<Set<string>>(new Set());
  const [pollVotes, setPollVotes] = useState<Map<string, string>>(new Map());

  const fetchFeedPosts = async (userId?: string) => {
    try {
      setFeedPosts(await getFeedPosts());
      if (userId) {
        const [liked, reposted, votes] = await Promise.all([
          getLikedPostIds(userId),
          getRepostedPostIds(userId),
          getMyPollVotes(userId),
        ]);
        setLikedPostIds(liked);
        setRepostedPostIds(reposted);
        setPollVotes(votes);
      }
    } catch (e) {
      console.error("fetchFeedPosts:", e);
    }
  };

  // Toggle like with optimistic UI + DB sync via toggle_post_like RPC.
  // useCallback so consumers in <FeedUserCtx.Provider value={…}> get a stable
  // identity — without it the context value changes every 1s tick of
  // useNowPlaying and every consumer re-renders.
  const onToggleLike = useCallback(async (postId: string) => {
    if (!currentUser) return;
    // Optimistic toggle
    setLikedPostIds((prev) => {
      const next = new Set(prev);
      next.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
    try {
      const data = await togglePostLike(postId, currentUser.id);
      if (data) {
        setFeedPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, likes: data.likes_count } : p))
        );
        setLikedPostIds((prev) => {
          const next = new Set(prev);
          data.liked ? next.add(postId) : next.delete(postId);
          return next;
        });
      }
    } catch (e) {
      // Revert optimistic toggle on failure
      setLikedPostIds((prev) => {
        const next = new Set(prev);
        next.has(postId) ? next.delete(postId) : next.add(postId);
        return next;
      });
      console.error("toggle_post_like:", e);
    }
  }, [currentUser]);

  /**
   * Toggle a repost. Same pattern as like: optimistic flip, RPC sync, revert
   * on failure. The RPC keeps `posts.reposts_count` in sync so the feed
   * card's badge updates on the next render.
   */
  const onToggleRepost = useCallback(async (postId: string) => {
    if (!currentUser) return;
    setRepostedPostIds((prev) => {
      const next = new Set(prev);
      next.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
    try {
      const data = await togglePostRepost(postId, currentUser.id);
      if (data) {
        setFeedPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, reposts: data.reposts_count } : p))
        );
        setRepostedPostIds((prev) => {
          const next = new Set(prev);
          data.reposted ? next.add(postId) : next.delete(postId);
          return next;
        });
      }
    } catch (e) {
      setRepostedPostIds((prev) => {
        const next = new Set(prev);
        next.has(postId) ? next.delete(postId) : next.add(postId);
        return next;
      });
      console.error("toggle_post_repost:", e);
    }
  }, [currentUser]);

  /**
   * Cast a poll vote. Idempotent against double-tapping the same option.
   * Optimistically updates the user's selection + per-option counts, then
   * reconciles against the RPC's authoritative response. The RPC bases
   * "previous option" on poll_votes (not the client), so the bug where the
   * same user could vote forever by reopening the post is closed.
   */
  const pollVotesRef = useRef(pollVotes);
  pollVotesRef.current = pollVotes;
  const onVoteOnPoll = useCallback(async (postId: string, optId: string) => {
    const pollVotes = pollVotesRef.current;
    if (!currentUser) return;
    const prevOptId = pollVotes.get(postId) ?? null;
    if (prevOptId === optId) return; // already voted for this option

    // Optimistic: update vote map + per-option counts on the post.
    setPollVotes((prev) => {
      const next = new Map(prev);
      next.set(postId, optId);
      return next;
    });
    setFeedPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId || !p.pollOptions) return p;
        const nextOpts = p.pollOptions.map((o) => {
          if (o.id === optId)              return { ...o, votes: o.votes + 1 };
          if (prevOptId && o.id === prevOptId) return { ...o, votes: Math.max(0, o.votes - 1) };
          return o;
        });
        return { ...p, pollOptions: nextOpts };
      })
    );

    try {
      const { data, error } = await voteOnPoll(postId, optId);
      if (error) throw error;
      // Server-authoritative options come back — re-sync.
      if (data?.options) {
        setFeedPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, pollOptions: data.options } : p))
        );
      }
    } catch (e) {
      // Revert vote + counts.
      setPollVotes((prev) => {
        const next = new Map(prev);
        if (prevOptId) next.set(postId, prevOptId); else next.delete(postId);
        return next;
      });
      setFeedPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId || !p.pollOptions) return p;
          const reverted = p.pollOptions.map((o) => {
            if (o.id === optId)              return { ...o, votes: Math.max(0, o.votes - 1) };
            if (prevOptId && o.id === prevOptId) return { ...o, votes: o.votes + 1 };
            return o;
          });
          return { ...p, pollOptions: reverted };
        })
      );
      console.error("vote_on_poll:", e);
    }
  }, [currentUser]);

  // Post directly from the floating quick-field without opening the sheet.
  // If a track is attached the post type becomes "music" and song_data is stored.
  const handleQuickPost = async () => {
    const hasText  = quickText.trim().length > 0;
    const hasTrack = attachedTrack !== null;
    if (!currentUser || (!hasText && !hasTrack)) return;

    const textToPost   = quickText.trim();
    const trackToPost  = attachedTrack;
    setQuickText("");
    setAttachedTrack(null);
    Keyboard.dismiss();

    try {
      const payload: Record<string, any> = {
        user_id: currentUser.id,
        type: hasTrack ? "music" : "text",
        text: textToPost || null,
      };
      if (trackToPost) {
        payload.song_id        = trackToPost.id;
        payload.song_name      = trackToPost.name;
        payload.song_artist    = trackToPost.artist;
        payload.song_album_art = trackToPost.albumArt ?? null;
        // Cache the 30s preview to our bucket so the feed can stream it without
        // re-scraping. Null on failure — the post still posts, just without preview.
        const previewUrl = await getOrCacheSongPreviewUrl(trackToPost.id);
        if (previewUrl) payload.song_preview_url = previewUrl;
      }

      const newPost = await createPost(payload);
      setFeedPosts((prev) => [newPost, ...prev]);
    } catch (e: any) {
      Alert.alert("Post failed", e.message ?? "Could not create post.");
      setQuickText(textToPost);
      setAttachedTrack(trackToPost);
    }
  };

  /** Post a voice note (uploads the local recording, then creates a 'voice' post). */
  const handleVoicePost = async ({ uri, durationMs }: { uri: string; durationMs: number }) => {
    if (!currentUser) return;
    try {
      const { uploadImageToStorage } = await import("../services/storage");
      const ext = uri.split(".").pop()?.toLowerCase() || "m4a";
      // m4a on iOS, sometimes 3gp/webm on Android — pick a sensible audio MIME.
      const mime =
        ext === "m4a" || ext === "mp4" ? "audio/m4a" :
        ext === "aac"                  ? "audio/aac" :
        ext === "wav"                  ? "audio/wav" :
        ext === "webm"                 ? "audio/webm" :
                                         "audio/mpeg";
      const publicUrl = await uploadImageToStorage(
        "post-audio",
        `${currentUser.id}/voice-${Date.now()}.${ext}`,
        uri,
        mime,
      );
      const newPost = await createPost({
        user_id: currentUser.id,
        type: "voice",
        text: quickText.trim() || null,
        voice_url: publicUrl,
        voice_duration_ms: Math.min(30_000, durationMs),
      });
      setQuickText("");
      setFeedPosts((prev) => [newPost, ...prev]);
    } catch (e: any) {
      Alert.alert("Voice post failed", e?.message ?? "Could not upload.");
    }
  };

  // Load current user + initial posts on mount
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("users")
          .select("username, display_name, avatar_url")
          .eq("id", user.id)
          .single();
        if (data) setCurrentUser({ id: user.id, ...data });
        fetchFeedPosts(user.id);
      } else {
        fetchFeedPosts();
      }
    })();
  }, []);

  const onFeedRefresh = async () => {
    setFeedRefreshing(true);
    await fetchFeedPosts(currentUser?.id);
    setFeedRefreshing(false);
  };

  // Composer bottom animates between resting position (above nav) and above keyboard
  const composerBottom = useRef(new Animated.Value(COMPOSER_ABOVE_NAV)).current;

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvt, (e) => {
      setKeyboardUp(true);
      Animated.timing(composerBottom, {
        toValue: e.endCoordinates.height + 8,
        duration: Platform.OS === "ios" ? (e.duration ?? 260) : 260,
        useNativeDriver: false,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvt, (e) => {
      setKeyboardUp(false);
      Animated.timing(composerBottom, {
        toValue: COMPOSER_ABOVE_NAV,
        duration: Platform.OS === "ios" ? (e.duration ?? 260) : 260,
        useNativeDriver: false,
      }).start();
    });

    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Measured height of the floating composer stack, used to park the minimized
  // MeetMiniBar directly above it on the Feed tab.
  const [composerHeight, setComposerHeight] = useState(0);

useEffect(() => {
  const showSub = Keyboard.addListener('keyboardDidShow', () => {
    setKeyboardVisible(true);
  });

  const hideSub = Keyboard.addListener('keyboardDidHide', () => {
    setKeyboardVisible(false);
  });

  return () => {
    showSub.remove();
    hideSub.remove();
  };
}, []);


  return { nowPlaying, menuVisible, setMenuVisible, activeNav, setActiveNav, quickReplyPost, setQuickReplyPost, detailPost, setDetailPost, openConv, setOpenConv, listenerMeetId, setListenerMeetId, listenerMinimized, setListenerMinimized, listenerInfo, setListenerInfo, listenerIsPublic, setListenerIsPublic, joinPromptMeetId, setJoinPromptMeetId, hostMeetId, setHostMeetId, hostMeetName, setHostMeetName, hostMeetToken, setHostMeetToken, hostMinimized, setHostMinimized, openListenerMeet, openHostMeet, jamMeetId, jamOther, jamToken, jamMinimized, setJamMinimized, openJam, closeJam, keyboardUp, setKeyboardUp, feedScrollEnabled, setFeedScrollEnabled, feedRefreshing, setFeedRefreshing, feedPosts, setFeedPosts, currentUser, setCurrentUser, quickText, setQuickText, attachedTrack, setAttachedTrack, likedPostIds, setLikedPostIds, repostedPostIds, setRepostedPostIds, pollVotes, setPollVotes, onVoteOnPoll, fetchFeedPosts, onToggleLike, onToggleRepost, handleQuickPost, handleVoicePost, onFeedRefresh, composerBottom, keyboardVisible, setKeyboardVisible, composerHeight, setComposerHeight };
}
