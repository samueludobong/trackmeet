import React, { useContext, useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { CachedImage } from "../ui/CachedImage";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { openSpotifyLink } from "../../lib/spotify";
import { PROVIDER_DISPLAY } from "../../lib/musicLink";
import { isTrackInAnyPlaylist } from "../../services/playlists";
import { spCard } from "../../assets/styles/messages/SpotifyTrackCard";
import { AddToPlaylistSheet } from "../../components/AddToPlaylistSheet";
import { NowPlayingCtx } from "../../lib/feed/contexts";
import { AnimatedWaveform } from "../feed/AnimatedWaveform";
import { MusicCardActionsSheet } from "../post/MusicCardActionsSheet";
import { MusicPlatformsSheet } from "../post/MusicPlatformsSheet";

export function SpotifyTrackCard({
  track,
  fromMe,
}: {
  // `id` is the Spotify track id, or null for a pasted link with no Spotify
  // match. `url`/`provider`/`links` carry the multi-provider attachment.
  track: {
    id: string | null;
    name: string;
    artist: string;
    albumArt: string | null;
    url?: string | null;
    provider?: string | null;
    links?: { platform: string; url: string }[] | null;
  };
  fromMe: boolean;
}) {
  const [saved,        setSaved]        = useState(false);
  const [checked,      setChecked]      = useState(false);
  const [userId,       setUserId]       = useState<string | null>(null);
  const [pickerOpen,   setPickerOpen]   = useState(false);
  // Shown when the viewer taps the open button while THIS track is the one
  // currently playing on their Spotify (the waveform state) — same richer
  // actions sheet the feed's MusicCard uses (Open / Add to Playlist / Lyrics).
  const [actionsOpen,  setActionsOpen]  = useState(false);
  const [platformsOpen, setPlatformsOpen] = useState(false);

  // Multi-provider state for pasted-link cards.
  const altCount = (track.links ?? []).filter((l) => l.url !== track.url).length;
  const hasPlatforms = altCount > 0;
  const isExternal = !!track.url && !!track.provider && track.provider !== "spotify";
  const providerMeta = track.provider ? (PROVIDER_DISPLAY as any)[track.provider] : undefined;

  // Three states for the open button, mirroring components/post/MusicCard.tsx:
  //   • this song IS currently playing on Spotify → waveform
  //   • a different song is playing on Spotify   → play icon (tap swaps to this)
  //   • nothing playing on Spotify                → Spotify icon (tap opens app)
  const np = useContext(NowPlayingCtx);
  const spotifyDevicePlaying = !isExternal && !hasPlatforms && !!np?.track?.isPlaying;
  const isThisSongPlaying = spotifyDevicePlaying && !!track.id && np?.track?.id === track.id;

  // On mount, resolve the viewer and check if already in one of their playlists
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      setUserId(user?.id ?? null);
      if (user && track.id) setSaved(await isTrackInAnyPlaylist(user.id, track.id));
      if (active) setChecked(true);
    })();
    return () => { active = false; };
  }, [track.id]);

  const handleSave = () => { if (userId) setPickerOpen(true); };

  const openExternal = (url: string) =>
    Linking.openURL(url).catch(() => WebBrowser.openBrowserAsync(url).catch(() => {}));

  const handleOpen = () => {
    // Resolved across platforms → let the viewer pick where to listen.
    if (hasPlatforms) { setPlatformsOpen(true); return; }
    // Non-Spotify source → open its link directly.
    if (isExternal) { openExternal(track.url!); return; }
    if (!track.id) { if (track.url) openExternal(track.url); return; }
    // Same swap as MusicCard: if this track is the one currently playing on
    // the viewer's Spotify, the open button shows the waveform and tapping
    // surfaces the actions sheet rather than launching Spotify again.
    if (isThisSongPlaying) { setActionsOpen(true); return; }
    openSpotifyLink(
      `spotify:track:${track.id}`,
      `https://open.spotify.com/track/${track.id}`,
    );
  };


  return (
    <View style={[spCard.card, fromMe && spCard.cardMe]}>
      {track.albumArt ? (
        <CachedImage source={{ uri: track.albumArt }} style={spCard.art} resizeMode="cover" />
      ) : (
        <View style={spCard.artFallback}>
          <Ionicons name="musical-notes" size={22} color="#1DB954" />
        </View>
      )}

      <View style={spCard.info}>
        <View style={spCard.spotifyRow}>
          <FontAwesome5 name={(providerMeta?.icon ?? "spotify") as any} size={11} color={providerMeta?.color ?? "#1DB954"} />
          <Text style={spCard.spotifyLabel}>{providerMeta?.label ?? "Spotify"}</Text>
        </View>
        <Text style={spCard.trackName} numberOfLines={1}>{track.name}</Text>
        <Text style={spCard.artistName} numberOfLines={1}>{track.artist}</Text>

        <View style={spCard.btnRow}>
          <TouchableOpacity
            style={spCard.openBtn}
            activeOpacity={0.8}
            onPress={handleOpen}
          >
            {isThisSongPlaying ? (
              <AnimatedWaveform color="#000000" compact />
            ) : spotifyDevicePlaying ? (
              <Ionicons name="play" size={13} color="#000000" />
            ) : (
              <FontAwesome5 name={((hasPlatforms || isExternal) ? (providerMeta?.icon ?? "music") : "spotify") as any} size={13} color="#000000" />
            )}
            <Text style={spCard.openBtnText}>
              {isThisSongPlaying ? "Playing" : spotifyDevicePlaying ? "Play" : hasPlatforms ? "Listen" : "Open"}
            </Text>
          </TouchableOpacity>

          {checked && !!track.id && (
            <TouchableOpacity
              style={[spCard.saveBtn, saved && spCard.savedBtn]}
              activeOpacity={0.8}
              onPress={handleSave}
            >
              <Ionicons
                name={saved ? "checkmark-circle" : "add-circle-outline"}
                size={13}
                color={saved ? "#1DB954" : "rgb(0, 0, 0)"}
              />
              <Text style={[spCard.saveBtnText, saved && spCard.savedBtnText]}>
                {saved ? "Saved" : "Save"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!!track.id && (
        <>
          <AddToPlaylistSheet
            visible={pickerOpen}
            onClose={() => setPickerOpen(false)}
            userId={userId}
            track={{ id: track.id, name: track.name, artist: track.artist, albumArt: track.albumArt }}
            onSavedChange={setSaved}
          />

          <MusicCardActionsSheet
            visible={actionsOpen}
            onClose={() => setActionsOpen(false)}
            song={{ id: track.id, name: track.name, artist: track.artist, albumArt: track.albumArt }}
            userId={userId}
          />
        </>
      )}

      <MusicPlatformsSheet
        visible={platformsOpen}
        onClose={() => setPlatformsOpen(false)}
        song={{ name: track.name, artist: track.artist, albumArt: track.albumArt }}
        originalProvider={track.provider ?? null}
        originalUrl={track.url ?? null}
        links={track.links ?? []}
      />
    </View>
  );
}


// ─── Now Playing bubble (replaces plain story bubble) ────────────────────────
