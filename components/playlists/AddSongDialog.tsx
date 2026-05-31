import React, { useState } from "react";
import { addSongToCuratedPlaylist } from "../../services/playlists";
import { View, Text, ScrollView, TouchableOpacity, Modal, Pressable, TextInput, Platform, Image, KeyboardAvoidingView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { searchSpotifyTracks, getValidSpotifyToken, type SpotifyTrackResult } from "../../lib/spotify";
import { cpStyles } from "../../lib/feed/localStyles";
import { useNowPlayingCtx } from "../../lib/feed/contexts";

export function AddSongDialog({
  playlistId, userId, onClose, onAdded,
}: {
  playlistId: string
  userId: string
  onClose: () => void
  onAdded: () => void
}) {
  const { track: nowPlaying } = useNowPlayingCtx()
  const [mode, setMode] = useState<'search' | 'now'>('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SpotifyTrackResult[]>([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
  const [added, setAdded] = useState<Set<string>>(new Set())

  const handleSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    const token = await getValidSpotifyToken(userId)
    if (!token) { setSearching(false); return }
    const found = await searchSpotifyTracks(token, query.trim(), 20)
    setResults(found)
    setSearching(false)
  }

  const addTrack = async (track: SpotifyTrackResult) => {
    if (adding || added.has(track.id)) return
    setAdding(track.id)
    await addSongToCuratedPlaylist(playlistId, track)
    setAdded(prev => new Set(prev).add(track.id))
    setAdding(null)
    onAdded()
  }

  const nowTrack: SpotifyTrackResult | null = nowPlaying ? {
    id: nowPlaying.id,
    name: nowPlaying.name,
    artist: nowPlaying.artist,
    albumArt: nowPlaying.albumArt,
    durationMs: nowPlaying.durationMs,
    previewUrl: nowPlaying.previewUrl,
  } : null

  return (
    <Modal transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={cpStyles.dialogOverlay} onPress={onClose}>
          <Pressable onPress={e => e.stopPropagation()}>
            <View style={cpStyles.dialogSheet}>
              <View style={cpStyles.dialogHandle} />
              <Text style={cpStyles.dialogTitle}>Add Song</Text>

              <View style={cpStyles.modeRow}>
                <TouchableOpacity
                  style={[cpStyles.modeBtn, mode === 'search' && cpStyles.modeBtnActive]}
                  onPress={() => setMode('search')}
                >
                  <Text style={[cpStyles.modeBtnText, mode === 'search' && cpStyles.modeBtnTextActive]}>Search</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[cpStyles.modeBtn, mode === 'now' && cpStyles.modeBtnActive]}
                  onPress={() => setMode('now')}
                >
                  <Text style={[cpStyles.modeBtnText, mode === 'now' && cpStyles.modeBtnTextActive]}>Now Playing</Text>
                </TouchableOpacity>
              </View>

              {mode === 'search' ? (
                <>
                  <View style={cpStyles.searchRow}>
                    <TextInput
                      style={cpStyles.searchInput}
                      placeholder="Search Spotify…"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={query}
                      onChangeText={setQuery}
                      onSubmitEditing={handleSearch}
                      returnKeyType="search"
                    />
                    <TouchableOpacity style={cpStyles.searchBtn} onPress={handleSearch} activeOpacity={0.8}>
                      {searching
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Ionicons name="search" size={18} color="#fff" />
                      }
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {results.map(track => (
                      <View key={track.id} style={cpStyles.trackRow}>
                        {track.albumArt
                          ? <Image source={{ uri: track.albumArt }} style={cpStyles.trackArt} />
                          : <View style={[cpStyles.trackArt, { alignItems: 'center', justifyContent: 'center' }]}>
                              <Text style={{ fontSize: 18 }}>🎵</Text>
                            </View>
                        }
                        <View style={cpStyles.trackInfo}>
                          <Text style={cpStyles.trackName} numberOfLines={1}>{track.name}</Text>
                          <Text style={cpStyles.trackArtist} numberOfLines={1}>{track.artist}</Text>
                        </View>
                        <TouchableOpacity
                          style={[cpStyles.addBtn, added.has(track.id) && cpStyles.addBtnDone]}
                          onPress={() => addTrack(track)}
                          activeOpacity={0.7}
                          disabled={!!adding || added.has(track.id)}
                        >
                          {adding === track.id
                            ? <ActivityIndicator size="small" color="#FF6C1A" />
                            : <Text style={[cpStyles.addBtnText, added.has(track.id) && cpStyles.addBtnTextDone]}>
                                {added.has(track.id) ? '✓' : 'Add'}
                              </Text>
                          }
                        </TouchableOpacity>
                      </View>
                    ))}
                    {results.length === 0 && !searching && query.length > 0 && (
                      <Text style={{ color: 'rgba(255,255,255,0.25)', textAlign: 'center', paddingVertical: 20 }}>
                        No results found
                      </Text>
                    )}
                  </ScrollView>
                </>
              ) : (
                <View>
                  {nowTrack ? (
                    <View style={cpStyles.trackRow}>
                      {nowTrack.albumArt
                        ? <Image source={{ uri: nowTrack.albumArt }} style={cpStyles.trackArt} />
                        : <View style={[cpStyles.trackArt, { alignItems: 'center', justifyContent: 'center' }]}>
                            <Text style={{ fontSize: 18 }}>🎵</Text>
                          </View>
                      }
                      <View style={cpStyles.trackInfo}>
                        <Text style={cpStyles.trackName} numberOfLines={1}>{nowTrack.name}</Text>
                        <Text style={cpStyles.trackArtist} numberOfLines={1}>{nowTrack.artist}</Text>
                        <Text style={{ fontSize: 11, color: '#1DB954', fontWeight: '600', marginTop: 2 }}>● Now playing</Text>
                      </View>
                      <TouchableOpacity
                        style={[cpStyles.addBtn, added.has(nowTrack.id) && cpStyles.addBtnDone]}
                        onPress={() => addTrack(nowTrack)}
                        activeOpacity={0.7}
                        disabled={!!adding || added.has(nowTrack.id)}
                      >
                        {adding === nowTrack.id
                          ? <ActivityIndicator size="small" color="#FF6C1A" />
                          : <Text style={[cpStyles.addBtnText, added.has(nowTrack.id) && cpStyles.addBtnTextDone]}>
                              {added.has(nowTrack.id) ? '✓' : 'Add'}
                            </Text>
                        }
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                      <Text style={{ fontSize: 32, marginBottom: 12 }}>🎵</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Nothing playing right now</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, marginTop: 6 }}>Open Spotify and play a track</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── Create Playlist dialog ───────────────────────────────────────────────────
