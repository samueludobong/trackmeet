import { StyleSheet, Platform, Dimensions } from "react-native";
import { SW, SH, NAVBAR_H, BOTTOM_INSET, COMPOSER_ABOVE_NAV, COLLAGE_W, COLLAGE_GAP } from "../dimensions";
import { STREAM_CARD_GAP, STREAM_CARD_W, WAVE_HEIGHTS, CARD_AVATAR_SIZE, CARD_AVATAR_OVERLAP, CARD_BANNER_H, MSG_HEADER_H, TOGGLE_W, TOGGLE_H, THUMB_SIZE, THUMB_TRAVEL, PROFILE_BANNER_H, PROFILE_AVATAR_SIZE, PROFILE_AVATAR_OVERLAP, SWATCH_SIZE } from "../../../constants/feedLayout";

// Component-scoped StyleSheets extracted from app/feed.tsx.


export const lmStyles = StyleSheet.create({
  card: { borderRadius: 16, overflow: "hidden", backgroundColor: "#111", marginBottom: STREAM_CARD_GAP, minHeight: 196, justifyContent: "space-between" },
  cardTop: { flexDirection: "row", justifyContent: "space-between", padding: 8 },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#E8000F", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#fff" },
  liveBadgeText: { fontSize: 10, color: "#fff", fontWeight: "800" },
  viewerBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  viewerText: { fontSize: 10, color: "#fff", fontWeight: "700" },
  cardBottom: { padding: 10, gap: 3 },
  cardTitle: { fontSize: 14, color: "#fff", fontWeight: "800", lineHeight: 18 },
  cardTrack: { fontSize: 11, color: "rgba(255,255,255,0.7)" },
  cardHost: { fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 6 },
  joinBtn: { backgroundColor: "#AB00FF", borderRadius: 18, paddingVertical: 8, alignItems: "center" },
  joinBtnText: { fontSize: 13, fontWeight: "800", color: "#fff" },
});


export const reactStyles = StyleSheet.create({
  floatLayer: {
    position: "absolute",
    right: 18,
    bottom: 84,
    width: 60,
    height: 320,
  },
  heartBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(233,30,140,0.14)",
    borderWidth: 1, borderColor: "rgba(233,30,140,0.4)",
    alignItems: "center", justifyContent: "center",
  },
  heartEmoji: { fontSize: 22 },
  menuBackdrop: {
    position: "absolute",
    top: -1000, left: -1000, right: -1000, bottom: -1000,
  },
  menu: {
    position: "absolute",
    bottom: 52,
    right: 0,
    backgroundColor: "rgba(20,20,24,0.96)",
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "center",
    gap: 2,
  },
  menuItem: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
  },
  menuEmoji: { fontSize: 24 },
});


export const gdStyles = StyleSheet.create({
  scrim: { backgroundColor: "rgba(0,0,0,0.78)", alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  card: { width: "100%", maxWidth: 360, backgroundColor: "#171018", borderRadius: 24, padding: 24, alignItems: "center" },
  iconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(29,185,84,0.16)", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  title: { fontSize: 20, fontWeight: "800", color: "#fff", marginBottom: 8, textAlign: "center" },
  body: { fontSize: 14, lineHeight: 20, color: "rgba(255,255,255,0.7)", textAlign: "center", marginBottom: 20 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 10, alignSelf: "stretch", marginBottom: 20 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "rgba(255,255,255,0.35)", alignItems: "center", justifyContent: "center" },
  checkboxOn: { backgroundColor: "#1DB954", borderColor: "#1DB954" },
  toggleText: { fontSize: 14, color: "rgba(255,255,255,0.85)", fontWeight: "600" },
  gotItBtn: { alignSelf: "stretch", backgroundColor: "#1DB954", borderRadius: 26, paddingVertical: 15, alignItems: "center" },
  gotItText: { fontSize: 16, fontWeight: "800", color: "#fff" },
});


export const jpStyles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.78)", alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  card: { width: "100%", maxWidth: 360, backgroundColor: "#171018", borderRadius: 24, padding: 24, alignItems: "center" },
  iconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(171,0,255,0.16)", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  title: { fontSize: 20, fontWeight: "800", color: "#fff", marginBottom: 8, textAlign: "center" },
  body: { fontSize: 14, lineHeight: 20, color: "rgba(255,255,255,0.7)", textAlign: "center", marginBottom: 20 },
  publicBtn: { alignSelf: "stretch", flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#AB00FF", borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 12 },
  publicBtnText: { fontSize: 16, fontWeight: "800", color: "#fff" },
  privateBtn: { alignSelf: "stretch", flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 8 },
  privateBtnText: { fontSize: 16, fontWeight: "800", color: "#fff" },
  btnSub: { fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 2 },
  cancelBtn: { paddingVertical: 12, alignItems: "center", alignSelf: "stretch" },
  cancelText: { fontSize: 15, fontWeight: "700", color: "rgba(255,255,255,0.55)" },
});


