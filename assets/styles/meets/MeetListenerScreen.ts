import { StyleSheet, Platform, Dimensions } from "react-native";
import { SW, SH, NAVBAR_H, BOTTOM_INSET, COMPOSER_ABOVE_NAV, COLLAGE_W, COLLAGE_GAP } from "../../../lib/feed/dimensions";
import { STREAM_CARD_GAP, STREAM_CARD_W, WAVE_HEIGHTS, CARD_AVATAR_SIZE, CARD_AVATAR_OVERLAP, CARD_BANNER_H, MSG_HEADER_H, TOGGLE_W, TOGGLE_H, THUMB_SIZE, THUMB_TRAVEL, PROFILE_BANNER_H, PROFILE_AVATAR_SIZE, PROFILE_AVATAR_OVERLAP, SWATCH_SIZE } from "../../../constants/feedLayout";

// Component-scoped StyleSheets extracted from app/feed.tsx.

/** Used by components/meets/MeetListenerScreen.tsx. */
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
