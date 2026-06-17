import { StyleSheet, Platform, Dimensions } from "react-native";
import { SW, SH, NAVBAR_H, BOTTOM_INSET, COMPOSER_ABOVE_NAV, COLLAGE_W, COLLAGE_GAP } from "../../../lib/feed/dimensions";
import { STREAM_CARD_GAP, STREAM_CARD_W, WAVE_HEIGHTS, CARD_AVATAR_SIZE, CARD_AVATAR_OVERLAP, CARD_BANNER_H, MSG_HEADER_H, TOGGLE_W, TOGGLE_H, THUMB_SIZE, THUMB_TRAVEL, PROFILE_BANNER_H, PROFILE_AVATAR_SIZE, PROFILE_AVATAR_OVERLAP, SWATCH_SIZE } from "../../../constants/feedLayout";

// Component-scoped StyleSheets extracted from app/feed.tsx.

/** Used inside the Messages tab header (header chips, tab rows). Consumed by components/messages/MessagesView.tsx and a couple of message overlays. */
export const ms = StyleSheet.create({
  scrollContent: { paddingBottom: NAVBAR_H + BOTTOM_INSET + 40 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  headerTitle: { fontSize: 48, fontWeight: "900", color: "#fff", letterSpacing: -1, lineHeight: 44 },

  tabRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 20 },
  tabPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  tabPillActive: { backgroundColor: "#AB00FF", borderColor: "#AB00FF" },
  tabText: { fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: "600" },
  tabTextActive: { color: "#fff" },
  liveTabDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,80,80,0.45)" },
  liveTabDotActive: { backgroundColor: "#FF3333" },

  grid: { flexDirection: "row", paddingHorizontal: 16, gap: STREAM_CARD_GAP },
  col: { flex: 1, gap: STREAM_CARD_GAP },

  card: { width: STREAM_CARD_W, borderRadius: 16, overflow: "hidden", backgroundColor: "#111", justifyContent: "space-between" },

  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: 8 },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#E8000F", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#fff" },
  liveBadgeText: { fontSize: 10, color: "#fff", fontWeight: "800" },
  meetBadge: { backgroundColor: "#AB00FF", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  meetBadgeText: { fontSize: 10, color: "#fff", fontWeight: "800" },
  viewerBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  viewerText: { fontSize: 10, color: "#fff", fontWeight: "700" },

  waveWrap: { position: "absolute", bottom: 44, left: 0, right: 0, flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 3, paddingHorizontal: 10 },
  waveBar: { width: 4, borderRadius: 2, opacity: 0.75 },

  cardBottom: { padding: 9, gap: 2 },
  typeTag: { alignSelf: "flex-start", width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", marginBottom: 3 },
  cardTitle: { fontSize: 12, color: "#fff", fontWeight: "700", lineHeight: 16 },
  cardHost: { fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 1 },
});
