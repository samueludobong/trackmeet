import { StyleSheet, Platform, Dimensions } from "react-native";
import { SW, SH, NAVBAR_H, BOTTOM_INSET, COMPOSER_ABOVE_NAV, COLLAGE_W, COLLAGE_GAP } from "../../../lib/feed/dimensions";
import { STREAM_CARD_GAP, STREAM_CARD_W, WAVE_HEIGHTS, CARD_AVATAR_SIZE, CARD_AVATAR_OVERLAP, CARD_BANNER_H, MSG_HEADER_H, TOGGLE_W, TOGGLE_H, THUMB_SIZE, THUMB_TRAVEL, PROFILE_BANNER_H, PROFILE_AVATAR_SIZE, PROFILE_AVATAR_OVERLAP, SWATCH_SIZE } from "../../../constants/feedLayout";

// Component-scoped StyleSheets extracted from app/feed.tsx.

/** Used by components/meets/FloatingReaction.tsx. */
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
