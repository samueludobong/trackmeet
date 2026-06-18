import { StyleSheet, Platform, Dimensions } from "react-native";
import { SW, SH, NAVBAR_H, BOTTOM_INSET, COMPOSER_ABOVE_NAV, COLLAGE_W, COLLAGE_GAP } from "../../../lib/feed/dimensions";
import { STREAM_CARD_GAP, STREAM_CARD_W, WAVE_HEIGHTS, CARD_AVATAR_SIZE, CARD_AVATAR_OVERLAP, CARD_BANNER_H, MSG_HEADER_H, TOGGLE_W, TOGGLE_H, THUMB_SIZE, THUMB_TRAVEL, PROFILE_BANNER_H, PROFILE_AVATAR_SIZE, PROFILE_AVATAR_OVERLAP, SWATCH_SIZE } from "../../../constants/feedLayout";

// Component-scoped StyleSheets extracted from app/feed.tsx.

/** Used by components/meets/MeetLiveScreen.tsx (the host/jam fullscreen meet room). */
export const mlStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },

  // â”€â”€ Top bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  topBar: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 52,
    paddingBottom: 10,
  },
  topLeft:  { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 0 },
  topRight: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 0 },

  // Gradient-ring avatar (like in image)
  avatarRing: {
    width: 44, height: 44, borderRadius: 22,
    padding: 2.5,
    alignItems: "center", justifyContent: "center",
  },
  avatarInner: {
    flex: 1, width: "100%", borderRadius: 18,
    backgroundColor: "#1c0030",
    alignItems: "center", justifyContent: "center",
  },
  avatarInitial: { fontSize: 15, fontWeight: "800", color: "#fff" },
  hostName:      { fontSize: 16, fontWeight: "700", color: "#fff" },
  listenerRow:   { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  liveDotSm:     { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FF3B30" },
  listenerText:  { fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: "600" },

  // Dark circular buttons â€” exactly as in image
  topCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(45,45,45,0.82)",
    alignItems: "center", justifyContent: "center",
  },
  endBtn: {
    paddingHorizontal: 16, height: 38, borderRadius: 19,
    backgroundColor: "#E8000F",
    alignItems: "center", justifyContent: "center",
  },
  endBtnText: { fontSize: 13, fontWeight: "800", color: "#fff" },
  micBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: "rgba(45,45,45,0.82)",
    alignItems: "center", justifyContent: "center",
  },
  micBtnOn: { backgroundColor: "#AB00FF" },

  // â”€â”€ Comments + hearts row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  commentSection: {
    position: "absolute",
    left: 0, right: 0,
    bottom: BOTTOM_INSET + 76,   // sits above bottom bar
    flexDirection: "row",
    alignItems: "flex-end",
    paddingLeft: 14,
    paddingRight: 10,
  },
  commentCol: { flex: 1, gap: 9 },

  msgRow: { flexDirection: "row", alignItems: "center", gap: 8 },

  msgAvatar: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  msgAvatarLetter: { fontSize: 13, fontWeight: "800", color: "#fff" },

  msgBubble: {
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexShrink: 1,
  },
  msgName: { fontSize: 12, fontWeight: "700", color: "#fff",                   marginBottom: 2 },
  msgText: { fontSize: 13, fontWeight: "400", color: "rgba(255,255,255,0.88)" },

  // Hearts aligned to bottom-right of the comment stack
  heartsCol: {
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 4,
    paddingLeft: 4,
    gap: 8,
  },
  heartLg: { fontSize: 26 },
  heartSm: { fontSize: 18, opacity: 0.70 },

  // â”€â”€ Bottom bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  bottomBarWrap: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: BOTTOM_INSET + 16,
    gap: 14,
  },
  // White pill â€” exactly as in image
  inputPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(45,45,45,0.70)",
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 10,
  },
  inputPlaceholder: { fontSize: 15, color: "rgba(255,255,255,0.32)" },
  inputField: { flex: 1, fontSize: 15, color: "#fff", padding: 0 },
  // Icons are standalone â€” no container â€” matching the image

  // â”€â”€ Swipe hint (right edge of page 1) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  swipeHint: {
    position: "absolute",
    right: 12,
    top: SH * 0.52,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    opacity: 0.5,
  },
  swipeHintText: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgb(255,255,255)",
    letterSpacing: 0.5,
  },

  // â”€â”€ Page 2 â€” Music picker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  musicPage: {
    width: SW,
    height: SH,
    backgroundColor: "#0e0e11",
    flexDirection: "column",   // explicit â€” children stack vertically
  },
  // Lyrics page â€” absolute (overlays playback) so it can slide in from the left.
  lyricsPage: {
    position: "absolute",
    top: 0, left: 0,
    width: SW,
    height: SH,
    flexDirection: "column",
  },
  musicHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  musicBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  musicTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
  },
  musicSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  musicSearchInput: {
    flex: 1,
    fontSize: 15,
    color: "#fff",
    paddingVertical: 0,
  },
  musicListContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: BOTTOM_INSET + 24,
    // Fill the viewport even when the list is short, so the empty bottom is part
    // of the content (which the back-swipe handles) rather than bare, gesture-
    // swallowing scroll-view background.
    flexGrow: 1,
  },
  musicRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  musicRowArt: {
    width: 50,
    height: 50,
    borderRadius: 8,
    flexShrink: 0,
  },
  musicRowName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 3,
  },
  musicRowSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
  },
  musicEmpty: {
    textAlign: "center",
    marginTop: 48,
    fontSize: 14,
    color: "rgba(255,255,255,0.3)",
  },

  // â”€â”€ Search tabs (Songs / Artists / Albums) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  musicTabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    marginBottom: 4,
  },
  musicTab: { flex: 1, alignItems: "center", paddingVertical: 11 },
  musicTabText: { fontSize: 13.5, fontWeight: "700", color: "rgba(255,255,255,0.45)" },
  musicTabTextActive: { color: "#fff" },
  musicTabUnderline: { position: "absolute", bottom: -1, left: "22%", right: "22%", height: 2, borderRadius: 2, backgroundColor: "#AB00FF" },

  // â”€â”€ Artist / album rows + album dropdown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  albumRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9 },
  albumArt: { width: 48, height: 48, borderRadius: 6, flexShrink: 0 },
  albumArtFallback: { backgroundColor: "rgba(255,255,255,0.07)", alignItems: "center", justifyContent: "center" },
  albumName: { fontSize: 14, fontWeight: "700", color: "#fff" },
  albumMeta: { fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2, textTransform: "capitalize" },
  albumDropdown: { paddingLeft: 8, paddingBottom: 8, gap: 2 },
  playAllBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "#CAFF00", borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 7, marginVertical: 6,
  },
  playAllText: { fontSize: 13, fontWeight: "800", color: "#0D0D0D" },
  albumTrackRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9, paddingRight: 4 },
  albumTrackNum: { width: 18, textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.4)" },
  albumTrackName: { flex: 1, fontSize: 13.5, color: "rgba(255,255,255,0.85)" },

  // â”€â”€ Track info + playback controls â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  trackSection: {
    position: "absolute",
    left: 0,
    right: 0,
    // Sits between top bar and comments; centres in the usable space
    top: SH * 0.30,
    alignItems: "center",
    paddingHorizontal: 32,
  },
  trackName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
    marginBottom: 4,
  },
  trackArtist: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255,255,255,0.72)",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    marginBottom: 20,
  },
  // Thin progress bar (full width of section)
  progressTrack: {
    width: "100%",
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.22)",
    overflow: "hidden",
    marginBottom: 6,
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: "#fff",
  },
  progressTimes: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  progressTime: {
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
  },
  // Prev / Play-Pause / Next row
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 36,
  },
  // Circular play/pause button
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },

  // â”€â”€ Idle state (nothing playing yet) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Overlays the (faded-out) playing block during the idle→playing cross-fade.
  idleWrap: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    alignItems: "center",
  },
  idlePulse: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 22,
  },
  // Hold-to-speak mic that takes centre stage when nothing is playing.
  idleMic: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.42)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 16,
  },
  idleMicOn: {
    backgroundColor: "#AB00FF",
    borderColor: "#D98CFF",
  },
  // Held above the lock threshold — releasing now locks. Brighter ring cue.
  idleMicArmed: {
    borderColor: "#fff",
    borderWidth: 2.5,
  },
  // "Drag up to lock" affordance floating just above the mic while holding.
  lockHint: {
    position: "absolute",
    top: -34,
    alignItems: "center",
    gap: 1,
  },
  lockHintText: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 0.3,
  },
  idleTitle: {
    fontSize: 21, fontWeight: "800", color: "#fff",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
    marginBottom: 6,
  },
  idleSub: {
    fontSize: 13.5, fontWeight: "500",
    color: "rgba(255,255,255,0.78)",
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 12,
    marginBottom: 22,
  },
  idleBtn: {
    flexDirection: "row", alignItems: "center", gap: 7,
    backgroundColor: "#fff", borderRadius: 22,
    paddingHorizontal: 22, paddingVertical: 12,
  },
  idleBtnText: { fontSize: 15, fontWeight: "800", color: "#0D0D0D" },
  idleAltText: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.75)", textDecorationLine: "underline" },

  // â”€â”€ Jam "stage" toggle (who controls playback) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  stageWrap: { alignItems: "center", marginTop: 16, gap: 6 },
  stageBtn: {
    flexDirection: "row", alignItems: "center", gap: 7,
    backgroundColor: "#CAFF00", borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 9,
  },
  stageBtnHeld: { backgroundColor: "#AB00FF" },
  stageBtnLocked: { backgroundColor: "rgba(255,255,255,0.1)" },
  stageBtnText: { fontSize: 14, fontWeight: "800", color: "#0D0D0D" },
  stageBtnTextHeld: { color: "#fff" },
  stageBtnTextLocked: { color: "rgba(255,255,255,0.45)" },
  stageError: { fontSize: 12, color: "rgba(255,255,255,0.55)", fontWeight: "600", textAlign: "center" },
});
