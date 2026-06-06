import { useRef, useState, useEffect } from "react";
import { Animated, PanResponder } from "react-native";
import { supabase } from "../lib/supabase";
import { getUserPlaylists, getValidSpotifyToken, type SpotifyPlaylist } from "../lib/spotify";
import { type CuratedPlaylist } from "../lib/feed/types";
import { dbRowToPost } from "../lib/feed/helpers";
import { feedCache } from "../lib/feed/caches";
import { SW } from "../lib/feed/dimensions";
import { PROFILE_TABS, type Post, type ProfileTab } from "../app/data/mock";

/** Loads the posts + curated/Spotify playlists shown in the profile tab strip. */
export function useProfileTabsData(userId: string | null, readOnly: boolean) {
  const [active, setActive]             = useState<ProfileTab>("Posts");
  // Own profile reuses the session-wide feedCache.myPosts; a read-only view of
  // someone else's profile must never read/write that cache (it'd clobber the
  // viewer's own posts), so it keeps posts in local state only.
  const [myPosts, setMyPosts]           = useState<Post[]>(readOnly ? [] : (feedCache.myPosts ?? []));
  const [postsLoading, setPostsLoading] = useState(readOnly ? true : !feedCache.myPosts);
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const contentAnim   = useRef(new Animated.Value(1)).current;
  const activeRef     = useRef<ProfileTab>("Posts");
  const tabWidth = (SW - 32) / PROFILE_TABS.length;

  // ── Playlist state ─────────────────────────────────────────────────────────
  const [playlistFilter, setPlaylistFilter] = useState<'curated' | 'spotify'>('curated');
  const [curatedPlaylists, setCuratedPlaylists] = useState<CuratedPlaylist[]>([]);
  const [curatedLoading, setCuratedLoading]     = useState(false);
  const [curatedLoaded, setCuratedLoaded]       = useState(false);
  const [spotifyPlaylists, setSpotifyPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [spLoading, setSpLoading]               = useState(false);
  const [spLoaded, setSpLoaded]                 = useState(false);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [openCurated, setOpenCurated]   = useState<CuratedPlaylist | null>(null);
  const [openSpotify, setOpenSpotify]   = useState<SpotifyPlaylist | null>(null);

  // ── Posts effect ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    // Own profile: honor the cache. Read-only: always fetch fresh, never cache.
    if (!readOnly && feedCache.myPosts) return;
    setPostsLoading(true);
    supabase
      .from("posts")
      .select("id, type, text, media_urls, song_id, song_name, song_artist, song_album_art, poll_question, poll_options, created_at, likes_count, comments_count, users!user_id(id, username, display_name, avatar_url)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (!error && data) {
          const posts = data.map(dbRowToPost);
          if (!readOnly) feedCache.myPosts = posts;
          setMyPosts(posts);
        }
        setPostsLoading(false);
      });
  }, [userId, readOnly]);

  // ── Load curated playlists when tab is active ──────────────────────────────
  useEffect(() => {
    if (active !== 'Playlists' || playlistFilter !== 'curated' || curatedLoaded || !userId) return;
    setCuratedLoading(true);
    supabase
      .from('curated_playlists')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setCuratedPlaylists((data ?? []) as CuratedPlaylist[]);
        setCuratedLoading(false);
        setCuratedLoaded(true);
      });
  }, [active, playlistFilter, userId, curatedLoaded]);

  // ── Load Spotify playlists when tab is active ──────────────────────────────
  useEffect(() => {
    if (active !== 'Playlists' || playlistFilter !== 'spotify' || spLoaded || !userId) return;
    setSpLoading(true);
    getValidSpotifyToken(userId).then(async token => {
      if (!token) { setSpLoading(false); return; }
      const pls = await getUserPlaylists(token);
      setSpotifyPlaylists(pls);
      setSpLoading(false);
      setSpLoaded(true);
    });
  }, [active, playlistFilter, userId, spLoaded]);

  // ── Tab switcher ───────────────────────────────────────────────────────────
  const switchTo = (tab: ProfileTab, index: number) => {
    activeRef.current = tab;
    setActive(tab);
    contentAnim.setValue(1);
    Animated.timing(contentAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    Animated.spring(indicatorAnim, { toValue: index * tabWidth, useNativeDriver: true, damping: 22, stiffness: 280 }).start();
  };

  // Swipe left/right to change tabs
  const swipePan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, { dx, dy }) =>
      Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 2,
    onShouldBlockNativeResponder: () => false,
    onPanResponderRelease: (_, { dx, vx }) => {
      const idx = PROFILE_TABS.indexOf(activeRef.current);
      if ((dx < -50 || vx < -0.5) && idx < PROFILE_TABS.length - 1) {
        const next = idx + 1;
        activeRef.current = PROFILE_TABS[next];
        setActive(PROFILE_TABS[next]);
        contentAnim.setValue(0.5);
        Animated.timing(contentAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
        Animated.spring(indicatorAnim, { toValue: next * tabWidth, useNativeDriver: true, damping: 22, stiffness: 280 }).start();
      } else if ((dx > 50 || vx > 0.5) && idx > 0) {
        const prev = idx - 1;
        activeRef.current = PROFILE_TABS[prev];
        setActive(PROFILE_TABS[prev]);
        contentAnim.setValue(0.5);
        Animated.timing(contentAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
        Animated.spring(indicatorAnim, { toValue: prev * tabWidth, useNativeDriver: true, damping: 22, stiffness: 280 }).start();
      }
    },
  })).current;

  // ── Render content ─────────────────────────────────────────────────────────
  return { active, setActive, myPosts, setMyPosts, postsLoading, setPostsLoading, indicatorAnim, contentAnim, activeRef, tabWidth, playlistFilter, setPlaylistFilter, curatedPlaylists, setCuratedPlaylists, curatedLoading, setCuratedLoading, curatedLoaded, setCuratedLoaded, spotifyPlaylists, setSpotifyPlaylists, spLoading, setSpLoading, spLoaded, setSpLoaded, showCreatePlaylist, setShowCreatePlaylist, openCurated, setOpenCurated, openSpotify, setOpenSpotify, switchTo, swipePan };
}
