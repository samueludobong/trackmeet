import React, { useState, useEffect } from "react";
import { useSlideInPanel } from '../../hooks/useSlideInPanel';
import { getCuratedPlaylistSongs, setPlaylistShowOnProfile, deleteCuratedPlaylistSong } from '../../services/playlists';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Animated, Modal, Image, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { pdStyles, cpStyles } from "../../lib/feed/localStyles";
import { type CuratedPlaylist, type CuratedSong } from "../../lib/feed/types";
import { AddSongDialog } from "../../components/playlists/AddSongDialog";
import { RealSongRow } from "../../components/playlists/RealSongRow";

export function CuratedPlaylistDetailOverlay({
  playlist, userId, onClose, onUpdated,
}: {
  playlist: CuratedPlaylist
  userId: string
  onClose: () => void
  onUpdated: (updated: CuratedPlaylist) => void
}) {
  const insets = useSafeAreaInsets()
  const { slideX, panHandlers, close } = useSlideInPanel(onClose)
  const [songs, setSongs] = useState<CuratedSong[]>([])
  const [songsLoading, setSongsLoading] = useState(true)
  const [showOnProfile, setShowOnProfile] = useState(playlist.show_on_profile)
  const [showAddSong, setShowAddSong] = useState(false)

  const ACCENT = '#AB00FF'

  useEffect(() => { loadSongs() }, [])

  const loadSongs = async () => {
    setSongsLoading(true)
    setSongs(await getCuratedPlaylistSongs(playlist.id))
    setSongsLoading(false)
  }

  const toggleShowOnProfile = async () => {
    const newVal = !showOnProfile
    setShowOnProfile(newVal)
    await setPlaylistShowOnProfile(playlist.id, newVal)
    onUpdated({ ...playlist, show_on_profile: newVal })
  }

  const deleteSong = async (songId: string) => {
    await deleteCuratedPlaylistSong(songId)
    setSongs(prev => prev.filter(s => s.id !== songId))
  }

  return (
    <Modal transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      <Animated.View style={[StyleSheet.absoluteFill, pdStyles.screen, { transform: [{ translateX: slideX }] }]} {...panHandlers}>
        <FlatList
          data={songs}
          keyExtractor={s => s.id}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            songsLoading
              ? <ActivityIndicator color={ACCENT} style={{ marginTop: 32 }} />
              : <View style={{ alignItems: 'center', paddingTop: 40 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 15 }}>No songs yet</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.15)', fontSize: 13, marginTop: 6 }}>Tap "Add Song" above to get started</Text>
                </View>
          }
          ListHeaderComponent={
            <>
              {/* ── Hero ── */}
              <View style={[pdStyles.hero, { minHeight: 340 + insets.top }]}>
                {/* Full-bleed background: cover image or mosaic of album arts */}
                {playlist.image_url ? (
                  <Image source={{ uri: playlist.image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : songs.length > 0 ? (
                  <View style={[StyleSheet.absoluteFill, { flexDirection: 'row', flexWrap: 'wrap' }]}>
                    {songs.slice(0, 4).map((s, i) =>
                      s.album_art
                        ? <Image key={s.id} source={{ uri: s.album_art }} style={{ width: '50%', height: '50%' }} resizeMode="cover" />
                        : <View key={s.id} style={{ width: '50%', height: '50%', backgroundColor: ACCENT + (i % 2 === 0 ? '55' : '33') }} />
                    )}
                  </View>
                ) : (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: ACCENT + '33' }]} />
                )}
                {/* Dark gradient overlay so text is readable over the image */}
                <LinearGradient
                  colors={['rgba(0,0,0,0.18)', 'rgba(0,0,0,0.55)', '#0D0D0D']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                {/* Back button – absolutely positioned so it doesn't disturb flex-end flow */}
                <TouchableOpacity
                  style={[pdStyles.backBtn, { paddingTop: insets.top + 6 }]}
                  onPress={close}
                  activeOpacity={0.7}
                >
                  <Text style={pdStyles.backIcon}>‹</Text>
                </TouchableOpacity>

                {/* Title block */}
                <View style={pdStyles.heroInfo}>
                  <Text style={pdStyles.heroTitle} numberOfLines={2}>{playlist.name}</Text>
                  <View style={pdStyles.heroMetaRow}>
                    <View style={[pdStyles.sourceIconBadge, { backgroundColor: '#AB00FF' }]}>
                      <Text style={pdStyles.sourceIconText}>T</Text>
                    </View>
                    <Text style={pdStyles.heroMetaText}>Curated</Text>
                    <Text style={pdStyles.heroMetaDot}>·</Text>
                    <Text style={pdStyles.heroMetaText}>{songs.length} Song{songs.length !== 1 ? 's' : ''}</Text>
                    {playlist.tags.length > 0 && (
                      <>
                        <Text style={pdStyles.heroMetaDot}>·</Text>
                        <Text style={pdStyles.heroMetaText}>{playlist.tags.slice(0, 2).join(', ')}</Text>
                      </>
                    )}
                  </View>

                  {/* Show on profile toggle */}
                  <TouchableOpacity
                    style={[pdStyles.showOnProfileBtn, showOnProfile && { borderColor: ACCENT, backgroundColor: ACCENT + '18' }]}
                    onPress={toggleShowOnProfile}
                    activeOpacity={0.8}
                  >
                    {showOnProfile && <Text style={[pdStyles.showOnProfileText, { color: ACCENT }]}>✓ </Text>}
                    <Text style={[pdStyles.showOnProfileText, showOnProfile && { color: ACCENT }]}>
                      {showOnProfile ? 'Showing on profile' : 'Show on profile'}
                    </Text>
                  </TouchableOpacity>

                  {/* Add Song button */}
                  <TouchableOpacity style={cpStyles.addSongBtn} onPress={() => setShowAddSong(true)} activeOpacity={0.8}>
                    <Ionicons name="add-circle-outline" size={16} color="#FF6C1A" />
                    <Text style={cpStyles.addSongBtnText}>Add Song</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={[pdStyles.playBtn, { backgroundColor: ACCENT }]} activeOpacity={0.85}>
                  <Text style={pdStyles.playIcon}>▶</Text>
                </TouchableOpacity>
              </View>

              {/* ── Action bar ── */}
              <View style={pdStyles.actionBar}>
                <TouchableOpacity style={pdStyles.actionBtn} activeOpacity={0.7}>
                  <Text style={pdStyles.actionIcon}>↺</Text>
                </TouchableOpacity>
                <TouchableOpacity style={pdStyles.actionBtn} activeOpacity={0.7}>
                  <Text style={pdStyles.actionIcon}>♡</Text>
                </TouchableOpacity>
                <TouchableOpacity style={pdStyles.actionBtn} activeOpacity={0.7}>
                  <Text style={pdStyles.actionIcon}>↓</Text>
                </TouchableOpacity>
                <TouchableOpacity style={pdStyles.actionBtn} activeOpacity={0.7}>
                  <Text style={[pdStyles.actionIcon, { fontSize: 22, letterSpacing: 2 }]}>···</Text>
                </TouchableOpacity>
              </View>
              <View style={pdStyles.songListDivider} />
            </>
          }
          renderItem={({ item }) => (
            <RealSongRow track={item} accent={ACCENT} onDelete={() => deleteSong(item.id)} />
          )}
          ItemSeparatorComponent={() => <View style={pdStyles.songDivider} />}
        />
      </Animated.View>

      {showAddSong && (
        <AddSongDialog
          playlistId={playlist.id}
          userId={userId}
          onClose={() => setShowAddSong(false)}
          onAdded={loadSongs}
        />
      )}
    </Modal>
  )
}

// ─── Spotify playlist detail overlay ─────────────────────────────────────────
