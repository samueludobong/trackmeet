import React from "react";
import { EditProfilePinnedSong } from "../../components/profile/EditProfilePinnedSong";
import { EditProfileSocialLinks } from "../../components/profile/EditProfileSocialLinks";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Modal, Pressable, TextInput, Platform, KeyboardAvoidingView, ActivityIndicator, Keyboard, TouchableWithoutFeedback } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import * as ImagePicker from "expo-image-picker";
import { FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { epOverlayStyles } from "../../assets/styles/feed/localStyles";
import { type EditFormData } from "../../types/profile";
import { BannerShape } from "../../components/profile/BannerShape";
import { PinnedSongOverlay } from "../../components/profile/PinnedSongOverlay";
import { BannerColorOverlay } from "../../components/profile/BannerColorOverlay";

import { useEditProfileForm } from "../../hooks/useEditProfileForm";
import { useSheetDragClose } from "../../hooks/useSheetDragClose";
import { DragGrabber } from "../common/DragGrabber";

export function EditProfileOverlay({ visible, onClose, initialData, onSaved, accessToken, userId }: {
  visible: boolean;
  onClose: () => void;
  initialData: EditFormData;
  onSaved: (data: EditFormData) => void;
  accessToken: string | null;
  userId: string | null;
}) {
  const {
    slideAnim, backdropAnim,
    form, setForm, saving, setSaving, songSearchOpen, setSongSearchOpen, bannerColorOpen, setBannerColorOpen, newLink, setNewLink, avatarUploading, setAvatarUploading, pickAvatar, addLink, removeLink, setSocialLink, usernameDaysLeft, isUsernameLocked, dnWindowExpired, dnChangesUsed, dnChangesLeft, isDNLocked, dnDaysLeft, usernameLabelSuffix, dnLabelSuffix, save, initials
  } = useEditProfileForm({ visible, onClose, initialData, onSaved, accessToken, userId });

  const { panHandlers: dragHandlers, stretch } = useSheetDragClose({ slideAnim, onClose, closedValue: 800 });
  const dragBackdrop = slideAnim.interpolate({ inputRange: [0, 800], outputRange: [1, 0], extrapolate: "clamp" });

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, epOverlayStyles.backdrop, { opacity: Animated.multiply(backdropAnim, dragBackdrop) }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <Animated.View style={[epOverlayStyles.sheet, { transform: [{ translateY: slideAnim }, { scaleY: stretch }] }]}>
          <DragGrabber panHandlers={dragHandlers} />
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
            <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>
              <View style={{ flex: 1 }}>

            <View style={epOverlayStyles.sheetHeader}>
              <TouchableOpacity onPress={onClose} hitSlop={12}>
                <Text style={epOverlayStyles.cancelBtn}>Cancel</Text>
              </TouchableOpacity>
              <Text style={epOverlayStyles.sheetTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={save} disabled={saving} hitSlop={8}>
                {saving
                  ? <ActivityIndicator size="small" color="#FF6C1A" />
                  : <Text style={epOverlayStyles.saveBtn}>Save</Text>}
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
            >              <View style={epOverlayStyles.section}>
                <Text style={epOverlayStyles.sectionLabel}>BANNER</Text>
                <View style={epOverlayStyles.bannerPreview}>
                  {form.banner_image_url ? (
                    <View style={StyleSheet.absoluteFill} pointerEvents="none">
                      <CachedImage source={{ uri: form.banner_image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    </View>
                  ) : form.banner_color ? (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: form.banner_color }]} pointerEvents="none" />
                  ) : (
                    <LinearGradient
                      colors={["#3D0C00", "#CC4200", "#FF6C1A", "#CC4200", "#3D0C00"]}
                      locations={[0, 0.25, 0.5, 0.75, 1]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={StyleSheet.absoluteFill}
                      pointerEvents="none"
                    />
                  )}
                  {form.banner_shape && !form.banner_image_url ? (
                    <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]} pointerEvents="none">
                      <BannerShape shape={form.banner_shape} color={form.banner_shape_color ?? "#ffffff"} size={56} />
                    </View>
                  ) : null}
                  <TouchableOpacity
                    style={[StyleSheet.absoluteFill, { alignItems: "flex-end", justifyContent: "flex-end", padding: 10 }]}
                    activeOpacity={0.8}
                    onPress={() => setBannerColorOpen(true)}
                  >
                    <View style={epOverlayStyles.bannerEditBtn}>
                      <FontAwesome5 name="pen" size={10} color="#fff" />
                      <Text style={epOverlayStyles.bannerEditText}>Edit Banner</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>              <View style={epOverlayStyles.avatarSection}>
                <TouchableOpacity style={epOverlayStyles.avatarWrap} onPress={pickAvatar} activeOpacity={0.8}>
                  {avatarUploading ? (
                    <View style={[epOverlayStyles.avatarCircle, epOverlayStyles.avatarLoading]}>
                      <ActivityIndicator color="#fff" />
                    </View>
                  ) : form.avatar_url ? (
                    <CachedImage source={{ uri: form.avatar_url }} style={epOverlayStyles.avatarCircle} />
                  ) : (
                    <View style={epOverlayStyles.avatarCircle}>
                      <Text style={epOverlayStyles.avatarInitials}>{initials}</Text>
                    </View>
                  )}
                  <View style={epOverlayStyles.avatarEditBadge}>
                    <FontAwesome5 name="camera" size={11} color="#fff" />
                  </View>
                </TouchableOpacity>
                <Text style={epOverlayStyles.avatarHint}>Tap to change photo</Text>
              </View>              <View style={epOverlayStyles.section}>
                <Text style={epOverlayStyles.sectionLabel}>
                  {"DISPLAY NAME"}
                  {dnLabelSuffix ? (
                    <Text style={isDNLocked ? epOverlayStyles.cooldownBadgeLocked : epOverlayStyles.cooldownBadge}>
                      {dnLabelSuffix}
                    </Text>
                  ) : null}
                </Text>
                <TextInput
                  style={[epOverlayStyles.input, isDNLocked && epOverlayStyles.inputLocked]}
                  value={form.display_name}
                  onChangeText={(t) => !isDNLocked && setForm((f) => ({ ...f, display_name: t }))}
                  placeholder="Your name"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  editable={!isDNLocked}
                />
              </View>              <View style={epOverlayStyles.section}>
                <Text style={epOverlayStyles.sectionLabel}>
                  {"USERNAME"}
                  {usernameLabelSuffix ? (
                    <Text style={epOverlayStyles.cooldownBadgeLocked}>{usernameLabelSuffix}</Text>
                  ) : null}
                </Text>
                <TextInput
                  style={[epOverlayStyles.input, isUsernameLocked && epOverlayStyles.inputLocked]}
                  value={form.username}
                  onChangeText={(t) => !isUsernameLocked && setForm((f) => ({ ...f, username: t.replace(/\s/g, "").toLowerCase() }))}
                  placeholder="@handle"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  autoCapitalize="none"
                  editable={!isUsernameLocked}
                />
              </View>              <View style={epOverlayStyles.section}>
                <Text style={epOverlayStyles.sectionLabel}>BIO</Text>
                <TextInput
                  style={[epOverlayStyles.input, epOverlayStyles.inputMulti]}
                  value={form.bio}
                  onChangeText={(t) => setForm((f) => ({ ...f, bio: t }))}
                  placeholder="Tell people about yourself…"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  multiline
                  numberOfLines={3}
                />
              </View>              
                <EditProfilePinnedSong form={form} setForm={setForm} onOpenPicker={() => setSongSearchOpen(true)} />
                <EditProfileSocialLinks form={form} setSocialLink={setSocialLink} newLink={newLink} setNewLink={setNewLink} addLink={addLink} removeLink={removeLink} />
            </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>

          <BannerColorOverlay
            visible={bannerColorOpen}
            onClose={() => setBannerColorOpen(false)}
            selectedColor={form.banner_color}
            bannerImageUrl={form.banner_image_url}
            userId={userId}
            onSelectColor={(color) => setForm((f) => ({ ...f, banner_color: color, banner_image_url: null }))}
            onSelectImage={(uri) => setForm((f) => ({ ...f, banner_image_url: uri, banner_color: null }))}
            selectedShape={form.banner_shape}
            selectedShapeColor={form.banner_shape_color}
            onSelectShape={(shape) => setForm((f) => ({ ...f, banner_shape: shape === "none" ? null : shape }))}
            onSelectShapeColor={(color) => setForm((f) => ({ ...f, banner_shape_color: color }))}
          />
          <PinnedSongOverlay
            visible={songSearchOpen}
            onClose={() => setSongSearchOpen(false)}
            accessToken={accessToken}
            onSelect={(song) => setForm((f) => ({
              ...f,
              pinned_song_id: song.id,
              pinned_song_name: song.name,
              pinned_song_artist: song.artist,
              pinned_song_album_art: song.albumArt,
            }))}
          />
        </Animated.View>
      </Modal>
  );
}
