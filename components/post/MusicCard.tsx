import React, { useContext, useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { CachedImage } from "../ui/CachedImage";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../lib/supabase";
import { openSpotifyLink } from "../../lib/spotify";
import { isTrackInAnyPlaylist, isUrlInAnyPlaylist } from "../../services/playlists";
import { styles } from "../../assets/styles/feed/styles";
import { AddToPlaylistSheet } from "../../components/AddToPlaylistSheet";
import { ActionRow } from "../../components/post/ActionRow";
import { PostHeader } from "../../components/post/PostHeader";
import { PostText } from "../../components/post/TextCard";
import { NowPlayingCtx, useFeedAudio } from "../../lib/feed/contexts";
import { AnimatedWaveform } from "../feed/AnimatedWaveform";
import { MusicCardActionsSheet } from "./MusicCardActionsSheet";
import { MusicPlatformsSheet } from "./MusicPlatformsSheet";
import { type Post } from "../../app/data/mock";

// Per-provider glyph + accent for the open button on cross-provider posts.
const PROVIDER_META: Record<string, { icon: string; color: string }> = {
  spotify:    { icon: "spotify",    color: "#1DB954" },
  appleMusic: { icon: "apple",      color: "#FC3C44" },
  youtube:    { icon: "youtube",    color: "#FF0000" },
  soundcloud: { icon: "soundcloud", color: "#FF5500" },
};

export function MusicCard({ post }: { post: Post }) {
  const accent = post.albumAccent ?? "#AB00FF";
  const bg     = post.albumColor  ?? "#111";
  // A pasted-link post from a non-Spotify provider opens its source URL directly
  // (the Spotify play/swap/preview path only applies when we have a song id).
  const isExternal = !!post.songUrl && !!post.songProvider && post.songProvider !== "spotify";
  const providerMeta = post.songProvider ? PROVIDER_META[post.songProvider] : undefined;
  // Cross-platform alternatives Odesli matched (beyond the original source). When
  // present the open button surfaces a "listen on" picker instead of a direct open.
  const alternatives = (post.songLinks ?? []).filter((l) => l.url !== post.songUrl);
  const hasPlatforms = alternatives.length > 0;
  const [saved,        setSaved]        = useState(false);
  const [userId,       setUserId]       = useState<string | null>(null);
  const [pickerOpen,   setPickerOpen]   = useState(false);
  const [platformsOpen, setPlatformsOpen] = useState(false);
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
  const spotifyDevicePlaying = !isExternal && !!np?.track?.isPlaying;
  const isThisSongPlaying = spotifyDevicePlaying && !!post.songId && np?.track?.id === post.songId;

  // A song can be saved to a playlist if it has a Spotify id OR a source URL
  // (non-Spotify, pasted-link songs go into curated playlists keyed by URL).
  const canSave = !!post.songId || !!post.songUrl;

  useEffect(() => {
    if (!canSave) return;
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      setUserId(user?.id ?? null);
      if (user) {
        setSaved(post.songId
          ? await isTrackInAnyPlaylist(user.id, post.songId)
          : await isUrlInAnyPlaylist(user.id, post.songUrl!));
      }
    })();
    return () => { active = false; };
  }, [post.songId, post.songUrl]);

  const openExternal = (url: string) =>
    Linking.openURL(url).catch(() => WebBrowser.openBrowserAsync(url).catch(() => {}));

  const handleOpen = () => {
    // Resolved across multiple platforms — let the viewer pick where to listen.
    if (hasPlatforms) { setPlatformsOpen(true); return; }
    // Pasted from a non-Spotify provider — open its source link in the app/browser.
    if (isExternal) { openExternal(post.songUrl!); return; }
    if (!post.songId) { if (post.songUrl) openExternal(post.songUrl); return; }
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

  const handleSave = () => { if (canSave && userId) setPickerOpen(true); };

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
                Subtle ring while this card is the active preview source. When
                there's no cached preview (e.g. non-Spotify links), there's
                nothing to mute, so show a "No preview" tag instead. */}
            {post.previewUrl ? (
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
            ) : (
              <View
                style={{
                  flexDirection: "row", alignItems: "center", gap: 5,
                  height: 32, paddingHorizontal: 11, borderRadius: 16,
                  backgroundColor: "rgba(0,0,0,0.55)",
                }}
              >
                <Ionicons name="volume-mute" size={14} color="rgba(255,255,255,0.55)" />
                <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "600" }}>
                  No preview
                </Text>
              </View>
            )}
          </View>

          {/* Top-right: open in provider app + add to a playlist */}
          <View style={styles.musicTopRight}>
            {/* Save to a playlist — works for Spotify songs and non-Spotify
                (pasted-link) songs alike (the latter go to curated playlists). */}
            {canSave && (
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
            )}

            <TouchableOpacity
              style={[styles.musicGlassBtn, { backgroundColor: "rgb(0, 0, 0)", borderColor: "rgba(255, 255, 255, 0.93)" }]}
              activeOpacity={0.8}
              onPress={handleOpen}
              disabled={!post.songId && !post.songUrl}
            >
              {hasPlatforms || isExternal ? (
                <FontAwesome5 name={(providerMeta?.icon ?? "music") as any} size={17} color={providerMeta?.color ?? "#fff"} />
              ) : isThisSongPlaying ? (
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
        track={canSave ? {
          id: post.songId ?? null, name: post.song ?? "", artist: post.artist ?? null, albumArt: post.albumArt ?? null,
          url: post.songUrl ?? null, provider: post.songProvider ?? null, links: post.songLinks ?? null,
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

      <MusicPlatformsSheet
        visible={platformsOpen}
        onClose={() => setPlatformsOpen(false)}
        song={{ name: post.song ?? "", artist: post.artist ?? "", albumArt: post.albumArt ?? null }}
        originalProvider={post.songProvider ?? null}
        originalUrl={post.songUrl ?? null}
        links={post.songLinks ?? []}
      />
    </View>
  );
}

// ─── Poll card ────────────────────────────────────────────────────────────────
