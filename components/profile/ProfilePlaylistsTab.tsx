import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { cpStyles } from "../../assets/styles/feed/localStyles";
import { type CuratedPlaylist } from "../../lib/feed/types";
import { type SpotifyPlaylist } from "../../lib/spotify";
import { CuratedPlaylistCard } from "../../components/playlists/CuratedPlaylistCard";
import { SpotifyPlaylistCard } from "../../components/playlists/SpotifyPlaylistCard";

/** The "Playlists" tab of a profile: curated/Spotify filter + the playlist grids. */
export function ProfilePlaylistsTab(p: {
  readOnly: boolean;
  playlistFilter: "curated" | "spotify";
  setPlaylistFilter: (v: "curated" | "spotify") => void;
  curatedLoading: boolean;
  curatedPlaylists: CuratedPlaylist[];
  setShowCreatePlaylist: (v: boolean) => void;
  setOpenCurated: (pl: CuratedPlaylist) => void;
  spLoading: boolean;
  spLoaded: boolean;
  spotifyPlaylists: SpotifyPlaylist[];
  setOpenSpotify: (pl: SpotifyPlaylist) => void;
}) {
  const effectiveFilter = p.readOnly ? "curated" : p.playlistFilter;
  return (
    <View style={{ paddingTop: 12 }}>
      {!p.readOnly && (
        <View style={cpStyles.filterRow}>
          <TouchableOpacity style={[cpStyles.filterBtn, p.playlistFilter === "curated" && cpStyles.filterBtnActive]} onPress={() => p.setPlaylistFilter("curated")}>
            <Text style={[cpStyles.filterLabel, p.playlistFilter === "curated" && cpStyles.filterLabelActive]}>Curated Playlists</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[cpStyles.filterBtn, p.playlistFilter === "spotify" && cpStyles.filterBtnActive]} onPress={() => p.setPlaylistFilter("spotify")}>
            <Text style={[cpStyles.filterLabel, p.playlistFilter === "spotify" && cpStyles.filterLabelActive]}>Spotify Playlists</Text>
          </TouchableOpacity>
        </View>
      )}

      {effectiveFilter === "curated" ? (
        <>
          {!p.readOnly && (
            <TouchableOpacity style={cpStyles.createBtn} onPress={() => p.setShowCreatePlaylist(true)} activeOpacity={0.8}>
              <Ionicons name="add-circle-outline" size={18} color="#FF6C1A" />
              <Text style={cpStyles.createBtnText}>Create Playlist</Text>
            </TouchableOpacity>
          )}
          {p.curatedLoading ? (
            <ActivityIndicator color="#FF6C1A" style={{ marginTop: 28 }} />
          ) : p.curatedPlaylists.length === 0 ? (
            <View style={{ alignItems: "center", paddingTop: 36 }}>
              <Text style={{ color: "rgba(255,255,255,0.25)", fontSize: 15 }}>No curated playlists yet</Text>
              {!p.readOnly && <Text style={{ color: "rgba(255,255,255,0.15)", fontSize: 13, marginTop: 6 }}>Create one above to get started</Text>}
            </View>
          ) : (
            <View style={{ gap: 6 }}>
              {p.curatedPlaylists.map((pl) => <CuratedPlaylistCard key={pl.id} pl={pl} onPress={() => p.setOpenCurated(pl)} />)}
            </View>
          )}
        </>
      ) : (
        <>
          {p.spLoading ? (
            <ActivityIndicator color="#1DB954" style={{ marginTop: 28 }} />
          ) : p.spotifyPlaylists.length === 0 && p.spLoaded ? (
            <View style={{ alignItems: "center", paddingTop: 36 }}>
              <Text style={{ color: "rgba(255,255,255,0.25)", fontSize: 15 }}>No Spotify playlists found</Text>
            </View>
          ) : (
            <View style={{ gap: 6 }}>
              {p.spotifyPlaylists.map((pl) => <SpotifyPlaylistCard key={pl.id} pl={pl} onPress={() => p.setOpenSpotify(pl)} />)}
            </View>
          )}
        </>
      )}
    </View>
  );
}
