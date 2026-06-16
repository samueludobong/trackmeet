import React, { useContext, useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { CachedImage } from "../ui/CachedImage";
import { AddToPlaylistSheet } from "../AddToPlaylistSheet";
import { LyricsOverlay } from "../profile/LyricsOverlay";
import { DragGrabber } from "../common/DragGrabber";
import { useSheetDragClose } from "../../hooks/useSheetDragClose";
import { openSpotifyLink } from "../../lib/spotify";
import { NowPlayingCtx } from "../../lib/feed/contexts";
import { ps } from "../songPreviewSheet.styles";

type Song = {
  id: string;
  name: string;
  artist: string;
  albumArt: string | null;
};

/**
 * Actions sheet shown when a music post card's open button is tapped while
 * THAT song is currently playing on the viewer's Spotify (the waveform state).
 * Mirrors SongPreviewSheet's chrome — art / title / artist + bottom action row —
 * but drops the 30-second preview (the user is already listening) and adds a
 * View Lyrics button that hands off to the full LyricsOverlay.
 */
export function MusicCardActionsSheet({
  visible,
  onClose,
  song,
  userId,
}: {
  visible: boolean;
  onClose: () => void;
  song: Song | null;
  /** Viewer's user id — needed for the Add-to-Playlist sheet and lyrics save. */
  userId: string | null;
}) {
  // The sheet only appears when this song IS the viewer's currently-playing
  // track, so we can pull live duration / progress / access token straight
  // from the now-playing context. Without this seed the LyricsOverlay opens
  // with no duration → seek bar dead, timestamps stuck at 0:00 — and if the
  // token snapshot was briefly null at mount, owner polling never starts.
  const np = useContext(NowPlayingCtx);
  const accessToken = np?.accessToken ?? null;
  const liveDurationMs = np?.track?.durationMs ?? null;
  const liveProgressMs = np?.liveProgressMs ?? null;
  // Same modal-render gating as SongPreviewSheet: keep the Modal mounted across
  // the close animation so the slide-out doesn't snap to invisible mid-frame.
  const [rendered, setRendered] = useState(visible);
  const slideAnim = useRef(new Animated.Value(400)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      slideAnim.setValue(400);
      backdropAnim.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 200 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else if (rendered) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 400, duration: 200, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished) setRendered(false); });
    }
  }, [visible, rendered, slideAnim, backdropAnim]);

  const { panHandlers: dragHandlers, stretch } = useSheetDragClose({ slideAnim, onClose, closedValue: 400 });
  const dragBackdrop = slideAnim.interpolate({ inputRange: [0, 400], outputRange: [1, 0], extrapolate: "clamp" });

  if (!song) return null;

  const handleOpenInSpotify = () => {
    openSpotifyLink(`spotify:track:${song.id}`, `https://open.spotify.com/track/${song.id}`);
  };

  return (
    <Modal visible={rendered} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, ps.root, { opacity: Animated.multiply(backdropAnim, dragBackdrop) }]}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.72)" }]} onPress={onClose} />
        <Animated.View style={[ps.sheet, { transform: [{ translateY: slideAnim }, { scaleY: stretch }] }]}>
          <DragGrabber panHandlers={dragHandlers} />

          <View style={ps.artWrap}>
            {song.albumArt ? (
              <CachedImage source={{ uri: song.albumArt }} style={ps.art} resizeMode="cover" />
            ) : (
              <View style={[ps.art, ps.artFallback]}>
                <FontAwesome5 name="music" size={36} color="rgba(255,255,255,0.18)" />
              </View>
            )}
          </View>

          <Text style={ps.trackName} numberOfLines={1}>{song.name}</Text>
          <Text style={ps.artist} numberOfLines={1}>{song.artist}</Text>

          {/* Action row: Open in Spotify + Add to Playlist */}
          <View style={[ps.actions, { marginTop: 8 }]}>
            <TouchableOpacity style={ps.openBtn} activeOpacity={0.8} onPress={handleOpenInSpotify}>
              <FontAwesome5 name="spotify" size={14} color="#1DB954" />
              <Text style={ps.openBtnText}>Open in Spotify</Text>
            </TouchableOpacity>

            <TouchableOpacity style={ps.saveBtn} activeOpacity={0.8} onPress={() => setPickerOpen(true)}>
              <Ionicons name="add-circle-outline" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={ps.saveBtnText}>Add to Playlist</Text>
            </TouchableOpacity>
          </View>

          {/* Orange CTA: View Lyrics → hands off to the full LyricsOverlay */}
          <TouchableOpacity style={local.lyricsBtn} activeOpacity={0.88} onPress={() => setLyricsOpen(true)}>
            <Ionicons name="chevron-expand-outline" size={16} color="#fff" />
            <Text style={local.lyricsBtnText}>View Lyrics</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      <AddToPlaylistSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        userId={userId}
        track={{ id: song.id, name: song.name, artist: song.artist, albumArt: song.albumArt }}
      />

      <LyricsOverlay
        visible={lyricsOpen}
        onClose={() => setLyricsOpen(false)}
        isOwner
        accessToken={accessToken}
        viewerId={userId}
        song={{
          id: song.id,
          name: song.name,
          artist: song.artist,
          albumArt: song.albumArt,
          // Seed from the live now-playing so the timestamp / seek bar / synced
          // lyric highlight all work on the very first frame, before the
          // overlay's first poll lands. Owner-mode polling then keeps it fresh.
          durationMs: liveDurationMs,
          progressMs: liveProgressMs,
          updatedAt: new Date().toISOString(),
        }}
      />
    </Modal>
  );
}

const local = StyleSheet.create({
  lyricsBtn: {
    alignSelf: "stretch",
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    height: 48, borderRadius: 14,
    backgroundColor: "#FF6C1A",
    marginTop: 12,
    shadowColor: "#FF6C1A",
    shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  lyricsBtnText: { fontSize: 14, fontWeight: "800", color: "#fff", letterSpacing: 0.2 },
});
