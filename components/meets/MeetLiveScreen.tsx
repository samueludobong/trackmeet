import React, { useRef } from "react";
import { MeetMusicPanel } from "../../components/meets/MeetMusicPanel";
import { useMeetMusicControl } from "../../hooks/useMeetMusicControl";
import { useMeetHost } from "../../hooks/useMeetHost";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Modal, Pressable, TextInput, Platform, Keyboard, Image, KeyboardAvoidingView } from "react-native";
import { VideoView } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { mlStyles } from "../../lib/feed/localStyles";
import { FloatingReactionLayer, ReactionButton } from "../../components/meets/FloatingReaction";
import { MeetChatList } from "../../components/meets/MeetChatList";
import { MeetSummaryScreen } from "../../components/meets/MeetSummaryScreen";

export function MeetLiveScreen({
  visible, onClose, meetId, meetName, accessToken, userId, minimized = false, onMinimize,
}: {
  visible: boolean;
  onClose: () => void;
  meetId: string | null;
  meetName?: string;
  accessToken: string | null;
  userId: string | null;
  minimized?: boolean;
  onMinimize?: () => void;
}) {
  const apiTokenRef = useRef<string | null>(null);
  const {
    track, liveProgressMs, listenerCount, messages, chatInput, setChatInput,
    talkOn, ending, summary, reactions, sendReaction, removeReaction, handleSendChat,
    handleToggleTalk, handleEndMeet, closeAll,
  } = useMeetHost({ visible, meetId, accessToken, getApiToken: () => apiTokenRef.current, onClose });

  const {
    slideAnim, musicSlideX, canvasUrl, setCanvasUrl, ctrlLoading, setCtrlLoading, pickerOpen, setPickerOpen, apiToken, setApiToken, playlists, setPlaylists, playlistsLoading, setPlaylistsLoading, selectedPlaylist, setSelectedPlaylist, playlistTracks, setPlaylistTracks, tracksLoading, setTracksLoading, tracksError, setTracksError, searchQuery, setSearchQuery, searchResults, setSearchResults, searchLoading, setSearchLoading, playingId, setPlayingId, player, openMusicPicker, closeMusicPicker, pickerOpenRef, musicPan, selectPlaylist, tok, handlePrev, handleNext, handlePlayPause, handlePlayTrack, fmtMs, progressPct, isSearching, showTracks, p2Loading, p2Title
  } = useMeetMusicControl({ visible, accessToken, userId, track, liveProgressMs });
  apiTokenRef.current = apiToken;

  // When minimized the hooks above keep running (realtime, audio, sync) but we
  // don't render the Modal at all. A Modal with visible={false} still creates a
  // native overlay on some platforms and consumes touches, blocking the MiniBar.
  if (!visible || minimized) return null;

  return (
    <Modal visible animationType="none" transparent statusBarTranslucent onRequestClose={onMinimize ?? onClose}>
      <Animated.View style={[mlStyles.root, { transform: [{ translateY: slideAnim }] }]} {...musicPan.panHandlers}>

        {canvasUrl ? (
          <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} allowsFullscreen={false} />
        ) : track?.albumArt ? (
          <Image source={{ uri: track.albumArt }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "#0c0007" }]} />
        )}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.42)" }]} pointerEvents="none" />
        <LinearGradient colors={["transparent", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.92)"]} locations={[0.30, 0.62, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />

        {/* Plain-tap surface — dismisses the keyboard. The right-swipe gesture
            is handled by the capturing responder on the root above, so this only
            needs to catch taps on the empty background. */}
        <Pressable style={StyleSheet.absoluteFill} onPress={() => Keyboard.dismiss()} />

        <View style={mlStyles.topBar}>
          <View style={mlStyles.topLeft}>
            <LinearGradient colors={["#AB00FF", "#FF6C1A"]} style={mlStyles.avatarRing}>
              <View style={mlStyles.avatarInner}>
                <Text style={mlStyles.avatarInitial}>{(meetName ?? "M").slice(0, 1).toUpperCase()}</Text>
              </View>
            </LinearGradient>
            <View>
              <Text style={mlStyles.hostName}>{meetName ?? "My Meet"}</Text>
              <View style={mlStyles.listenerRow}>
                <View style={mlStyles.liveDotSm} />
                <Text style={mlStyles.listenerText}>{listenerCount} listening</Text>
              </View>
            </View>
          </View>
          <View style={mlStyles.topRight}>
            <TouchableOpacity style={mlStyles.topCircle} activeOpacity={0.75} onPress={openMusicPicker}>
              <Ionicons name="musical-notes" size={17} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={mlStyles.endBtn} activeOpacity={0.8} onPress={handleEndMeet} disabled={ending}>
              <Text style={mlStyles.endBtnText}>{ending ? "Ending…" : "End"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={mlStyles.topCircle} activeOpacity={0.75} onPress={onMinimize ?? onClose}>
              <Ionicons name="chevron-down" size={19} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={mlStyles.trackSection}>
          <Text style={mlStyles.trackName} numberOfLines={1}>{track?.name ?? "—"}</Text>
          <Text style={mlStyles.trackArtist} numberOfLines={1}>{track?.artist ?? ""}</Text>
          <View style={mlStyles.progressTrack}>
            <View style={[mlStyles.progressFill, { width: `${progressPct * 100}%` as any }]} />
          </View>
          <View style={mlStyles.progressTimes}>
            <Text style={mlStyles.progressTime}>{fmtMs(liveProgressMs)}</Text>
            <Text style={mlStyles.progressTime}>{fmtMs(track?.durationMs ?? 0)}</Text>
          </View>
          <View style={mlStyles.controls}>
            <TouchableOpacity activeOpacity={0.7} onPress={handlePrev} disabled={ctrlLoading}>
              <Ionicons name="play-skip-back" size={34} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={mlStyles.playBtn} activeOpacity={0.8} onPress={handlePlayPause} disabled={ctrlLoading}>
              <Ionicons name={track?.isPlaying ? "pause" : "play"} size={30} color="#fff" style={track?.isPlaying ? undefined : { marginLeft: 3 }} />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} onPress={handleNext} disabled={ctrlLoading}>
              <Ionicons name="play-skip-forward" size={34} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={mlStyles.commentSection}>
          <MeetChatList messages={messages} />
        </View>

        {!pickerOpen && (
          <View style={mlStyles.swipeHint} pointerEvents="none">
            <Ionicons name="musical-notes" size={13} color="#ffffff70" />
            <Text style={mlStyles.swipeHintText}>Tracks</Text>
            <Ionicons name="chevron-forward" size={14} color="#ffffff5d" />
          </View>
        )}

        <FloatingReactionLayer items={reactions} onItemDone={removeReaction} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={mlStyles.bottomBarWrap}
        >
          <View style={mlStyles.bottomBar}>
            <View style={mlStyles.inputPill}>
              <TextInput
                style={mlStyles.inputField}
                placeholder="Send a message"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={chatInput}
                onChangeText={setChatInput}
                onSubmitEditing={handleSendChat}
                returnKeyType="send"
              />
              <TouchableOpacity onPress={handleSendChat} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="send" size={20} color="#E91E8C" />
              </TouchableOpacity>
            </View>
            <ReactionButton onReact={sendReaction} />
            <TouchableOpacity
              style={[mlStyles.micBtn, talkOn && mlStyles.micBtnOn]}
              activeOpacity={0.8}
              onPress={handleToggleTalk}
            >
              <Ionicons name={talkOn ? "mic" : "mic-outline"} size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {summary && (
          <MeetSummaryScreen
            tracks={summary}
            listenerCount={listenerCount}
            accessToken={apiToken ?? accessToken}
            onClose={closeAll}
            role="host"
            meetId={meetId}
            userId={userId}
          />
        )}

        {pickerOpen && (
          <MeetMusicPanel
            musicSlideX={musicSlideX}
            p2Title={p2Title}
            p2Loading={p2Loading}
            isSearching={isSearching}
            showTracks={showTracks}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            setSearchResults={setSearchResults}
            searchResults={searchResults}
            playlistTracks={playlistTracks}
            tracksError={tracksError}
            playlists={playlists}
            playingId={playingId}
            handlePlayTrack={handlePlayTrack}
            selectPlaylist={selectPlaylist}
            setSelectedPlaylist={setSelectedPlaylist}
            setPlaylistTracks={setPlaylistTracks}
            setTracksLoading={setTracksLoading}
            closeMusicPicker={closeMusicPicker}
          />
        )}

      </Animated.View>
    </Modal>
  );
}

