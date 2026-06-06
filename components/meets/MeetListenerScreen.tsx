import React from "react";
import { MeetGuideOverlay } from "../../components/meets/MeetGuideOverlay";
import { useMeetListener } from "../../hooks/useMeetListener";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Modal, Pressable, TextInput, Platform, Keyboard, Image, KeyboardAvoidingView, ActivityIndicator } from "react-native";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ms, llStyles, mlStyles } from "../../lib/feed/localStyles";
import { AddToPlaylistSheet } from "../../components/AddToPlaylistSheet";
import { FloatingReactionLayer, ReactionButton } from "../../components/meets/FloatingReaction";
import { MeetChatList } from "../../components/meets/MeetChatList";
import { MeetSummaryScreen } from "../../components/meets/MeetSummaryScreen";

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
    slideAnim, accessToken, setAccessToken, meet, setMeet, trackState, setTrackState, host, setHost, listenerCount, setListenerCount, messages, setMessages, chatInput, setChatInput, livePos, setLivePos, savedId, setSavedId, pickerOpen, setPickerOpen, ended, setEnded, summary, setSummary, reactions, setReactions, reactChannelRef, spawnReaction, sendReaction, showGuide, setShowGuide, dontShowGuide, setDontShowGuide, launched, setLaunched, openedOnceRef, handleGotIt, syncTokenRef, syncStateRef, inSync, setInSync, isHostViewer, handleSendChat, handleSaveSong, handleLeave
  } = useMeetListener({ visible, onClose, meetId, userId, isPublic, minimized, onInfo, onExpand });

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
      <Animated.View style={[mlStyles.root, { transform: [{ translateY: slideAnim }] }]}>
        {trackState?.albumArt ? (
          <Image source={{ uri: trackState.albumArt }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "#0c0007" }]} />
        )}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.5)" }]} pointerEvents="none" />
        <LinearGradient colors={["transparent", "rgba(0,0,0,0.6)", "rgba(0,0,0,0.94)"]} locations={[0.30, 0.62, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />

        <Pressable style={StyleSheet.absoluteFill} onPress={() => Keyboard.dismiss()} />

        {trackState?.talkMode && (
          <View style={llStyles.talkBanner}>
            <Ionicons name="mic" size={16} color="#fff" />
            <Text style={llStyles.talkBannerText}>{hostName} is talking — music paused</Text>
          </View>
        )}

        <View style={mlStyles.trackSection}>
          <Text style={mlStyles.trackName} numberOfLines={1}>{trackState?.name ?? "Waiting for host…"}</Text>
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

        <View style={mlStyles.commentSection}>
          <MeetChatList messages={messages} />
        </View>

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
              <Image source={{ uri: host.avatar_url }} style={{ width: 44, height: 44, borderRadius: 22 }} />
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
