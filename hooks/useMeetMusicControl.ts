import { useRef, useState, useEffect } from "react";
import { Animated, PanResponder } from "react-native";
import { useVideoPlayer } from "expo-video";
import { searchSpotifyTracks, getUserPlaylists, getPlaylistTracks, getValidSpotifyToken, skipPrevious, skipNext, setPlayback, playTrack, fetchSpotifyCanvas, type SpotifyTrackResult, type SpotifyPlaylist } from "../lib/spotify";
import { SW, SH } from "../lib/feed/dimensions";
import { type NowPlayingTrack } from "./useNowPlaying";

/** Spotify browse + playback control + canvas video for the host's live-meet screen. */
export function useMeetMusicControl({ visible, accessToken, userId, track, liveProgressMs, onControl }: {
  visible: boolean; accessToken: string | null; userId: string | null;
  track: NowPlayingTrack | null; liveProgressMs: number;
  // In a co-controlled DM jam, fired before any playback action so the actor
  // claims the "driver" role. Undefined (no-op) for normal host meets.
  onControl?: () => void;
}) {
  const slideAnim   = useRef(new Animated.Value(SH)).current;
  const musicSlideX = useRef(new Animated.Value(SW)).current;  // slides in from right

  // ── Page 1 state ──────────────────────────────────────────────────────────
  const [canvasUrl,   setCanvasUrl]   = useState<string | null>(null);
  const [ctrlLoading, setCtrlLoading] = useState(false);
  const [pickerOpen,  setPickerOpen]  = useState(false);

  // ── Page 2 state ──────────────────────────────────────────────────────────
  // apiToken is always a refreshed, valid token — used for all Spotify API calls
  const [apiToken,         setApiToken]         = useState<string | null>(null);
  const [playlists,        setPlaylists]        = useState<SpotifyPlaylist[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<SpotifyPlaylist | null>(null);
  const [playlistTracks,   setPlaylistTracks]   = useState<SpotifyTrackResult[]>([]);
  const [tracksLoading,    setTracksLoading]    = useState(false);
  const [tracksError,      setTracksError]      = useState<number | null>(null);
  const [searchQuery,      setSearchQuery]      = useState('');
  const [searchResults,    setSearchResults]    = useState<SpotifyTrackResult[]>([]);
  const [searchLoading,    setSearchLoading]    = useState(false);
  const [playingId,        setPlayingId]        = useState<string | null>(null);

  // Canvas video player — always created at hook level; source swapped when found
  const player = useVideoPlayer(null, (p) => { p.loop = true; });

  // Fetch a guaranteed-valid token whenever the screen opens
  useEffect(() => {
    if (!visible || !userId) return;
    getValidSpotifyToken(userId).then((t) => { if (t) setApiToken(t); });
  }, [visible, userId]);

  // Keep playingId in sync with the currently playing track
  useEffect(() => { if (track?.id) setPlayingId(track.id); }, [track?.id]);

  // ── Music picker open / close ─────────────────────────────────────────────
  const openMusicPicker = () => {
    setPickerOpen(true);
    Animated.spring(musicSlideX, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }).start();
  };
  const closeMusicPicker = (instant = false) => {
    const done = () => {
      setPickerOpen(false);
      setSelectedPlaylist(null);
      setPlaylistTracks([]);
      setTracksLoading(false);
      setTracksError(null);
      setSearchQuery('');
      setSearchResults([]);
    };
    if (instant) { musicSlideX.setValue(SW); done(); }
    else Animated.timing(musicSlideX, { toValue: SW, useNativeDriver: true, duration: 240 }).start(done);
  };

  // ── Swipe-to-open the music picker ────────────────────────────────────────
  // A horizontal right-swipe anywhere on the now-playing page opens the picker.
  // Ref keeps the gesture from re-firing while the panel is already open.
  const pickerOpenRef = useRef(false);
  pickerOpenRef.current = pickerOpen;
  // Attached to the ROOT of the page with a *capturing* move handler so a
  // clearly-horizontal left-drag opens the picker (which slides in from the
  // right edge) no matter where on screen it starts — even over the top bar,
  // controls, chat, or input. Taps and vertical scrolls fail the threshold and
  // pass straight through to those children.
  const musicPan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, { dx, dy }) =>
        !pickerOpenRef.current && dx < -12 && Math.abs(dx) > Math.abs(dy) * 1.6,
      onPanResponderRelease: (_, { dx, vx }) => {
        if (!pickerOpenRef.current && (dx < -55 || vx < -0.25)) openMusicPicker();
      },
    }),
  ).current;

  // ── Modal slide animation ─────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 180 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: SH, useNativeDriver: true, duration: 280 }).start();
      setCanvasUrl(null);
      player.pause();
      closeMusicPicker(true);
      setPlaylists([]);
      setApiToken(null);
    }
  }, [visible]);

  // ── Canvas fetch ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!visible || !track?.id || !accessToken) { setCanvasUrl(null); return; }
    let cancelled = false;
    fetchSpotifyCanvas(track.id, accessToken).then((url) => {
      if (cancelled) return;
      setCanvasUrl(url);
      if (url) { player.replace(url); player.loop = true; player.play(); }
      else      { player.pause(); }
    });
    return () => { cancelled = true; };
  }, [track?.id, accessToken, visible]);

  // ── Load playlists once apiToken is ready ────────────────────────────────
  useEffect(() => {
    if (!apiToken || playlists.length > 0) return;
    setPlaylistsLoading(true);
    getUserPlaylists(apiToken).then((list) => {
      setPlaylists(list);
      setPlaylistsLoading(false);
    });
  }, [apiToken]);

  // ── Search debounce ──────────────────────────────────────────────────────
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      if (!apiToken) return;
      setSearchLoading(true);
      const res = await searchSpotifyTracks(apiToken, q);
      setSearchResults(res);
      setSearchLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery, apiToken]);

  // ── Playlist drill-down ──────────────────────────────────────────────────
  // tracksLoading is set to true synchronously by selectPlaylist() before this fires.
  // We always call getValidSpotifyToken fresh here to guarantee a non-stale token —
  // the apiToken state is good for playlists list but a playlist tap may come later.
  useEffect(() => {
    if (!selectedPlaylist || !userId) return;
    let cancelled = false;
    (async () => {
      // Refresh token on every drill-down so we never hit a stale 401
      const freshToken = await getValidSpotifyToken(userId);
      if (!freshToken || cancelled) { setTracksLoading(false); return; }
      const { tracks, httpError } = await getPlaylistTracks(freshToken, selectedPlaylist.id);
      if (cancelled) return;
      setPlaylistTracks(tracks);
      setTracksError(httpError ?? null);
      setTracksLoading(false);
    })();
    return () => { cancelled = true; };
  }, [selectedPlaylist?.id]);

  // ── Playlist selection (sets loading immediately to avoid empty flicker) ──
  const selectPlaylist = (pl: SpotifyPlaylist) => {
    setSelectedPlaylist(pl);
    setPlaylistTracks([]);
    setTracksError(null);
    setTracksLoading(true);
  };

  // ── Playback helpers ─────────────────────────────────────────────────────
  // Prefer apiToken (auto-refreshed) over the raw accessToken prop (may be stale)
  const tok = apiToken ?? accessToken;

  const handlePrev = async () => {
    if (!tok || ctrlLoading) return;
    onControl?.();
    setCtrlLoading(true);
    await skipPrevious(tok);
    setTimeout(() => setCtrlLoading(false), 800);
  };
  const handleNext = async () => {
    if (!tok || ctrlLoading) return;
    onControl?.();
    setCtrlLoading(true);
    await skipNext(tok);
    setTimeout(() => setCtrlLoading(false), 800);
  };
  const handlePlayPause = async () => {
    if (!tok || ctrlLoading || !track) return;
    onControl?.();
    setCtrlLoading(true);
    await setPlayback(tok, !track.isPlaying);
    setTimeout(() => setCtrlLoading(false), 600);
  };
  const handlePlayTrack = async (t: SpotifyTrackResult) => {
    if (!tok) return;
    onControl?.();
    setPlayingId(t.id);
    await playTrack(tok, `spotify:track:${t.id}`);
  };

  // ── Progress ─────────────────────────────────────────────────────────────
  const fmtMs = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };
  const progressPct = track?.durationMs ? Math.min(liveProgressMs / track.durationMs, 1) : 0;

  // ── Page 2 content ───────────────────────────────────────────────────────
  const isSearching  = searchQuery.trim().length > 0;
  const showTracks   = !isSearching && selectedPlaylist !== null;
  const p2Loading    = isSearching ? searchLoading : showTracks ? tracksLoading : playlistsLoading;
  const p2Title      = isSearching ? "Search" : showTracks ? (selectedPlaylist?.name ?? "Playlist") : "Your Music";

  return { slideAnim, musicSlideX, canvasUrl, setCanvasUrl, ctrlLoading, setCtrlLoading, pickerOpen, setPickerOpen, apiToken, setApiToken, playlists, setPlaylists, playlistsLoading, setPlaylistsLoading, selectedPlaylist, setSelectedPlaylist, playlistTracks, setPlaylistTracks, tracksLoading, setTracksLoading, tracksError, setTracksError, searchQuery, setSearchQuery, searchResults, setSearchResults, searchLoading, setSearchLoading, playingId, setPlayingId, player, openMusicPicker, closeMusicPicker, pickerOpenRef, musicPan, selectPlaylist, tok, handlePrev, handleNext, handlePlayPause, handlePlayTrack, fmtMs, progressPct, isSearching, showTracks, p2Loading, p2Title };
}
