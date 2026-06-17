import { StyleSheet, Platform, Dimensions } from "react-native";
import { SW, SH, NAVBAR_H, BOTTOM_INSET, COMPOSER_ABOVE_NAV, COLLAGE_W, COLLAGE_GAP } from "../../../lib/feed/dimensions";
import { STREAM_CARD_GAP, STREAM_CARD_W, WAVE_HEIGHTS, CARD_AVATAR_SIZE, CARD_AVATAR_OVERLAP, CARD_BANNER_H, MSG_HEADER_H, TOGGLE_W, TOGGLE_H, THUMB_SIZE, THUMB_TRAVEL, PROFILE_BANNER_H, PROFILE_AVATAR_SIZE, PROFILE_AVATAR_OVERLAP, SWATCH_SIZE } from "../../../constants/feedLayout";

// Component-scoped StyleSheets extracted from app/feed.tsx.

/** Used by components/meets/LiveMeetCard.tsx. */
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
