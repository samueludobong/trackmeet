import { StyleSheet, Platform, Dimensions } from "react-native";
import { SW, SH, NAVBAR_H, BOTTOM_INSET, COMPOSER_ABOVE_NAV, COLLAGE_W, COLLAGE_GAP } from "../../../lib/feed/dimensions";
import { STREAM_CARD_GAP, STREAM_CARD_W, WAVE_HEIGHTS, CARD_AVATAR_SIZE, CARD_AVATAR_OVERLAP, CARD_BANNER_H, MSG_HEADER_H, TOGGLE_W, TOGGLE_H, THUMB_SIZE, THUMB_TRAVEL, PROFILE_BANNER_H, PROFILE_AVATAR_SIZE, PROFILE_AVATAR_OVERLAP, SWATCH_SIZE } from "../../../constants/feedLayout";

// Component-scoped StyleSheets extracted from app/feed.tsx.

/** Used by components/profile/PinnedSongOverlay.tsx + PinnedSongPreview. */
export const psStyles = StyleSheet.create({
  sheet: { position: "absolute", bottom: 0, left: 0, right: 0, height: "88%", backgroundColor: "#111113", borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden", borderTopWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  navBtn: { width: 32, alignItems: "center" },
  homeContent: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 40 },
  sectionLabel: { fontSize: 11, fontWeight: "700" as const, color: "rgba(255,255,255,0.3)", letterSpacing: 1, marginBottom: 14 },
  nowPlayingCard: { flexDirection: "row" as const, alignItems: "center" as const, gap: 12, backgroundColor: "rgba(29,185,84,0.08)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(29,185,84,0.2)", padding: 14 },
  npArt: { width: 52, height: 52, borderRadius: 10, flexShrink: 0 },
  npArtFallback: { backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center" as const, justifyContent: "center" as const },
  npTrack: { fontSize: 14, fontWeight: "700" as const, color: "#fff" },
  npArtist: { fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2 },
  pinBtn: { flexDirection: "row" as const, alignItems: "center" as const, gap: 5, backgroundColor: "#1DB954", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  pinBtnText: { fontSize: 12, fontWeight: "700" as const, color: "#000" },
  addSongBtn: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 10, backgroundColor: "#FF6C1A", borderRadius: 14, paddingVertical: 14 },
  addSongText: { fontSize: 15, fontWeight: "700" as const, color: "#fff" },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.07)", marginVertical: 24 },
  menuRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 14, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  menuIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center" as const, justifyContent: "center" as const },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: "600" as const, color: "#fff" },
  plArt: { width: 48, height: 48, borderRadius: 8, flexShrink: 0 },
  likedArt: { backgroundColor: "rgba(29,185,84,0.1)", alignItems: "center" as const, justifyContent: "center" as const },
  plArtFallback: { backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center" as const, justifyContent: "center" as const },
  // Preview step
  previewWrap: { flex: 1, alignItems: "center" as const, paddingHorizontal: 28, paddingTop: 20, paddingBottom: 28 },
  previewArt: { width: 190, height: 190, borderRadius: 18, marginBottom: 22 },
  previewArtFallback: { backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center" as const, justifyContent: "center" as const },
  previewTrack: { fontSize: 20, fontWeight: "800" as const, color: "#fff", textAlign: "center" as const, marginBottom: 6 },
  previewArtist: { fontSize: 14, color: "rgba(255,255,255,0.45)", textAlign: "center" as const, marginBottom: 24 },
  previewProgressTrack: { width: "100%", height: 4, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 2, marginBottom: 8 },
  previewProgressFill: { height: 4, backgroundColor: "#1DB954", borderRadius: 2 },
  previewTimes: { width: "100%", flexDirection: "row" as const, justifyContent: "space-between" as const, marginBottom: 20 },
  previewTime: { fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: "600" as const },
  noPreviewText: { fontSize: 13, color: "rgba(255,255,255,0.3)", marginVertical: 24, fontStyle: "italic" as const },
  playPauseBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#1DB954", alignItems: "center" as const, justifyContent: "center" as const, marginBottom: 28 },
  previewActions: { flexDirection: "row" as const, gap: 12, width: "100%", marginBottom: 14 },
  openBtn: { flex: 1, flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 7, height: 46, borderRadius: 14, backgroundColor: "rgba(29,185,84,0.12)", borderWidth: 1, borderColor: "rgba(29,185,84,0.3)" },
  openBtnText: { fontSize: 14, fontWeight: "700" as const, color: "#1DB954" },
  saveBtn: { flex: 1, flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 7, height: 46, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" },
  saveBtnSaved: { backgroundColor: "rgba(29,185,84,0.1)", borderColor: "rgba(29,185,84,0.28)" },
  saveBtnText: { fontSize: 14, fontWeight: "600" as const, color: "rgba(255,255,255,0.7)" },
  saveBtnTextSaved: { color: "#1DB954" },
  pinCTA: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 8, width: "100%", height: 52, borderRadius: 16, backgroundColor: "#FF6C1A" },
  pinCTAText: { fontSize: 16, fontWeight: "800" as const, color: "#000" },
});
