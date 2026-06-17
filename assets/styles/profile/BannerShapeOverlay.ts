import { StyleSheet, Platform, Dimensions } from "react-native";
import { SW, SH, NAVBAR_H, BOTTOM_INSET, COMPOSER_ABOVE_NAV, COLLAGE_W, COLLAGE_GAP } from "../../../lib/feed/dimensions";
import { STREAM_CARD_GAP, STREAM_CARD_W, WAVE_HEIGHTS, CARD_AVATAR_SIZE, CARD_AVATAR_OVERLAP, CARD_BANNER_H, MSG_HEADER_H, TOGGLE_W, TOGGLE_H, THUMB_SIZE, THUMB_TRAVEL, PROFILE_BANNER_H, PROFILE_AVATAR_SIZE, PROFILE_AVATAR_OVERLAP, SWATCH_SIZE } from "../../../constants/feedLayout";

// Component-scoped StyleSheets extracted from app/feed.tsx.

/** Used by components/profile/BannerColorOverlay.tsx (banner shape picker section). */
export const bsOverlayStyles = StyleSheet.create({
  sheet: { position: "absolute", bottom: 0, left: 0, right: 0, height: "78%", backgroundColor: "#1A1A1C", borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden", borderTopWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  sectionLabel: { fontSize: 11, fontWeight: "700" as const, color: "rgba(255,255,255,0.35)", letterSpacing: 1, marginBottom: 14 },
  shapeCell: { height: SWATCH_SIZE + 26, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.07)", alignItems: "center" as const, justifyContent: "center" as const },
  shapeCellSelected: { backgroundColor: "rgba(255,108,26,0.18)", borderWidth: 1.5, borderColor: "#FF6C1A" },
  shapeIconWrap: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const },
  shapeLabel: { fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: "600" as const, paddingBottom: 7 },
  shapeLabelSelected: { color: "#FF6C1A" },
  disabledHint: { fontSize: 12, color: "rgba(255,255,255,0.35)", textAlign: "center" as const, marginBottom: 14, fontStyle: "italic" as const },
});
