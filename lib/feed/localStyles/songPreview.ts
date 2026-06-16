import { StyleSheet, Platform, Dimensions } from "react-native";
import { SW, SH, NAVBAR_H, BOTTOM_INSET, COMPOSER_ABOVE_NAV, COLLAGE_W, COLLAGE_GAP } from "../dimensions";
import { STREAM_CARD_GAP, STREAM_CARD_W, WAVE_HEIGHTS, CARD_AVATAR_SIZE, CARD_AVATAR_OVERLAP, CARD_BANNER_H, MSG_HEADER_H, TOGGLE_W, TOGGLE_H, THUMB_SIZE, THUMB_TRAVEL, PROFILE_BANNER_H, PROFILE_AVATAR_SIZE, PROFILE_AVATAR_OVERLAP, SWATCH_SIZE } from "../../../constants/feedLayout";

// Component-scoped StyleSheets extracted from app/feed.tsx.


export const spCard = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    alignSelf: "flex-start",       // don't stretch to fill parent
    backgroundColor: "#0F1A12",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(29,185,84,0.25)",
    padding: 12,
    maxWidth: SW * 0.72,
  },
  cardMe: { alignSelf: "flex-end" },
  art: { width: 54, height: 54, borderRadius: 10, overflow: "hidden" },
  artFallback: {
    width: 54,
    height: 54,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "rgba(29,185,84,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1, gap: 2 },
  spotifyRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  spotifyLabel: { fontSize: 10, fontWeight: "700", color: "#1DB954", letterSpacing: 0.5 },
  trackName: { fontSize: 13, fontWeight: "700", color: "#fff", letterSpacing: -0.2 },
  artistName: { fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 8 },
  btnRow: { flexDirection: "row", gap: 7 },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: "rgba(29,185,84,0.12)",
    borderWidth: 1,
    borderColor: "rgba(29,185,84,0.35)",
  },
  openBtnText: { fontSize: 11, fontWeight: "700", color: "#1DB954" },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  savedBtn: {
    backgroundColor: "rgba(29,185,84,0.12)",
    borderColor: "rgba(29,185,84,0.3)",
  },
  saveBtnText: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.45)" },
  savedBtnText: { color: "#1DB954" },
});
