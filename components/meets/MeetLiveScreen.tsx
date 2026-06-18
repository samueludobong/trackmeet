import React, { useRef, useState, useEffect } from "react";
import { MeetMusicPanel } from "../../components/meets/MeetMusicPanel";
import { MeetLyricsView } from "../../components/meets/MeetLyricsView";
import { LiveSessionBackdrop } from "../../components/meets/LiveSessionBackdrop";
import { useMeetMusicControl } from "../../hooks/useMeetMusicControl";
import { useMeetHost } from "../../hooks/useMeetHost";
import { useSmoothProgressMs } from "../../hooks/useNowPlaying";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Modal, Pressable, TextInput, Platform, Keyboard, KeyboardAvoidingView, PanResponder, Easing } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { SW } from "../../lib/feed/dimensions";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { mlStyles } from "../../assets/styles/feed/localStyles";
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
    handleToggleTalk, setTalk, handleEndMeet, closeAll, displayTrack, resumeFromCache,
    isDriver, driverId, takeStage, dropStage, pausedCache, resumeHostSong,
  } = useMeetHost({ visible, meetId, accessToken, getApiToken: () => apiTokenRef.current, onClose, jam: jamConfig });

  // In a jam, only the stage holder may control playback.
  const canControl = jamConfig ? isDriver : true;
  const otherHasStage = !!jamConfig && !!driverId && driverId !== userId;

  // The polled liveProgressMs only updates every 3s, which makes the bar/timer
  // visibly jump. Use the 1Hz-extrapolated value for everything *displayed*;
  // useMeetHost still uses the polled value internally as the broadcast source.
  const smoothProgressMs = useSmoothProgressMs();

  const music = useMeetMusicControl({ visible, accessToken, userId, track, liveProgressMs: smoothProgressMs, canControl });
  const {
    slideAnim, musicSlideX, ctrlLoading, pickerOpen, setPickerOpen, apiToken, openMusicPicker, closeMusicPicker, pickerOpenRef,
    handlePrev, handleNext, handlePlayPause, fmtMs, progressPct,
  } = music;
  apiTokenRef.current = apiToken;

  const [lyricsOpen, setLyricsOpen] = useState(false);
  const title = jam ? (jam.otherName || "Jam") : (meetName ?? "My Meet");

  // ── Idle ↔ playing state cross-fade ──────────────────────────────────────────
  // playAnim: 0 = idle (animated live-session gradient), 1 = a track is playing
  // (album-art background + full controls). We smart-animate between the two so
  // starting/stopping music feels like a deliberate transition, not a hard cut.
  const hasTrack = !!displayTrack?.id;
  const playAnim = useRef(new Animated.Value(hasTrack ? 1 : 0)).current;
  const [showIdle, setShowIdle] = useState(!hasTrack);
  useEffect(() => {
    // Entering idle → mount the idle layer right away so it can fade in. Going
    // to playing → leave it mounted (it's already up) and unmount once the fade
    // finishes. (Previously this only ran for hasTrack, so playing→idle never
    // re-mounted the idle layer and its elements never appeared.)
    if (!hasTrack) setShowIdle(true);
    Animated.timing(playAnim, {
      toValue: hasTrack ? 1 : 0,
      duration: 520,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(({ finished }) => { if (finished && hasTrack) setShowIdle(false); });
  }, [hasTrack]);

  // Gentle breathing pulse on the idle icon so the empty state feels alive.
  const idlePulse = useRef(new Animated.Value(0)).current;
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
  const pulseScale = idlePulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  // Idle CTA only makes sense for whoever can actually start playback.
  const idleCanStart = canControl;

  // ── Hold-to-speak with drag-up-to-lock (walkie-talkie) ───────────────────────
  // Press-and-hold the idle mic to talk; drag up past the threshold to LOCK so
  // talk stays on hands-free; tap the locked mic to stop. A PanResponder (not
  // Pressable) so we can read the vertical drag during the hold.
  const LOCK_DRAG = 60; // px upward to arm the lock
  const [talkLocked, setTalkLocked] = useState(false);
  const [talkHolding, setTalkHolding] = useState(false);
  // True while pressing a locked mic — a tap or a swipe-up will unlock on release.
  const [talkUnlocking, setTalkUnlocking] = useState(false);
  // True while the finger is held above the threshold — releasing here commits
  // the lock (when holding) or the unlock (when unlocking). The commit happens
  // on release, not on crossing; this just drives the "Release to…" hint.
  const [atLockZone, setAtLockZone] = useState(false);
  const inLockZoneRef = useRef(false);
  // Latest setTalk in a ref — the PanResponder is created once, but setTalk's
  // identity changes each render, so we always call through the ref.
  const setTalkRef = useRef(setTalk);
  setTalkRef.current = setTalk;
  const talkLockedRef = useRef(false);
  talkLockedRef.current = talkLocked;
  const talkGestureRef = useRef<"idle" | "holding" | "unlock">("idle");
  // The mic physically follows the finger up during a hold; snaps home on
  // release. JS-driven (we setValue per move), so it lives on its own outer view
  // — the inner pulse/scale stays native-driver, no mixing on one view.
  const talkDragY = useRef(new Animated.Value(0)).current;
  const snapTalkHome = () =>
    Animated.spring(talkDragY, { toValue: 0, useNativeDriver: false, speed: 18, bounciness: 8 }).start();
  // If talk turns off by any path (locked → tap, meet end, etc.), drop the lock.
  useEffect(() => { if (!talkOn) setTalkLocked(false); }, [talkOn]);

  const talkPan = useRef(
    PanResponder.create({
      // Grab the press (so hold-to-talk fires immediately) but only *keep*
      // claiming the gesture while it's vertical — a horizontal drag is a page
      // swipe and must fall through to the pager. Allow the pager to steal at
      // any time via termination.
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_e, { dx, dy }) => Math.abs(dy) >= Math.abs(dx),
      onMoveShouldSetPanResponderCapture: () => false,
      onPanResponderTerminationRequest: () => true,
      onPanResponderGrant: () => {
        inLockZoneRef.current = false;
        setAtLockZone(false);
        talkDragY.setValue(0);
        if (talkLockedRef.current) {
          // Locked → begin an unlock gesture. A tap OR a swipe-up both unlock,
          // resolved on release; we follow the finger for feedback meanwhile.
          talkGestureRef.current = "unlock";
          setTalkUnlocking(true);
          return;
        }
        talkGestureRef.current = "holding";
        setTalkHolding(true);
        setTalkRef.current(true);
      },
      onPanResponderMove: (_, { dy }) => {
        const mode = talkGestureRef.current;
        if (mode !== "holding" && mode !== "unlock") return;
        // Follow the finger upward only, clamped a touch past the threshold.
        talkDragY.setValue(Math.max(-(LOCK_DRAG + 14), Math.min(0, dy)));
        // Above the threshold only *arms* the commit — release is what acts.
        const inZone = dy < -LOCK_DRAG;
        if (inZone !== inLockZoneRef.current) {
          inLockZoneRef.current = inZone;
          setAtLockZone(inZone);
        }
      },
      onPanResponderRelease: () => {
        const mode = talkGestureRef.current;
        if (mode === "holding") {
          if (inLockZoneRef.current) {
            // Released in the zone → lock talk on, hands-free.
            setTalkLocked(true);
            setTalkHolding(false);
          } else {
            // Released below it → normal push-to-talk end.
            setTalkRef.current(false);
            setTalkHolding(false);
          }
        } else if (mode === "unlock") {
          // Tap or swipe on a locked mic → unlock + stop talking.
          setTalkLocked(false);
          setTalkRef.current(false);
          setTalkUnlocking(false);
        }
        setAtLockZone(false);
        inLockZoneRef.current = false;
        if (mode === "holding" || mode === "unlock") snapTalkHome();
        talkGestureRef.current = "idle";
      },
      onPanResponderTerminate: () => {
        const mode = talkGestureRef.current;
        if (mode === "holding") {
          setTalkRef.current(false); // interrupted hold → stop talk
          setTalkHolding(false);
        } else if (mode === "unlock") {
          setTalkUnlocking(false);   // interrupted unlock → stay locked
        }
        setAtLockZone(false);
        inLockZoneRef.current = false;
        if (mode === "holding" || mode === "unlock") snapTalkHome();
        talkGestureRef.current = "idle";
      },
    }),
  ).current;

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
  // Shared scroll-lock: the instant a horizontal swipe is recognised anywhere,
  // we lock EVERY inner scroller (chat, lyrics, music list) so the page swipe
  // always wins — like a photo gallery — then release it when the gesture ends.
  const [scrollLock, setScrollLock] = useState(false);
  const scrollLockRef = useRef(false);
  const setLock = (v: boolean) => { scrollLockRef.current = v; setScrollLock(v); };
  const settle = (mode: "music" | "lyrics", cur: number, vx: number) => {
    // Reuse the open/close helpers so state flips on release only (pages are
    // pre-mounted → the drag never re-renders), and close still resets the
    // music panel's internal state like the old unmount did.
    if (mode === "music") {
      // musicSlideX: 0 = open, SW = closed. Left flick / past halfway → open.
      const open = vx < -0.35 ? true : vx > 0.35 ? false : cur < SW * 0.5;
      if (open) openMusicPicker(); else closeMusicPicker();
    } else {
      // lyricsSlideX: 0 = open, -SW = closed. Right flick / past halfway → open.
      const open = vx > 0.35 ? true : vx < -0.35 ? false : cur > -SW * 0.5;
      if (open) openLyrics(); else closeLyrics();
    }
  };
  const pagePan = useRef(
    PanResponder.create({
      // Never grab plain taps — children (chat input, buttons, the lyrics
      // scroll, etc.) need them.
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      // Claim as soon as the drag reads horizontal, from ANYWHERE on the screen —
      // over the mic, chat, buttons, lyrics, or the music list. Runs in the
      // capture phase so it preempts children, and the moment it recognises a
      // horizontal drag it locks every inner scroller (scrollLock) so the native
      // lists can't swallow the gesture. Horizontal must beat vertical (so a
      // clearly-vertical scroll still passes through to the list).
      onMoveShouldSetPanResponderCapture: (_, { dx, dy }) => {
        const horizontal = Math.abs(dx) > 4 && Math.abs(dx) > Math.abs(dy);
        if (horizontal && !scrollLockRef.current) setLock(true);
        return horizontal;
      },
      onMoveShouldSetPanResponder: (_, { dx, dy }) => {
        const horizontal = Math.abs(dx) > 4 && Math.abs(dx) > Math.abs(dy);
        if (horizontal && !scrollLockRef.current) setLock(true);
        return horizontal;
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
          // From playback: direction picks the page. Both pages are pre-mounted
          // off-screen, so this is a pure native-driver slide — no setState, no
          // mount hitch mid-gesture (that's what makes it feel instant).
          if (dx < 0) { mode = "music";  dragBaseRef.current = SW; }
          else        { mode = "lyrics"; dragBaseRef.current = -SW; }
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
        setLock(false);
        if (!mode) return;
        const d = dx - dragOffRef.current;
        const cur = mode === "music"
          ? clamp(dragBaseRef.current + d, 0, SW)
          : clamp(dragBaseRef.current + d, -SW, 0);
        settle(mode, cur, vx);
      },
      onPanResponderTerminate: () => { dragModeRef.current = null; setLock(false); },
    }),
  ).current;

  // When minimized the hooks above keep running (realtime, audio, sync) but we
  // don't render the Modal at all. A Modal with visible={false} still creates a
  // native overlay on some platforms and consumes touches, blocking the MiniBar.
  if (!visible || minimized) return null;

  return (
    <Modal visible animationType="none" transparent statusBarTranslucent onRequestClose={onMinimize ?? onClose}>
      <Animated.View style={[mlStyles.root, { transform: [{ translateY: slideAnim }] }]} {...pagePan.panHandlers}>

        {/* Idle: looping live-session gradient sits underneath everything. */}
        <LiveSessionBackdrop style={StyleSheet.absoluteFill} />
        {/* Playing: album art fades in over the gradient as a track starts. */}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: playAnim }]} pointerEvents="none">
          {displayTrack?.albumArt ? (
            <CachedImage source={{ uri: displayTrack.albumArt }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "#0c0007" }]} />
          )}
        </Animated.View>
        {/* Dark scrim — lighter when idle so the gradient reads, stronger when a
            track plays for text contrast over busy album art. */}
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: "#000", opacity: playAnim.interpolate({ inputRange: [0, 1], outputRange: [0.14, 0.42] }) }]}
          pointerEvents="none"
        />
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
              {/* Playing block — fades out (but holds its layout) when idle so
                  the section keeps its size during the cross-fade. */}
              <Animated.View style={{ width: "100%", alignItems: "center", opacity: playAnim }} pointerEvents={hasTrack ? "auto" : "none"}>
                <Text style={mlStyles.trackName} numberOfLines={1}>{displayTrack?.name ?? ""}</Text>
                <Text style={mlStyles.trackArtist} numberOfLines={1}>{displayTrack?.artist ?? ""}</Text>
                <View style={mlStyles.progressTrack}>
                  <View style={[mlStyles.progressFill, { width: `${progressPct * 100}%` as any }]} />
                </View>
                <View style={mlStyles.progressTimes}>
                  <Text style={mlStyles.progressTime}>{fmtMs(smoothProgressMs)}</Text>
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
              </Animated.View>

              {/* Idle block — overlays the faded playing block. With nothing
                  playing, the talk mic takes centre stage as a hold-to-speak
                  control; whoever can start playback also gets "Pick a song". */}
              {showIdle && (
                <Animated.View style={[mlStyles.idleWrap, { opacity: idleOpacity }]} pointerEvents={hasTrack ? "none" : "auto"}>
                  <View style={{ alignItems: "center" }}>
                    {(talkHolding || talkUnlocking) && (
                      <View style={mlStyles.lockHint} pointerEvents="none">
                        <Ionicons
                          name={
                            talkUnlocking
                              ? (atLockZone ? "lock-open-outline" : "lock-closed")
                              : (atLockZone ? "lock-closed" : "lock-open-outline")
                          }
                          size={15}
                          color={atLockZone ? "#D98CFF" : "rgba(255,255,255,0.8)"}
                        />
                        {!atLockZone && <Ionicons name="chevron-up" size={15} color="rgba(255,255,255,0.8)" />}
                      </View>
                    )}
                    <Animated.View style={{ transform: [{ translateY: talkDragY }] }}>
                      <Animated.View style={{ transform: [{ scale: talkHolding || talkLocked ? 1 : pulseScale }] }}>
                        <View style={[mlStyles.idleMic, talkOn && mlStyles.idleMicOn, atLockZone && mlStyles.idleMicArmed]} {...talkPan.panHandlers}>
                          <Ionicons name={talkLocked ? (talkUnlocking && atLockZone ? "lock-open-outline" : "lock-closed") : "mic"} size={36} color="#fff" />
                        </View>
                      </Animated.View>
                    </Animated.View>
                  </View>
                  <Text style={mlStyles.idleTitle}>
                    {talkLocked
                      ? (talkUnlocking ? (atLockZone ? "Release to unlock" : "Swipe up to unlock") : "Tap or swipe to stop")
                      : talkHolding
                        ? (atLockZone ? "Release to lock" : "Drag up to lock")
                        : "Hold to Speak"}
                  </Text>
                  {idleCanStart ? (
                    <>
                      <Text style={mlStyles.idleSub} numberOfLines={1}>
                        {pausedCache
                          ? `Paused — ${pausedCache.name}`
                          : (jam ? "No track yet — talk, or pick a song to jam" : "No track yet — talk to your listeners, or start a song")}
                      </Text>
                      {pausedCache ? (
                        <>
                          <TouchableOpacity style={mlStyles.idleBtn} activeOpacity={0.85} onPress={resumeHostSong}>
                            <Ionicons name="play" size={18} color="#0D0D0D" />
                            <Text style={mlStyles.idleBtnText}>Resume song</Text>
                          </TouchableOpacity>
                          <TouchableOpacity activeOpacity={0.7} onPress={openMusicPicker} style={{ marginTop: 12 }}>
                            <Text style={mlStyles.idleAltText}>Pick a different song</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <TouchableOpacity style={mlStyles.idleBtn} activeOpacity={0.85} onPress={openMusicPicker}>
                          <Ionicons name="musical-notes" size={17} color="#0D0D0D" />
                          <Text style={mlStyles.idleBtnText}>Pick a song</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  ) : (
                    <Text style={mlStyles.idleSub}>Waiting for {jam?.otherName || "the host"} to play something</Text>
                  )}
                </Animated.View>
              )}

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
              <MeetChatList messages={messages} scrollLocked={scrollLock} />
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
            {/* While idle the mic lives centre-stage (hold-to-speak); only show
                the bottom-bar mic once a track is playing. */}
            {!showIdle && (
              <TouchableOpacity
                style={[mlStyles.micBtn, talkOn && mlStyles.micBtnOn]}
                activeOpacity={0.8}
                onPress={handleToggleTalk}
              >
                <Ionicons name={talkOn ? "mic" : "mic-outline"} size={24} color="#fff" />
              </TouchableOpacity>
            )}
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

        {/* Lyrics page — pre-mounted off-screen LEFT (translateX -SW) so a swipe
            is a pure native-driver slide. Swiping back is handled by the root
            pager + shared scroll-lock. pointerEvents off while closed so it never
            intercepts playback touches. */}
        <Animated.View
          style={[mlStyles.lyricsPage, { transform: [{ translateX: lyricsSlideX }] }]}
          pointerEvents={lyricsOpen ? "auto" : "none"}
        >
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
              positionMs={smoothProgressMs}
              onClose={closeLyrics}
              scrollLocked={scrollLock}
            />
          </View>
        </Animated.View>

        {/* Music page — pre-mounted off-screen RIGHT (translateX SW). */}
        <MeetMusicPanel m={music} scrollLocked={scrollLock} active={pickerOpen} />

      </Animated.View>
    </Modal>
  );
}

