import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { setMeetOnProfile, type MeetTrack } from "../../services/meets";
import { isTrackInAnyPlaylist } from "../../services/playlists";
import { sumStyles } from "../../assets/styles/feed/localStyles";
import { AddToPlaylistSheet } from "../../components/AddToPlaylistSheet";

export function MeetSummaryScreen({
  tracks, listenerCount, accessToken, onClose, role = "listener", meetId = null, userId = null,
}: {
  tracks: MeetTrack[];
  listenerCount: number;
  accessToken: string | null;
  onClose: () => void;
  role?: "host" | "listener";
  meetId?: string | null;
  userId?: string | null;
}) {
  const [saved,  setSaved]  = useState(false);
  const [onProfile, setOnProfile] = useState(false);
  const [pinning,   setPinning]   = useState(false);
  // Per-track save state, keyed by Spotify track_id.
  const [savedIds,  setSavedIds]  = useState<Record<string, boolean>>({});
  // The single track whose playlist-picker is open (per-row save), or null.
  const [pickerTrack, setPickerTrack] = useState<MeetTrack | null>(null);
  const [bulkOpen,    setBulkOpen]    = useState(false);

  // On mount, mark which tracks are already in one of the viewer's playlists.
  useEffect(() => {
    if (!userId || tracks.length === 0) return;
    let active = true;
    (async () => {
      const entries = await Promise.all(
        tracks.map(async t => [t.track_id, await isTrackInAnyPlaylist(userId, t.track_id)] as const),
      );
      if (!active) return;
      const map: Record<string, boolean> = {};
      for (const [id, v] of entries) if (v) map[id] = true;
      setSavedIds(map);
      if (Object.keys(map).length === tracks.length) setSaved(true);
    })();
    return () => { active = false; };
  }, [userId, tracks]);

  const toInput = (t: MeetTrack) => ({
    id: t.track_id, name: t.name, artist: t.artist, albumArt: t.album_art,
  });

  const handleSaveAll = () => { if (userId && tracks.length > 0) setBulkOpen(true); };

  const handleSaveOne = (t: MeetTrack) => {
    if (!userId || savedIds[t.track_id]) return;
    setPickerTrack(t);
  };

  const handleShowOnProfile = async () => {
    if (!meetId || pinning || onProfile) return;
    setPinning(true);
    await setMeetOnProfile(meetId, true);
    setPinning(false);
    setOnProfile(true);
  };

  return (
    <View style={[StyleSheet.absoluteFill, sumStyles.root]}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <View style={sumStyles.header}>
          <Ionicons name="checkmark-circle" size={48} color="#AB00FF" />
          <Text style={sumStyles.title}>Meet ended</Text>
          <Text style={sumStyles.sub}>{tracks.length} tracks · {listenerCount} listeners</Text>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 10 }} showsVerticalScrollIndicator={false}>
          {tracks.length === 0 ? (
            <Text style={sumStyles.empty}>No tracks were played this meet.</Text>
          ) : tracks.map((t) => (
            <View key={t.id} style={sumStyles.trackRow}>
              {t.album_art ? (
                <CachedImage source={{ uri: t.album_art }} style={sumStyles.art} />
              ) : (
                <View style={[sumStyles.art, { backgroundColor: "#1DB95422", alignItems: "center", justifyContent: "center" }]}>
                  <Ionicons name="musical-note" size={16} color="#1DB954" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={sumStyles.trackName} numberOfLines={1}>{t.name}</Text>
                <Text style={sumStyles.trackArtist} numberOfLines={1}>{t.artist ?? ""}</Text>
              </View>
              {userId && (
                <TouchableOpacity
                  style={sumStyles.rowSaveBtn}
                  activeOpacity={0.7}
                  onPress={() => handleSaveOne(t)}
                  disabled={savedIds[t.track_id]}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={savedIds[t.track_id] ? "checkmark-circle" : "add-circle-outline"}
                    size={26}
                    color={savedIds[t.track_id] ? "#1DB954" : "rgba(255,255,255,0.8)"}
                  />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>

        <View style={sumStyles.footer}>
          {/* Host: surface this meet's tracklist on their profile.
              Listener: save the tracklist to their own Spotify Liked Songs. */}
          {role === "host" ? (
            tracks.length > 0 && (
              <TouchableOpacity
                style={[sumStyles.saveBtn, onProfile && sumStyles.saveBtnDone]}
                activeOpacity={0.85}
                onPress={handleShowOnProfile}
                disabled={pinning || onProfile || !meetId}
              >
                <Ionicons name={onProfile ? "checkmark" : "person-circle-outline"} size={16} color="#fff" />
                <Text style={sumStyles.saveBtnText}>
                  {onProfile ? "Showing on profile" : pinning ? "Adding…" : "Show on profile"}
                </Text>
              </TouchableOpacity>
            )
          ) : (
            tracks.length > 0 && (
              <TouchableOpacity
                style={[sumStyles.saveBtn, (saved || !userId) && sumStyles.saveBtnDone]}
                activeOpacity={0.85}
                onPress={handleSaveAll}
                disabled={saved || !userId}
              >
                <Ionicons name={saved ? "checkmark" : "add-circle-outline"} size={16} color="#fff" />
                <Text style={sumStyles.saveBtnText}>
                  {saved ? "Saved to playlist" : "Save all to playlist"}
                </Text>
              </TouchableOpacity>
            )
          )}
          <TouchableOpacity style={sumStyles.doneBtn} activeOpacity={0.85} onPress={onClose}>
            <Text style={sumStyles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <AddToPlaylistSheet
        visible={!!pickerTrack}
        onClose={() => setPickerTrack(null)}
        userId={userId}
        track={pickerTrack ? toInput(pickerTrack) : null}
        onSavedChange={(v) => {
          if (v && pickerTrack) setSavedIds(prev => ({ ...prev, [pickerTrack.track_id]: true }));
        }}
      />

      <AddToPlaylistSheet
        visible={bulkOpen}
        onClose={() => setBulkOpen(false)}
        userId={userId}
        tracks={tracks.map(toInput)}
        onSavedChange={(v) => {
          if (v) { setSaved(true); setSavedIds(Object.fromEntries(tracks.map(t => [t.track_id, true]))); }
        }}
      />
    </View>
  );
}
