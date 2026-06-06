import { useRef, useState, useEffect } from "react";
import { useLocalSearchParams } from "expo-router";
import { getFeedPosts, getLikedPostIds, togglePostLike, createPost } from "../services/posts";
import { Animated, Platform, Keyboard, Alert } from "react-native";
import { supabase } from "../lib/supabase";
import { getValidSpotifyToken } from "../lib/spotify";
import { type ConversationInfo } from "../services/messages";
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

  const fetchFeedPosts = async (userId?: string) => {
    try {
      setFeedPosts(await getFeedPosts());
      if (userId) setLikedPostIds(await getLikedPostIds(userId));
    } catch (e) {
      console.error("fetchFeedPosts:", e);
    }
  };

  // Toggle like with optimistic UI + DB sync via toggle_post_like RPC
  const onToggleLike = async (postId: string) => {
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
  };

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
      }

      const newPost = await createPost(payload);
      setFeedPosts((prev) => [newPost, ...prev]);
    } catch (e: any) {
      Alert.alert("Post failed", e.message ?? "Could not create post.");
      setQuickText(textToPost);
      setAttachedTrack(trackToPost);
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


  return { nowPlaying, menuVisible, setMenuVisible, activeNav, setActiveNav, quickReplyPost, setQuickReplyPost, detailPost, setDetailPost, openConv, setOpenConv, listenerMeetId, setListenerMeetId, listenerMinimized, setListenerMinimized, listenerInfo, setListenerInfo, listenerIsPublic, setListenerIsPublic, joinPromptMeetId, setJoinPromptMeetId, hostMeetId, setHostMeetId, hostMeetName, setHostMeetName, hostMeetToken, setHostMeetToken, hostMinimized, setHostMinimized, openListenerMeet, openHostMeet, keyboardUp, setKeyboardUp, feedScrollEnabled, setFeedScrollEnabled, feedRefreshing, setFeedRefreshing, feedPosts, setFeedPosts, currentUser, setCurrentUser, quickText, setQuickText, attachedTrack, setAttachedTrack, likedPostIds, setLikedPostIds, fetchFeedPosts, onToggleLike, handleQuickPost, onFeedRefresh, composerBottom, keyboardVisible, setKeyboardVisible, composerHeight, setComposerHeight };
}
