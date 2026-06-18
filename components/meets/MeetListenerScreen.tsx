import React, { useState, useRef, useEffect } from "react";
import { MeetGuideOverlay } from "../../components/meets/MeetGuideOverlay";
import { MeetLyricsView } from "../../components/meets/MeetLyricsView";
import { LiveSessionBackdrop } from "../../components/meets/LiveSessionBackdrop";
import { EqualizerBars } from "../../components/meets/EqualizerBars";
import { SongChangingOverlay } from "../../components/meets/SongChangingOverlay";
import { useMeetListener } from "../../hooks/useMeetListener";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Modal, Pressable, TextInput, Platform, Keyboard, KeyboardAvoidingView, ActivityIndicator, PanResponder, Easing } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ms, llStyles, mlStyles } from "../../assets/styles/feed/localStyles";
import { AddToPlaylistSheet } from "../../components/AddToPlaylistSheet";
import { FloatingReactionLayer, ReactionButton } from "../../components/meets/FloatingReaction";
import { MeetChatList } from "../../components/meets/MeetChatList";
import { MeetSummaryScreen } from "../../components/meets/MeetSummaryScreen";

// Center band for the lyrics view — between the top bar and the chat bar.
const lyricsBand = { position: "absolute" as const, top: 96, left: 0, right: 0, bottom: 104 };

