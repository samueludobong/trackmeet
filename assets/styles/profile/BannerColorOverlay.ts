import { StyleSheet, Platform, Dimensions } from "react-native";
import { SW, SH, NAVBAR_H, BOTTOM_INSET, COMPOSER_ABOVE_NAV, COLLAGE_W, COLLAGE_GAP } from "../../../lib/feed/dimensions";
import { STREAM_CARD_GAP, STREAM_CARD_W, WAVE_HEIGHTS, CARD_AVATAR_SIZE, CARD_AVATAR_OVERLAP, CARD_BANNER_H, MSG_HEADER_H, TOGGLE_W, TOGGLE_H, THUMB_SIZE, THUMB_TRAVEL, PROFILE_BANNER_H, PROFILE_AVATAR_SIZE, PROFILE_AVATAR_OVERLAP, SWATCH_SIZE } from "../../../constants/feedLayout";

// Component-scoped StyleSheets extracted from app/feed.tsx.

/** Used by components/profile/BannerColorOverlay.tsx. */
export const bcOverlayStyles = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: { position: "absolute", bottom: 0, left: 0, right: 0, height: "75%", backgroundColor: "#1A1A1C", borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden", borderTopWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", alignSelf: "center", marginTop: 10, marginBottom: 4 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" },
  title: { fontSize: 16, fontWeight: "700" as const, color: "#fff" },
  closeBtn: { fontSize: 16, color: "rgba(255,255,255,0.45)", fontWeight: "600" as const },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  imageBox: { height: 120, borderRadius: 16, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.15)", borderStyle: "dashed" as const, alignItems: "center", justifyContent: "center", gap: 8, overflow: "hidden", backgroundColor: "#1A1A1C" },
  imageOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", gap: 6 },
  imageBoxText: { fontSize: 14, color: "rgba(255,255,255,0.5)", fontWeight: "600" as const },
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: 22, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.08)" },
  dividerText: { fontSize: 12, color: "rgba(255,255,255,0.25)", fontWeight: "600" as const },
  colorRow: { flexDirection: "row" as const, justifyContent: "space-between" as const, marginBottom: 10 },
  colorSwatch: { borderRadius: 14, alignItems: "center" as const, justifyContent: "center" as const },
  colorSwatchSelected: { borderWidth: 2.5, borderColor: "#fff" },
});
