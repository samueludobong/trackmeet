import React, { useRef, useState, useEffect } from "react";
import { s } from "../../app/userProfile.styles";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { openSpotifyLink } from "../../lib/spotify";
import { isTrackInAnyPlaylist } from "../../services/playlists";
import { useArtGradient } from "../../hooks/albumColors";
import { AddToPlaylistSheet } from "../../components/AddToPlaylistSheet";
import { LyricsOverlay } from "./LyricsOverlay";

// Grace window past a song's end before we treat the broadcast as stale and hide
// the card. Comfortably covers the broadcaster's ~3s poll + realtime delivery, so
// a normal track→track transition never flickers the card away.
const STALE_GRACE_MS = 12_000;

export function NowListeningCard({
  song,
  viewerToken,
  viewerId,
  meet,
  onJoinMeet,
}: {
  song: {
    name: string;
    artist: string | null;
    id: string | null;
    albumArt: string | null;
    durationMs: number | null;
    progressMs: number | null;
    updatedAt: string | null;
  };
  viewerToken: string | null;
  viewerId: string | null;
  // When set, this user is publicly in a meet (or hosting one) — render the
  // meet variant with a Join affordance.
  meet?: { hostName: string; isHost: boolean } | null;
  onJoinMeet?: () => void;
}) {
  const pulse = useRef(new Animated.Value(1)).current;
  const [liveProgress, setLiveProgress] = useState(0);
  const [saved, setSaved]   = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  // True when the broadcaster's sync has gone silent and the song has run past
  // its end with no fresh update (e.g. their app was killed / lost connection).
  const [stale, setStale] = useState(false);
  // Gradient derived from the album art (Expo Go-safe). Meet variant keeps its
  // purple identity so "in a meet" stays visually distinct.
  const artGradient = useArtGradient(song.albumArt);

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 900, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  useEffect(() => {
    if (!song.durationMs || !song.updatedAt) { setLiveProgress(0); setStale(false); return; }
    const updatedAtMs  = new Date(song.updatedAt).getTime();
    const baseProgress = song.progressMs ?? 0;
    const apply = () => {
      const raw = baseProgress + (Date.now() - updatedAtMs);
      setLiveProgress(Math.min(raw, song.durationMs!));
      // Past the end by more than the grace window → sync has stalled.
      setStale(raw - song.durationMs! > STALE_GRACE_MS);
    };
    apply();
    const id = setInterval(apply, 1_000);
    return () => clearInterval(id);
  }, [song.id, song.updatedAt]);

  const fmt = (ms: number) => {
    const sec = Math.floor(ms / 1000);
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
  };
  const progress = song.durationMs && song.durationMs > 0
    ? Math.min(liveProgress / song.durationMs, 1)
    : 0;

  const handleOpen = () => {
    if (!song.id) return;
    openSpotifyLink(`spotify:track:${song.id}`, `https://open.spotify.com/track/${song.id}`);
  };

  // Reflect whether this track is already in one of the viewer's playlists.
  useEffect(() => {
    if (!song.id || !viewerId) { setSaved(false); return; }
    let active = true;
    isTrackInAnyPlaylist(viewerId, song.id).then(v => { if (active) setSaved(v); });
    return () => { active = false; };
  }, [song.id, viewerId]);

  const handleSave = () => {
    if (!song.id || !viewerId) return;
    setPickerOpen(true);
  };

  // Sync has stalled and the song has ended — vanish until a fresh update lands.
  // (Meets stay visible: the room is still live/joinable even if position lags.)
  if (stale && !meet) return null;

  return (
    <LinearGradient
      colors={meet ? ["#2A0C3D", "#1A0820", "#0E070F"] : artGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[s.nowPlayingCard, meet && s.nowPlayingCardMeet]}
    >
      {/* Meet banner — shows this user is hosting / in a synced listening room */}
      {meet && (
        <View style={s.npMeetBadge}>
          <View style={s.npLiveDot} />
          {meet.isHost ? (
            <Text style={s.npMeetBadgeText} numberOfLines={1}>
              <Text style={s.npMeetBadgeHost}>Hosting</Text> a live Meet
            </Text>
          ) : (
            <Text style={s.npMeetBadgeText} numberOfLines={1}>
              In <Text style={s.npMeetBadgeHost}>{meet.hostName}</Text>&apos;s Meet
            </Text>
          )}
        </View>
      )}

      <View style={s.npBody}>
        {song.albumArt ? (
          <CachedImage source={{ uri: song.albumArt }} style={s.npAlbumArt} />
        ) : (
          <View style={[s.npAlbumArt, s.npAlbumArtFallback]}>
            <FontAwesome5 name="music" size={18} color="rgba(255,255,255,0.3)" />
          </View>
        )}

        <View style={s.npInfo}>
          <View style={{ flex: 1, alignItems: "center", gap: 6, flexDirection: "row", justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <Text style={s.npTrack} numberOfLines={1}>{song.name}</Text>
              <Text style={s.npArtist} numberOfLines={1}>{song.artist ?? ""}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setLyricsOpen(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <Ionicons name="expand-outline" size={16} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
            <FontAwesome5 name="spotify" size={13} color="#1DB954" />
          </View>

          {!!song.durationMs && (
            <>
              <View style={s.npProgressTrack}>
                <View style={[s.npProgressFill, { width: `${progress * 100}%` as any }]} />
              </View>
              <View style={s.npProgressTimes}>
                <Text style={s.npTimeText}>{fmt(liveProgress)}</Text>
                <Text style={s.npTimeText}>{fmt(song.durationMs)}</Text>
              </View>
            </>
          )}

          <View style={s.npBtnRow}>
            {!!song.id && (
              <TouchableOpacity style={s.npOpenBtn} activeOpacity={0.8} onPress={handleOpen}>
                <Ionicons name="open-outline" size={12} color="#1DB954" />
                <Text style={s.npOpenBtnText}>Open</Text>
              </TouchableOpacity>
            )}

            {!!song.id && (
              <TouchableOpacity style={[s.npOpenBtn, { backgroundColor: "#fbff092d", borderColor: "#fbff09" }]} activeOpacity={0.8} onPress={handleOpen}>
                <Ionicons name="add" size={12} color="#fbff09" />
                <Text style={[s.npOpenBtnText, { color: "#fbff09" }]}>Post</Text>
              </TouchableOpacity>
            )}
            {!!song.id && !!viewerId && (
              <TouchableOpacity
                style={[s.npSaveBtn, saved && s.npSavedBtn]}
                activeOpacity={0.8}
                onPress={handleSave}
              >
                <Ionicons
                  name={saved ? "checkmark-circle" : "add-circle-outline"}
                  size={12}
                  color={saved ? "#1DB954" : "rgba(255,255,255,0.45)"}
                />
                <Text style={[s.npSaveBtnText, saved && s.npSavedBtnText]}>
                  {saved ? "Saved" : "Save"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <AddToPlaylistSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        userId={viewerId}
        track={song.id ? {
          id: song.id, name: song.name, artist: song.artist,
          albumArt: song.albumArt, durationMs: song.durationMs,
        } : null}
        onSavedChange={setSaved}
      />

      <LyricsOverlay
        visible={lyricsOpen}
        onClose={() => setLyricsOpen(false)}
        song={song}
        viewerId={viewerId}
      />

      {/* Join the same meet — only when the user is publicly in one */}
      {meet && (
        <TouchableOpacity style={s.npJoinBtn} activeOpacity={0.85} onPress={onJoinMeet}>
          <Ionicons name="headset" size={15} color="#fff" />
          <Text style={s.npJoinBtnText}>Join Meet</Text>
        </TouchableOpacity>
      )}
    </LinearGradient>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
