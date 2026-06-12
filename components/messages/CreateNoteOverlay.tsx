import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Modal, Pressable,
  TextInput, Platform, Image, ActivityIndicator,
  Keyboard, FlatList,
} from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { searchSpotifyTracks, getValidSpotifyToken, type SpotifyTrackResult } from "../../lib/spotify";
import { setMyNote, deleteMyNote, NOTE_COLORS, type Note } from "../../services/notes";
import { SH } from "../../lib/feed/dimensions";

const ACCENT = "#AB00FF";
type Tab = "text" | "song";
type ChosenSong = { id: string; name: string; artist: string; albumArt: string | null };

export function CreateNoteOverlay({
  userId, existing, onClose, onSaved,
}: {
  userId: string;
  existing: Note | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(SH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  // Lift the whole sheet by the real keyboard height so it always sits on top
  // of the keyboard (KeyboardAvoidingView doesn't reliably move an absolutely
  // positioned bottom sheet).
  const kbOffset = useRef(new Animated.Value(0)).current;

  const [tab, setTab] = useState<Tab>(existing?.type === "song" ? "song" : "text");
  const [text, setText] = useState(existing?.type === "text" ? (existing.text ?? "") : "");
  const [song, setSong] = useState<ChosenSong | null>(
    existing?.type === "song" && existing.song_id
      ? { id: existing.song_id, name: existing.song_name ?? "", artist: existing.song_artist ?? "", albumArt: existing.song_album_art }
      : null,
  );

  const [color, setColor] = useState<string | null>(existing?.color ?? null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SpotifyTrackResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, []);

  // Track the keyboard and slide the sheet up by its height.
  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const onShow = (e: any) => {
      Animated.timing(kbOffset, {
        toValue: -(e?.endCoordinates?.height ?? 0),
        duration: e?.duration ?? 220,
        useNativeDriver: true,
      }).start();
    };
    const onHide = (e: any) => {
      Animated.timing(kbOffset, { toValue: 0, duration: e?.duration ?? 220, useNativeDriver: true }).start();
    };
    const subShow = Keyboard.addListener(showEvt, onShow);
    const subHide = Keyboard.addListener(hideEvt, onHide);
    return () => { subShow.remove(); subHide.remove(); };
  }, []);

  const close = () => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: SH, duration: 240, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(onClose);
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    const token = await getValidSpotifyToken(userId);
    if (!token) { setSearching(false); return; }
    setResults(await searchSpotifyTracks(token, query.trim(), 25));
    setSearching(false);
  };

  const canSave = tab === "text" ? text.trim().length > 0 : !!song;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    const res = tab === "text"
      ? await setMyNote({ type: "text", text: text.trim(), color })
      : await setMyNote({ type: "song", song_id: song!.id, song_name: song!.name, song_artist: song!.artist, song_album_art: song!.albumArt, color });
    setSaving(false);
    if (res.error) return; // keep sheet open on failure
    onSaved();
    close();
  };

  const handleRemove = async () => {
    setSaving(true);
    await deleteMyNote();
    setSaving(false);
    onSaved();
    close();
  };

  // Live preview of the note bubble exactly as it'll appear in the strip.
  const previewText = tab === "text" ? (text.trim() || "Your note…") : (song ? song.name : "Pick a song…");

  return (
    <Modal transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.6)", opacity: backdropAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }, { translateY: kbOffset }] }]}>
          <View style={s.grabber} />

          <View style={s.header}>
            <Text style={s.title}>{existing ? "Edit your note" : "Leave a note"}</Text>
            <TouchableOpacity onPress={close} hitSlop={12}>
              <Ionicons name="close" size={22} color="rgba(255,255,255,0.55)" />
            </TouchableOpacity>
          </View>

          {/* Live preview */}
          <View style={s.previewWrap}>
            <View style={[s.previewBubble, color ? { backgroundColor: color } : null]}>
              {tab === "song" && song?.albumArt && (
                <Image source={{ uri: song.albumArt }} style={s.previewArt} />
              )}
              {tab === "song" && !song?.albumArt && (
                <FontAwesome5 name="music" size={10} color={color ? "#fff" : ACCENT} style={{ marginRight: 5 }} />
              )}
              <Text style={s.previewText} numberOfLines={2}>{previewText}</Text>
            </View>
            <View style={[s.previewTail, color ? { backgroundColor: color } : null]} />
          </View>

          {/* Text / Song toggle */}
          <View style={s.toggleRow}>
            <Seg label="Text" icon="text" active={tab === "text"} onPress={() => setTab("text")} />
            <Seg label="Song" icon="musical-notes" active={tab === "song"} onPress={() => setTab("song")} />
          </View>

          {/* Colour picker */}
          <View style={s.colorRow}>
            {NOTE_COLORS.map((c, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  s.swatch,
                  c ? { backgroundColor: c } : s.swatchDefault,
                  (color ?? null) === c && s.swatchActive,
                ]}
                activeOpacity={0.8}
                onPress={() => setColor(c)}
              >
                {!c && <Ionicons name="ban-outline" size={14} color="rgba(255,255,255,0.4)" />}
              </TouchableOpacity>
            ))}
          </View>

          {tab === "text" ? (
            <View style={s.textWrap}>
              <TextInput
                style={s.textInput}
                placeholder="Share what you're feeling…"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={text}
                onChangeText={setText}
                maxLength={30}
                autoFocus
                multiline
              />
              <Text style={s.counter}>{text.length}/30</Text>
            </View>
          ) : song ? (
            <View style={s.chosenRow}>
              {song.albumArt ? (
                <Image source={{ uri: song.albumArt }} style={s.chosenArt} />
              ) : (
                <View style={[s.chosenArt, s.artFallback]}>
                  <FontAwesome5 name="music" size={14} color="rgba(255,255,255,0.3)" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.chosenName} numberOfLines={1}>{song.name}</Text>
                <Text style={s.chosenArtist} numberOfLines={1}>{song.artist}</Text>
              </View>
              <TouchableOpacity style={s.changeBtn} onPress={() => setSong(null)} activeOpacity={0.8}>
                <Text style={s.changeBtnText}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.songSearch}>
              <View style={s.searchRow}>
                <Ionicons name="search" size={15} color="rgba(255,255,255,0.4)" style={{ marginRight: 8 }} />
                <TextInput
                  style={s.searchInput}
                  placeholder="Search a song…"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={query}
                  onChangeText={setQuery}
                  onSubmitEditing={handleSearch}
                  returnKeyType="search"
                  autoFocus
                />
                {searching && <ActivityIndicator size="small" color={ACCENT} />}
              </View>
              <FlatList
                data={results}
                keyExtractor={t => t.id}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                style={{ maxHeight: 240 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  !searching && query.length > 0
                    ? <Text style={s.empty}>No results for "{query}"</Text>
                    : <Text style={s.empty}>Search Spotify to attach a song.</Text>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={s.resultRow}
                    activeOpacity={0.75}
                    onPress={() => { setSong({ id: item.id, name: item.name, artist: item.artist, albumArt: item.albumArt }); Keyboard.dismiss(); }}
                  >
                    {item.albumArt ? (
                      <Image source={{ uri: item.albumArt }} style={s.resultArt} />
                    ) : (
                      <View style={[s.resultArt, s.artFallback]}>
                        <FontAwesome5 name="music" size={12} color="rgba(255,255,255,0.3)" />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={s.resultName} numberOfLines={1}>{item.name}</Text>
                      <Text style={s.resultArtist} numberOfLines={1}>{item.artist}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {/* Footer */}
          <View style={s.footer}>
            {existing && (
              <TouchableOpacity onPress={handleRemove} disabled={saving} hitSlop={8}>
                <Text style={s.removeText}>Remove note</Text>
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              style={[s.shareBtn, !canSave && s.shareBtnOff]}
              onPress={handleSave}
              disabled={!canSave || saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={s.shareBtnText}>{existing ? "Update" : "Share"}</Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function Seg({ label, icon, active, onPress }: { label: string; icon: any; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[s.seg, active && s.segActive]} onPress={onPress} activeOpacity={0.85}>
      <Ionicons name={icon} size={15} color={active ? "#fff" : "rgba(255,255,255,0.5)"} />
      <Text style={[s.segText, active && s.segTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  sheet: {
    position: "absolute",
    // Floated up off the bottom edge with side gaps so it reads as a pulled-up
    // card — all four corners rounded.
    bottom: 12, left: 10, right: 10,
    backgroundColor: "#15121A",
    borderRadius: 26,
    paddingBottom: 18,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  grabber: { alignSelf: "center", width: 38, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.18)", marginTop: 9, marginBottom: 4 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 10 },
  title: { color: "#fff", fontSize: 18, fontWeight: "800" },

  // Preview bubble
  previewWrap: { alignItems: "center", marginTop: 4, marginBottom: 14 },
  previewBubble: {
    flexDirection: "row", alignItems: "center",
    maxWidth: 220,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 9,
  },
  previewArt: { width: 18, height: 18, borderRadius: 4, marginRight: 7 },
  previewText: { color: "rgba(255,255,255,0.92)", fontSize: 13, fontWeight: "600", flexShrink: 1 },
  previewTail: { width: 9, height: 9, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.14)", marginTop: 3, marginLeft: -28 },

  // Toggle
  toggleRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  seg: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
    paddingVertical: 11, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.07)",
  },
  segActive: { backgroundColor: "rgba(171,0,255,0.18)", borderColor: ACCENT },
  segText: { color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: "700" },
  segTextActive: { color: "#fff" },

  // Colour picker
  colorRow: { flexDirection: "row", justifyContent: "center", gap: 12, paddingHorizontal: 16, marginBottom: 14 },
  swatch: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "transparent" },
  swatchDefault: { backgroundColor: "rgba(255,255,255,0.08)" },
  swatchActive: { borderColor: "#fff" },

  // Text mode
  textWrap: { marginHorizontal: 16, marginBottom: 6 },
  textInput: {
    minHeight: 64, maxHeight: 120,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12,
    color: "#fff", fontSize: 15, textAlignVertical: "top",
  },
  counter: { alignSelf: "flex-end", color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 5, marginRight: 2 },

  // Song chosen
  chosenRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginHorizontal: 16, marginBottom: 6,
    padding: 10, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  chosenArt: { width: 46, height: 46, borderRadius: 8 },
  chosenName: { color: "#fff", fontSize: 14, fontWeight: "700" },
  chosenArtist: { color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 2 },
  changeBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.08)" },
  changeBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  // Song search
  songSearch: { marginBottom: 4 },
  searchRow: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 16, marginBottom: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  searchInput: { flex: 1, color: "#fff", fontSize: 14, padding: 0 },
  resultRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 7 },
  resultArt: { width: 42, height: 42, borderRadius: 6 },
  resultName: { color: "#fff", fontSize: 13.5, fontWeight: "700" },
  resultArtist: { color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 1 },
  artFallback: { backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  empty: { color: "rgba(255,255,255,0.35)", textAlign: "center", paddingVertical: 22, fontSize: 13 },

  // Footer
  footer: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingTop: 10 },
  removeText: { color: "#FF5A5A", fontSize: 14, fontWeight: "700" },
  shareBtn: { minWidth: 96, height: 44, borderRadius: 22, backgroundColor: ACCENT, alignItems: "center", justifyContent: "center", paddingHorizontal: 22 },
  shareBtnOff: { backgroundColor: "rgba(171,0,255,0.35)" },
  shareBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
