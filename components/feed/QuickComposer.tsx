import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, Animated } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../../assets/styles/feed/styles";
import { type NowPlayingTrack } from "../../hooks/useNowPlaying";
import { type ParsedMusicLink } from "../../lib/musicLink";
import { NowPlayingBanner } from "./NowPlayingBanner";
import { ParsedLinkChip } from "./ParsedLinkChip";
import { VoiceRecorder } from "./VoiceRecorder";

/** The floating quick-post field shown on the Feed tab (text + now-playing attach + pasted-link song cards). */
export function QuickComposer({
  composerBottom, keyboardVisible, attachedTrack, setAttachedTrack,
  attachedLink, removeAttachedLink, parsingLink,
  setMenuVisible, quickText, setQuickText, onComposerTextChange, handleQuickPost, handleVoicePost, onMeasure,
}: {
  composerBottom: Animated.AnimatedInterpolation<number> | Animated.Value | number;
  keyboardVisible: boolean;
  attachedTrack: NowPlayingTrack | null;
  setAttachedTrack: React.Dispatch<React.SetStateAction<NowPlayingTrack | null>>;
  // A song attached by pasting a streaming link, plus its in-flight/parse state.
  attachedLink: ParsedMusicLink | null;
  removeAttachedLink: () => void;
  parsingLink: boolean;
  setMenuVisible: (v: boolean) => void;
  quickText: string;
  setQuickText: (v: string) => void;
  // Wraps setQuickText so pasting a music link kicks off parsing.
  onComposerTextChange: (v: string) => void;
  handleQuickPost: () => void;
  handleVoicePost?: (rec: { uri: string; durationMs: number }) => void;
  // Reports the rendered height of the whole composer stack (input + optional
  // now-playing banner) so the MeetMiniBar can be positioned directly above it.
  onMeasure?: (height: number) => void;
}) {
  const [recorderOpen, setRecorderOpen] = useState(false);
  return (
    <Animated.View
      style={[styles.composerWrap, { bottom: composerBottom as any }]}
      onLayout={(e) => onMeasure?.(e.nativeEvent.layout.height)}
    >
      {keyboardVisible && (
        <View style={{ paddingHorizontal: 12 }}>
          <NowPlayingBanner onAttach={(t) => { setAttachedTrack((prev) => (prev?.id === t.id ? null : t)); removeAttachedLink(); }} />
          {attachedTrack && (
            <View style={styles.attachedTrackChip}>
              {attachedTrack.albumArt ? (
                <CachedImage source={{ uri: attachedTrack.albumArt }} style={styles.attachedTrackArt} />
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

      {/* Pasted-link parsing state + resolved song card. Shown regardless of the
          keyboard since it appears the moment a link is pasted. */}
      {(parsingLink || attachedLink) && (
        <View style={{ paddingHorizontal: 12 }}>
          <ParsedLinkChip parsingLink={parsingLink} attachedLink={attachedLink} onRemove={removeAttachedLink} />
        </View>
      )}

      {/* While a link is parsing the whole input row is inert — no typing,
          no opening the composer sheet, voice recorder or sending. */}
      <View style={[styles.composerGlass, parsingLink && { opacity: 0.5 }]}>
        <TouchableOpacity
          style={styles.composerPlus}
          activeOpacity={0.8}
          onPress={() => setMenuVisible(true)}
          disabled={parsingLink}
        >
          <Text style={styles.composerPlusIcon}>+</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.composerInput}
          placeholder={parsingLink ? "Parsing link…" : attachedLink ? "Add a caption…" : "What's on your mind?"}
          placeholderTextColor="rgba(255,255,255,0.3)"
          returnKeyType="send"
          value={quickText}
          onChangeText={onComposerTextChange}
          onSubmitEditing={handleQuickPost}
          editable={!parsingLink}
        />
        {handleVoicePost && (
          <TouchableOpacity
            style={styles.composerPlus}
            activeOpacity={0.8}
            onPress={() => setRecorderOpen(true)}
            hitSlop={6}
            disabled={parsingLink}
          >
            <Ionicons name="mic" size={18} color="#AB00FF" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.composerSend}
          activeOpacity={0.8}
          onPress={handleQuickPost}
          disabled={parsingLink}
        >
          <Text style={styles.composerSendIcon}>↑</Text>
        </TouchableOpacity>
      </View>

      {handleVoicePost && (
        <VoiceRecorder
          visible={recorderOpen}
          onClose={() => setRecorderOpen(false)}
          onCapture={handleVoicePost}
        />
      )}
    </Animated.View>
  );
}
