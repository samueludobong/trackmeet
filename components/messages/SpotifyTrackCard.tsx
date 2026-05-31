import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { openSpotifyLink } from "../../lib/spotify";
import { isTrackInAnyPlaylist } from "../../services/playlists";
import { spCard } from "../../lib/feed/localStyles";
import { AddToPlaylistSheet } from "../../components/AddToPlaylistSheet";

export function SpotifyTrackCard({
  track,
  fromMe,
}: {
  track: { id: string; name: string; artist: string; albumArt: string | null };
  fromMe: boolean;
}) {
  const [saved,      setSaved]      = useState(false);
  const [checked,    setChecked]    = useState(false);
  const [userId,     setUserId]     = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // On mount, resolve the viewer and check if already in one of their playlists
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      setUserId(user?.id ?? null);
      if (user) setSaved(await isTrackInAnyPlaylist(user.id, track.id));
      if (active) setChecked(true);
    })();
    return () => { active = false; };
  }, [track.id]);

  const handleSave = () => { if (userId) setPickerOpen(true); };

  return (
    <View style={[spCard.card, fromMe && spCard.cardMe]}>
      {track.albumArt ? (
        <Image source={{ uri: track.albumArt }} style={spCard.art} resizeMode="cover" />
      ) : (
        <View style={spCard.artFallback}>
          <Ionicons name="musical-notes" size={22} color="#1DB954" />
        </View>
      )}

      <View style={spCard.info}>
        <View style={spCard.spotifyRow}>
          <FontAwesome5 name="spotify" size={11} color="#1DB954" />
          <Text style={spCard.spotifyLabel}>Spotify</Text>
        </View>
        <Text style={spCard.trackName} numberOfLines={1}>{track.name}</Text>
        <Text style={spCard.artistName} numberOfLines={1}>{track.artist}</Text>

        <View style={spCard.btnRow}>
          <TouchableOpacity
            style={spCard.openBtn}
            activeOpacity={0.8}
            onPress={() => openSpotifyLink(
              `spotify:track:${track.id}`,
              `https://open.spotify.com/track/${track.id}`,
            )}
          >
            <Ionicons name="open-outline" size={11} color="#1DB954" />
            <Text style={spCard.openBtnText}>Open</Text>
          </TouchableOpacity>

          {checked && (
            <TouchableOpacity
              style={[spCard.saveBtn, saved && spCard.savedBtn]}
              activeOpacity={0.8}
              onPress={handleSave}
            >
              <Ionicons
                name={saved ? "checkmark-circle" : "add-circle-outline"}
                size={11}
                color={saved ? "#1DB954" : "rgba(255,255,255,0.45)"}
              />
              <Text style={[spCard.saveBtnText, saved && spCard.savedBtnText]}>
                {saved ? "Saved" : "Save"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <AddToPlaylistSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        userId={userId}
        track={{ id: track.id, name: track.name, artist: track.artist, albumArt: track.albumArt }}
        onSavedChange={setSaved}
      />
    </View>
  );
}


// ─── Now Playing bubble (replaces plain story bubble) ────────────────────────
