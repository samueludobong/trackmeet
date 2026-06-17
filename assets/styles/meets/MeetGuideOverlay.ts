import { StyleSheet, Platform, Dimensions } from "react-native";
import { SW, SH, NAVBAR_H, BOTTOM_INSET, COMPOSER_ABOVE_NAV, COLLAGE_W, COLLAGE_GAP } from "../../../lib/feed/dimensions";
import { STREAM_CARD_GAP, STREAM_CARD_W, WAVE_HEIGHTS, CARD_AVATAR_SIZE, CARD_AVATAR_OVERLAP, CARD_BANNER_H, MSG_HEADER_H, TOGGLE_W, TOGGLE_H, THUMB_SIZE, THUMB_TRAVEL, PROFILE_BANNER_H, PROFILE_AVATAR_SIZE, PROFILE_AVATAR_OVERLAP, SWATCH_SIZE } from "../../../constants/feedLayout";

// Component-scoped StyleSheets extracted from app/feed.tsx.

/** Used by components/meets/MeetGuideOverlay.tsx. */
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
