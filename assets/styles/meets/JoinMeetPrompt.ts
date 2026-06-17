import { StyleSheet, Platform, Dimensions } from "react-native";
import { SW, SH, NAVBAR_H, BOTTOM_INSET, COMPOSER_ABOVE_NAV, COLLAGE_W, COLLAGE_GAP } from "../../../lib/feed/dimensions";
import { STREAM_CARD_GAP, STREAM_CARD_W, WAVE_HEIGHTS, CARD_AVATAR_SIZE, CARD_AVATAR_OVERLAP, CARD_BANNER_H, MSG_HEADER_H, TOGGLE_W, TOGGLE_H, THUMB_SIZE, THUMB_TRAVEL, PROFILE_BANNER_H, PROFILE_AVATAR_SIZE, PROFILE_AVATAR_OVERLAP, SWATCH_SIZE } from "../../../constants/feedLayout";

// Component-scoped StyleSheets extracted from app/feed.tsx.

/** Used by components/meets/JoinMeetPrompt.tsx. */
export const jpStyles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.78)", alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  card: { width: "100%", maxWidth: 360, backgroundColor: "#171018", borderRadius: 24, padding: 24, alignItems: "center" },
  iconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(171,0,255,0.16)", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  title: { fontSize: 20, fontWeight: "800", color: "#fff", marginBottom: 8, textAlign: "center" },
  body: { fontSize: 14, lineHeight: 20, color: "rgba(255,255,255,0.7)", textAlign: "center", marginBottom: 20 },
  publicBtn: { alignSelf: "stretch", flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#AB00FF", borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 12 },
  publicBtnText: { fontSize: 16, fontWeight: "800", color: "#fff" },
  privateBtn: { alignSelf: "stretch", flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 8 },
  privateBtnText: { fontSize: 16, fontWeight: "800", color: "#fff" },
  btnSub: { fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 2 },
  cancelBtn: { paddingVertical: 12, alignItems: "center", alignSelf: "stretch" },
  cancelText: { fontSize: 15, fontWeight: "700", color: "rgba(255,255,255,0.55)" },
});
