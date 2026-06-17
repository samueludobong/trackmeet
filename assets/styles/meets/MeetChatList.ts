import { StyleSheet, Platform, Dimensions } from "react-native";
import { SW, SH, NAVBAR_H, BOTTOM_INSET, COMPOSER_ABOVE_NAV, COLLAGE_W, COLLAGE_GAP } from "../../../lib/feed/dimensions";
import { STREAM_CARD_GAP, STREAM_CARD_W, WAVE_HEIGHTS, CARD_AVATAR_SIZE, CARD_AVATAR_OVERLAP, CARD_BANNER_H, MSG_HEADER_H, TOGGLE_W, TOGGLE_H, THUMB_SIZE, THUMB_TRAVEL, PROFILE_BANNER_H, PROFILE_AVATAR_SIZE, PROFILE_AVATAR_OVERLAP, SWATCH_SIZE } from "../../../constants/feedLayout";

// Component-scoped StyleSheets extracted from app/feed.tsx.

/** Used by components/meets/MeetChatList.tsx. */
export const mcStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  avatar: { width: 30, height: 30, borderRadius: 15, flexShrink: 0, backgroundColor: "#222" },
  avatarFallback: { backgroundColor: "rgba(171,0,255,0.4)", alignItems: "center", justifyContent: "center" },
  avatarLetter: { fontSize: 12, fontWeight: "800", color: "#fff" },
  bubble: { backgroundColor: "rgba(243, 243, 243, 0.1)", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 7, flexShrink: 1 },
  name: { fontSize: 13, fontWeight: "700", color: "rgba(255, 255, 255, 0.73)", marginBottom: 1 },
  text: { fontSize: 13, color: "#fff" },
});
