import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useEffect, useState } from "react";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import {
  getMyCuratedPlaylists,
  getPlaylistIdsContainingTrack,
  addTrackToCuratedPlaylist,
  removeTrackFromCuratedPlaylist,
  createCuratedPlaylist,
  type CuratedPlaylistLite,
  type PlaylistTrackInput,
} from "../lib/playlists";

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
  const items = (tracks && tracks.length > 0) ? tracks : (track ? [track] : []);
  const bulk = items.length > 1;
  const single = items.length === 1 ? items[0] : null;

  const [playlists, setPlaylists] = useState<CuratedPlaylistLite[]>([]);
  const [memberOf, setMemberOf]   = useState<Set<string>>(new Set());  // single mode
  const [addedTo, setAddedTo]     = useState<Set<string>>(new Set());  // bulk mode
  const [loading, setLoading]     = useState(true);
  const [busy, setBusy]           = useState<string | null>(null);
  const [creating, setCreating]   = useState(false);
  const [newName, setNewName]     = useState("");

  const key = single?.id ?? `bulk:${items.length}`;

  // Load playlists + current membership whenever the sheet opens.
  useEffect(() => {
    if (!visible || items.length === 0 || !userId) return;
    let active = true;
    setLoading(true);
    setNewName("");
    setAddedTo(new Set());
    (async () => {
      const pls = await getMyCuratedPlaylists(userId);
      const mem = single ? await getPlaylistIdsContainingTrack(userId, single.id) : new Set<string>();
      if (!active) return;
      setPlaylists(pls);
      setMemberOf(mem);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [visible, key, userId]);

  const emit = (set: Set<string>) => onSavedChange?.(set.size > 0);

  const toggle = async (playlistId: string) => {
    if (busy) return;
    setBusy(playlistId);
    if (bulk) {
      for (const t of items) await addTrackToCuratedPlaylist(playlistId, t);
      const next = new Set(addedTo).add(playlistId);
      setAddedTo(next);
      onSavedChange?.(true);
    } else if (single) {
      const next = new Set(memberOf);
      if (memberOf.has(playlistId)) {
        await removeTrackFromCuratedPlaylist(playlistId, single.id);
        next.delete(playlistId);
      } else {
        await addTrackToCuratedPlaylist(playlistId, single);
        next.add(playlistId);
      }
      setMemberOf(next);
      emit(next);
    }
    setBusy(null);
  };

  const createAndAdd = async () => {
    if (!userId || items.length === 0 || !newName.trim() || creating) return;
    setCreating(true);
    const pl = await createCuratedPlaylist(userId, newName.trim());
    if (pl) {
      for (const t of items) await addTrackToCuratedPlaylist(pl.id, t);
      setPlaylists(prev => [pl, ...prev]);
      if (bulk) {
        setAddedTo(prev => new Set(prev).add(pl.id));
        onSavedChange?.(true);
      } else {
        const next = new Set(memberOf).add(pl.id);
        setMemberOf(next);
        emit(next);
      }
      setNewName("");
    }
    setCreating(false);
  };

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
            )}

            {/* New playlist row */}
            <View style={s.newRow}>
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

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#1A1A1C",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingBottom: 36,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderBottomWidth: 0,
    maxHeight: "80%",
  },
  handle: {
    width: 38, height: 4, borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignSelf: "center", marginTop: 12, marginBottom: 18,
  },
  title: { fontSize: 18, fontWeight: "800", color: "#fff", marginBottom: 16 },

  trackRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingBottom: 16, marginBottom: 6,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)",
  },
  trackArt: { width: 44, height: 44, borderRadius: 8 },
  trackArtFallback: {
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center", justifyContent: "center",
  },
  trackName:   { fontSize: 15, fontWeight: "700", color: "#fff" },
  trackArtist: { fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 2 },

  newRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12,
  },
  newIcon: {
    width: 44, height: 44, borderRadius: 8,
    backgroundColor: "rgba(255,108,26,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  newInput: {
    flex: 1, fontSize: 15, fontWeight: "600", color: "#fff",
    paddingVertical: 0,
  },
  createBtn: {
    paddingHorizontal: 14, height: 34, borderRadius: 10,
    backgroundColor: "#FF6C1A",
    alignItems: "center", justifyContent: "center",
  },
  createBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },

  loadingWrap: { height: 80, alignItems: "center", justifyContent: "center" },
  empty: {
    fontSize: 13, color: "rgba(255,255,255,0.35)",
    textAlign: "center", paddingVertical: 24,
  },

  list: { marginTop: 4 },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 10,
  },
  cover: { width: 44, height: 44, borderRadius: 8 },
  coverFallback: {
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center", justifyContent: "center",
  },
  rowName: { flex: 1, fontSize: 15, fontWeight: "600", color: "#fff" },

  doneBtn: {
    marginTop: 18, height: 50, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center", justifyContent: "center",
  },
  doneBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
