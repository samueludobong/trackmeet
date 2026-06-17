import React, { useEffect, useState } from "react";
import {
  Modal, View, Text, TouchableOpacity, TextInput, ScrollView,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getConversationSettings, upsertConversationSettings,
  type ConversationSettings, type ConversationInfo,
} from "../../services/messages";
import {
  getConversationPlaylists, createConversationPlaylist,
} from "../../services/playlists";
import { type CuratedPlaylist } from "../../lib/feed/types";
import { s } from "../../assets/styles/messages/ChatSettingsScreen";

const ACCENT = "#AB00FF";

// Curated swatches — small enough to feel like a chooser, broad enough to
// cover the look. Tap to pick, tap-X to clear.
const ACCENT_SWATCHES = ["#AB00FF", "#FF3CAC", "#FF6C1A", "#1DB954", "#1B6CF5", "#FFD23F", "#00E5A0"];
const BACKGROUND_SWATCHES = ["#0D0D0D", "#1A0820", "#0B1428", "#10221A", "#1F1410", "#1A1A0A", "#241024"];

/**
 * Per-DM personalization. The viewer can set a nickname for the other person,
 * an accent color, a chat background color/image, and see the playlists that
 * have been created for this conversation. Mirrors the GroupSettingsScreen
 * pattern (tap the header in ChatDetailView to open).
 */
