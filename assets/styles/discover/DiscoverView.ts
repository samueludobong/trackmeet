import { StyleSheet, Platform, Dimensions } from "react-native";
import { SW, SH, NAVBAR_H, BOTTOM_INSET, COMPOSER_ABOVE_NAV, COLLAGE_W, COLLAGE_GAP } from "../../../lib/feed/dimensions";
import { STREAM_CARD_GAP, STREAM_CARD_W, WAVE_HEIGHTS, CARD_AVATAR_SIZE, CARD_AVATAR_OVERLAP, CARD_BANNER_H, MSG_HEADER_H, TOGGLE_W, TOGGLE_H, THUMB_SIZE, THUMB_TRAVEL, PROFILE_BANNER_H, PROFILE_AVATAR_SIZE, PROFILE_AVATAR_OVERLAP, SWATCH_SIZE } from "../../../constants/feedLayout";

// Component-scoped StyleSheets extracted from app/feed.tsx.

/** Used by components/discover/DiscoverView.tsx and its row/card children. */
export const ds = StyleSheet.create({
  scrollContent: { paddingBottom: NAVBAR_H + BOTTOM_INSET + 40 },

  header: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  headerTitle: { fontSize: 48, fontWeight: "900", color: "#ffffff", letterSpacing: -1, lineHeight: 44 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center", marginBottom: 4 },

  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginHorizontal: 16, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 16 },
  searchInput: { flex: 1, fontSize: 14, color: "#fff" },

  filtersRow: { paddingHorizontal: 16, gap: 8 },
  filterPill: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  filterPillActive: { backgroundColor: "#AB00FF", borderColor: "#AB00FF" },
  filterPillText: { fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: "600" },
  filterPillTextActive: { color: "#fff" },

  carouselCard: { borderRadius: 24, overflow: "hidden", height: 220 },
  featuredGradient: { flex: 1, padding: 20 },
  decoCircle: { position: "absolute", borderRadius: 999 },
  featuredBadge: { alignSelf: "flex-start", backgroundColor: "rgba(0,0,0,0.35)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  featuredBadgeText: { fontSize: 12, color: "#CAFF00", fontWeight: "700" },
  featuredBottom: { gap: 6 },
  featuredTitle: { fontSize: 26, fontWeight: "900", color: "#fff", letterSpacing: -0.5 },
  featuredSub: { fontSize: 13, color: "rgba(255,255,255,0.65)" },
  featuredRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  featuredTag: { backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  featuredTagText: { fontSize: 11, color: "#fff", fontWeight: "600" },
  featuredCta: { backgroundColor: "#CAFF00", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  featuredCtaActive: { backgroundColor: "rgba(255,255,255,0.2)", borderWidth: 1, borderColor: "rgba(255,255,255,0.4)" },
  featuredCtaText: { fontSize: 13, color: "#0D0D0D", fontWeight: "800" },
  featuredCtaTextActive: { color: "#fff" },

  dotRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.2)" },
  dotActive: { width: 18, backgroundColor: "#AB00FF" },

  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 14 },
  sectionTitle: { fontSize: 20, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },
  sectionSub: { fontSize: 12, color: "rgba(255,255,255,0.35)", fontWeight: "500" },
  seeAll: { fontSize: 13, color: "#AB00FF", fontWeight: "600" },

  storiesRow: { paddingHorizontal: 16, gap: 20 },
  storyItem2: { alignItems: "center", width: 72 },
  storyRing2: { width: 68, height: 68, borderRadius: 34, borderWidth: 3, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  storyAvatar2: { width: 60, height: 60, borderRadius: 30 },
  storyName2: { fontSize: 11, color: "rgba(255,255,255,0.5)", textAlign: "center" },

  artistsRow: { paddingHorizontal: 16, gap: 16 },
  artistCard: { alignItems: "center", width: 84 },
  artistAvatarRing: { width: 74, height: 74, borderRadius: 37, borderWidth: 3, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  artistAvatar: { width: 66, height: 66, borderRadius: 33 },
  artistInitials: { fontSize: 22, fontWeight: "800" },
  artistName: { fontSize: 12, color: "#fff", fontWeight: "700", textAlign: "center", marginBottom: 2 },
  artistGenre: { fontSize: 10, color: "rgba(255,255,255,0.4)", textAlign: "center", marginBottom: 8 },
  followBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  followBtnText: { fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: "700" },
  followBtnTextActive: { color: "#0D0D0D" },

  recsRow: { paddingHorizontal: 16, gap: 12 },
  recCard: { width: 158, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },

  // Song card â€” vinyl aesthetic
  songThumb: { width: 158, height: 108, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  vinylRing: { position: "absolute", borderRadius: 999, borderWidth: 1 },
  vinylCenter: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  vinylPhoto: { width: 42, height: 42, borderRadius: 21, resizeMode: "cover" },
  songDurationBadge: { position: "absolute", bottom: 8, right: 8, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  songDurationText: { fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: "600" },

  // Video card â€” thumbnail + play
  recThumb: { width: 158, height: 108, position: "relative" },
  recThumbImg: { width: "100%", height: "100%", resizeMode: "cover" },
  recPlayBtn: { position: "absolute", top: "50%", left: "50%", marginTop: -20, marginLeft: -20, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.35)" },
  videoBadge: { position: "absolute", top: 8, right: 8, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3 },
  videoBadgeText: { fontSize: 8, fontWeight: "900", letterSpacing: 0.5 },
  recDurationBadge: { position: "absolute", bottom: 8, left: 8, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  recDurationText: { fontSize: 10, color: "#fff", fontWeight: "600" },

  recInfo: { padding: 10, gap: 2 },
  recTitle: { fontSize: 13, color: "#fff", fontWeight: "700" },
  recArtist: { fontSize: 11, color: "rgba(255,255,255,0.45)" },
  recBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  recGenre: { fontSize: 10, fontWeight: "700" },

  meetsCol: { paddingHorizontal: 16, gap: 12 },
  meetCard: { backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 20, flexDirection: "row", overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  meetStrip: { width: 4 },
  meetBody: { flex: 1, padding: 14, gap: 8 },
  meetTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  meetTitle: { fontSize: 15, fontWeight: "800", color: "#fff", marginBottom: 2 },
  meetSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 16 },
  meetDateBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, alignItems: "center", minWidth: 58 },
  meetDateText: { fontSize: 10, fontWeight: "800", textAlign: "center", lineHeight: 14 },
  meetMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  meetLocation: { fontSize: 12, color: "rgba(255,255,255,0.4)" },
  meetBottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  meetTag: { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
  meetTagText: { fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: "600" },
  rsvpBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  rsvpText: { fontSize: 11, fontWeight: "800" },

  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, color: "rgba(255,255,255,0.3)", fontWeight: "500" },
});
