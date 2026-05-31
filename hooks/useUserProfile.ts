import { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { type OtherUserProfile } from "../types/profile";
import { supabase } from "../lib/supabase";
import { getValidSpotifyToken } from "../lib/spotify";
import { getOrCreateConversation } from "../services/messages";
import { followUser, unfollowUser, checkIsFollowing } from "../services/follows";
import { getActiveMeetForUser, type ActiveMeetForUser } from "../services/meets";
import { ProfileTabs } from "../components/profile/ProfileTabs";

export function useUserProfile() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();

  const [profile,        setProfile]        = useState<OtherUserProfile | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [isFollowing,       setIsFollowing]       = useState(false);
  const [followLoading,     setFollowLoading]     = useState(false);
  const [followersCount,    setFollowersCount]    = useState(0);
  const [currentUserId,     setCurrentUserId]     = useState<string | null>(null);
  const [viewerToken,       setViewerToken]       = useState<string | null>(null);
  const [pinnedPreviewOpen, setPinnedPreviewOpen] = useState(false);
  const [socialLinksSheetOpen, setSocialLinksSheetOpen] = useState(false);
  // The viewed user's active *public* meet, if any (private ones stay hidden).
  const [publicMeet,        setPublicMeet]        = useState<ActiveMeetForUser | null>(null);
  // Posts the viewer has liked — powers the heart state in the read-only tabs.
  const [likedPostIds,      setLikedPostIds]      = useState<Set<string>>(new Set());

  useEffect(() => { loadProfile(); }, [userId]);

  // Load which posts the viewer has already liked (drives ProfileTabs' hearts).
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("post_likes").select("post_id").eq("user_id", user.id);
      if (data) setLikedPostIds(new Set(data.map((r: any) => r.post_id)));
    })();
  }, []);

  // Toggle a like with optimistic UI + DB sync (mirrors the feed's behavior).
  const onToggleLike = async (postId: string) => {
    if (!currentUserId) return;
    setLikedPostIds(prev => {
      const next = new Set(prev);
      next.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
    try {
      const { data, error } = await supabase.rpc("toggle_post_like", { p_post_id: postId, p_user_id: currentUserId });
      if (error) throw error;
      if (data) setLikedPostIds(prev => {
        const next = new Set(prev);
        (data as any).liked ? next.add(postId) : next.delete(postId);
        return next;
      });
    } catch (e) {
      setLikedPostIds(prev => {
        const next = new Set(prev);
        next.has(postId) ? next.delete(postId) : next.add(postId);
        return next;
      });
      console.error("toggle_post_like:", e);
    }
  };

  // Viewer's own Spotify token for Open/Save
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const token = await getValidSpotifyToken(user.id);
      if (token) setViewerToken(token);
    })();
  }, []);

  // Viewing your own profile? Send the user to the real Profile tab instead of
  // this read-only view.
  useEffect(() => {
    if (currentUserId && userId && currentUserId === userId) {
      router.replace({ pathname: "/feed", params: { openTab: "Profile" } });
    }
  }, [currentUserId, userId]);

  // Live song sync — realtime + 5-second polling fallback
  useEffect(() => {
    if (!userId) return;
    const SONG_COLS = "current_song_name, current_song_artist, current_song_id, current_song_album_art, current_song_duration_ms, current_song_progress_ms, current_song_updated_at";

    const syncSong = async () => {
      const { data } = await supabase.from("users").select(SONG_COLS).eq("id", userId).single();
      if (data) setProfile(prev => prev ? { ...prev, ...data } : null);
    };

    const ch = supabase
      .channel(`profile-song:${userId}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "users", filter: `id=eq.${userId}`,
      }, (payload) => {
        setProfile(prev => prev ? { ...prev, ...(payload.new as Partial<OtherUserProfile>) } : null);
      })
      .subscribe();

    const pollId = setInterval(syncSong, 5_000);
    return () => { supabase.removeChannel(ch); clearInterval(pollId); };
  }, [userId]);

  // Whether the viewed user is publicly in a meet — drives the meet now-playing
  // variant + Join button. Private participation is excluded (publicOnly).
  useEffect(() => {
    if (!userId) return;
    let active = true;
    const load = async () => {
      const m = await getActiveMeetForUser(userId, true);
      if (active) setPublicMeet(m);
    };
    load();
    const id = setInterval(load, 8_000);
    return () => { active = false; clearInterval(id); };
  }, [userId]);

  // Open the feed and let it prompt the viewer to join publicly/privately.
  const handleJoinMeet = () => {
    if (!publicMeet) return;
    router.replace({ pathname: "/feed", params: { openMeetId: publicMeet.meet.id } });
  };

  const loadProfile = async () => {
    if (!userId) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);

      const { data, error } = await supabase
        .from("users")
        .select(
          "id, username, display_name, bio, is_verified, followers_count, following_count, " +
          "avatar_url, banner_color, banner_image_url, banner_shape, banner_shape_color, " +
          "current_song_name, current_song_artist, current_song_id, current_song_album_art, " +
          "current_song_duration_ms, current_song_progress_ms, current_song_updated_at, " +
          "top_genres, account_type, pinned_song_id, pinned_song_name, pinned_song_artist, pinned_song_album_art, social_links, profile_links"
        )
        .eq("id", userId)
        .single<OtherUserProfile>();

      if (error) throw error;
      setProfile(data);
      setFollowersCount(data.followers_count ?? 0);

      if (user && user.id !== userId) {
        const following = await checkIsFollowing(userId);
        setIsFollowing(following);
      }
    } catch (err) {
      console.error("loadProfile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!profile || followLoading) return;
    setFollowLoading(true);
    if (isFollowing) {
      const r = await unfollowUser(profile.id);
      if (!r.error) { setIsFollowing(false); setFollowersCount(c => Math.max(0, c - 1)); }
    } else {
      const r = await followUser(profile.id);
      if (!r.error) { setIsFollowing(true); setFollowersCount(c => c + 1); }
    }
    setFollowLoading(false);
  };

  const handleDM = async () => {
    if (!profile) return;
    const convId = await getOrCreateConversation(profile.id);
    if (!convId) return;
    router.replace({
      pathname: "/feed",
      params: {
        openTab: "Messages",
        openConvId: convId,
        openConvUserId: profile.id,
        openConvUserName: profile.username,
        openConvAvatar: profile.avatar_url ?? "",
      },
    });
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const f = parts[0]?.charAt(0).toUpperCase() ?? "";
    const l = parts.length > 1 ? parts[parts.length - 1].charAt(0).toUpperCase() : "";
    return `${f}${l}`;
  };

  const isOwnProfile = currentUserId === userId;


  return { userId, router, profile, setProfile, loading, setLoading, isFollowing, setIsFollowing, followLoading, setFollowLoading, followersCount, setFollowersCount, currentUserId, setCurrentUserId, viewerToken, setViewerToken, pinnedPreviewOpen, setPinnedPreviewOpen, socialLinksSheetOpen, setSocialLinksSheetOpen, publicMeet, setPublicMeet, likedPostIds, setLikedPostIds, onToggleLike, handleJoinMeet, loadProfile, handleFollow, handleDM, getInitials, isOwnProfile };
}
