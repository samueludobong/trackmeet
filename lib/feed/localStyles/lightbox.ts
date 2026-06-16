import { StyleSheet, Platform, Dimensions } from "react-native";
import { SW, SH, NAVBAR_H, BOTTOM_INSET, COMPOSER_ABOVE_NAV, COLLAGE_W, COLLAGE_GAP } from "../dimensions";
import { STREAM_CARD_GAP, STREAM_CARD_W, WAVE_HEIGHTS, CARD_AVATAR_SIZE, CARD_AVATAR_OVERLAP, CARD_BANNER_H, MSG_HEADER_H, TOGGLE_W, TOGGLE_H, THUMB_SIZE, THUMB_TRAVEL, PROFILE_BANNER_H, PROFILE_AVATAR_SIZE, PROFILE_AVATAR_OVERLAP, SWATCH_SIZE } from "../../../constants/feedLayout";

// Component-scoped StyleSheets extracted from app/feed.tsx.


export const lbStyles = StyleSheet.create({
  backdrop:  { flex: 1, backgroundColor: "#000" },
  header:    {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 54, paddingBottom: 10,
  },
  counter:   { fontSize: 15, color: "rgba(255,255,255,0.6)", fontWeight: "600" },
  closeBtn:  { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  page:      { width: SW, flex: 1, justifyContent: "center", alignItems: "center" },
  fullImage: { width: SW, height: SH * 0.78 },
  videoFull: { width: SW, height: SH * 0.62 },
});
