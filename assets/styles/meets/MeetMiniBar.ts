import { StyleSheet, Platform, Dimensions } from "react-native";
import { SW, SH, NAVBAR_H, BOTTOM_INSET, COMPOSER_ABOVE_NAV, COLLAGE_W, COLLAGE_GAP } from "../../../lib/feed/dimensions";
import { STREAM_CARD_GAP, STREAM_CARD_W, WAVE_HEIGHTS, CARD_AVATAR_SIZE, CARD_AVATAR_OVERLAP, CARD_BANNER_H, MSG_HEADER_H, TOGGLE_W, TOGGLE_H, THUMB_SIZE, THUMB_TRAVEL, PROFILE_BANNER_H, PROFILE_AVATAR_SIZE, PROFILE_AVATAR_OVERLAP, SWATCH_SIZE } from "../../../constants/feedLayout";

// Component-scoped StyleSheets extracted from app/feed.tsx.

/** Used by components/meets/MeetMiniBar.tsx. */
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
