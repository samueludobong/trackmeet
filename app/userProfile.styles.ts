import { StyleSheet } from "react-native";

const BANNER_H = 172;
const AVATAR_SIZE = 86;
const AVATAR_OVERLAP = Math.round(AVATAR_SIZE * 0.44);

export const s = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: "#0D0D0D" },
  scrollContent: { paddingHorizontal: 16, paddingTop: 1, paddingBottom: 40 },

  backBtn:  { paddingHorizontal: 18, paddingVertical: 10 },
  backIcon: { fontSize: 32, color: "#fff", fontWeight: "300", lineHeight: 36 },

  // ── Card ──────────────────────────────────────────────────
  card: {
    backgroundColor: "#161618",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  // ── Banner ────────────────────────────────────────────────
  bannerWrap:    { height: BANNER_H, overflow: "hidden" },
  bannerActions: {
    position: "absolute", bottom: 14, right: 16,
    flexDirection: "row", alignItems: "center", gap: 8,
  },

  socialBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
  },

  dmBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, height: 34, borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.22)",
  },
  dmBtnText: { fontSize: 13, fontWeight: "600", color: "#fff" },

  followBtn: {
    paddingHorizontal: 20, height: 34, borderRadius: 17,
    backgroundColor: "#ffffff",
    alignItems: "center", justifyContent: "center",
  },
  followingBtn: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.22)",
  },
  followBtnText:    { fontSize: 14, fontWeight: "700", color: "#111" },
  followingBtnText: { color: "#fff" },

  editBtn: {
    paddingHorizontal: 16, height: 34, borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.22)",
    alignItems: "center", justifyContent: "center",
  },
  editBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },

  // ── Avatar ────────────────────────────────────────────────
  avatarRow: {
    paddingHorizontal: 18, paddingBottom: 12,
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
  },
  avatarActions: { flexDirection: "row", alignItems: "center", gap: 8, paddingBottom: 4 },
  avatar: {
    width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: 18,
    backgroundColor: "#FF6B35",
    borderWidth: 3, borderColor: "#161618",
    alignItems: "center", justifyContent: "center",
  },
  avatarImg: {
    width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: 18,
    borderWidth: 3, borderColor: "#161618",
  },
  avatarInitials: { fontSize: 28, fontWeight: "800", color: "#fff" },

  // ── Live ring (hosting / in a meet) ───────────────────────
  avatarLiveWrap:   { width: AVATAR_SIZE + 8, height: AVATAR_SIZE + 8, alignItems: "center", justifyContent: "center" },
  avatarLiveRing:   { width: AVATAR_SIZE + 8, height: AVATAR_SIZE + 8, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarRingImg:    { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: 18, borderWidth: 3, borderColor: "#161618" },
  avatarRingFallback: { backgroundColor: "#FF6B35", alignItems: "center", justifyContent: "center" },
  liveBadge: {
    position: "absolute", bottom: -4, alignSelf: "center",
    backgroundColor: "#FF3B5C", borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: 2, borderColor: "#161618",
  },
  liveBadgeText: { fontSize: 9, fontWeight: "900", color: "#fff", letterSpacing: 0.6 },

  // ── Info ──────────────────────────────────────────────────
  infoSection: { paddingHorizontal: 20, paddingBottom: 26 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" },
  name: { fontSize: 21, fontWeight: "800", color: "#fff" },
  verifiedBadge: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: "#1D9BF0",
    alignItems: "center", justifyContent: "center",
  },
  verifiedText: { fontSize: 10, fontWeight: "900", color: "#fff" },
  artistBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    backgroundColor: "rgba(171,0,255,0.2)",
    borderWidth: 1, borderColor: "rgba(171,0,255,0.4)",
  },
  artistBadgeText: { fontSize: 10, fontWeight: "800", color: "#AB00FF" },
  handle: { fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 14 },
  bio:    { fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 22, marginBottom: 16 },

  statsRow: { flexDirection: "row", alignItems: "baseline", marginBottom: 16 },
  statBtn:  { flexDirection: "row", alignItems: "baseline" },
  statNum:  { fontSize: 15, fontWeight: "800", color: "#fff" },
  statLabel:{ fontSize: 14, color: "rgba(255,255,255,0.38)" },

  // ── Meta row (pinned song + links) ────────────────────────
  metaRow:  { flexDirection: "row", gap: 20, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5, flex: 1, maxWidth: "55%" },
  metaText: { fontSize: 13, color: "rgba(255,255,255,0.32)" },
  linkBadge: { backgroundColor: "rgba(255,108,26,0.18)", borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  linkBadgeText: { fontSize: 10, fontWeight: "800", color: "#FF6C1A" },

  // ── Pinned song ───────────────────────────────────────────
  pinnedRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "rgba(255,108,26,0.09)",
    borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: "rgba(255,108,26,0.18)",
    marginBottom: 16,
  },
  pinnedArt: { width: 44, height: 44, borderRadius: 10 },
  pinnedArtFallback: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center", justifyContent: "center",
  },
  pinnedLabel:  { fontSize: 10, fontWeight: "700", color: "#FF6C1A", letterSpacing: 0.8, marginBottom: 2 },
  pinnedTrack:  { fontSize: 14, fontWeight: "700", color: "#fff" },
  pinnedArtist: { fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 1 },

  // ── Genres ────────────────────────────────────────────────
  genreRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  genreChip: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    backgroundColor: "rgba(171,0,255,0.12)",
    borderWidth: 1, borderColor: "rgba(171,0,255,0.28)",
  },
  genreText: { fontSize: 12, fontWeight: "600", color: "#AB00FF" },

  // ── Now Listening card ────────────────────────────────────
  nowPlayingCard: {
    marginTop: 12, borderRadius: 20, overflow: "hidden",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    padding: 16, gap: 14,
  },
  nowPlayingCardMeet: { borderColor: "rgba(171,0,255,0.45)" },
  npMeetBadge: {
    flexDirection: "row", alignItems: "center", gap: 7,
    alignSelf: "flex-start",
    backgroundColor: "rgba(171,0,255,0.22)",
    borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12,
  },
  npMeetBadgeText: { fontSize: 12, fontWeight: "700", color: "#E7CBFF", flexShrink: 1 },
  npMeetBadgeHost: { fontWeight: "800", color: "#fff" },
  npLiveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#FF3B5C" },
  npJoinBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#AB00FF", borderRadius: 24, paddingVertical: 12,
  },
  npJoinBtnText: { fontSize: 14, fontWeight: "800", color: "#fff" },
  npBody:            { flexDirection: "row", gap: 14, alignItems: "center" },
  npAlbumArt:        { width: 58, height: 58, borderRadius: 10 },
  npAlbumArtFallback:{ backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  npInfo:            { flex: 1, gap: 3 },
  npTrack:           { fontSize: 15, fontWeight: "700", color: "#fff", letterSpacing: -0.2 },
  npArtist:          { fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 10 },
  npProgressTrack:   { height: 3, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 2, marginBottom: 5 },
  npProgressFill:    { height: 3, backgroundColor: "#ffffff", borderRadius: 2 },
  npProgressTimes:   { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  npTimeText:        { fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: "600" },
  npBtnRow:          { flexDirection: "row", gap: 8, marginTop: 10 },
  npOpenBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
    backgroundColor: "rgba(29,185,84,0.12)",
    borderWidth: 1, borderColor: "rgba(29,185,84,0.35)",
  },
  npOpenBtnText: { fontSize: 11, fontWeight: "700", color: "#1DB954" },
  npSaveBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.14)",
  },
  npSavedBtn:     { backgroundColor: "rgba(29,185,84,0.12)", borderColor: "rgba(29,185,84,0.3)" },
  npSaveBtnText:  { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.45)" },
  npSavedBtnText: { color: "#1DB954" },
});
