import React, { useContext, useState, useEffect } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../lib/supabase";
import { openSpotifyLink } from "../../lib/spotify";
import { isTrackInAnyPlaylist } from "../../services/playlists";
import { styles } from "../../lib/feed/styles";
import { AddToPlaylistSheet } from "../../components/AddToPlaylistSheet";
import { ActionRow } from "../../components/post/ActionRow";
import { PostHeader } from "../../components/post/PostHeader";
import { PostText } from "../../components/post/TextCard";
import { NowPlayingCtx, useFeedAudio } from "../../lib/feed/contexts";
import { AnimatedWaveform } from "../feed/AnimatedWaveform";
import { MusicCardActionsSheet } from "./MusicCardActionsSheet";
import { type Post } from "../../app/data/mock";

export function MusicCard({ post }: { post: Post }) {
  const accent = post.albumAccent ?? "#AB00FF";
  const bg     = post.albumColor  ?? "#111";
  const [saved,        setSaved]        = useState(false);
  const [userId,       setUserId]       = useState<string | null>(null);
  const [pickerOpen,   setPickerOpen]   = useState(false);
  // Sheet shown when the user taps the open button while THIS song is the one
  // currently playing on their Spotify (the waveform state) — gives them
  // Open-in-Spotify / Add-to-Playlist / View-Lyrics actions instead of just
  // opening the Spotify app (which they're already inside, in effect).
  const [actionsOpen,  setActionsOpen]  = useState(false);
  const { muted, toggleMuted, activePostId } = useFeedAudio();
  const isActive = activePostId === post.id && !!post.previewUrl;
  // Three states for the open button:
  //   • this song IS the one currently playing on Spotify → waveform
  //   • a different song is playing on Spotify          → play icon (tap will swap to this one)
  //   • nothing playing on Spotify                       → Spotify icon (tap opens the app)
  const np = useContext(NowPlayingCtx);
  const spotifyDevicePlaying = !!np?.track?.isPlaying;
  const isThisSongPlaying = spotifyDevicePlaying && !!post.songId && np?.track?.id === post.songId;

  useEffect(() => {
    if (!post.songId) return;
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      setUserId(user?.id ?? null);
      if (user) setSaved(await isTrackInAnyPlaylist(user.id, post.songId!));
    })();
    return () => { active = false; };
  }, [post.songId]);

  const handleOpen = () => {
    if (!post.songId) return;
    // If this song IS the one currently playing on the viewer's Spotify, the
    // open button shows the waveform — tapping it surfaces a richer actions
    // sheet (View Lyrics, Open in Spotify, Add to Playlist) instead of the
    // default app-launch behavior.
    if (isThisSongPlaying) { setActionsOpen(true); return; }
    openSpotifyLink(
      `spotify:track:${post.songId}`,
      `https://open.spotify.com/track/${post.songId}`,
    );
  };

  const handleSave = () => { if (post.songId && userId) setPickerOpen(true); };

  return (
    <View style={styles.card}>
      <PostHeader post={post} />
      {post.text && <PostText text={post.text} />}

      <View style={[styles.musicPlayerCard, { backgroundColor: bg }]}>
        {/* Art — song info overlaid at bottom */}
        <View style={styles.musicArtArea}>
          {post.albumArt ? (
            <CachedImage source={{ uri: post.albumArt }} style={styles.musicArtFill} resizeMode="cover" />
          ) : (
            <View style={[styles.musicArtFill, { backgroundColor: accent + "28" }]}>
              <Text style={styles.musicArtEmoji}>🎵</Text>
            </View>
          )}

          {/* Bottom scrim + song info */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.72)"]}
            style={styles.musicInfoOverlay}
            pointerEvents="none"
          />
          <View style={[styles.musicInfoText, { flexDirection: "row", alignItems: "flex-end", gap: 10 }]}>
            <View style={{ flex: 1 }} pointerEvents="none">
              <Text style={styles.musicSongTitle} numberOfLines={1}>{post.song}</Text>
              <Text style={styles.musicArtistName} numberOfLines={1}>{post.artist}</Text>
            </View>
            {/* Universal mute — toggles audio across the feed + media viewer.
                Subtle ring while this card is the active preview source. */}
            <TouchableOpacity
              onPress={toggleMuted}
              hitSlop={10}
              style={{
                width: 32, height: 32, borderRadius: 16,
                alignItems: "center", justifyContent: "center",
                backgroundColor: "rgba(0,0,0,0.55)",
                borderWidth: isActive ? 1 : 0,
                borderColor: "rgba(255,255,255,0.6)",
              }}
              activeOpacity={0.7}
            >
              <Ionicons name={muted ? "volume-mute" : "volume-high"} size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Top-right: open in Spotify + save to Liked Songs */}
          <View style={styles.musicTopRight}>
            <TouchableOpacity
              style={[styles.musicGlassBtn, { backgroundColor: "rgb(0, 0, 0)", borderColor: "rgba(255, 255, 255, 0.93)" }]}
              activeOpacity={0.8}
              onPress={handleSave}
            >
              <Ionicons
                name={saved ? "checkmark-circle" : "add"}
                size={17}
                color={saved ? "#1DB954" : "#fff"}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.musicGlassBtn, { backgroundColor: "rgb(0, 0, 0)", borderColor: "rgba(255, 255, 255, 0.93)" }]}
              activeOpacity={0.8}
              onPress={handleOpen}
              disabled={!post.songId}
            >
              {isThisSongPlaying ? (
                <AnimatedWaveform color="#1DB954" compact />
              ) : spotifyDevicePlaying ? (
                <Ionicons name="play" size={17} color="#1DB954" />
              ) : (
                <FontAwesome5 name="spotify" size={17} color="#1DB954" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ActionRow post={post} />

      <AddToPlaylistSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        userId={userId}
        track={post.songId ? {
          id: post.songId, name: post.song ?? "", artist: post.artist ?? null, albumArt: post.albumArt ?? null,
        } : null}
        onSavedChange={setSaved}
      />

      <MusicCardActionsSheet
        visible={actionsOpen}
        onClose={() => setActionsOpen(false)}
        song={post.songId ? {
          id: post.songId,
          name: post.song ?? "",
          artist: post.artist ?? "",
          albumArt: post.albumArt ?? null,
        } : null}
        userId={userId}
      />
    </View>
  );
}

// ─── Poll card ────────────────────────────────────────────────────────────────
