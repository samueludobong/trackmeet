import { StyleSheet, Platform, Dimensions } from "react-native";
import { SW, SH, NAVBAR_H, BOTTOM_INSET, COMPOSER_ABOVE_NAV, COLLAGE_W, COLLAGE_GAP } from "../../../lib/feed/dimensions";
import { STREAM_CARD_GAP, STREAM_CARD_W, WAVE_HEIGHTS, CARD_AVATAR_SIZE, CARD_AVATAR_OVERLAP, CARD_BANNER_H, MSG_HEADER_H, TOGGLE_W, TOGGLE_H, THUMB_SIZE, THUMB_TRAVEL, PROFILE_BANNER_H, PROFILE_AVATAR_SIZE, PROFILE_AVATAR_OVERLAP, SWATCH_SIZE } from "../../../constants/feedLayout";

// Component-scoped StyleSheets extracted from app/feed.tsx.

/** Used by components/meets/MeetSummaryScreen.tsx. */
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
