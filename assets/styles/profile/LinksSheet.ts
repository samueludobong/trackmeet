import { StyleSheet, Platform, Dimensions } from "react-native";
import { SW, SH, NAVBAR_H, BOTTOM_INSET, COMPOSER_ABOVE_NAV, COLLAGE_W, COLLAGE_GAP } from "../../../lib/feed/dimensions";
import { STREAM_CARD_GAP, STREAM_CARD_W, WAVE_HEIGHTS, CARD_AVATAR_SIZE, CARD_AVATAR_OVERLAP, CARD_BANNER_H, MSG_HEADER_H, TOGGLE_W, TOGGLE_H, THUMB_SIZE, THUMB_TRAVEL, PROFILE_BANNER_H, PROFILE_AVATAR_SIZE, PROFILE_AVATAR_OVERLAP, SWATCH_SIZE } from "../../../constants/feedLayout";

// Component-scoped StyleSheets extracted from app/feed.tsx.

/** Used by components/profile/SocialLinksSheet.tsx + LinksSheet.tsx. */
export const linksSheetStyles = StyleSheet.create({
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#1A1A1C",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: BOTTOM_INSET + 16,
    borderTopWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  handle:  { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", alignSelf: "center", marginTop: 10, marginBottom: 4 },
  heading: { fontSize: 11, fontWeight: "700", letterSpacing: 1, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10 },
  row:     { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 13, gap: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(255,255,255,0.07)" },
  iconWrap:    { width: 44, height: 44, borderRadius: 10, backgroundColor: "rgba(255,108,26,0.13)", alignItems: "center", justifyContent: "center" },
  spotifyWrap: { width: 44, height: 44, borderRadius: 10, backgroundColor: "rgba(29,185,84,0.12)", alignItems: "center", justifyContent: "center" },
  art:         { width: 44, height: 44, borderRadius: 8 },
  artCircle:   { width: 44, height: 44, borderRadius: 22 },
  domain: { fontSize: 14, fontWeight: "600", color: "#fff" },
  path:   { fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 1 },
});