export const mbStyles = StyleSheet.create({
  bar: {
    position: "absolute", left: 12, right: 12,
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "rgba(20,10,24,0.97)", borderRadius: 16, padding: 10,
    borderWidth: 1, borderColor: "rgba(171,0,255,0.45)",
    shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  art: { width: 42, height: 42, borderRadius: 9, backgroundColor: "#222" },
  artFallback: { backgroundColor: "rgba(171,0,255,0.35)", alignItems: "center", justifyContent: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#FF3B5C" },
  title: { fontSize: 14, fontWeight: "800", color: "#fff", flexShrink: 1 },
  subtitle: { fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2 },
  expandBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
});


export const llStyles = StyleSheet.create({
  talkBanner: {
    position: "absolute", top: 104, left: 16, right: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "rgba(171,0,255,0.85)", borderRadius: 14, paddingVertical: 10,
  },
  talkBannerText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  saveSongBtn: {
    justifyContent: "center", gap: 12, flexDirection: "row", alignItems: "center", 
    backgroundColor: "rgba(29,185,84,0.92)", borderRadius: 24, paddingVertical: 13, paddingHorizontal: 24, marginTop: 20,
  },
  saveSongBtnDone: { backgroundColor: "rgba(29,185,84,0.4)" },
  saveSongText: { fontSize: 14, fontWeight: "800", color: "#fff" },
  syncRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 8, paddingBottom: 20 },
  syncDotOk: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#1DB954" },
  syncTextOk: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.6)" },
  syncTextBusy: { fontSize: 12, fontWeight: "600", color: "#FFB020" },
  endedOverlay: { backgroundColor: "rgba(0,0,0,0.88)", alignItems: "center", justifyContent: "center", gap: 14 },
  endedTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
  endedBtn: { backgroundColor: "#AB00FF", borderRadius: 24, paddingHorizontal: 32, paddingVertical: 13, marginTop: 8 },
  endedBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});


export const mcStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  avatar: { width: 30, height: 30, borderRadius: 15, flexShrink: 0, backgroundColor: "#222" },
  avatarFallback: { backgroundColor: "rgba(171,0,255,0.4)", alignItems: "center", justifyContent: "center" },
  avatarLetter: { fontSize: 12, fontWeight: "800", color: "#fff" },
  bubble: { backgroundColor: "rgba(243, 243, 243, 0.1)", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 7, flexShrink: 1 },
  name: { fontSize: 13, fontWeight: "700", color: "rgba(255, 255, 255, 0.73)", marginBottom: 1 },
  text: { fontSize: 13, color: "#fff" },
});


export const sumStyles = StyleSheet.create({
  root: { backgroundColor: "#0D0D0D" },
  header: { alignItems: "center", paddingTop: 24, paddingBottom: 8, gap: 6 },
  title: { fontSize: 26, fontWeight: "900", color: "#fff" },
  sub: { fontSize: 14, color: "rgba(255,255,255,0.5)" },
  empty: { fontSize: 14, color: "rgba(255,255,255,0.4)", textAlign: "center", marginTop: 40 },
  trackRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 10 },
  art: { width: 44, height: 44, borderRadius: 8 },
  trackName: { fontSize: 14, fontWeight: "700", color: "#fff" },
  trackArtist: { fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 },
  rowSaveBtn: { width: 32, alignItems: "center", justifyContent: "center" },
  footer: { padding: 16, gap: 10 },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#1DB954", borderRadius: 26, paddingVertical: 15 },
  saveBtnDone: { backgroundColor: "rgba(29,185,84,0.45)" },
  saveBtnText: { fontSize: 15, fontWeight: "800", color: "#fff" },
  doneBtn: { alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 26, paddingVertical: 15 },
  doneBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});


