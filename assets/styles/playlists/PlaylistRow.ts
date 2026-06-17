import { StyleSheet, Platform, Dimensions } from "react-native";
import { SW, SH, NAVBAR_H, BOTTOM_INSET, COMPOSER_ABOVE_NAV, COLLAGE_W, COLLAGE_GAP } from "../../../lib/feed/dimensions";
import { STREAM_CARD_GAP, STREAM_CARD_W, WAVE_HEIGHTS, CARD_AVATAR_SIZE, CARD_AVATAR_OVERLAP, CARD_BANNER_H, MSG_HEADER_H, TOGGLE_W, TOGGLE_H, THUMB_SIZE, THUMB_TRAVEL, PROFILE_BANNER_H, PROFILE_AVATAR_SIZE, PROFILE_AVATAR_OVERLAP, SWATCH_SIZE } from "../../../constants/feedLayout";

// Component-scoped StyleSheets extracted from app/feed.tsx.

/** Used by playlist row components (MusicPlaylistRow, CuratedPlaylistCard, SpotifyPlaylistCard) and ProfilePlaylistsTab. */
export const pplStyles = StyleSheet.create({
  card: {
    backgroundColor: "#111113",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  bannerWrap: { height: CARD_BANNER_H, overflow: "hidden" },
  bannerFollowWrap: { position: "absolute", bottom: 10, right: 10 },
  avatarRow: {
    paddingHorizontal: 14,
    marginTop: -CARD_AVATAR_OVERLAP,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  avatarImg: {
    width: CARD_AVATAR_SIZE, height: CARD_AVATAR_SIZE,
    borderRadius: 14,
    borderWidth: 2.5, borderColor: "#111113",
    backgroundColor: "#1A1A1C",
  },
  avatarFallback: {
    width: CARD_AVATAR_SIZE, height: CARD_AVATAR_SIZE,
    borderRadius: 14,
    borderWidth: 2.5, borderColor: "#111113",
    backgroundColor: "#AB00FF33",
    alignItems: "center" as const, justifyContent: "center" as const,
  },
  avatarInitials: { fontSize: 18, fontWeight: "800" as const, color: "#AB00FF" },
  info: { paddingHorizontal: 14, paddingBottom: 14, paddingTop: 8 },
  nameRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6, flexShrink: 1 },
  name: { fontSize: 15, fontWeight: "700" as const, color: "#fff", flexShrink: 1 },
  verifiedBadge: {
    backgroundColor: "#FF6C1A", borderRadius: 8,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  verifiedText: { fontSize: 10, fontWeight: "800" as const, color: "#fff" },
  username: { fontSize: 12, color: "rgba(255,255,255,0.38)", marginTop: 2 },
  bio: { fontSize: 13, color: "rgba(255,255,255,0.52)", marginTop: 6, lineHeight: 18 },
  statsRow: { flexDirection: "row" as const, alignItems: "center" as const, marginTop: 10 },
  statNum: { fontSize: 13, fontWeight: "700" as const, color: "#fff" },
  statLabel: { fontSize: 12, color: "rgba(255,255,255,0.38)" },
  pinnedRow: {
    flexDirection: "row" as const, alignItems: "center" as const, gap: 7,
    marginTop: 10,
    backgroundColor: "rgba(255,108,26,0.08)",
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7,
  },
  pinnedArt: { width: 26, height: 26, borderRadius: 5 },
  pinnedArtFallback: {
    width: 26, height: 26, borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center" as const, justifyContent: "center" as const,
  },
  pinnedText: { flex: 1, fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: "500" as const },
  genreRow: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 6, marginTop: 10 },
  genreChip: {
    backgroundColor: "rgba(171,0,255,0.12)",
    borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: 1, borderColor: "rgba(171,0,255,0.2)",
  },
  genreText: { fontSize: 11, fontWeight: "600" as const, color: "#AB00FF" },
  followBtn: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: "#fff",
  },
  followingBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  followBtnText: { fontSize: 13, fontWeight: "700" as const, color: "#111" },
  followingBtnText: { color: "#fff" },

  // â”€â”€ Artist card (standalone artists table) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  artistCard: {
    backgroundColor: "#111113",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  artistBanner: { height: CARD_BANNER_H, overflow: "hidden" },
  artistAvatarRow: {
    paddingHorizontal: 14,
    marginTop: -CARD_AVATAR_OVERLAP,
    flexDirection: "row" as const,
    alignItems: "flex-end" as const,
  },
  artistAvatar: {
    width: CARD_AVATAR_SIZE, height: CARD_AVATAR_SIZE,
    borderRadius: 14,
    borderWidth: 2.5, borderColor: "#111113",
    backgroundColor: "#1A1A1C",
  },
  artistAvatarFallback: {
    alignItems: "center" as const, justifyContent: "center" as const,
    backgroundColor: "rgba(255,108,26,0.18)",
  },
  artistInfo: { paddingHorizontal: 14, paddingBottom: 14, paddingTop: 8 },
  artistBadge: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8,
    backgroundColor: "rgba(171,0,255,0.2)",
    borderWidth: 1, borderColor: "rgba(171,0,255,0.35)",
  },
  artistBadgeText: { fontSize: 10, fontWeight: "800" as const, color: "#AB00FF" },
});