export function MeetListenerScreen({
  visible, onClose, meetId, userId, isPublic = false, minimized = false, onMinimize, onExpand, onInfo,
}: {
  visible: boolean;
  onClose: () => void;
  meetId: string | null;
  userId: string | null;
  isPublic?: boolean;
  minimized?: boolean;
  onMinimize?: () => void;
  onExpand?: () => void;
  onInfo?: (info: { name: string; trackName: string | null; albumArt: string | null }) => void;
}) {
  const {
    slideAnim, accessToken, setAccessToken, meet, setMeet, trackState, setTrackState, host, setHost, listenerCount, setListenerCount, messages, setMessages, chatInput, setChatInput, livePos, setLivePos, savedId, setSavedId, pickerOpen, setPickerOpen, ended, setEnded, summary, setSummary, reactions, setReactions, reactChannelRef, spawnReaction, sendReaction, showGuide, setShowGuide, dontShowGuide, setDontShowGuide, launched, setLaunched, openedOnceRef, handleGotIt, syncTokenRef, syncStateRef, inSync, setInSync, isHostViewer, changing, changingInfo, handleSendChat, handleSaveSong, handleLeave
  } = useMeetListener({ visible, onClose, meetId, userId, isPublic, minimized, onInfo, onExpand });

  const [lyricsOpen, setLyricsOpen] = useState(false);

  // Swipe right → open lyrics, swipe left → back. Only claims clearly-horizontal
  // gestures so vertical scrolls (chat list, lyrics) aren't hijacked.
  const lyricsPan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 28 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
      onPanResponderRelease: (_e, g) => {
        if (g.dx > 60) setLyricsOpen(true);
        else if (g.dx < -60) setLyricsOpen(false);
      },
    }),
  ).current;

  // Cross-fade the album-art background + content in over the live-session
  // gradient only while the host is actually *playing*. A pause (or a stop)
  // drops the listener to the idle/waiting state too — mirroring the host —
  // instead of lingering on the paused track. (Declared before the early
  // return below so hook order stays stable.)
  const hasTrack = !!trackState?.id && !!trackState?.isPlaying;
  const playAnim = useRef(new Animated.Value(hasTrack ? 1 : 0)).current;
  const [showIdle, setShowIdle] = useState(!hasTrack);
  const idlePulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    // Entering idle → mount the idle layer immediately so its elements render;
    // going to playing → unmount only once the fade finishes.
    if (!hasTrack) setShowIdle(true);
    Animated.timing(playAnim, {
      toValue: hasTrack ? 1 : 0,
      duration: 520,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(({ finished }) => { if (finished && hasTrack) setShowIdle(false); });
  }, [hasTrack]);
  useEffect(() => {
    if (!showIdle) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(idlePulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(idlePulse, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [showIdle]);
  const idleOpacity = playAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const pulseScale = idlePulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });

  // When minimized the hooks above keep running (realtime, sync) but we don't
  // render the Modal at all. A Modal with visible={false} still creates a native
  // overlay on some platforms and consumes touches, blocking the MiniBar.
  if (!visible || minimized) return null;

  const fmtMs = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };
  const progressPct = trackState?.durationMs ? Math.min(livePos / trackState.durationMs, 1) : 0;
  const hostName = host?.display_name || host?.username || meet?.name || "Host";
  const isSaved  = savedId === trackState?.id;

  return (
    <Modal visible animationType="none" transparent statusBarTranslucent onRequestClose={onMinimize ?? handleLeave}>
      <Animated.View style={[mlStyles.root, { transform: [{ translateY: slideAnim }] }]} {...lyricsPan.panHandlers}>
        {/* Idle: looping live-session gradient until the host has a track. */}
        <LiveSessionBackdrop style={StyleSheet.absoluteFill} />
        {/* Playing: album art fades in over the gradient once a track loads. */}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: playAnim }]} pointerEvents="none">
          {trackState?.albumArt ? (
            <CachedImage source={{ uri: trackState.albumArt }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "#0c0007" }]} />
          )}
        </Animated.View>
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: "#000", opacity: playAnim.interpolate({ inputRange: [0, 1], outputRange: [0.14, 0.5] }) }]}
          pointerEvents="none"
        />
        <LinearGradient colors={["transparent", "rgba(0,0,0,0.6)", "rgba(0,0,0,0.94)"]} locations={[0.30, 0.62, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />

        <Pressable style={StyleSheet.absoluteFill} onPress={() => Keyboard.dismiss()} />

        {trackState?.talkMode && (
          <View style={llStyles.talkBanner}>
            <Ionicons name="mic" size={16} color="#fff" />
            <Text style={llStyles.talkBannerText}>{hostName} is talking — music paused</Text>
          </View>
        )}

        {!lyricsOpen && (
        <View style={mlStyles.trackSection}>
          {/* Playing block — fades out (holding layout) when nothing's playing. */}
          <Animated.View style={{ width: "100%", alignItems: "center", opacity: playAnim }} pointerEvents={hasTrack ? "auto" : "none"}>
            <Text style={mlStyles.trackName} numberOfLines={1}>{trackState?.name ?? ""}</Text>
            <Text style={mlStyles.trackArtist} numberOfLines={1}>{trackState?.artist ?? ""}</Text>

            {launched && trackState?.id && !trackState?.talkMode && (
              <View style={llStyles.syncRow}>
                {inSync ? (
                  <>
                    <View style={llStyles.syncDotOk} />
                    <Text style={llStyles.syncTextOk}>In sync with host</Text>
                  </>
                ) : (
                  <>
                    <ActivityIndicator size="small" color="#FFB020" />
                    <Text style={llStyles.syncTextBusy}>Syncing with host…</Text>
                  </>
                )}
              </View>
            )}

            <View style={mlStyles.progressTrack}>
              <View style={[mlStyles.progressFill, { width: `${progressPct * 100}%` as any }]} />
            </View>
            <View style={mlStyles.progressTimes}>
              <Text style={mlStyles.progressTime}>{fmtMs(livePos)}</Text>
              <Text style={mlStyles.progressTime}>{fmtMs(trackState?.durationMs ?? 0)}</Text>
            </View>
            <TouchableOpacity
              style={[llStyles.saveSongBtn, (isSaved || !trackState?.id) && llStyles.saveSongBtnDone]}
              activeOpacity={0.85}
              onPress={handleSaveSong}
              disabled={!trackState?.id}
            >
              <Ionicons name={isSaved ? "checkmark" : "add"} size={18} color="#fff" />
              <Text style={llStyles.saveSongText}>{isSaved ? "Saved" : "Save song"}</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Idle block — a styled "waiting room" instead of a bare label. Shows
              the host is live, reflects when they're speaking, and keeps a live
              equalizer animating so the screen never feels frozen. */}
          {showIdle && (
            <Animated.View style={[mlStyles.idleWrap, { opacity: idleOpacity }]} pointerEvents={hasTrack ? "none" : "auto"}>
              <Animated.View style={[mlStyles.idlePulse, { transform: [{ scale: pulseScale }] }]}>
                <Ionicons name={trackState?.talkMode ? "mic" : "disc"} size={32} color="#fff" />
              </Animated.View>
              <Text style={mlStyles.idleTitle}>
                {trackState?.talkMode ? `${hostName} is speaking` : `Waiting for ${hostName}`}
              </Text>
              <Text style={mlStyles.idleSub}>
                {trackState?.talkMode
                  ? "Listen in — the music picks back up right after"
                  : `Sit tight — the music starts the moment ${hostName} plays`}
              </Text>
              <View style={{ marginTop: 20 }}>
                <EqualizerBars color="rgba(255,255,255,0.92)" />
              </View>
            </Animated.View>
          )}

          <AddToPlaylistSheet
            visible={pickerOpen}
            onClose={() => setPickerOpen(false)}
            userId={userId}
            track={trackState?.id ? {
              id: trackState.id, name: trackState.name ?? "", artist: trackState.artist,
              albumArt: trackState.albumArt, durationMs: trackState.durationMs,
            } : null}
            onSavedChange={(v) => { if (v && trackState?.id) setSavedId(trackState.id); }}
          />
        </View>
        )}

        {!lyricsOpen && (
        <View style={mlStyles.commentSection}>
          <MeetChatList messages={messages} />
        </View>
        )}

        {/* Brief "switching song…" transition while the host's new pick lands. */}
        {!lyricsOpen && !ended && <SongChangingOverlay visible={changing} info={changingInfo} />}

        {lyricsOpen && (
          <View style={lyricsBand}>
            <MeetLyricsView
              track={trackState ? { id: trackState.id, name: trackState.name, artist: trackState.artist, durationMs: trackState.durationMs } : null}
              positionMs={livePos}
              onClose={() => setLyricsOpen(false)}
            />
          </View>
        )}

        <FloatingReactionLayer items={reactions} onItemDone={(id) => setReactions((prev) => prev.filter((r) => r.id !== id))} />

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
          </View>
        </KeyboardAvoidingView>
        {ended && (summary ? (
          <MeetSummaryScreen
            tracks={summary}
            listenerCount={listenerCount}
            accessToken={accessToken}
            onClose={handleLeave}
            role="listener"
            meetId={meetId}
            userId={userId}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, llStyles.endedOverlay]}>
            <Ionicons name="radio-outline" size={56} color="rgba(255,255,255,0.5)" />
            <Text style={llStyles.endedTitle}>This Meet has ended</Text>
            <TouchableOpacity style={llStyles.endedBtn} activeOpacity={0.85} onPress={handleLeave}>
              <Text style={llStyles.endedBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        ))}
        {showGuide && !ended && (
          <MeetGuideOverlay dontShowGuide={dontShowGuide} setDontShowGuide={setDontShowGuide} onGotIt={handleGotIt} />
        )}
        <View style={mlStyles.topBar}>
          <View style={mlStyles.topLeft}>
            {host?.avatar_url ? (
              <CachedImage source={{ uri: host.avatar_url }} style={{ width: 44, height: 44, borderRadius: 22 }} />
            ) : (
              <LinearGradient colors={["#AB00FF", "#FF6C1A"]} style={mlStyles.avatarRing}>
                <View style={mlStyles.avatarInner}>
                  <Text style={mlStyles.avatarInitial}>{hostName.slice(0, 1).toUpperCase()}</Text>
                </View>
              </LinearGradient>
            )}
            <View>
              <Text style={mlStyles.hostName}>{hostName}</Text>
              <View style={mlStyles.listenerRow}>
                <View style={mlStyles.liveDotSm} />
                <Text style={mlStyles.listenerText}>{listenerCount} listening</Text>
              </View>
            </View>
          </View>
          <View style={mlStyles.topRight}>
            <TouchableOpacity style={mlStyles.topCircle} activeOpacity={0.75} onPress={() => setLyricsOpen((v) => !v)}>
              <Ionicons name={lyricsOpen ? "musical-note" : "document-text-outline"} size={17} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={mlStyles.topCircle} activeOpacity={0.75} onPress={onMinimize ?? handleLeave}>
              <Ionicons name="chevron-down" size={19} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={mlStyles.endBtn} activeOpacity={0.8} onPress={handleLeave}>
              <Text style={mlStyles.endBtnText}>Leave</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}


// ─── Join confirmation (public vs private) ────────────────────────────────────
// Before entering a meet, the joiner chooses whether their participation is
// visible on their profile. Public surfaces a "Join" affordance to anyone who
// views their now-playing; private keeps their profile looking like ordinary
// solo listening.
