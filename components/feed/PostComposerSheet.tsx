import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Modal, Pressable, TextInput, Platform, KeyboardAvoidingView, ActivityIndicator, Keyboard, TouchableWithoutFeedback } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import * as ImagePicker from "expo-image-picker";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { csStyles } from "../../assets/styles/feed/localStyles";
import { styles as feedStyles } from "../../assets/styles/feed/styles";
import { NowPlayingBanner } from "./NowPlayingBanner";
import { type ComposerUser } from "../../types/composer";
import { type Post } from "../../app/data/mock";

import { usePostComposer } from "../../hooks/usePostComposer";
import { useSheetDragClose } from "../../hooks/useSheetDragClose";
import { SH } from "../../lib/feed/dimensions";
import { DragGrabber } from "../common/DragGrabber";
import { type NowPlayingTrack } from "../../hooks/useNowPlaying";

export function PostComposerSheet({
  visible,
  onClose,
  currentUser,
  onPosted,
  initialText,
  initialTrack,
}: {
  visible: boolean;
  onClose: () => void;
  currentUser: ComposerUser | null;
  onPosted: (post: Post) => void;
  initialText?: string;
  /** Pre-attach this song to the composer (used from the now-playing strip's
   *  "Share as Post" → composer already has the song chip seeded). */
  initialTrack?: NowPlayingTrack | null;
}) {
  const {
    text, setText, images, setImages, pollMode, setPollMode, pollQuestion, setPollQuestion, pollOptions, setPollOptions, posting, setPosting, mediaPickerOpen, setMediaPickerOpen, musicMode, setMusicMode, attachedTrack, setAttachedTrack, slideAnim, backdropAnim, pickFromCamera, pickFromLibrary, pickVideo, removeImage, canPost, handlePost, initials
  } = usePostComposer({ visible, onClose, currentUser, onPosted, initialText, initialTrack });

  const { panHandlers: dragHandlers, stretch } = useSheetDragClose({ slideAnim, onClose, closedValue: SH });
  const dragBackdrop = slideAnim.interpolate({ inputRange: [0, SH], outputRange: [1, 0], extrapolate: "clamp" });

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, csStyles.backdrop, { opacity: Animated.multiply(backdropAnim, dragBackdrop) }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[csStyles.sheet, { transform: [{ translateY: slideAnim }, { scaleY: stretch }] }]}>
        <DragGrabber panHandlers={dragHandlers} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>
          <View style={csStyles.header}>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Text style={csStyles.cancelBtn}>Cancel</Text>
            </TouchableOpacity>
            <Text style={csStyles.title}>New Post</Text>
            <TouchableOpacity
              style={[csStyles.postBtn, !canPost && { opacity: 0.4 }]}
              disabled={!canPost || posting}
              onPress={handlePost}
            >
              {posting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={csStyles.postBtnText}>Post</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          >            <View style={csStyles.composeRow}>
              {currentUser?.avatar_url ? (
                <CachedImage source={{ uri: currentUser.avatar_url }} style={csStyles.avatar} />
              ) : (
                <View style={csStyles.avatar}>
                  <Text style={csStyles.avatarInitials}>{initials}</Text>
                </View>
              )}
              <TextInput
                style={csStyles.textInput}
                placeholder="What's on your mind?"
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={text}
                onChangeText={setText}
                multiline
                autoFocus
              />
            </View>            {musicMode && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
                <NowPlayingBanner onAttach={(t) => setAttachedTrack((prev) => (prev?.id === t.id ? null : t))} />
              </View>
            )}

            {/* Attached-track chip — render whenever a track is attached, even
                if the music-picker mode isn't open. Otherwise a track that was
                pre-attached (e.g. from the now-playing strip's "Share as Post")
                would be invisible because `musicMode` defaults to false. */}
            {attachedTrack && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
                <View style={feedStyles.attachedTrackChip}>
                  {attachedTrack.albumArt ? (
                    <CachedImage source={{ uri: attachedTrack.albumArt }} style={feedStyles.attachedTrackArt} />
                  ) : (
                    <View style={[feedStyles.attachedTrackArt, { backgroundColor: "#1DB95422", alignItems: "center", justifyContent: "center" }]}>
                      <Ionicons name="musical-note" size={14} color="#1DB954" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={feedStyles.attachedTrackName} numberOfLines={1}>{attachedTrack.name}</Text>
                    <Text style={feedStyles.attachedTrackArtist} numberOfLines={1}>{attachedTrack.artist}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setAttachedTrack(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.35)" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {images.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={csStyles.imageStrip}
              >
                {images.map((uri, idx) => (
                  <TouchableOpacity key={idx} onPress={() => removeImage(idx)} activeOpacity={0.8} style={{ position: "relative" }}>
                    <CachedImage source={{ uri }} style={csStyles.thumbImage} />
                    <View style={csStyles.thumbRemove}>
                      <Text style={csStyles.thumbRemoveText}>✕</Text>
                    </View>
                  </TouchableOpacity>
                ))}
                {images.length < 4 && (
                  <TouchableOpacity style={csStyles.thumbAdd} onPress={() => setMediaPickerOpen(true)}>
                    <FontAwesome5 name="plus" size={18} color="rgba(255,255,255,0.4)" />
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}            {pollMode && (
              <View style={csStyles.pollSection}>
                <TextInput
                  style={csStyles.pollQuestion}
                  placeholder="Ask a question…"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={pollQuestion}
                  onChangeText={setPollQuestion}
                />
                {pollOptions.map((opt, idx) => (
                  <View key={idx} style={csStyles.pollOptionRow}>
                    <TextInput
                      style={csStyles.pollOptionInput}
                      placeholder={`Option ${idx + 1}${idx < 2 ? "" : " (optional)"}`}
                      placeholderTextColor="rgba(255,255,255,0.25)"
                      value={opt}
                      onChangeText={(t) =>
                        setPollOptions((prev) => prev.map((o, i) => (i === idx ? t : o)))
                      }
                    />
                    {idx > 1 && (
                      <TouchableOpacity
                        onPress={() => setPollOptions((prev) => prev.filter((_, i) => i !== idx))}
                        hitSlop={8}
                        style={{ marginLeft: 8 }}
                      >
                        <FontAwesome5 name="times" size={14} color="rgba(255,100,100,0.7)" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                {pollOptions.length < 4 && (
                  <TouchableOpacity style={csStyles.addOptionBtn} onPress={() => setPollOptions((p) => [...p, ""])}>
                    <FontAwesome5 name="plus" size={11} color="#AB00FF" style={{ marginRight: 6 }} />
                    <Text style={csStyles.addOptionText}>Add option</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </ScrollView>          {mediaPickerOpen && (
            <View style={csStyles.mediaPicker}>
              <TouchableOpacity style={csStyles.mediaPickerBtn} onPress={pickFromCamera} activeOpacity={0.75}>
                <FontAwesome5 name="camera" size={20} color="#fff" />
                <Text style={csStyles.mediaPickerLabel}>Camera</Text>
              </TouchableOpacity>
              <View style={csStyles.mediaPickerDivider} />
              <TouchableOpacity style={csStyles.mediaPickerBtn} onPress={pickFromLibrary} activeOpacity={0.75}>
                <FontAwesome5 name="images" size={20} color="#fff" />
                <Text style={csStyles.mediaPickerLabel}>Photos</Text>
              </TouchableOpacity>
              <View style={csStyles.mediaPickerDivider} />
              <TouchableOpacity style={csStyles.mediaPickerBtn} onPress={pickVideo} activeOpacity={0.75}>
                <FontAwesome5 name="film" size={20} color="#fff" />
                <Text style={csStyles.mediaPickerLabel}>Video</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={csStyles.mediaPickerClose}
                onPress={() => setMediaPickerOpen(false)}
                hitSlop={12}
              >
                <FontAwesome5 name="times" size={16} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>
          )}          <View style={csStyles.toolbar}>
            <TouchableOpacity
              style={[csStyles.toolBtn, (images.length > 0 || mediaPickerOpen) && csStyles.toolBtnActive]}
              onPress={() => { setMediaPickerOpen((o) => !o); setPollMode(false); setMusicMode(false); setAttachedTrack(null); }}
              activeOpacity={0.7}
            >
              <FontAwesome5
                name="images"
                size={19}
                color={(images.length > 0 || mediaPickerOpen) ? "#AB00FF" : "rgba(255,255,255,0.45)"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[csStyles.toolBtn, pollMode && csStyles.toolBtnActive]}
              onPress={() => { setPollMode((p) => !p); setImages([]); setMusicMode(false); setAttachedTrack(null); }}
              disabled={images.length > 0}
              activeOpacity={0.7}
            >
              <FontAwesome5 name="poll-h" size={19} color={pollMode ? "#AB00FF" : "rgba(255,255,255,0.45)"} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[csStyles.toolBtn, (musicMode || attachedTrack) && csStyles.toolBtnActive]}
              onPress={() => { setMusicMode((m) => !m); setImages([]); setPollMode(false); }}
              disabled={images.length > 0 || pollMode}
              activeOpacity={0.7}
            >
              <FontAwesome5 name="music" size={18} color={(musicMode || attachedTrack) ? "#AB00FF" : "rgba(255,255,255,0.45)"} />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <View style={csStyles.audienceChip}>
              <FontAwesome5 name="globe" size={11} color="rgba(255,255,255,0.5)" style={{ marginRight: 5 }} />
              <Text style={csStyles.audienceText}>Public</Text>
            </View>
          </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
