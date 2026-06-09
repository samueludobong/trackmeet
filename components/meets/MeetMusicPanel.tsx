import React from "react";
import { View, Text, Animated, TouchableOpacity, TextInput, FlatList, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { mlStyles } from "../../lib/feed/localStyles";
import { type SpotifyTrackResult, type SpotifyPlaylist } from "../../lib/spotify";
import { MusicTrackRow } from "../../components/playlists/MusicTrackRow";
import { MusicPlaylistRow } from "../../components/playlists/MusicPlaylistRow";

/** The slide-in Spotify browser (playlists / search / tracks) for the live-meet host. */
export function MeetMusicPanel(p: {
  musicSlideX: Animated.Value;
  p2Title: string;
  p2Loading: boolean;
  isSearching: boolean;
  showTracks: boolean;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  setSearchResults: (v: SpotifyTrackResult[]) => void;
  searchResults: SpotifyTrackResult[];
  playlistTracks: SpotifyTrackResult[];
  tracksError: number | null;
  playlists: SpotifyPlaylist[];
  playingId: string | null;
  handlePlayTrack: (t: SpotifyTrackResult) => void;
  selectPlaylist: (pl: SpotifyPlaylist) => void;
  setSelectedPlaylist: (pl: SpotifyPlaylist | null) => void;
  setPlaylistTracks: (t: SpotifyTrackResult[]) => void;
  setTracksLoading: (v: boolean) => void;
  closeMusicPicker: () => void;
}) {
  return (
    <Animated.View style={[mlStyles.musicPage, { transform: [{ translateX: p.musicSlideX }] }]}>
      <View style={mlStyles.musicHeader}>
        <TouchableOpacity
          style={mlStyles.musicBackBtn}
          activeOpacity={0.7}
          onPress={p.showTracks
            ? () => { p.setSelectedPlaylist(null); p.setPlaylistTracks([]); p.setTracksLoading(false); }
            : () => p.closeMusicPicker()
          }
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={mlStyles.musicTitle}>{p.p2Title}</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={mlStyles.musicSearchRow}>
        <Ionicons name="search" size={16} color="rgba(255,255,255,0.4)" style={{ marginRight: 8 }} />
        <TextInput
          style={mlStyles.musicSearchInput}
          placeholder="Search songs, artists..."
          placeholderTextColor="rgba(255,255,255,0.32)"
          value={p.searchQuery}
          onChangeText={p.setSearchQuery}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {p.searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => { p.setSearchQuery(""); p.setSearchResults([]); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={17} color="rgba(255,255,255,0.35)" />
          </TouchableOpacity>
        )}
      </View>

      <View style={{ flex: 1 }}>
        {p.p2Loading ? (
          <ActivityIndicator color="#AB00FF" style={{ marginTop: 48 }} />
        ) : p.isSearching ? (
          <FlatList
            style={{ flex: 1 }}
            data={p.searchResults}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <MusicTrackRow track={item} playing={p.playingId === item.id} onPlay={p.handlePlayTrack} />}
            contentContainerStyle={mlStyles.musicListContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            ListEmptyComponent={<Text style={mlStyles.musicEmpty}>No results for "{p.searchQuery}"</Text>}
          />
        ) : p.showTracks ? (
          <FlatList
            style={{ flex: 1 }}
            data={p.playlistTracks}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <MusicTrackRow track={item} playing={p.playingId === item.id} onPlay={p.handlePlayTrack} />}
            contentContainerStyle={mlStyles.musicListContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            ListEmptyComponent={
              p.tracksError === 401 || p.tracksError === 403 ? (
                <View style={{ alignItems: "center", paddingHorizontal: 24, marginTop: 48, gap: 8 }}>
                  <Ionicons name="lock-closed-outline" size={32} color="rgba(255,255,255,0.25)" />
                  <Text style={[mlStyles.musicEmpty, { marginTop: 8 }]}>Spotify access error ({p.tracksError})</Text>
                  <Text style={[mlStyles.musicEmpty, { fontSize: 11, marginTop: 0 }]}>
                    Go to Settings → Connected Apps and reconnect Spotify to grant playlist access.
                  </Text>
                </View>
              ) : p.tracksError ? (
                <Text style={mlStyles.musicEmpty}>Could not load tracks (HTTP {p.tracksError})</Text>
              ) : (
                <Text style={mlStyles.musicEmpty}>No tracks in this playlist</Text>
              )
            }
          />
        ) : (
          <FlatList
            style={{ flex: 1 }}
            data={p.playlists}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <MusicPlaylistRow playlist={item} onPress={() => p.selectPlaylist(item)} />}
            contentContainerStyle={mlStyles.musicListContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<Text style={mlStyles.musicEmpty}>No playlists found</Text>}
          />
        )}
      </View>
    </Animated.View>
  );
}
