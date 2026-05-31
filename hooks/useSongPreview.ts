import { useRef, useState, useEffect } from "react";
import { fetchSpotifyTrackById } from "../lib/spotify";
import { Animated, Modal } from "react-native";
import { Audio } from "expo-av";
import { openSpotifyLink } from "../lib/spotify";
import { isTrackInAnyPlaylist } from "../services/playlists";
import { ms } from "../lib/feed/localStyles";

export function useSongPreview({ visible, onClose, song, accessToken, userId }: { visible: boolean; onClose: () => void; song: { id: string; name: string; artist: string; albumArt: string | null } | null; accessToken?: string | null; userId?: string | null }) {
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const slideAnim   = useRef(new Animated.Value(400)).current;

  const soundRef   = useRef<Audio.Sound | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [playing,    setPlaying]    = useState(false);
  const [posMs,      setPosMs]      = useState(0);
  const [durMs,      setDurMs]      = useState(30_000);
  const [saved,      setSaved]      = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Keep Modal mounted until the close animation finishes
  const [rendered,   setRendered]   = useState(false);

  // ── Animate in/out ────────────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 1, duration: 240, useNativeDriver: true }),
        Animated.spring(slideAnim,    { toValue: 0, useNativeDriver: true, tension: 68, friction: 12 }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim,    { toValue: 400, duration: 260, useNativeDriver: true }),
      ]).start(() => setRendered(false));
    }
  }, [visible]);

  // ── Load + play preview when sheet opens / song changes ───────────────────
  useEffect(() => {
    if (!visible || !song?.id || !accessToken) return;

    let active = true;

    // Reset state
    setLoading(true);
    setPosMs(0);
    setSaved(false);
    setPreviewUrl(null);

    const load = async () => {
      try {
        // Fetch preview_url for this track ID
        const data = await fetchSpotifyTrackById(accessToken as string, song.id);
        if (!data || !active) return;
        const url: string | null = data.preview_url ?? null;
        if (!active) return;
        setPreviewUrl(url);

        if (!url) { setLoading(false); return; }

        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, shouldDuckAndroid: true });

        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true },
          (status) => {
            if (!status.isLoaded || !active) return;
            setPosMs(status.positionMillis ?? 0);
            setDurMs(status.durationMillis ?? 30_000);
            setPlaying(status.isPlaying ?? false);
          },
        );

        if (active) {
          soundRef.current = sound;
        } else {
          // Component closed while loading — clean up immediately
          await sound.stopAsync().catch(() => {});
          await sound.unloadAsync().catch(() => {});
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load().catch(console.error);

    return () => {
      active = false;
      const s = soundRef.current;
      soundRef.current = null;
      if (s) {
        s.stopAsync().then(() => s.unloadAsync()).catch(() => {});
      }
      setPlaying(false);
      setLoading(false);
    };
  }, [visible, song?.id]);

  // ── Check whether this track is already in one of the viewer's playlists ──
  useEffect(() => {
    if (!visible || !song?.id || !userId) { setSaved(false); return; }
    let active = true;
    isTrackInAnyPlaylist(userId, song.id).then(v => { if (active) setSaved(v); });
    return () => { active = false; };
  }, [visible, song?.id, userId]);

  // ── Controls ──────────────────────────────────────────────────────────────
  const togglePlay = async () => {
    const s = soundRef.current;
    if (!s) return;
    if (playing) await s.pauseAsync().catch(() => {});
    else         await s.playAsync().catch(() => {});
  };

  const handleSave = () => {
    if (!song?.id || !userId) return;
    setPickerOpen(true);
  };

  const handleOpen = () => {
    if (!song?.id) return;
    openSpotifyLink(
      `spotify:track:${song.id}`,
      `https://open.spotify.com/track/${song.id}`,
    );
  };

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  const progress = durMs > 0 ? Math.min(posMs / durMs, 1) : 0;


  return { backdropAnim, slideAnim, soundRef, previewUrl, setPreviewUrl, loading, setLoading, playing, setPlaying, posMs, setPosMs, durMs, setDurMs, saved, setSaved, pickerOpen, setPickerOpen, rendered, setRendered, togglePlay, handleSave, handleOpen, fmt, progress };
}
