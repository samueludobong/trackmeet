import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { epOverlayStyles } from "../../lib/feed/localStyles";
import { type EditFormData } from "../../types/profile";

/** The PINNED SONG section of the Edit Profile form. */
export function EditProfilePinnedSong({
  form, setForm, onOpenPicker,
}: {
  form: EditFormData;
  setForm: React.Dispatch<React.SetStateAction<EditFormData>>;
  onOpenPicker: () => void;
}) {
  return (
    <View style={epOverlayStyles.section}>
      <Text style={epOverlayStyles.sectionLabel}>PINNED SONG</Text>
      <TouchableOpacity style={epOverlayStyles.songRow} activeOpacity={0.75} onPress={onOpenPicker}>
        {form.pinned_song_album_art ? (
          <Image source={{ uri: form.pinned_song_album_art }} style={epOverlayStyles.songArt} />
        ) : (
          <View style={[epOverlayStyles.songArt, epOverlayStyles.songArtFallback]}>
            <FontAwesome5 name="music" size={14} color="rgba(255,255,255,0.25)" />
          </View>
        )}
        <View style={{ flex: 1 }}>
          {form.pinned_song_name ? (
            <>
              <Text style={epOverlayStyles.songName} numberOfLines={1}>{form.pinned_song_name}</Text>
              <Text style={epOverlayStyles.songArtist} numberOfLines={1}>{form.pinned_song_artist}</Text>
            </>
          ) : (
            <Text style={epOverlayStyles.songPlaceholder}>Choose a song to pin…</Text>
          )}
        </View>
        <FontAwesome5 name="search" size={12} color="rgba(255,255,255,0.35)" />
      </TouchableOpacity>
      {form.pinned_song_id && (
        <TouchableOpacity
          style={epOverlayStyles.clearBtn}
          onPress={() => setForm((f) => ({ ...f, pinned_song_id: null, pinned_song_name: null, pinned_song_artist: null, pinned_song_album_art: null }))}
        >
          <Text style={epOverlayStyles.clearBtnText}>Remove pinned song</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