export function ChatSettingsScreen({
  conv, viewerId, onClose, onSaved,
}: {
  conv: ConversationInfo;
  viewerId: string | null;
  onClose: () => void;
  /** Notify the parent so the header nickname / accent updates in place. */
  onSaved?: (next: ConversationSettings) => void;
}) {
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nickname, setNickname] = useState("");
  const [accent, setAccent] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

  const [playlists, setPlaylists] = useState<CuratedPlaylist[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(true);
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");

  // Load existing settings + playlists in parallel.
  useEffect(() => {
    let active = true;
    (async () => {
      const [settings, pls] = await Promise.all([
        getConversationSettings(conv.conversationId),
        getConversationPlaylists(conv.conversationId),
      ]);
      if (!active) return;
      if (settings) {
        setNickname(settings.nickname ?? "");
        setAccent(settings.accent_color);
        setBackgroundColor(settings.background_color);
        setBackgroundImage(settings.background_image_url);
      }
      setPlaylists(pls);
      setLoading(false);
      setPlaylistsLoading(false);
    })();
    return () => { active = false; };
  }, [conv.conversationId]);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    const next = await upsertConversationSettings(conv.conversationId, {
      nickname: nickname.trim() ? nickname.trim() : null,
      accent_color: accent,
      background_color: backgroundColor,
      background_image_url: backgroundImage,
    });
    setSaving(false);
    if (!next) { Alert.alert("Couldn't save", "Please try again."); return; }
    onSaved?.(next);
    onClose();
  };

  const createPlaylist = async () => {
    if (!viewerId) return;
    const name = newPlaylistName.trim();
    if (!name || creatingPlaylist) return;
    setCreatingPlaylist(true);
    const playlist = await createConversationPlaylist(viewerId, conv.conversationId, name);
    setCreatingPlaylist(false);
    if (!playlist) { Alert.alert("Couldn't create playlist", "Please try again."); return; }
    setPlaylists((prev) => [playlist, ...prev]);
    setNewPlaylistName("");
  };

  const otherName = conv.otherUser.display_name || conv.otherUser.username;
  const initials = (otherName ?? "?").trim().slice(0, 1).toUpperCase();

  return (
    <Modal visible animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[s.root, { paddingTop: insets.top }]}>
          <View style={s.header}>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Text style={s.headerBtn}>Cancel</Text>
            </TouchableOpacity>
            <Text style={s.headerTitle}>Chat Details</Text>
            <TouchableOpacity onPress={save} disabled={saving} hitSlop={12}>
              {saving ? <ActivityIndicator size="small" color={ACCENT} /> : <Text style={s.headerBtnAccent}>Save</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}
          >
            {/* Hero: avatar + display name + @handle */}
            <View style={s.hero}>
              {conv.otherUser.avatar_url ? (
                <CachedImage source={{ uri: conv.otherUser.avatar_url }} style={s.avatar} />
              ) : (
                <View style={[s.avatar, s.avatarFallback]}>
                  <Text style={s.avatarInitials}>{initials}</Text>
                </View>
              )}
              <Text style={s.heroName} numberOfLines={1}>{otherName}</Text>
              <Text style={s.heroHandle}>@{conv.otherUser.username}</Text>
            </View>

            {loading ? (
              <ActivityIndicator color={ACCENT} style={{ marginTop: 24 }} />
            ) : (
              <>
                {/* Nickname */}
                <View style={s.section}>
                  <Text style={s.sectionLabel}>NICKNAME</Text>
                  <TextInput
                    style={s.input}
                    placeholder={`How you call ${otherName}`}
                    placeholderTextColor="rgba(255,255,255,0.28)"
                    value={nickname}
                    onChangeText={setNickname}
                    maxLength={40}
                  />
                  <Text style={s.inputHint}>Only visible to you.</Text>
                </View>

                {/* Accent color */}
                <View style={s.section}>
                  <Text style={s.sectionLabel}>ACCENT COLOR</Text>
                  <View style={s.swatchRow}>
                    <TouchableOpacity
                      onPress={() => setAccent(null)}
                      style={[s.swatch, s.swatchClear, accent == null && s.swatchSelected]}
                    >
                      <Ionicons name="close" size={18} color="rgba(255,255,255,0.5)" />
                    </TouchableOpacity>
                    {ACCENT_SWATCHES.map((c) => (
                      <TouchableOpacity
                        key={c}
                        onPress={() => setAccent(c)}
                        style={[s.swatch, { backgroundColor: c }, accent === c && s.swatchSelected]}
                      />
                    ))}
                  </View>
                </View>

                {/* Background color */}
                <View style={s.section}>
                  <Text style={s.sectionLabel}>CHAT BACKGROUND</Text>
                  <View style={s.swatchRow}>
                    <TouchableOpacity
                      onPress={() => setBackgroundColor(null)}
                      style={[s.swatch, s.swatchClear, backgroundColor == null && s.swatchSelected]}
                    >
                      <Ionicons name="close" size={18} color="rgba(255,255,255,0.5)" />
                    </TouchableOpacity>
                    {BACKGROUND_SWATCHES.map((c) => (
                      <TouchableOpacity
                        key={c}
                        onPress={() => setBackgroundColor(c)}
                        style={[s.swatch, { backgroundColor: c }, backgroundColor === c && s.swatchSelected]}
                      />
                    ))}
                  </View>
                </View>

                {/* Background image — minimal placeholder for now. */}
                <View style={s.section}>
                  <Text style={s.sectionLabel}>BACKGROUND IMAGE</Text>
                  <View style={s.bgPickerBox}>
                    {backgroundImage ? (
                      <>
                        <CachedImage source={{ uri: backgroundImage }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                        <View style={s.bgPickerOverlay}>
                          <TouchableOpacity onPress={() => setBackgroundImage(null)} hitSlop={10}>
                            <Text style={s.bgPickerHint}>Remove</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    ) : (
                      <>
                        <Ionicons name="image-outline" size={24} color="rgba(255,255,255,0.35)" />
                        <Text style={s.bgPickerHint}>Image picker coming soon</Text>
                      </>
                    )}
                  </View>
                </View>

                {/* DM playlists */}
                <View style={s.section}>
                  <Text style={s.sectionLabel}>PLAYLISTS FOR THIS CHAT</Text>
                  {playlistsLoading ? (
                    <ActivityIndicator color={ACCENT} style={{ marginVertical: 14 }} />
                  ) : playlists.length === 0 ? (
                    <Text style={s.playlistEmpty}>No playlists yet. Create one to share with this person.</Text>
                  ) : (
                    playlists.map((pl) => (
                      <View key={pl.id} style={s.playlistRow}>
                        {pl.image_url ? (
                          <CachedImage source={{ uri: pl.image_url }} style={s.playlistArt} />
                        ) : (
                          <View style={[s.playlistArt, s.playlistArtFallback]}>
                            <FontAwesome5 name="music" size={16} color={ACCENT} />
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={s.playlistName} numberOfLines={1}>{pl.name}</Text>
                          <Text style={s.playlistMeta} numberOfLines={1}>
                            Created {new Date(pl.created_at).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}

                  <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                    <TextInput
                      style={[s.input, { flex: 1 }]}
                      placeholder="New playlist name"
                      placeholderTextColor="rgba(255,255,255,0.28)"
                      value={newPlaylistName}
                      onChangeText={setNewPlaylistName}
                      maxLength={50}
                      returnKeyType="done"
                      onSubmitEditing={createPlaylist}
                    />
                    <TouchableOpacity
                      style={[s.newPlaylistBtn, (!newPlaylistName.trim() || creatingPlaylist) && { opacity: 0.45 }]}
                      onPress={createPlaylist}
                      disabled={!newPlaylistName.trim() || creatingPlaylist}
                      activeOpacity={0.85}
                    >
                      {creatingPlaylist
                        ? <ActivityIndicator size="small" color={ACCENT} />
                        : <Text style={s.newPlaylistBtnText}>Create</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
