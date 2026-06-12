import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Modal, Pressable,
  TextInput, Platform, Image, KeyboardAvoidingView, ActivityIndicator, Alert,
  Keyboard, TouchableWithoutFeedback, ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { type CuratedPlaylist } from "../../lib/feed/types";
import { updateCuratedPlaylist } from "../../services/playlists";
import { uploadImageToStorage } from "../../services/storage";
import { useSheetDragClose } from "../../hooks/useSheetDragClose";
import { DragGrabber } from "../common/DragGrabber";

/**
 * Owner-only edit overlay for a curated playlist. Lets the user change the
 * cover image, name, and description in one place. Saves to Supabase and
 * hands the updated row back via `onSaved` so the parent screen can refresh
 * without an extra fetch.
 */
export function EditPlaylistOverlay({
  playlist, userId, onClose, onSaved,
}: {
  playlist: CuratedPlaylist;
  userId: string;
  onClose: () => void;
  onSaved: (updated: CuratedPlaylist) => void;
}) {
  const slideAnim = useRef(new Animated.Value(800)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const [name, setName] = useState(playlist.name);
  const [description, setDescription] = useState(playlist.description ?? "");
  const [imageUri, setImageUri] = useState<string | null>(playlist.image_url);
  const [imageDirty, setImageDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, []);

  const close = () => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 800, duration: 220, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(onClose);
  };

  const { panHandlers, stretch } = useSheetDragClose({ slideAnim, onClose: close, closedValue: 800 });
  const dragBackdrop = slideAnim.interpolate({ inputRange: [0, 800], outputRange: [1, 0], extrapolate: "clamp" });

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission required", "Allow photo access to set a cover image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    setImageUri(result.assets[0].uri);
    setImageDirty(true);
  };

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      let nextImageUrl: string | null | undefined = undefined;
      if (imageDirty && imageUri) {
        setUploading(true);
        const ext = imageUri.split(".").pop()?.toLowerCase() ?? "jpg";
        const filePath = `${userId}/playlist-${playlist.id}-${Date.now()}.${ext}`;
        nextImageUrl = await uploadImageToStorage("post-media", filePath, imageUri, `image/${ext}`);
        setUploading(false);
      } else if (imageDirty && !imageUri) {
        nextImageUrl = null;
      }
      const updated = await updateCuratedPlaylist(playlist.id, {
        name: name.trim(),
        description,
        ...(nextImageUrl !== undefined ? { image_url: nextImageUrl } : {}),
      });
      if (!updated) {
        Alert.alert("Couldn't save", "Please try again.");
        return;
      }
      onSaved(updated as CuratedPlaylist);
      close();
    } catch (e: any) {
      Alert.alert("Save failed", e?.message ?? "Could not update playlist.");
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  return (
    <Modal transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "rgba(0,0,0,0.55)" },
          { opacity: Animated.multiply(backdropAnim, dragBackdrop) },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      <KeyboardAvoidingView
        style={StyleSheet.absoluteFill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: slideAnim }, { scaleY: stretch }] },
          ]}
        >
          <DragGrabber panHandlers={panHandlers} />
          <View style={styles.header}>
            <TouchableOpacity onPress={close} hitSlop={12}>
              <Text style={styles.headerBtnMuted}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Playlist</Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={!name.trim() || saving}
              hitSlop={12}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#1DB954" />
              ) : (
                <Text style={[styles.headerBtnSave, !name.trim() && { opacity: 0.4 }]}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 30 }}
            >
              {/* Cover image */}
              <View style={{ alignItems: "center", marginTop: 16, marginBottom: 24 }}>
                <TouchableOpacity activeOpacity={0.85} onPress={pickImage} style={styles.imagePicker}>
                  {imageUri ? (
                    <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  ) : (
                    <View style={[StyleSheet.absoluteFill, styles.imagePickerEmpty]}>
                      <FontAwesome5 name="image" size={26} color="rgba(255,255,255,0.35)" />
                      <Text style={styles.imagePickerHint}>Tap to add cover</Text>
                    </View>
                  )}
                  {uploading && (
                    <View style={[StyleSheet.absoluteFill, styles.imageOverlay]}>
                      <ActivityIndicator color="#fff" />
                    </View>
                  )}
                  {imageUri && !uploading && (
                    <View style={styles.editBadge}>
                      <FontAwesome5 name="camera" size={11} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Name */}
              <Text style={styles.label}>NAME</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Playlist name"
                placeholderTextColor="rgba(255,255,255,0.25)"
                maxLength={60}
              />

              {/* Description */}
              <Text style={styles.label}>DESCRIPTION</Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={description}
                onChangeText={setDescription}
                placeholder="What's this playlist about?"
                placeholderTextColor="rgba(255,255,255,0.25)"
                multiline
                numberOfLines={4}
                maxLength={300}
              />
              <Text style={styles.charCount}>{description.length}/300</Text>
            </ScrollView>
          </TouchableWithoutFeedback>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    backgroundColor: "#11171D",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingBottom: 30,
    maxHeight: "92%",
    borderTopWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
    marginBottom: 6,
  },
  headerBtnMuted: { color: "rgba(255,255,255,0.55)", fontSize: 15, fontWeight: "600" },
  headerTitle:    { color: "#fff", fontSize: 16, fontWeight: "800" },
  headerBtnSave:  { color: "#1DB954", fontSize: 15, fontWeight: "800" },
  imagePicker: {
    width: 168, height: 168,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  imagePickerEmpty: {
    alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.12)",
    borderStyle: "dashed",
    borderRadius: 20,
  },
  imagePickerHint: { color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: "600" },
  imageOverlay: {
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  editBadge: {
    position: "absolute",
    right: 8, bottom: 8,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
  },
  label: {
    fontSize: 11, fontWeight: "800",
    letterSpacing: 1,
    color: "rgba(255,255,255,0.4)",
    marginTop: 12, marginBottom: 8,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: "#fff",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  inputMulti: { minHeight: 100, textAlignVertical: "top" },
  charCount: {
    alignSelf: "flex-end",
    color: "rgba(255,255,255,0.3)",
    fontSize: 11, marginTop: 4,
  },
});
