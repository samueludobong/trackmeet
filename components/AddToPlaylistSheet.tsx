import { View, Text, Modal, Pressable, TouchableOpacity, TextInput, Image, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
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
    items, bulk, single, playlists, setPlaylists, memberOf, setMemberOf, addedTo, setAddedTo, loading, setLoading, busy, setBusy, creating, setCreating, newName, setNewName, key, emit, toggle, createAndAdd
  } = useAddToPlaylist({ visible, onClose, track, tracks, userId, onSavedChange });

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={s.overlay} onPress={onClose}>
          <Pressable style={s.sheet} onPress={e => e.stopPropagation()}>
            <View style={s.handle} />
            <Text style={s.title}>{bulk ? `Add ${items.length} songs` : "Add to Playlist"}</Text>

            {single && (
              <View style={s.trackRow}>
                {single.albumArt
                  ? <Image source={{ uri: single.albumArt }} style={s.trackArt} />
                  : <View style={[s.trackArt, s.trackArtFallback]}>
                      <FontAwesome5 name="music" size={14} color="rgba(255,255,255,0.3)" />
                    </View>}
                <View style={{ flex: 1 }}>
                  <Text style={s.trackName} numberOfLines={1}>{single.name}</Text>
                  <Text style={s.trackArtist} numberOfLines={1}>{single.artist}</Text>
                </View>
              </View>
            )}            <View style={s.newRow}>
              <View style={s.newIcon}>
                <Ionicons name="add" size={20} color="#FF6C1A" />
              </View>
              <TextInput
                style={s.newInput}
                placeholder="New playlist…"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={newName}
                onChangeText={setNewName}
                returnKeyType="done"
                onSubmitEditing={createAndAdd}
              />
              {newName.trim().length > 0 && (
                <TouchableOpacity style={s.createBtn} onPress={createAndAdd} disabled={creating}>
                  {creating
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={s.createBtnText}>Create</Text>}
                </TouchableOpacity>
              )}
            </View>

            {loading ? (
              <View style={s.loadingWrap}>
                <ActivityIndicator color="rgba(255,255,255,0.4)" />
              </View>
            ) : playlists.length === 0 ? (
              <Text style={s.empty}>No playlists yet — create one above.</Text>
            ) : (
              <ScrollView
                style={s.list}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {playlists.map(pl => {
                  const inIt = bulk ? addedTo.has(pl.id) : memberOf.has(pl.id);
                  return (
                    <TouchableOpacity
                      key={pl.id}
                      style={s.row}
                      activeOpacity={0.7}
                      onPress={() => toggle(pl.id)}
                      disabled={busy === pl.id}
                    >
                      {pl.image_url
                        ? <Image source={{ uri: pl.image_url }} style={s.cover} />
                        : <View style={[s.cover, s.coverFallback]}>
                            <FontAwesome5 name="music" size={14} color="rgba(255,255,255,0.3)" />
                          </View>}
                      <Text style={s.rowName} numberOfLines={1}>{pl.name}</Text>
                      {busy === pl.id ? (
                        <ActivityIndicator size="small" color="rgba(255,255,255,0.5)" />
                      ) : (
                        <Ionicons
                          name={inIt ? "checkmark-circle" : "ellipse-outline"}
                          size={24}
                          color={inIt ? "#FF6C1A" : "rgba(255,255,255,0.25)"}
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

