import React from "react";
import { View, Text, Animated, TouchableOpacity, TextInput, FlatList, ActivityIndicator } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { Ionicons } from "@expo/vector-icons";
import { mlStyles } from "../../assets/styles/feed/localStyles";
import { type SpotifyAlbum, type SpotifyArtistInfo } from "../../lib/spotify";
import { type MeetMusicControl } from "../../hooks/useMeetMusicControl";
import { MusicTrackRow } from "../../components/playlists/MusicTrackRow";
import { MusicPlaylistRow } from "../../components/playlists/MusicPlaylistRow";

const TABS = [
  { key: "songs",   label: "Songs" },
  { key: "artists", label: "Artists" },
  { key: "albums",  label: "Albums" },
] as const;

/** Slide-in Spotify browser for the meet/jam control screen. Search is tabbed:
 *  Songs (tracks), Artists (→ their albums), Albums (expandable, play-all).
 *  `scrollLocked` is driven by the screen's page-swipe pager: while a horizontal
 *  swipe is in progress every list here freezes its vertical scroll, so the page
 *  swipe always wins (gallery-style) instead of the FlatList swallowing it. */
export function MeetMusicPanel({ m, scrollLocked = false, active = true }: { m: MeetMusicControl; scrollLocked?: boolean; active?: boolean }) {
  const searching = m.searchQuery.trim().length > 0;

  const back = m.selectedArtist
    ? m.clearArtist
    : m.showTracks
      ? () => { m.setSelectedPlaylist(null); m.setPlaylistTracks([]); m.setTracksLoading(false); }
      : () => m.closeMusicPicker();

  return (
    <Animated.View
      style={[mlStyles.musicPage, { transform: [{ translateX: m.musicSlideX }] }]}
      pointerEvents={active ? "auto" : "none"}
    >
      <View style={mlStyles.musicHeader}>
        <TouchableOpacity style={mlStyles.musicBackBtn} activeOpacity={0.7} onPress={back}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={mlStyles.musicTitle} numberOfLines={1}>{m.selectedArtist ? m.selectedArtist.name : m.p2Title}</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={mlStyles.musicSearchRow}>
        <Ionicons name="search" size={16} color="rgba(255,255,255,0.4)" style={{ marginRight: 8 }} />
        <TextInput
          style={mlStyles.musicSearchInput}
          placeholder="Search songs, artists, albums..."
          placeholderTextColor="rgba(255,255,255,0.32)"
          value={m.searchQuery}
          onChangeText={m.setSearchQuery}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {m.searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => { m.setSearchQuery(""); m.setSearchResults([]); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={17} color="rgba(255,255,255,0.35)" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs — shown while searching (the artist drill-in hides them). */}
      {searching && !m.selectedArtist && (
        <View style={mlStyles.musicTabs}>
          {TABS.map((t) => {
            const active = m.searchType === t.key;
            return (
              <TouchableOpacity key={t.key} style={mlStyles.musicTab} activeOpacity={0.8} onPress={() => m.selectTab(t.key)}>
                <Text style={[mlStyles.musicTabText, active && mlStyles.musicTabTextActive]}>{t.label}</Text>
                {active && <View style={mlStyles.musicTabUnderline} />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View style={{ flex: 1 }}>
        {renderContent(m, searching, !scrollLocked)}
      </View>
    </Animated.View>
  );
}

function renderContent(m: MeetMusicControl, searching: boolean, scrollEnabled: boolean) {
  // Artists tab → drilled into one artist's albums.
  if (m.selectedArtist) {
    if (m.artistAlbumsLoading) return <ActivityIndicator color="#AB00FF" style={{ marginTop: 48 }} />;
    return (
      <FlatList
        key="artist-albums"
        style={{ flex: 1 }}
        data={m.artistAlbums}
        keyExtractor={(a) => a.id}
        extraData={m.expandedAlbumId}
        renderItem={({ item }) => <AlbumRow m={m} album={item} />}
        contentContainerStyle={mlStyles.musicListContent}
        scrollEnabled={scrollEnabled}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<Text style={mlStyles.musicEmpty}>No albums found</Text>}
      />
    );
  }

  if (searching) {
    if (m.searchLoading) return <ActivityIndicator color="#AB00FF" style={{ marginTop: 48 }} />;
    if (m.searchType === "songs") {
      return (
        <FlatList
          key="songs"
          style={{ flex: 1 }}
          data={m.searchResults}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => <MusicTrackRow track={item} playing={m.playingId === item.id} onPlay={m.handlePlayTrack} />}
          contentContainerStyle={mlStyles.musicListContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={<Text style={mlStyles.musicEmpty}>No results for "{m.searchQuery}"</Text>}
        />
      );
    }
    if (m.searchType === "artists") {
      return (
        <FlatList
          key="artists"
          style={{ flex: 1 }}
          data={m.artistResults}
          keyExtractor={(a) => a.id}
          renderItem={({ item }) => <ArtistRow artist={item} onPress={() => m.selectArtist(item)} />}
          contentContainerStyle={mlStyles.musicListContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={<Text style={mlStyles.musicEmpty}>No artists for "{m.searchQuery}"</Text>}
        />
      );
    }
    // albums
    return (
      <FlatList
        key="albums"
        style={{ flex: 1 }}
        data={m.albumResults}
        keyExtractor={(a) => a.id}
        extraData={m.expandedAlbumId}
        renderItem={({ item }) => <AlbumRow m={m} album={item} />}
        contentContainerStyle={mlStyles.musicListContent}
        scrollEnabled={scrollEnabled}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListEmptyComponent={<Text style={mlStyles.musicEmpty}>No albums for "{m.searchQuery}"</Text>}
      />
    );
  }

  // Not searching → playlists / playlist tracks (unchanged browse).
  if (m.showTracks) {
    return (
      <FlatList
        key="playlist-tracks"
        style={{ flex: 1 }}
        data={m.playlistTracks}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => <MusicTrackRow track={item} playing={m.playingId === item.id} onPlay={m.handlePlayTrack} />}
        contentContainerStyle={mlStyles.musicListContent}
        scrollEnabled={scrollEnabled}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListEmptyComponent={
          m.tracksError === 401 || m.tracksError === 403 ? (
            <View style={{ alignItems: "center", paddingHorizontal: 24, marginTop: 48, gap: 8 }}>
              <Ionicons name="lock-closed-outline" size={32} color="rgba(255,255,255,0.25)" />
              <Text style={[mlStyles.musicEmpty, { marginTop: 8 }]}>Spotify access error ({m.tracksError})</Text>
              <Text style={[mlStyles.musicEmpty, { fontSize: 11, marginTop: 0 }]}>Reconnect Spotify in Settings to grant playlist access.</Text>
            </View>
          ) : m.tracksError ? (
            <Text style={mlStyles.musicEmpty}>Could not load tracks (HTTP {m.tracksError})</Text>
          ) : (
            <Text style={mlStyles.musicEmpty}>No tracks in this playlist</Text>
          )
        }
      />
    );
  }
  if (m.p2Loading) return <ActivityIndicator color="#AB00FF" style={{ marginTop: 48 }} />;
  return (
    <FlatList
      key="playlists"
      style={{ flex: 1 }}
      data={m.playlists}
      keyExtractor={(pl) => pl.id}
      renderItem={({ item }) => <MusicPlaylistRow playlist={item} onPress={() => m.selectPlaylist(item)} />}
      contentContainerStyle={mlStyles.musicListContent}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={<Text style={mlStyles.musicEmpty}>No playlists found</Text>}
    />
  );
}

// ─── Artist row (tap → their albums) ──────────────────────────────────────────
function ArtistRow({ artist, onPress }: { artist: SpotifyArtistInfo; onPress: () => void }) {
  return (
    <TouchableOpacity style={mlStyles.albumRow} activeOpacity={0.75} onPress={onPress}>
      {artist.imageUrl ? (
        <CachedImage source={{ uri: artist.imageUrl }} style={[mlStyles.albumArt, { borderRadius: 22 }]} />
      ) : (
        <View style={[mlStyles.albumArt, mlStyles.albumArtFallback, { borderRadius: 22 }]}>
          <Ionicons name="person" size={18} color="rgba(255,255,255,0.3)" />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={mlStyles.albumName} numberOfLines={1}>{artist.name}</Text>
        <Text style={mlStyles.albumMeta}>Artist</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" />
    </TouchableOpacity>
  );
}

// ─── Expandable album row (dropdown of tracks + Play all) ─────────────────────
function AlbumRow({ m, album }: { m: MeetMusicControl; album: SpotifyAlbum }) {
  const open = m.expandedAlbumId === album.id;
  const tracks = m.albumTracks[album.id] ?? [];
  const loading = m.albumTracksLoad === album.id;
  return (
    <View>
      <TouchableOpacity style={mlStyles.albumRow} activeOpacity={0.75} onPress={() => m.toggleAlbum(album.id)}>
        {album.imageUrl ? (
          <CachedImage source={{ uri: album.imageUrl }} style={mlStyles.albumArt} />
        ) : (
          <View style={[mlStyles.albumArt, mlStyles.albumArtFallback]}>
            <Ionicons name="disc-outline" size={18} color="rgba(255,255,255,0.3)" />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={mlStyles.albumName} numberOfLines={1}>{album.name}</Text>
          <Text style={mlStyles.albumMeta} numberOfLines={1}>
            {album.artist ? `${album.artist} · ` : ""}{album.albumType} · {album.totalTracks} song{album.totalTracks === 1 ? "" : "s"}
          </Text>
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color="rgba(255,255,255,0.45)" />
      </TouchableOpacity>

      {open && (
        <View style={mlStyles.albumDropdown}>
          <TouchableOpacity style={mlStyles.playAllBtn} activeOpacity={0.85} onPress={() => m.playAlbum(album.id)}>
            <Ionicons name="play" size={13} color="#0D0D0D" />
            <Text style={mlStyles.playAllText}>Play all</Text>
          </TouchableOpacity>
          {loading ? (
            <ActivityIndicator color="#AB00FF" style={{ marginVertical: 14 }} />
          ) : (
            tracks.map((t) => (
              <TouchableOpacity key={t.id} style={mlStyles.albumTrackRow} activeOpacity={0.7} onPress={() => m.playAlbumTrack(t.id)}>
                <Text style={mlStyles.albumTrackNum}>{t.trackNumber}</Text>
                <Text style={[mlStyles.albumTrackName, m.playingId === t.id && { color: "#1DB954" }]} numberOfLines={1}>{t.name}</Text>
                <Ionicons name="play" size={13} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </View>
  );
}
