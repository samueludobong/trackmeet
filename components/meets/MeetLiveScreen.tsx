import React, { useRef, useState } from "react";
import { MeetMusicPanel } from "../../components/meets/MeetMusicPanel";
import { MeetLyricsView } from "../../components/meets/MeetLyricsView";
import { useMeetMusicControl } from "../../hooks/useMeetMusicControl";
import { useMeetHost } from "../../hooks/useMeetHost";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Modal, Pressable, TextInput, Platform, Keyboard, KeyboardAvoidingView, PanResponder } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { SW } from "../../lib/feed/dimensions";
import { VideoView } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { mlStyles } from "../../lib/feed/localStyles";
import { FloatingReactionLayer, ReactionButton } from "../../components/meets/FloatingReaction";
import { MeetChatList } from "../../components/meets/MeetChatList";
import { MeetSummaryScreen } from "../../components/meets/MeetSummaryScreen";

// The center band for the lyrics view — sits between the top bar and the chat
// bar so the bottom chat input stays usable and the album-art background shows.

export function MeetLiveScreen({
  visible, onClose, meetId, meetName, accessToken, userId, minimized = false, onMinimize, jam,
}: {
  visible: boolean;
  onClose: () => void;
  meetId: string | null;
  meetName?: string;
  accessToken: string | null;
  userId: string | null;
  minimized?: boolean;
  onMinimize?: () => void;
  // Set for a private DM jam: hostless, co-controlled. `otherName` titles the bar.
  jam?: { otherName: string | null };
}) {
  const apiTokenRef = useRef<string | null>(null);
  // useMeetHost's jam mode needs the viewer id; only enable it when we have one.
  const jamConfig = React.useMemo(() => (jam && userId ? { userId } : undefined), [jam, userId]);
  const {
    track, liveProgressMs, listenerCount, messages, chatInput, setChatInput,
    talkOn, ending, summary, reactions, sendReaction, removeReaction, handleSendChat,
    handleToggleTalk, handleEndMeet, closeAll, displayTrack, resumeFromCache,
    isDriver, driverId, takeStage, dropStage,
  } = useMeetHost({ visible, meetId, accessToken, getApiToken: () => apiTokenRef.current, onClose, jam: jamConfig });

  // In a jam, only the stage holder may control playback.
  const canControl = jamConfig ? isDriver : true;
  const otherHasStage = !!jamConfig && !!driverId && driverId !== userId;

  const music = useMeetMusicControl({ visible, accessToken, userId, track, liveProgressMs, canControl });
  const {
    slideAnim, musicSlideX, canvasUrl, ctrlLoading, pickerOpen, setPickerOpen, apiToken, player, openMusicPicker, closeMusicPicker, pickerOpenRef,
    handlePrev, handleNext, handlePlayPause, fmtMs, progressPct,
  } = music;
  apiTokenRef.current = apiToken;

  const [lyricsOpen, setLyricsOpen] = useState(false);
  const title = jam ? (jam.otherName || "Jam") : (meetName ?? "My Meet");

  // ── Page swipe pager: Lyrics ← Playback → Music ──────────────────────────────
  // An *interactive* pager: the music page (slides from the right) and lyrics
  // page (slides from the left) follow your finger 1:1 during the drag, then
  // settle open/closed on release by position + flick. Same feel either side.
  const lyricsSlideX = useRef(new Animated.Value(-SW)).current;
  const lyricsOpenRef = useRef(false);
  lyricsOpenRef.current = lyricsOpen;
  const openLyrics = () => {
    setLyricsOpen(true);
    Animated.spring(lyricsSlideX, { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 220 }).start();
  };
  const closeLyrics = () => {
    Animated.timing(lyricsSlideX, { toValue: -SW, useNativeDriver: true, duration: 200 }).start(() => setLyricsOpen(false));
  };

  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
  const dragModeRef = useRef<null | "music" | "lyrics">(null);
  const dragBaseRef = useRef(0);   // slide value where the drag started
  const dragOffRef = useRef(0);    // dx at the moment the drag was recognised
  const settle = (mode: "music" | "lyrics", cur: number, vx: number) => {
    if (mode === "music") {
      // musicSlideX: 0 = open, SW = closed. Left flick / past halfway → open.
      const open = vx < -0.35 ? true : vx > 0.35 ? false : cur < SW * 0.5;
      if (open) Animated.spring(musicSlideX, { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 220 }).start();
      else Animated.timing(musicSlideX, { toValue: SW, useNativeDriver: true, duration: 180 }).start(() => setPickerOpen(false));
    } else {
      // lyricsSlideX: 0 = open, -SW = closed. Right flick / past halfway → open.
      const open = vx > 0.35 ? true : vx < -0.35 ? false : cur > -SW * 0.5;
      if (open) Animated.spring(lyricsSlideX, { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 220 }).start();
      else Animated.timing(lyricsSlideX, { toValue: -SW, useNativeDriver: true, duration: 180 }).start(() => setLyricsOpen(false));
    }
  };
  const pagePan = useRef(
    PanResponder.create({
      // Never grab plain taps — children (chat input, buttons, the lyrics
      // scroll, etc.) need them.
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      // Only claim once the user has committed to a *clearly* horizontal drag.
      // Previously `dx > 4 && dx > dy * 0.6` was too lenient: accidental
      // diagonal twitches captured, and on the chat area the child scroll
      // sometimes won the race so the pager felt stuck. New rule:
      //  • dx must be > 10px (filters tap jitter)
      //  • horizontal must dominate vertical by 1.6× on playback, 2× on a panel
      //    (so vertical scrolling in lyrics / music panel always wins)
      // Same threshold on both capture (preempt children) and non-capture
      // (catch-up if a child slipped past us first), for resilience.
      onMoveShouldSetPanResponderCapture: (_, { dx, dy }) => {
        const onPanel = pickerOpenRef.current || lyricsOpenRef.current;
        return Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * (onPanel ? 2 : 1.6);
      },
      onMoveShouldSetPanResponder: (_, { dx, dy }) => {
        const onPanel = pickerOpenRef.current || lyricsOpenRef.current;
        return Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * (onPanel ? 2 : 1.6);
      },
      // Once we own the horizontal drag, never give it back — a momentary
      // vertical wiggle mid-swipe shouldn't cancel into a scroll.
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => {
        // A page already open → we're dragging it back toward playback (base 0).
        dragModeRef.current = pickerOpenRef.current ? "music" : lyricsOpenRef.current ? "lyrics" : null;
        dragBaseRef.current = 0;
        dragOffRef.current = 0;
      },
      onPanResponderMove: (_, { dx }) => {
        let mode = dragModeRef.current;
        if (!mode) {
          // From playback: the swipe direction picks the page, mounted off-screen.
          if (dx < 0) { mode = "music";  dragBaseRef.current = SW;  setPickerOpen(true); }
          else        { mode = "lyrics"; dragBaseRef.current = -SW; setLyricsOpen(true); }
          dragModeRef.current = mode;
          dragOffRef.current = dx;   // so the page starts exactly under the finger
        }
        const d = dx - dragOffRef.current;
        if (mode === "music")  musicSlideX.setValue(clamp(dragBaseRef.current + d, 0, SW));
        else                   lyricsSlideX.setValue(clamp(dragBaseRef.current + d, -SW, 0));
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        const mode = dragModeRef.current;
        dragModeRef.current = null;
        if (!mode) return;
        const d = dx - dragOffRef.current;
        const cur = mode === "music"
          ? clamp(dragBaseRef.current + d, 0, SW)
          : clamp(dragBaseRef.current + d, -SW, 0);
        settle(mode, cur, vx);
      },
      onPanResponderTerminate: () => { dragModeRef.current = null; },
    }),
  ).current;

  // When minimized the hooks above keep running (realtime, audio, sync) but we
  // don't render the Modal at all. A Modal with visible={false} still creates a
  // native overlay on some platforms and consumes touches, blocking the MiniBar.
  if (!visible || minimized) return null;

  return (
    <Modal visible animationType="none" transparent statusBarTranslucent onRequestClose={onMinimize ?? onClose}>
      <Animated.View style={[mlStyles.root, { transform: [{ translateY: slideAnim }] }]} {...pagePan.panHandlers}>

        {canvasUrl ? (
          <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} allowsFullscreen={false} />
        ) : displayTrack?.albumArt ? (
          <CachedImage source={{ uri: displayTrack.albumArt }} style={StyleSheet.absoluteFill} resizeMode="cover" />
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
                <Text style={mlStyles.avatarInitial}>{(title ?? "M").slice(0, 1).toUpperCase()}</Text>
              </View>
            </LinearGradient>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={mlStyles.hostName} numberOfLines={1}>{title}</Text>
              <View style={mlStyles.listenerRow}>
                <View style={mlStyles.liveDotSm} />
                <Text style={mlStyles.listenerText} numberOfLines={1}>{jam ? "You both control" : `${listenerCount} listening`}</Text>
              </View>
            </View>
          </View>
          <View style={mlStyles.topRight}>
            <TouchableOpacity style={mlStyles.topCircle} activeOpacity={0.75} onPress={() => (lyricsOpen ? closeLyrics() : openLyrics())}>
              <Ionicons name={lyricsOpen ? "musical-note" : "document-text-outline"} size={17} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={mlStyles.topCircle} activeOpacity={0.75} onPress={openMusicPicker}>
              <Ionicons name="musical-notes" size={17} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={mlStyles.endBtn} activeOpacity={0.8} onPress={handleEndMeet} disabled={ending}>
              <Text style={mlStyles.endBtnText}>{jam ? (ending ? "Leaving…" : "Leave") : (ending ? "Ending…" : "End")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={mlStyles.topCircle} activeOpacity={0.75} onPress={onMinimize ?? onClose}>
              <Ionicons name="chevron-down" size={19} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <>
            <View style={mlStyles.trackSection}>
              <Text style={mlStyles.trackName} numberOfLines={1}>{displayTrack?.name ?? "—"}</Text>
              <Text style={mlStyles.trackArtist} numberOfLines={1}>{displayTrack?.artist ?? ""}</Text>
              <View style={mlStyles.progressTrack}>
                <View style={[mlStyles.progressFill, { width: `${progressPct * 100}%` as any }]} />
              </View>
              <View style={mlStyles.progressTimes}>
                <Text style={mlStyles.progressTime}>{fmtMs(liveProgressMs)}</Text>
                <Text style={mlStyles.progressTime}>{fmtMs(track?.durationMs ?? 0)}</Text>
              </View>
              <View style={mlStyles.controls}>
                <TouchableOpacity activeOpacity={0.7} onPress={handlePrev} disabled={ctrlLoading || !canControl}>
                  <Ionicons name="play-skip-back" size={34} color={canControl ? "#fff" : "rgba(255,255,255,0.3)"} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={mlStyles.playBtn}
                  activeOpacity={0.8}
                  disabled={ctrlLoading || !canControl}
                  onPress={() => {
                    // Device idle (no live track) but we have a cached frame →
                    // reactivate Spotify + resume from the cached point.
                    if (jam && !track && displayTrack) resumeFromCache();
                    else handlePlayPause();
                  }}
                >
                  <Ionicons name={displayTrack?.isPlaying ? "pause" : "play"} size={30} color={canControl ? "#fff" : "rgba(255,255,255,0.4)"} style={displayTrack?.isPlaying ? undefined : { marginLeft: 3 }} />
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.7} onPress={handleNext} disabled={ctrlLoading || !canControl}>
                  <Ionicons name="play-skip-forward" size={34} color={canControl ? "#fff" : "rgba(255,255,255,0.3)"} />
                </TouchableOpacity>
              </View>

              {/* Stage toggle — who's in control. */}
              {jam && (
                <View style={mlStyles.stageWrap}>
                  <TouchableOpacity
                    style={[mlStyles.stageBtn, isDriver && mlStyles.stageBtnHeld, otherHasStage && mlStyles.stageBtnLocked]}
                    activeOpacity={0.85}
                    disabled={otherHasStage}
                    onPress={isDriver ? dropStage : takeStage}
                  >
                    <Ionicons name={isDriver ? "mic" : "mic-outline"} size={14} color={otherHasStage ? "rgba(255,255,255,0.45)" : isDriver ? "#fff" : "#0D0D0D"} />
                    <Text style={[mlStyles.stageBtnText, isDriver && mlStyles.stageBtnTextHeld, otherHasStage && mlStyles.stageBtnTextLocked]}>
                      {isDriver ? "Drop Stage" : "Take Stage"}
                    </Text>
                  </TouchableOpacity>
                  {otherHasStage && (
                    <Text style={mlStyles.stageError}>
                      {jam.otherName || "They"} has to release stage to control
                    </Text>
                  )}
                </View>
              )}
            </View>

            <View style={mlStyles.commentSection}>
              <MeetChatList messages={messages} />
            </View>
        </>

        {!pickerOpen && !lyricsOpen && (
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

        {/* Lyrics page — slides in from the LEFT (right-swipe / lyrics button). */}
        {lyricsOpen && (
          <Animated.View style={[mlStyles.lyricsPage, { transform: [{ translateX: lyricsSlideX }] }]}>
            {displayTrack?.albumArt && (
              <CachedImage source={{ uri: displayTrack.albumArt }} style={StyleSheet.absoluteFill} resizeMode="cover" blurRadius={22} />
            )}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(8,0,6,0.82)" }]} />
            <View style={mlStyles.musicHeader}>
              <TouchableOpacity style={mlStyles.musicBackBtn} activeOpacity={0.7} onPress={closeLyrics}>
                <Ionicons name="chevron-back" size={22} color="#fff" />
              </TouchableOpacity>
              <Text style={mlStyles.musicTitle}>Lyrics</Text>
              <View style={{ width: 36 }} />
            </View>
            <View style={{ flex: 1 }}>
              <MeetLyricsView
                track={track ? { id: track.id, name: track.name, artist: track.artist, durationMs: track.durationMs } : null}
                positionMs={liveProgressMs}
                onClose={closeLyrics}
              />
            </View>
          </Animated.View>
        )}

        {pickerOpen && <MeetMusicPanel m={music} />}

      </Animated.View>
    </Modal>
  );
}

