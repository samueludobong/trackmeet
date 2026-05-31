import React, { useRef, useState, useEffect } from "react";
import { isSpotifyPlaylistShown, setSpotifyPlaylistShown } from "../../services/playlists";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Animated, Modal, PanResponder, Image, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getPlaylistTracks, getValidSpotifyToken, type SpotifyTrackResult, type SpotifyPlaylist } from "../../lib/spotify";
import { pdStyles } from "../../lib/feed/localStyles";
import { SW } from "../../lib/feed/dimensions";
import { SpotifyTrackRow } from "../../components/playlists/SpotifyTrackRow";

export function SpotifyPlaylistDetailOverlay({
  playlist, userId, onClose,
}: {
  playlist: SpotifyPlaylist
  userId: string
  onClose: () => void
}) {
  const insets = useSafeAreaInsets()
  const slideX = useRef(new Animated.Value(SW)).current
  const [tracks, setTracks] = useState<SpotifyTrackResult[]>([])
  const [tracksLoading, setTracksLoading] = useState(true)
  const [showOnProfile, setShowOnProfile] = useState(false)

  const ACCENT = '#1DB954'

  useEffect(() => {
    Animated.spring(slideX, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }).start()
    // Check if already showing on profile
    isSpotifyPlaylistShown(userId, playlist.id).then(setShowOnProfile)
    // Load tracks
    ;(async () => {
      const token = await getValidSpotifyToken(userId)
      if (!token) { setTracksLoading(false); return }
      const { tracks: t } = await getPlaylistTracks(token, playlist.id)
      setTracks(t)
      setTracksLoading(false)
    })()
  }, [])

  const handleClose = () => {
    Animated.timing(slideX, { toValue: SW, duration: 260, useNativeDriver: true }).start(onClose)
  }

  const toggleShowOnProfile = async () => {
    const newVal = !showOnProfile
    setShowOnProfile(newVal)
    if (newVal) {
      await setSpotifyPlaylistShown(userId, playlist.id, true)
    } else {
      await setSpotifyPlaylistShown(userId, playlist.id, false)
    }
  }

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, { dx, dy }) => dx > 8 && dx > Math.abs(dy) * 2,
    onShouldBlockNativeResponder: () => false,
    onPanResponderMove: (_, { dx }) => { if (dx > 0) slideX.setValue(dx) },
    onPanResponderRelease: (_, { dx, vx }) => {
      if (dx > SW * 0.3 || vx > 0.8) handleClose()
      else Animated.spring(slideX, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }).start()
    },
    onPanResponderTerminate: () => {
      Animated.spring(slideX, { toValue: 0, useNativeDriver: true }).start()
    },
  })).current

  return (
    <Modal transparent animationType="none" statusBarTranslucent onRequestClose={handleClose}>
      <Animated.View style={[StyleSheet.absoluteFill, pdStyles.screen, { transform: [{ translateX: slideX }] }]} {...pan.panHandlers}>
        <FlatList
          data={tracks}
          keyExtractor={t => t.id}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            tracksLoading
              ? <ActivityIndicator color={ACCENT} style={{ marginTop: 32 }} />
              : <View style={{ alignItems: 'center', paddingTop: 40 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 15 }}>No tracks found</Text>
                </View>
          }
          ListHeaderComponent={
            <>
              {/* ── Hero ── */}
              <View style={[pdStyles.hero, { minHeight: 340 + insets.top }]}>
                {/* Full-bleed background: cover image or mosaic of album arts */}
                {playlist.imageUrl ? (
                  <Image source={{ uri: playlist.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : tracks.length > 0 ? (
                  <View style={[StyleSheet.absoluteFill, { flexDirection: 'row', flexWrap: 'wrap' }]}>
                    {tracks.slice(0, 4).map((t, i) =>
                      t.albumArt
                        ? <Image key={t.id} source={{ uri: t.albumArt }} style={{ width: '50%', height: '50%' }} resizeMode="cover" />
                        : <View key={t.id} style={{ width: '50%', height: '50%', backgroundColor: ACCENT + (i % 2 === 0 ? '55' : '33') }} />
                    )}
                  </View>
                ) : (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0a1a0a' }]} />
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
                  onPress={handleClose}
                  activeOpacity={0.7}
                >
                  <Text style={pdStyles.backIcon}>‹</Text>
                </TouchableOpacity>

                {/* Title block */}
                <View style={pdStyles.heroInfo}>
                  <Text style={pdStyles.heroTitle} numberOfLines={2}>{playlist.name}</Text>
                  <View style={pdStyles.heroMetaRow}>
                    <View style={[pdStyles.sourceIconBadge, { backgroundColor: '#1DB954' }]}>
                      <Text style={pdStyles.sourceIconText}>S</Text>
                    </View>
                    <Text style={pdStyles.heroMetaText}>Spotify</Text>
                    <Text style={pdStyles.heroMetaDot}>·</Text>
                    <Text style={pdStyles.heroMetaText}>{playlist.trackCount} Song{playlist.trackCount !== 1 ? 's' : ''}</Text>
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
          renderItem={({ item }) => <SpotifyTrackRow track={item} accent={ACCENT} />}
          ItemSeparatorComponent={() => <View style={pdStyles.songDivider} />}
        />
      </Animated.View>
    </Modal>
  )
}



// ─── Playlist list cards ──────────────────────────────────────────────────────
