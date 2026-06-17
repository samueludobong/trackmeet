import { StyleSheet, Platform, Dimensions } from "react-native";
import { SW, SH, NAVBAR_H, BOTTOM_INSET, COMPOSER_ABOVE_NAV, COLLAGE_W, COLLAGE_GAP } from "../../../lib/feed/dimensions";
import { STREAM_CARD_GAP, STREAM_CARD_W, WAVE_HEIGHTS, CARD_AVATAR_SIZE, CARD_AVATAR_OVERLAP, CARD_BANNER_H, MSG_HEADER_H, TOGGLE_W, TOGGLE_H, THUMB_SIZE, THUMB_TRAVEL, PROFILE_BANNER_H, PROFILE_AVATAR_SIZE, PROFILE_AVATAR_OVERLAP, SWATCH_SIZE } from "../../../constants/feedLayout";

// Component-scoped StyleSheets extracted from app/feed.tsx.

/** Used by SpotifyPlaylistDetailOverlay / CuratedPlaylistDetailOverlay header area + row layout. */
export const pdStyles = StyleSheet.create({
  screen: { backgroundColor: "#0D0D0D" },
  hero: { minHeight: 340, justifyContent: "flex-end", overflow: "hidden" },
  backBtn: { position: "absolute", top: 0, left: 0, paddingHorizontal: 18, paddingBottom: 0, zIndex: 10 },
  backIcon: { fontSize: 32, color: "#fff", fontWeight: "300", lineHeight: 36 },
  artMosaic: { flexDirection: "row", flexWrap: "wrap", width: 130, height: 130, borderRadius: 16, overflow: "hidden", alignSelf: "center", marginBottom: 20 },
  mosaicCell: { width: 65, height: 65 },
  heroInfo: { paddingHorizontal: 20, paddingBottom: 24 },
  heroTitle: { fontSize: 28, fontWeight: "900", color: "#fff", lineHeight: 34, marginBottom: 10 },
  heroMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14, flexWrap: "wrap" },
  sourceIconBadge: { width: 18, height: 18, borderRadius: 4, alignItems: "center", justifyContent: "center" },
  sourceIconText: { fontSize: 10, fontWeight: "900", color: "#fff" },
  heroMetaText: { fontSize: 13, color: "rgba(255,255,255,0.55)", fontWeight: "500" },
  heroMetaDot: { fontSize: 13, color: "rgba(255,255,255,0.25)" },
  showOnProfileBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  showOnProfileText: { fontSize: 13, color: "#fff", fontWeight: "600" },
  playBtn: { position: "absolute", bottom: 20, right: 20, width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
  playIcon: { fontSize: 20, color: "#fff", marginLeft: 3 },
  actionBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" },
  actionBtn: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4 },
  actionIcon: { fontSize: 24, color: "rgba(255,255,255,0.7)" },
  actionCount: { fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: "600" },
  songListDivider: { height: 8 },
  songRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 14 },
  songInfo: { flex: 1 },
  songTitle: { fontSize: 15, fontWeight: "600", color: "#fff", marginBottom: 3 },
  songArtist: { fontSize: 13, color: "rgba(255,255,255,0.4)" },
  songArt: { width: 46, height: 46, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  songDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.05)", marginHorizontal: 16 },
});
