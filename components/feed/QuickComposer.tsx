import React from "react";
import { View, Text, TouchableOpacity, TextInput, Animated, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../../lib/feed/styles";
import { type NowPlayingTrack } from "../../hooks/useNowPlaying";
import { NowPlayingBanner } from "./NowPlayingBanner";

/** The floating quick-post field shown on the Feed tab (text + now-playing attach). */
export function QuickComposer({
  composerBottom, keyboardVisible, attachedTrack, setAttachedTrack,
  setMenuVisible, quickText, setQuickText, handleQuickPost, onMeasure,
}: {
  composerBottom: Animated.AnimatedInterpolation<number> | Animated.Value | number;
  keyboardVisible: boolean;
  attachedTrack: NowPlayingTrack | null;
  setAttachedTrack: React.Dispatch<React.SetStateAction<NowPlayingTrack | null>>;
  setMenuVisible: (v: boolean) => void;
  quickText: string;
  setQuickText: (v: string) => void;
  handleQuickPost: () => void;
  // Reports the rendered height of the whole composer stack (input + optional
  // now-playing banner) so the MeetMiniBar can be positioned directly above it.
  onMeasure?: (height: number) => void;
}) {
  return (
    <Animated.View
      style={[styles.composerWrap, { bottom: composerBottom as any }]}
      onLayout={(e) => onMeasure?.(e.nativeEvent.layout.height)}
    >
      {keyboardVisible && (
        <View style={{ paddingHorizontal: 12 }}>
          <NowPlayingBanner onAttach={(t) => setAttachedTrack((prev) => (prev?.id === t.id ? null : t))} />
          {attachedTrack && (
            <View style={styles.attachedTrackChip}>
              {attachedTrack.albumArt ? (
                <Image source={{ uri: attachedTrack.albumArt }} style={styles.attachedTrackArt} />
              ) : (
                <View style={[styles.attachedTrackArt, { backgroundColor: "#1DB95422", alignItems: "center", justifyContent: "center" }]}>
                  <Ionicons name="musical-note" size={14} color="#1DB954" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.attachedTrackName} numberOfLines={1}>{attachedTrack.name}</Text>
                <Text style={styles.attachedTrackArtist} numberOfLines={1}>{attachedTrack.artist}</Text>
              </View>
              <TouchableOpacity onPress={() => setAttachedTrack(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.35)" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
      <View style={styles.composerGlass}>
        <TouchableOpacity style={styles.composerPlus} activeOpacity={0.8} onPress={() => setMenuVisible(true)}>
          <Text style={styles.composerPlusIcon}>+</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.composerInput}
          placeholder="What's on your mind?"
          placeholderTextColor="rgba(255,255,255,0.3)"
          returnKeyType="send"
          value={quickText}
          onChangeText={setQuickText}
          onSubmitEditing={handleQuickPost}
        />
        <TouchableOpacity style={styles.composerSend} activeOpacity={0.8} onPress={handleQuickPost}>
          <Text style={styles.composerSendIcon}>↑</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
