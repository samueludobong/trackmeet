import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Modal, Pressable, TextInput, Image, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { type SpotifyTrackResult } from "../../lib/spotify";
import { psStyles, epOverlayStyles } from "../../lib/feed/localStyles";
import { type PinnedSong } from "../../types/music";
import { type BaseStep } from "../../types/profile";
import { AddToPlaylistSheet } from "../../components/AddToPlaylistSheet";
import { EditProfileOverlay } from "../../components/profile/EditProfileOverlay";

import { usePinnedSongPicker } from "../../hooks/usePinnedSongPicker";
import { useSheetDragClose } from "../../hooks/useSheetDragClose";
import { DragGrabber } from "../common/DragGrabber";

import { PinnedSongPreview } from "../../components/profile/PinnedSongPreview";

export function PinnedSongOverlay({ visible, onClose, onSelect, accessToken, ctaLabel = "Pin to Profile", ctaIcon = "thumbtack" }: {
  visible: boolean;
  onClose: () => void;
  onSelect: (song: PinnedSong) => void;
  accessToken: string | null;
  ctaLabel?: string;
  ctaIcon?: string;
}) {
  const {
    step, setStep, nowPlaying, setNowPlaying, loadingNow, setLoadingNow, playlists, setPlaylists, loadingPlaylists, setLoadingPlaylists, playlistTracks, setPlaylistTracks, loadingTracks, setLoadingTracks, query, setQuery, searchResults, setSearchResults, searching, setSearching, previewPositionMs, setPreviewPositionMs, previewDurationMs, setPreviewDurationMs, previewPlaying, setPreviewPlaying, previewLoading, setPreviewLoading, previewSaved, setPreviewSaved, previewPickerOpen, setPreviewPickerOpen, pinUserId, setPinUserId, soundRef, slideAnim, backdropAnim, searchTimer, previewSongId, previewSongUrl, pin, goBack, togglePreviewPlayback, savePreviewToLiked, previewTrack, fmtMs, title, isSubStep
  } = usePinnedSongPicker({ visible, onClose, onSelect, accessToken });

  const { panHandlers: dragHandlers, stretch } = useSheetDragClose({ slideAnim, onClose, closedValue: 600 });
  const dragBackdrop = slideAnim.interpolate({ inputRange: [0, 600], outputRange: [1, 0], extrapolate: "clamp" });

  const TrackRow = ({ item }: { item: SpotifyTrackResult }) => (
    <TouchableOpacity
      style={epOverlayStyles.resultRow}
      activeOpacity={0.75}
      onPress={() => setStep({ type: "preview", song: { id: item.id, name: item.name, artist: item.artist, albumArt: item.albumArt, previewUrl: item.previewUrl }, from: step as BaseStep })}
    >
      {item.albumArt ? (
        <Image source={{ uri: item.albumArt }} style={epOverlayStyles.resultArt} />
      ) : (
        <View style={[epOverlayStyles.resultArt, epOverlayStyles.resultArtFallback]}>
          <FontAwesome5 name="music" size={12} color="rgba(255,255,255,0.3)" />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={epOverlayStyles.resultTrack} numberOfLines={1}>{item.name}</Text>
        <Text style={epOverlayStyles.resultArtist} numberOfLines={1}>{item.artist}</Text>
      </View>
    </TouchableOpacity>
  );

  // Rendered inside EditProfileOverlay's Modal as an Animated.View overlay (no nested Modal)

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { zIndex: 100, opacity: Animated.multiply(backdropAnim, dragBackdrop) }]}
      pointerEvents={visible ? "auto" : "none"}
    >
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.70)" }]} onPress={onClose} />
      <KeyboardAvoidingView pointerEvents="box-none" behavior={Platform.OS === "ios" ? "padding" : undefined} style={StyleSheet.absoluteFill}>
      <Animated.View style={[psStyles.sheet, { transform: [{ translateY: slideAnim }, { scaleY: stretch }] }]}>
        <DragGrabber panHandlers={dragHandlers} />
        <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
        <View style={epOverlayStyles.sheetHeader}>
          <TouchableOpacity onPress={isSubStep ? goBack : onClose} hitSlop={12} style={psStyles.navBtn}>
            <FontAwesome5
              name={isSubStep ? "chevron-left" : "times"}
              size={isSubStep ? 14 : 16}
              color="rgba(255,255,255,0.55)"
            />
          </TouchableOpacity>
          <Text style={epOverlayStyles.sheetTitle}>{title}</Text>
          {isSubStep ? (
            <TouchableOpacity onPress={onClose} hitSlop={12} style={psStyles.navBtn}>
              <FontAwesome5 name="times" size={16} color="rgba(255,255,255,0.55)" />
            </TouchableOpacity>
          ) : (
            <View style={psStyles.navBtn} />
          )}
        </View>        {step === "home" && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={psStyles.homeContent} showsVerticalScrollIndicator={false}>
            <Text style={psStyles.sectionLabel}>NOW PLAYING</Text>
            {loadingNow ? (
              <ActivityIndicator color="#1DB954" style={{ marginVertical: 24 }} />
            ) : nowPlaying ? (
              <TouchableOpacity
                style={psStyles.nowPlayingCard}
                activeOpacity={0.82}
                onPress={() => setStep({ type: "preview", song: nowPlaying, from: "home" })}
              >
                {nowPlaying.albumArt ? (
                  <Image source={{ uri: nowPlaying.albumArt }} style={psStyles.npArt} />
                ) : (
                  <View style={[psStyles.npArt, psStyles.npArtFallback]}>
                    <FontAwesome5 name="music" size={18} color="rgba(255,255,255,0.25)" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={psStyles.npTrack} numberOfLines={1}>{nowPlaying.name}</Text>
                  <Text style={psStyles.npArtist} numberOfLines={1}>{nowPlaying.artist}</Text>
                </View>
                <FontAwesome5 name="chevron-right" size={12} color="rgba(255,255,255,0.25)" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={psStyles.addSongBtn} onPress={() => setStep("search")} activeOpacity={0.8}>
                <FontAwesome5 name="plus" size={14} color="#fff" />
                <Text style={psStyles.addSongText}>Add Song</Text>
              </TouchableOpacity>
            )}

            <View style={psStyles.divider} />

            <TouchableOpacity style={psStyles.menuRow} onPress={() => setStep("search")} activeOpacity={0.75}>
              <View style={[psStyles.menuIcon, { backgroundColor: "rgba(255,108,26,0.15)" }]}>
                <FontAwesome5 name="search" size={14} color="#FF6C1A" />
              </View>
              <Text style={psStyles.menuLabel}>Search Spotify</Text>
              <FontAwesome5 name="chevron-right" size={12} color="rgba(255,255,255,0.2)" />
            </TouchableOpacity>

            <TouchableOpacity style={psStyles.menuRow} onPress={() => setStep("playlists")} activeOpacity={0.75}>
              <View style={[psStyles.menuIcon, { backgroundColor: "rgba(29,185,84,0.12)" }]}>
                <FontAwesome5 name="list-ul" size={13} color="#1DB954" />
              </View>
              <Text style={psStyles.menuLabel}>Browse Playlists</Text>
              <FontAwesome5 name="chevron-right" size={12} color="rgba(255,255,255,0.2)" />
            </TouchableOpacity>
          </ScrollView>
        )}        {step === "search" && (
          <>
            <View style={epOverlayStyles.searchRow}>
              <FontAwesome5 name="search" size={14} color="rgba(255,255,255,0.3)" style={{ marginRight: 8 }} />
              <TextInput
                style={epOverlayStyles.searchInput}
                placeholder="Search Spotify…"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={query}
                onChangeText={setQuery}
                autoFocus
              />
              {searching && <ActivityIndicator size="small" color="#1DB954" />}
            </View>
            <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {searchResults.map((item) => <TrackRow key={item.id} item={item} />)}
              {!searching && query.trim() && searchResults.length === 0 && (
                <Text style={epOverlayStyles.emptyText}>No results for "{query}"</Text>
              )}
              {!query.trim() && <Text style={epOverlayStyles.emptyText}>Type to search Spotify</Text>}
            </ScrollView>
          </>
        )}        {step === "playlists" && (
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {loadingPlaylists ? (
              <ActivityIndicator color="#1DB954" style={{ marginTop: 48 }} />
            ) : playlists.length === 0 ? (
              <Text style={epOverlayStyles.emptyText}>No playlists found</Text>
            ) : playlists.map((pl) => (
              <TouchableOpacity
                key={pl.id}
                style={epOverlayStyles.resultRow}
                activeOpacity={0.75}
                onPress={() => setStep({ type: "playlistTracks", id: pl.id, name: pl.name })}
              >
                {pl.isLiked ? (
                  <View style={[psStyles.plArt, psStyles.likedArt]}>
                    <FontAwesome5 name="heart" size={18} color="#1DB954" />
                  </View>
                ) : pl.imageUrl ? (
                  <Image source={{ uri: pl.imageUrl }} style={psStyles.plArt} />
                ) : (
                  <View style={[psStyles.plArt, psStyles.plArtFallback]}>
                    <FontAwesome5 name="music" size={16} color="rgba(255,255,255,0.2)" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={epOverlayStyles.resultTrack} numberOfLines={1}>{pl.name}</Text>
                  <Text style={epOverlayStyles.resultArtist}>{pl.trackCount} songs</Text>
                </View>
                <FontAwesome5 name="chevron-right" size={11} color="rgba(255,255,255,0.2)" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}        {typeof step === "object" && step.type === "playlistTracks" && (
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {loadingTracks ? (
              <ActivityIndicator color="#1DB954" style={{ marginTop: 48 }} />
            ) : playlistTracks.length === 0 ? (
              <Text style={epOverlayStyles.emptyText}>No tracks in this playlist</Text>
            ) : playlistTracks.map((item) => <TrackRow key={item.id} item={item} />)}
          </ScrollView>
        )}        {typeof step === "object" && step.type === "preview" && <PinnedSongPreview song={step.song} previewDurationMs={previewDurationMs} previewPositionMs={previewPositionMs} previewLoading={previewLoading} previewPlaying={previewPlaying} previewSaved={previewSaved} fmtMs={fmtMs} togglePreviewPlayback={togglePreviewPlayback} savePreviewToLiked={savePreviewToLiked} onPin={pin} ctaIcon={ctaIcon} ctaLabel={ctaLabel} />}
          </View>
        </TouchableWithoutFeedback>
      </Animated.View>
      </KeyboardAvoidingView>

      <AddToPlaylistSheet
        visible={previewPickerOpen}
        onClose={() => setPreviewPickerOpen(false)}
        userId={pinUserId}
        track={previewTrack}
        onSavedChange={setPreviewSaved}
      />
    </Animated.View>
  );
}

// ─── Edit Profile Overlay ─────────────────────────────────────────────────────

// ─── Banner Color Overlay ─────────────────────────────────────────────────────
