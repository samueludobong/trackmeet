import React, { useContext } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { openSpotifyLink } from "../../lib/spotify";
import { NowPlayingCtx } from "../../lib/feed/contexts";
import { styles } from "../../assets/styles/post/AttachedSongChip";

/** Compact song chip appended to non-music posts that have a song attached. */
export function AttachedSongChip({
  songId, songName, songArtist, albumArt,
}: {
  songId: string | null | undefined;
  songName: string | null | undefined;
  songArtist: string | null | undefined;
  albumArt: string | null | undefined;
}) {
  if (!songName) return null;
  // If a Spotify device is already playing, tapping will swap the song in place
  // (via openSpotifyLink) — switch the trailing icon to a play triangle to hint
  // at that, otherwise show the Spotify mark (signals "opens Spotify").
  const np = useContext(NowPlayingCtx);
  const spotifyDevicePlaying = !!np?.track?.isPlaying;
  const open = () => {
    if (!songId) return;
    openSpotifyLink(`spotify:track:${songId}`, `https://open.spotify.com/track/${songId}`);
  };
  return (
    <TouchableOpacity style={styles.chip} activeOpacity={0.85} onPress={open}>
      {albumArt ? (
        <CachedImage source={{ uri: albumArt }} style={styles.art} />
      ) : (
        <View style={[styles.art, styles.artFallback]}>
          <Ionicons name="musical-note" size={14} color="#1DB954" />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>{songName}</Text>
        {songArtist && <Text style={styles.artist} numberOfLines={1}>{songArtist}</Text>}
      </View>
      <View style={styles.openBtn}>
        {spotifyDevicePlaying ? (
          <Ionicons name="play" size={14} color="#1DB954" />
        ) : (
          <FontAwesome5 name="spotify" size={14} color="#1DB954" />
        )}
      </View>
    </TouchableOpacity>
  );
}
