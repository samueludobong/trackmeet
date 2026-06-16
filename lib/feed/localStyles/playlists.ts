import { StyleSheet, Platform, Dimensions } from "react-native";
import { SW, SH, NAVBAR_H, BOTTOM_INSET, COMPOSER_ABOVE_NAV, COLLAGE_W, COLLAGE_GAP } from "../dimensions";
import { STREAM_CARD_GAP, STREAM_CARD_W, WAVE_HEIGHTS, CARD_AVATAR_SIZE, CARD_AVATAR_OVERLAP, CARD_BANNER_H, MSG_HEADER_H, TOGGLE_W, TOGGLE_H, THUMB_SIZE, THUMB_TRAVEL, PROFILE_BANNER_H, PROFILE_AVATAR_SIZE, PROFILE_AVATAR_OVERLAP, SWATCH_SIZE } from "../../../constants/feedLayout";

// Component-scoped StyleSheets extracted from app/feed.tsx.


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


export const cpStyles = StyleSheet.create({
  // Filter pills
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.04)' },
  filterBtnActive: { borderColor: '#FF6C1A', backgroundColor: 'rgba(255,108,26,0.12)' },
  filterLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.38)' },
  filterLabelActive: { color: '#FF6C1A' },
  // Create playlist button
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: 'rgba(255,108,26,0.07)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,108,26,0.18)', marginBottom: 6 },
  createBtnText: { fontSize: 14, fontWeight: '700', color: '#FF6C1A' },
  // Profile badge on card
  profileBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, backgroundColor: 'rgba(171,0,255,0.15)', marginRight: 2 },
  profileBadgeText: { fontSize: 10, fontWeight: '700', color: '#AB00FF' },
  // Dialog overlay + sheet
  dialogOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
  // Bottom corners are rounded too â€” invisible when the sheet sits at the
  // screen edge, but visible when the keyboard lifts it up. Border swapped from
  // borderTopWidth to a full borderWidth so the rounded edges have the same
  // hairline outline as the top.
  dialogSheet: { backgroundColor: '#161618', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, paddingHorizontal: 20, paddingTop: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', maxHeight: SH * 0.88 },
  dialogHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', marginBottom: 20 },
  dialogTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 18 },
  // Image picker
  imagePicker: { width: 90, height: 90, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 20, overflow: 'hidden' },
  imagePickerText: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 },
  // Form fields
  label: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.35)', letterSpacing: 0.9, marginBottom: 8 },
  input: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#fff', marginBottom: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  // Tags
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  tagChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: 'rgba(171,0,255,0.14)', borderWidth: 1, borderColor: 'rgba(171,0,255,0.28)' },
  tagChipText: { fontSize: 12, fontWeight: '600', color: '#AB00FF' },
  tagInputRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  tagInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  addTagBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center' },
  addTagBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  // Create submit
  createSubmitBtn: { backgroundColor: '#FF6C1A', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  createSubmitText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  // Mode tabs (Add Song dialog)
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  modeBtnActive: { backgroundColor: 'rgba(255,108,26,0.12)', borderColor: '#FF6C1A' },
  modeBtnText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.4)' },
  modeBtnTextActive: { color: '#FF6C1A' },
  // Search
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  searchInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  searchBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#FF6C1A', alignItems: 'center', justifyContent: 'center' },
  // Track rows
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  trackArt: { width: 46, height: 46, borderRadius: 8, backgroundColor: '#1a0a2e', flexShrink: 0 },
  trackInfo: { flex: 1 },
  trackName: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 2 },
  trackArtist: { fontSize: 12, color: 'rgba(255,255,255,0.38)' },
  // Add buttons
  addBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(255,108,26,0.12)', borderWidth: 1, borderColor: 'rgba(255,108,26,0.25)' },
  addBtnText: { fontSize: 12, fontWeight: '700', color: '#FF6C1A' },
  addBtnDone: { backgroundColor: 'rgba(29,185,84,0.12)', borderColor: 'rgba(29,185,84,0.3)' },
  addBtnTextDone: { color: '#1DB954' },
  // Add Song button in detail hero
  addSongBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(255,108,26,0.1)', borderWidth: 1, borderColor: 'rgba(255,108,26,0.28)', marginTop: 10 },
  addSongBtnText: { fontSize: 13, fontWeight: '700', color: '#FF6C1A' },
});
