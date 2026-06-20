import React, { useEffect, useState } from "react";
import { View, Text, StyleProp, ViewStyle } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { getCuratedPlaylistCovers } from "../../services/playlists";

/**
 * Playlist cover art with a consistent fallback chain:
 *   1. the uploaded `imageUrl`
 *   2. a 2×2 mosaic of the first songs' album art (curated playlists only)
 *   3. a 🎵 emoji
 * Mirrors the detail view's hero so list cards and the add-to-playlist picker
 * all show real artwork instead of a blank placeholder.
 */
export function PlaylistCover({
  imageUrl,
  playlistId,
  size,
  style,
  mosaic = true,
}: {
  imageUrl: string | null;
  playlistId: string;
  size: number;
  style?: StyleProp<ViewStyle>;
  /** Attempt the song-cover mosaic when there's no image. Off for non-curated
   *  (e.g. Spotify) playlists whose ids don't map to curated_playlist_songs. */
  mosaic?: boolean;
}) {
  const [covers, setCovers] = useState<string[]>([]);
  useEffect(() => {
    if (imageUrl || !mosaic) return;
    let active = true;
    getCuratedPlaylistCovers(playlistId, 4).then((c) => { if (active) setCovers(c); });
    return () => { active = false; };
  }, [playlistId, imageUrl, mosaic]);

  const half = size / 2;
  return (
    <View style={[{ width: size, height: size, overflow: "hidden", alignItems: "center", justifyContent: "center" }, style]}>
      {imageUrl ? (
        <CachedImage source={{ uri: imageUrl }} style={{ width: size, height: size }} resizeMode="cover" />
      ) : covers.length > 0 ? (
        <View style={{ width: size, height: size, flexDirection: "row", flexWrap: "wrap" }}>
          {covers.slice(0, 4).map((uri, i) => (
            <CachedImage key={i} source={{ uri }} style={{ width: half, height: half }} resizeMode="cover" />
          ))}
        </View>
      ) : (
        <Text style={{ fontSize: size * 0.4 }}>🎵</Text>
      )}
    </View>
  );
}
