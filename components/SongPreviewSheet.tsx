import { View, Text, StyleSheet, Animated, Pressable, TouchableOpacity, ActivityIndicator, Modal } from "react-native";
import { CachedImage } from "./ui/CachedImage";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { AddToPlaylistSheet } from "./AddToPlaylistSheet";


import { ps } from "./songPreviewSheet.styles";

import { useSongPreview } from "../hooks/useSongPreview";
import { useSheetDragClose } from "../hooks/useSheetDragClose";
import { DragGrabber } from "./common/DragGrabber";

type Song = {
  id: string;
  name: string;
  artist: string;
  albumArt: string | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  song: Song | null;
  /** Viewer's Spotify access token — needed to fetch the 30-second preview URL */
  accessToken: string | null;
  /** Viewer's user id — needed to save the track into their curated playlists */
  userId?: string | null;
};

export function SongPreviewSheet({ visible, onClose, song, accessToken, userId }: Props) {
  const {
    backdropAnim, slideAnim, soundRef, previewUrl, setPreviewUrl, loading, setLoading, playing, setPlaying, posMs, setPosMs, durMs, setDurMs, saved, setSaved, pickerOpen, setPickerOpen, rendered, setRendered, togglePlay, handleSave, handleOpen, fmt, progress
  } = useSongPreview({ visible, onClose, song, accessToken, userId });

  const { panHandlers: dragHandlers, stretch } = useSheetDragClose({ slideAnim, onClose, closedValue: 400 });
  const dragBackdrop = slideAnim.interpolate({ inputRange: [0, 400], outputRange: [1, 0], extrapolate: "clamp" });

  if (!song) return null;

  return (
    <Modal
      visible={rendered}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View
        style={[StyleSheet.absoluteFill, ps.root, { opacity: Animated.multiply(backdropAnim, dragBackdrop) }]}
      >      <Pressable
        style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.72)" }]}
        onPress={onClose}
      />      <Animated.View style={[ps.sheet, { transform: [{ translateY: slideAnim }, { scaleY: stretch }] }]}>        <DragGrabber panHandlers={dragHandlers} />        <View style={ps.artWrap}>
          {song.albumArt ? (
            <CachedImage source={{ uri: song.albumArt }} style={ps.art} resizeMode="cover" />
          ) : (
            <View style={[ps.art, ps.artFallback]}>
              <FontAwesome5 name="music" size={36} color="rgba(255,255,255,0.18)" />
            </View>
          )}
        </View>        <Text style={ps.trackName} numberOfLines={1}>{song.name}</Text>
        <Text style={ps.artist}    numberOfLines={1}>{song.artist}</Text>        {loading ? (
          <View style={ps.loadingWrap}>
            <ActivityIndicator color="rgba(255,255,255,0.4)" />
          </View>
        ) : previewUrl ? (
          <>
            <View style={ps.progressTrack}>
              <View style={[ps.progressFill, { width: `${progress * 100}%` as any }]} />
            </View>
            <View style={ps.times}>
              <Text style={ps.time}>{fmt(posMs)}</Text>
              <Text style={ps.time}>{fmt(durMs)}</Text>
            </View>

            <TouchableOpacity style={ps.playBtn} onPress={togglePlay} activeOpacity={0.85}>
              <Ionicons name={playing ? "pause" : "play"} size={28} color="#fff" />
            </TouchableOpacity>
          </>
        ) : (
          <View style={ps.loadingWrap}>
            <Text style={ps.noPreview}>No 30-second preview available</Text>
          </View>
        )}        <View style={ps.actions}>
          <TouchableOpacity style={ps.openBtn} activeOpacity={0.8} onPress={handleOpen}>
            <FontAwesome5 name="spotify" size={14} color="#1DB954" />
            <Text style={ps.openBtnText}>Open</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[ps.saveBtn, saved && ps.savedBtn]}
            activeOpacity={0.8}
            onPress={handleSave}
          >
            <Ionicons
              name={saved ? "checkmark-circle" : "add-circle-outline"}
              size={14}
              color={saved ? "#1DB954" : "rgba(255,255,255,0.5)"}
            />
            <Text style={[ps.saveBtnText, saved && ps.savedBtnText]}>
              {saved ? "Saved" : "Save"}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
      </Animated.View>

      <AddToPlaylistSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        userId={userId ?? null}
        track={song ? {
          id: song.id, name: song.name, artist: song.artist, albumArt: song.albumArt,
        } : null}
        onSavedChange={setSaved}
      />
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
