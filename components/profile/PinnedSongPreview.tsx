import React from "react";
import { View, Text, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { openSpotifyLink } from "../../lib/spotify";
import { psStyles } from "../../lib/feed/localStyles";
import { type PinnedSong } from "../../types/music";

/** The preview step of the pinned-song picker: album art, 30s scrubber, save + pin CTAs. */
export function PinnedSongPreview({
  song, previewDurationMs, previewPositionMs, previewLoading, previewPlaying, previewSaved,
  fmtMs, togglePreviewPlayback, savePreviewToLiked, onPin, ctaIcon, ctaLabel,
}: {
  song: PinnedSong;
  previewDurationMs: number;
  previewPositionMs: number;
  previewLoading: boolean;
  previewPlaying: boolean;
  previewSaved: boolean;
  fmtMs: (ms: number) => string;
  togglePreviewPlayback: () => void;
  savePreviewToLiked: () => void;
  onPin: (song: PinnedSong) => void;
  ctaIcon: string;
  ctaLabel: string;
}) {
  const capMs = Math.min(previewDurationMs, 30_000);
  const progress = capMs > 0 ? Math.min(previewPositionMs / capMs, 1) : 0;
  return (
    <View style={psStyles.previewWrap}>
      {song.albumArt ? (
        <Image source={{ uri: song.albumArt }} style={psStyles.previewArt} />
      ) : (
        <View style={[psStyles.previewArt, psStyles.previewArtFallback]}>
          <FontAwesome5 name="music" size={40} color="rgba(255,255,255,0.15)" />
        </View>
      )}
      <Text style={psStyles.previewTrack} numberOfLines={2}>{song.name}</Text>
      <Text style={psStyles.previewArtist} numberOfLines={1}>{song.artist}</Text>
      {song.previewUrl ? (
        <>
          <View style={psStyles.previewProgressTrack}>
            <View style={[psStyles.previewProgressFill, { width: `${progress * 100}%` as any }]} />
          </View>
          <View style={psStyles.previewTimes}>
            <Text style={psStyles.previewTime}>{fmtMs(previewPositionMs)}</Text>
            <Text style={psStyles.previewTime}>{fmtMs(capMs)}</Text>
          </View>
          <TouchableOpacity style={psStyles.playPauseBtn} onPress={togglePreviewPlayback} activeOpacity={0.8} disabled={previewLoading}>
            {previewLoading ? <ActivityIndicator color="#fff" /> : <FontAwesome5 name={previewPlaying ? "pause" : "play"} size={22} color="#fff" />}
          </TouchableOpacity>
        </>
      ) : (
        <Text style={psStyles.noPreviewText}>No preview available</Text>
      )}
      <View style={psStyles.previewActions}>
        <TouchableOpacity style={psStyles.openBtn} activeOpacity={0.8} onPress={() => openSpotifyLink(`spotify:track:${song.id}`, `https://open.spotify.com/track/${song.id}`)}>
          <FontAwesome5 name="spotify" size={14} color="#1DB954" />
          <Text style={psStyles.openBtnText}>Open</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[psStyles.saveBtn, previewSaved && psStyles.saveBtnSaved]} activeOpacity={0.8} onPress={savePreviewToLiked}>
          <FontAwesome5 name={previewSaved ? "check-circle" : "plus-circle"} size={13} color={previewSaved ? "#1DB954" : "rgba(255,255,255,0.7)"} />
          <Text style={[psStyles.saveBtnText, previewSaved && psStyles.saveBtnTextSaved]}>{previewSaved ? "Saved" : "Save to Playlist"}</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={psStyles.pinCTA} onPress={() => onPin(song)} activeOpacity={0.85}>
        <FontAwesome5 name={ctaIcon} size={13} color="#000" />
        <Text style={psStyles.pinCTAText}>{ctaLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}
