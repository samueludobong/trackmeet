import { useRef, useState, useEffect } from "react";
import { Animated } from "react-native";
import { Audio } from "expo-av";
import { supabase } from "../lib/supabase";
import { searchSpotifyTracks, getCurrentlyPlaying, getUserPlaylists, getPlaylistTracks, type SpotifyTrackResult, type SpotifyPlaylist } from "../lib/spotify";
import { isTrackInAnyPlaylist } from "../services/playlists";
import { ms } from "../lib/feed/localStyles";
import { type PinnedSong, type NowPlayingSnap } from "../types/music";
import { type PinStep } from "../types/profile";

export function usePinnedSongPicker({ visible, onClose, onSelect, accessToken }: { visible: boolean; onClose: () => void; onSelect: (song: PinnedSong) => void; accessToken: string | null }) {
  const [step, setStep] = useState<PinStep>("home");
  const [nowPlaying, setNowPlaying] = useState<NowPlayingSnap>(null);
  const [loadingNow, setLoadingNow] = useState(false);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [playlistTracks, setPlaylistTracks] = useState<SpotifyTrackResult[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SpotifyTrackResult[]>([]);
  const [searching, setSearching] = useState(false);
  // Preview audio state
  const [previewPositionMs, setPreviewPositionMs] = useState(0);
  const [previewDurationMs, setPreviewDurationMs] = useState(30_000);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewSaved, setPreviewSaved] = useState(false);
  const [previewPickerOpen, setPreviewPickerOpen] = useState(false);
  const [pinUserId, setPinUserId] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const slideAnim = useRef(new Animated.Value(600)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      setStep("home");
      setQuery("");
      setSearchResults([]);
      setPlaylists([]);
      setPlaylistTracks([]);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
      if (accessToken) {
        setLoadingNow(true);
        getCurrentlyPlaying(accessToken).then((res) => {
          if (res && !("unauthorized" in res) && res.id) {
            setNowPlaying({ id: res.id, name: res.name, artist: res.artist, albumArt: res.albumArt ?? null, previewUrl: res.previewUrl ?? null });
          } else {
            setNowPlaying(null);
          }
          setLoadingNow(false);
        });
      }
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 600, duration: 200, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  useEffect(() => {
    if (step === "playlists" && accessToken && playlists.length === 0 && !loadingPlaylists) {
      setLoadingPlaylists(true);
      getUserPlaylists(accessToken).then((pls) => { setPlaylists(pls); setLoadingPlaylists(false); });
    }
  }, [step]);

  useEffect(() => {
    if (typeof step === "object" && step.type === "playlistTracks" && accessToken) {
      setLoadingTracks(true);
      setPlaylistTracks([]);
      getPlaylistTracks(accessToken, step.id).then(({ tracks }) => { setPlaylistTracks(tracks); setLoadingTracks(false); });
    }
  }, [step]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!query.trim() || !accessToken) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      const res = await searchSpotifyTracks(accessToken, query.trim());
      setSearchResults(res);
      setSearching(false);
    }, 450);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query]);

  // Load & play preview audio whenever the preview step is active
  const previewSongId  = typeof step === "object" && step.type === "preview" ? step.song.id       : undefined;
  const previewSongUrl = typeof step === "object" && step.type === "preview" ? step.song.previewUrl : undefined;

  useEffect(() => {
    let active = true;
    let localSound: Audio.Sound | null = null;

    const cleanup = () => {
      active = false;
      const s = localSound ?? soundRef.current;
      if (s) { s.stopAsync().catch(() => {}); s.unloadAsync().catch(() => {}); }
      soundRef.current = null;
      setPreviewPlaying(false);
      setPreviewPositionMs(0);
    };

    if (!previewSongUrl) { cleanup(); return cleanup; }

    setPreviewLoading(true);
    setPreviewPositionMs(0);
    setPreviewDurationMs(30_000);
    setPreviewSaved(false);

    Audio.setAudioModeAsync({ playsInSilentModeIOS: true, shouldDuckAndroid: true }).then(() =>
      Audio.Sound.createAsync(
        { uri: previewSongUrl },
        { shouldPlay: true },
        (status) => {
          if (!active || !status.isLoaded) return;
          setPreviewPositionMs(status.positionMillis);
          if (status.durationMillis) setPreviewDurationMs(status.durationMillis);
          setPreviewPlaying(status.isPlaying);
        },
      )
    ).then(({ sound: s }) => {
      if (!active) { s.stopAsync().catch(() => {}); s.unloadAsync().catch(() => {}); return; }
      localSound = s;
      soundRef.current = s;
      setPreviewLoading(false);
    }).catch(() => { if (active) setPreviewLoading(false); });

    return cleanup;
  }, [previewSongId]);

  // Stop audio when overlay closes
  useEffect(() => {
    if (!visible && soundRef.current) {
      soundRef.current.stopAsync().catch(() => {});
      soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
  }, [visible]);

  const pin = (song: PinnedSong) => { onSelect(song); onClose(); };

  const goBack = () => {
    if (typeof step === "object" && step.type === "preview") setStep(step.from);
    else if (typeof step === "object" && step.type === "playlistTracks") setStep("playlists");
    else setStep("home");
  };

  const togglePreviewPlayback = async () => {
    if (!soundRef.current) return;
    if (previewPlaying) await soundRef.current.pauseAsync();
    else await soundRef.current.playAsync();
  };

  // Resolve the viewer once, and refresh the "already saved" flag whenever the
  // preview step changes to a new song.
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (active) setPinUserId(user?.id ?? null);
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (typeof step !== "object" || step.type !== "preview" || !pinUserId) return;
    let active = true;
    isTrackInAnyPlaylist(pinUserId, step.song.id).then(v => { if (active) setPreviewSaved(v); });
    return () => { active = false; };
  }, [typeof step === "object" && step.type === "preview" ? step.song.id : null, pinUserId]);

  const savePreviewToLiked = () => {
    if (typeof step !== "object" || step.type !== "preview" || !pinUserId) return;
    setPreviewPickerOpen(true);
  };

  const previewTrack = (typeof step === "object" && step.type === "preview")
    ? { id: step.song.id, name: step.song.name, artist: step.song.artist, albumArt: step.song.albumArt }
    : null;

  const fmtMs = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  const title = step === "home" ? "Pin a Song"
    : step === "search" ? "Search Spotify"
    : step === "playlists" ? "Playlists"
    : typeof step === "object" && step.type === "playlistTracks" ? step.name
    : typeof step === "object" && step.type === "preview" ? "Preview"
    : "Pin a Song";

  const isSubStep = step !== "home";


  return { step, setStep, nowPlaying, setNowPlaying, loadingNow, setLoadingNow, playlists, setPlaylists, loadingPlaylists, setLoadingPlaylists, playlistTracks, setPlaylistTracks, loadingTracks, setLoadingTracks, query, setQuery, searchResults, setSearchResults, searching, setSearching, previewPositionMs, setPreviewPositionMs, previewDurationMs, setPreviewDurationMs, previewPlaying, setPreviewPlaying, previewLoading, setPreviewLoading, previewSaved, setPreviewSaved, previewPickerOpen, setPreviewPickerOpen, pinUserId, setPinUserId, soundRef, slideAnim, backdropAnim, searchTimer, previewSongId, previewSongUrl, pin, goBack, togglePreviewPlayback, savePreviewToLiked, previewTrack, fmtMs, title, isSubStep };
}
