import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../../lib/feed/styles";
import { useNowPlayingCtx } from "../../lib/feed/contexts";
import { type NowPlayingTrack } from "../../hooks/useNowPlaying";
import { AnimatedWaveform } from "./AnimatedWaveform";

// ─── Now Playing banner (shown above composer) ────────────────────────────────

export function NowPlayingBanner({
  onShare,
  onAttach,
}: {
  onShare?: (track: NowPlayingTrack) => void;
  onAttach?: (track: NowPlayingTrack) => void;
} = {}) {
  const { track } = useNowPlayingCtx();

  if (!track?.isPlaying) return null;

  const COLOR = "#1DB954";
  // When onAttach is provided (quick-post context) show a "+" button;
  // otherwise fall back to the paper-plane share-to-chat button.
  const handleBtn = () => {
    if (!track) return;
    onAttach ? onAttach(track) : onShare?.(track);
  };

  return (
    <View style={styles.nowPlayingBar}>
      {/* Album art or fallback swatch */}
      {track.albumArt ? (
        <CachedImage source={{ uri: track.albumArt }} style={[styles.nowPlayingBarSwatch, { borderWidth: 0 }]} />
      ) : (
        <View style={[styles.nowPlayingBarSwatch, { backgroundColor: COLOR + "33", borderColor: COLOR + "55" }]}>
          <Ionicons name="musical-note" size={13} color={COLOR} />
        </View>
      )}

      {/* Track info */}
      <View style={{ flex: 1 }}>
        <Text style={styles.nowPlayingBarSong} numberOfLines={1}>{track.name}</Text>
        <Text style={styles.nowPlayingBarArtist} numberOfLines={1}>{track.artist}</Text>
      </View>

      {/* Animated waveform */}
      <AnimatedWaveform color={COLOR} />

      {/* Action button */}
      <TouchableOpacity
        style={styles.nowPlayingShareBtn}
        activeOpacity={0.75}
        onPress={handleBtn}
      >
        <Ionicons
          name={onAttach ? "add-circle-outline" : "paper-plane-outline"}
          size={onAttach ? 22 : 14}
          color={COLOR}
        />
      </TouchableOpacity>
    </View>
  );
}
