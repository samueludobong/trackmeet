import { View, Text, Modal, Pressable, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Keyboard } from "react-native";
import { CachedImage } from "./ui/CachedImage";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { type PlaylistTrackInput } from "../services/playlists";

import { s } from "./addToPlaylistSheet.styles";

import { useAddToPlaylist } from "../hooks/useAddToPlaylist";

type Props = {
  visible: boolean;
  onClose: () => void;
  track?: PlaylistTrackInput | null;
  /** Bulk mode: add several tracks at once (e.g. a whole meet tracklist). */
  tracks?: PlaylistTrackInput[];
  userId: string | null;
  /** Notified whenever the track's "is in at least one playlist" state changes. */
  onSavedChange?: (saved: boolean) => void;
};

export function AddToPlaylistSheet({ visible, onClose, track, tracks, userId, onSavedChange }: Props) {
  const {
    items, bulk, single,
    busy, creating, newName, setNewName,
    toggle, createAndAdd,
    mode, setMode,
    spotifyToken,
    activeLoading, activePlaylists, activeMemberOf, activeAddedTo,
    canCreate, createDisabledReason,
    error, dismissError,
    reconnect, reconnecting,
  } = useAddToPlaylist({ visible, onClose, track, tracks, userId, onSavedChange });

  const isSpotify = mode === "spotify";
  const accentColor = isSpotify ? "#1DB954" : "#FF6C1A";

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={s.overlay} onPress={onClose}>
          <Pressable style={s.sheet} onPress={(e) => { e.stopPropagation(); Keyboard.dismiss(); }}>
            <View style={s.handle} />
            <Text style={s.title}>{bulk ? `Add ${items.length} songs` : "Add to Playlist"}</Text>

            {single && (
              <View style={s.trackRow}>
                {single.albumArt
                  ? <CachedImage source={{ uri: single.albumArt }} style={s.trackArt} />
                  : <View style={[s.trackArt, s.trackArtFallback]}>
                      <FontAwesome5 name="music" size={14} color="rgba(255,255,255,0.3)" />
                    </View>}
                <View style={{ flex: 1 }}>
                  <Text style={s.trackName} numberOfLines={1}>{single.name}</Text>
                  <Text style={s.trackArtist} numberOfLines={1}>{single.artist}</Text>
                </View>
              </View>
            )}

            {/* ── Mode selector ── */}
            <View style={s.modeRow}>
              <TouchableOpacity
                style={[s.modeBtn, !isSpotify && s.modeBtnActive]}
                activeOpacity={0.85}
                onPress={() => setMode("curated")}
              >
                <Ionicons name="albums-outline" size={14} color={!isSpotify ? "#0D0D0D" : "rgba(255,255,255,0.7)"} />
                <Text style={[s.modeBtnText, !isSpotify && s.modeBtnTextActive]}>TrackMeet</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modeBtn, isSpotify && s.modeBtnActiveSpotify]}
                activeOpacity={0.85}
                onPress={() => setMode("spotify")}
              >
                <FontAwesome5 name="spotify" size={13} color={isSpotify ? "#0D0D0D" : "rgba(255,255,255,0.7)"} />
                <Text style={[s.modeBtnText, isSpotify && s.modeBtnTextActive]}>Spotify</Text>
              </TouchableOpacity>
            </View>

            {/* ── Create new playlist row (always at top, in either mode) ── */}
            {canCreate ? (
              <View style={s.newRow}>
                <View style={[s.newIcon, { backgroundColor: isSpotify ? "rgba(29,185,84,0.14)" : "rgba(255,108,26,0.12)" }]}>
                  <Ionicons name="add" size={20} color={accentColor} />
                </View>
                <TextInput
                  style={s.newInput}
                  placeholder={isSpotify ? "New Spotify playlist…" : "New playlist…"}
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={newName}
                  onChangeText={setNewName}
                  returnKeyType="done"
                  onSubmitEditing={createAndAdd}
                />
                {newName.trim().length > 0 && (
                  <TouchableOpacity style={[s.createBtn, { backgroundColor: accentColor }]} onPress={createAndAdd} disabled={creating}>
                    {creating
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={s.createBtnText}>Create</Text>}
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={[s.newRow, { opacity: 0.6 }]}>
                <View style={[s.newIcon, { backgroundColor: "rgba(255,255,255,0.06)" }]}>
                  <Ionicons name="lock-closed-outline" size={18} color="rgba(255,255,255,0.4)" />
                </View>
                <Text style={[s.trackArtist, { flex: 1 }]} numberOfLines={2}>{createDisabledReason}</Text>
              </View>
            )}

            {error && (
              <View style={s.errBox}>
                <Ionicons name="alert-circle" size={16} color="#FF6C1A" />
                <View style={{ flex: 1 }}>
                  <Text style={s.errText} numberOfLines={4}>{error.message}</Text>
                  {error.needsReconnect && (
                    <TouchableOpacity
                      onPress={reconnect}
                      disabled={reconnecting}
                      activeOpacity={0.85}
                      style={s.errReconnectBtn}
                    >
                      {reconnecting ? (
                        <ActivityIndicator size="small" color="#0D0D0D" />
                      ) : (
                        <>
                          <FontAwesome5 name="spotify" size={12} color="#0D0D0D" />
                          <Text style={s.errReconnectTxt}>Reconnect Spotify</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity onPress={dismissError} hitSlop={10}>
                  <Ionicons name="close" size={16} color="rgba(255,255,255,0.5)" />
                </TouchableOpacity>
              </View>
            )}

            {activeLoading ? (
              <View style={s.loadingWrap}>
                <ActivityIndicator color="rgba(255,255,255,0.4)" />
              </View>
            ) : isSpotify && !spotifyToken ? (
              <Text style={s.empty}>Connect Spotify in Settings → Connected Apps to save here.</Text>
            ) : activePlaylists.length === 0 ? (
              <Text style={s.empty}>
                {isSpotify ? "No Spotify playlists found." : "No playlists yet — create one above."}
              </Text>
            ) : (
              <ScrollView
                style={s.list}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
              >
                {activePlaylists.map(pl => {
                  const inIt = bulk ? activeAddedTo.has(pl.id) : activeMemberOf.has(pl.id);
                  return (
                    <TouchableOpacity
                      key={pl.id}
                      style={s.row}
                      activeOpacity={0.7}
                      onPress={() => toggle(pl.id)}
                      disabled={busy === pl.id}
                    >
                      {pl.isLiked ? (
                        <View style={[s.cover, { backgroundColor: "rgba(29,185,84,0.14)", alignItems: "center", justifyContent: "center" }]}>
                          <Ionicons name="heart" size={18} color="#1DB954" />
                        </View>
                      ) : pl.image_url ? (
                        <CachedImage source={{ uri: pl.image_url }} style={s.cover} />
                      ) : (
                        <View style={[s.cover, s.coverFallback]}>
                          <FontAwesome5 name="music" size={14} color="rgba(255,255,255,0.3)" />
                        </View>
                      )}
                      <Text style={s.rowName} numberOfLines={1}>{pl.name}</Text>
                      {busy === pl.id ? (
                        <ActivityIndicator size="small" color="rgba(255,255,255,0.5)" />
                      ) : (
                        <Ionicons
                          name={inIt ? "checkmark-circle" : "ellipse-outline"}
                          size={24}
                          color={inIt ? accentColor : "rgba(255,255,255,0.25)"}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <TouchableOpacity style={s.doneBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={s.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