export const mmStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.70)",
  },
  sheet: {
    // Fixed height anchored to the bottom. Keyboard slides over the bottom portion;
    // the inner ScrollView lets the user reach everything by scrolling.
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    height: SH * 0.85,
    backgroundColor: "#111113",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignSelf: "center",
    marginTop: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#fff" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.55)",
    marginTop: 18,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  labelMuted: { fontWeight: "400", textTransform: "none", letterSpacing: 0 },

  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#fff",
  },
  inputMultiline: {
    minHeight: 88,
    textAlignVertical: "top",
  },

  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  toggleLabel: { fontSize: 15, color: "#fff", fontWeight: "500" },

  tagInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tagInput: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: "#fff",
  },
  tagAddBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: "rgba(171,0,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(171,0,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  tagChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(171,0,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(171,0,255,0.32)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagChipText: { fontSize: 13, color: "#AB00FF", fontWeight: "600" },

  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 28,
    paddingVertical: 15,
    borderRadius: 24,
    backgroundColor: "#AB00FF",
  },
  startBtnDisabled: { opacity: 0.40 },
  startBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
});


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


export const csStyles = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(0,0,0,0.65)" },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0, height: "90%",
    backgroundColor: "#111113",
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    overflow: "hidden",
    borderTopWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)",
  },
  title: { fontSize: 16, fontWeight: "700", color: "#fff" },
  cancelBtn: { fontSize: 15, color: "rgba(255,255,255,0.5)" },
  postBtn: {
    backgroundColor: "#AB00FF", borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 7,
    minWidth: 56, alignItems: "center",
  },
  postBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },

  composeRow: { flexDirection: "row", alignItems: "flex-start", padding: 18, gap: 12 },
  avatar: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: "#AB00FF",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
    overflow: "hidden",
  },
  avatarInitials: { fontSize: 16, fontWeight: "800", color: "#fff" },
  textInput: {
    flex: 1, fontSize: 16, color: "#fff",
    lineHeight: 24, minHeight: 80,
    textAlignVertical: "top",
  },

  imageStrip: { paddingHorizontal: 18, paddingBottom: 16, gap: 10, flexDirection: "row", alignItems: "center" },
  thumbImage: { width: 88, height: 88, borderRadius: 12 },
  thumbRemove: {
    position: "absolute", top: 4, right: 4,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center", justifyContent: "center",
  },
  thumbRemoveText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  thumbAdd: {
    width: 88, height: 88, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    borderStyle: "dashed",
    alignItems: "center", justifyContent: "center",
  },

  pollSection: { paddingHorizontal: 18, paddingBottom: 12, gap: 10 },
  pollQuestion: {
    backgroundColor: "#1A1A1C", borderRadius: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    color: "#fff", fontSize: 16, fontWeight: "600",
    paddingHorizontal: 16, paddingVertical: 13,
  },
  pollOptionRow: { flexDirection: "row", alignItems: "center" },
  pollOptionInput: {
    flex: 1, backgroundColor: "#1A1A1C", borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    color: "#fff", fontSize: 14,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  addOptionBtn: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 10, paddingHorizontal: 4,
  },
  addOptionText: { fontSize: 14, color: "#AB00FF", fontWeight: "600" },

  toolbar: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.07)",
    gap: 4,
  },
  toolBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
  },
  toolBtnActive: { backgroundColor: "rgba(171,0,255,0.12)" },
  audienceChip: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  audienceText: { fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: "600" },

  // â”€â”€â”€ Media source picker panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  mediaPicker: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.12)",
    paddingVertical: 16, paddingHorizontal: 16,
  },
  mediaPickerBtn: { flex: 1, alignItems: "center", gap: 7 },
  mediaPickerLabel: { color: "#fff", fontSize: 12, fontWeight: "600", opacity: 0.85 },
  mediaPickerDivider: {
    width: StyleSheet.hairlineWidth, height: 38,
    backgroundColor: "rgba(255,255,255,0.15)", marginHorizontal: 6,
  },
  mediaPickerClose: { paddingLeft: 14, paddingRight: 2, alignSelf: "center" },
});
