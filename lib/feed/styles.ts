import { StyleSheet } from "react-native";
import { BOTTOM_INSET, NAVBAR_H, SW } from "./dimensions";

// Shared StyleSheet for the feed screen, extracted from app/feed.tsx.
export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },

  feedContent: { paddingBottom: NAVBAR_H + 64 + BOTTOM_INSET + 32 },

  // Top navbar
  navbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 12,
  },
  navTitle: { fontSize: 48, fontWeight: "900", color: "#ffffff", letterSpacing: -1, lineHeight: 52 },
  navBrand: {
    flex: 1,
    textAlign: "center",
    fontSize: 25,
    fontFamily: "Pacifico_400Regular",
    color: "#AB00FF",
  },
  notifBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
  },

  // Stories
  storiesStrip: { paddingBottom: 16 },
  storiesContent: { paddingHorizontal: 16, gap: 28 },
  storyItem: { alignItems: "center", width: 60 },
  storyRing: { width: 82, height: 82, borderRadius: 78, borderWidth: 5, alignItems: "center", justifyContent: "center", marginBottom: 5 },
  storyAvatar: { width: 76, height: 76, borderRadius: 78, alignItems: "center", justifyContent: "center" },
  storyInitials: { fontSize: 17, fontWeight: "800" },
  storyName: { fontSize: 10, color: "rgba(255,255,255,0.4)", textAlign: "center" },
  storyArtistSub: { fontSize: 9, color: "rgba(255,255,255,0.22)", textAlign: "center" },
  stripDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.07)", marginBottom: 12 },

  // Now-playing bubble (wider than storyItem to fit artist line)
  nowPlayingItem: { alignItems: "center", width: 72 },
  nowPlayingBadge: {
    position: "absolute", bottom: -2, right: -2,
    width: 18, height: 18, borderRadius: 9,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#0D0D0D",
  },

  // Now-playing composer banner
  nowPlayingBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(18,18,24,0.95)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(171,0,255,0.22)",
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 8,
    shadowColor: "#AB00FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  nowPlayingBarSwatch: {
    width: 32, height: 32, borderRadius: 9,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1,
  },
  nowPlayingBarSong:   { fontSize: 12, color: "#fff", fontWeight: "700" },
  nowPlayingBarArtist: { fontSize: 11, color: "rgba(255,255,255,0.38)", marginTop: 1 },
  nowPlayingWaves: { flexDirection: "row", alignItems: "center", gap: 2 },
  nowPlayingWaveBar: { width: 3, borderRadius: 2 },
  nowPlayingShareBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "rgba(171,0,255,0.12)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(171,0,255,0.3)",
  },

  // Attached-track chip (shown below the now-playing banner once "+" is tapped)
  attachedTrackChip: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "rgb(0,0,0)",
    borderRadius: 12, borderWidth: 1, borderColor: "rgba(29,185,84,0.25)",
    paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8,
  },
  attachedTrackArt:    { width: 36, height: 36, borderRadius: 8 },
  attachedTrackName:   { fontSize: 12, fontWeight: "700", color: "#fff" },
  attachedTrackArtist: { fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 1 },

  // Card shell
  card: { backgroundColor: "#ffffff0e", borderRadius: 20, marginHorizontal: 13, paddingTop: 16, overflow: "hidden" },

  // Post header
  postHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10, paddingHorizontal: 16 },
  postAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  postAvatarText: { fontSize: 17, fontWeight: "800" },
  postUser: { fontSize: 14, fontWeight: "700", color: "#fff", marginBottom: 2 },
  postBio: { fontSize: 12, color: "#888", lineHeight: 16 },
  postText: { fontSize: 18, color: "#fff", lineHeight: 24, paddingHorizontal: 16, marginBottom: 12, fontWeight: "300" },

  // Media
  mediaBlock: { width: "100%", height: 220, alignItems: "center", justifyContent: "center" },
  mediaImageFull: { width: SW - 26, height: 260 },
  mediaPlaceholder: { fontSize: 44, opacity: 0.25 },
  collageMoreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  collageMoreText: { color: "#fff", fontSize: 26, fontWeight: "800" },
  videoPlayCircle: { width: 54, height: 54, borderRadius: 27, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  videoPlayIcon: { fontSize: 20, color: "#fff", marginLeft: 3 },
  durationBadge: { position: "absolute", bottom: 10, right: 12, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  durationText: { fontSize: 12, color: "#fff", fontWeight: "600" },

  // Music player (visual only)
  musicPlayerCard: { width: "100%", overflow: "hidden" },
  musicArtArea: { width: "100%", height: 280, position: "relative" },
  musicArtFill: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  musicArtEmoji: { fontSize: 72, opacity: 0.25 },
  musicGradientOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, height: 110, opacity: 0.9 },
  musicTopRight: { position: "absolute", top: 14, right: 14, flexDirection: "row", gap: 8 },
  musicGlassBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  musicGlassBtnIcon: { fontSize: 16, color: "#fff" },
  musicInfoOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, height: 100 },
  musicInfoText: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 14, paddingBottom: 14 },
  musicSongTitle: { fontSize: 20, fontWeight: "700", color: "#ffffff", marginBottom: 2 },
  musicArtistName: { fontSize: 14, color: "rgba(255,255,255,0.65)" },
  musicProgressRow: { marginBottom: 4 },
  musicProgressTrack: { height: 3, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 2 },
  musicProgressFill: { height: 3, borderRadius: 2, position: "relative" },
  musicProgressThumb: { position: "absolute", right: -5, top: -4, width: 11, height: 11, borderRadius: 6, backgroundColor: "#fff" },
  musicTimestamps: { flexDirection: "row", justifyContent: "space-between" },
  musicTime: { fontSize: 11, color: "rgba(255,255,255,0.45)" },

  // Poll
  pollContainer: { paddingHorizontal: 16, paddingBottom: 4 },
  pollQuestion: { fontSize: 17, fontWeight: "700", color: "#ffffff", marginBottom: 14 },
  pollOptions: { gap: 9, marginBottom: 10 },
  pollOption: { borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", overflow: "hidden", position: "relative", backgroundColor: "rgba(255,255,255,0.05)", minHeight: 46, justifyContent: "center" },
  pollFillBar: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 13 },
  pollOptionInner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12 },
  pollOptionLabel: { fontSize: 14, color: "#ffffff", fontWeight: "500", flex: 1 },
  pollPct: { fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: "700", marginLeft: 8 },
  pollMeta: { fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 2 },

  // Action row
  actionRow: { flexDirection: "row", alignItems: "center", gap: 18, paddingHorizontal: 16, paddingVertical: 12 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionIcon: { fontSize: 30, color: "#555" },
  actionIconLiked: { color: "#FF3CAC" },
  actionCount: { fontSize: 13, color: "#888", fontWeight: "600" },
  actionCountLiked: { color: "#FF3CAC" },
  moreIcon: { fontSize: 18, color: "#bbb", letterSpacing: 2 },

  // Floating composer
  composerWrap: { position: "absolute", left: 16, right: 16 },
  composerGlass: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.70)",
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 16,
  },
  composerPlus: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  composerPlusIcon: { fontSize: 24, color: "#fff", lineHeight: 28 },
  composerInput: { flex: 1, fontSize: 15, color: "#ffffff", paddingVertical: 0, paddingHorizontal: 4, textAlignVertical: "center" },
  composerSend: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#AB00FF", alignItems: "center", justifyContent: "center" },
  composerSendIcon: { fontSize: 18, color: "#fff", fontWeight: "700" },

  // ─── Song card in PostDetailOverlay composer bar ──────────────────────────
  detailSongCard: {
    flexDirection: "row" as const, alignItems: "center" as const, gap: 10,
    backgroundColor: "rgba(29,185,84,0.10)",
    borderWidth: 1, borderColor: "rgba(29,185,84,0.25)",
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9,
    marginBottom: 8,
  },
  detailSongArt: { width: 38, height: 38, borderRadius: 8, backgroundColor: "#1a1a1c" },
  detailSongArtFallback: { alignItems: "center" as const, justifyContent: "center" as const },
  detailSongName: { fontSize: 13, fontWeight: "700" as const, color: "#fff" },
  detailSongArtist: { fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 1 },

  // ─── Song card embedded inside a comment bubble ───────────────────────────
  commentSongCard: {
    flexDirection: "row" as const, alignItems: "center" as const, gap: 9,
    marginTop: 7,
    backgroundColor: "rgba(29,185,84,0.10)",
    borderWidth: 1, borderColor: "rgba(29,185,84,0.22)",
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8,
  },
  commentSongArt: { width: 34, height: 34, borderRadius: 7, backgroundColor: "#1a1a1c" },
  commentSongArtFallback: { alignItems: "center" as const, justifyContent: "center" as const },
  commentSongName: { fontSize: 12, fontWeight: "700" as const, color: "#fff" },
  commentSongArtist: { fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 1 },

  // Bottom glass navbar
  navBarWrap: { position: "absolute", bottom: 0, left: 0, right: 0, paddingBottom: BOTTOM_INSET, paddingHorizontal: 12, paddingTop: 8 },
  navBarGlass: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", backgroundColor: "rgba(0,0,0,0.70)", borderRadius: 96, borderWidth: 1, borderColor: "rgba(255,255,255,0.09)", paddingVertical: 6, height: NAVBAR_H - 8 },
  navItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, paddingVertical: 4 },
  navIcon: { fontSize: 30, color: "rgba(255,255,255,0.3)" },
  navIconActive: { color: "#AB00FF" },
  navLabel: { fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: "500" },
  navLabelActive: { color: "#AB00FF", fontWeight: "700" },

  // Swipe container + reply indicator
  swipeContainer: { position: "relative" },
  replyIndicator: {
    position: "absolute",
    right: 22,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    gap: 3,
  },
  replyIndicatorArrow: { fontSize: 20, color: "#AB00FF" },
  replyIndicatorLabel: {
    fontSize: 11,
    color: "#AB00FF",
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },

  // Quick reply overlay
  qrBackdrop: { backgroundColor: "rgb(10, 10, 14)" },
  qrCardWrap: { position: "absolute", top: 60, left: 12, right: 12 },
  qrCloseBtn: { position: "absolute", top: -13, right: -13, zIndex: 20 },
  qrCloseBtnCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(35,35,40,0.98)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  qrCloseBtnIcon: { fontSize: 12, color: "#fff", fontWeight: "700" },
  qrInputRow: { position: "absolute", left: 16, right: 16 },
  qrInputGlass: { flexDirection: "row", alignItems: "center", backgroundColor: "#1c1c22", borderRadius: 28, paddingHorizontal: 8, paddingVertical: 6, gap: 10 },
  qrAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  qrAvatarText: { fontSize: 14, fontWeight: "800" },
  qrInputInner: { flex: 1 },
  qrReplyingTo: { fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 2 },
  qrInput: { fontSize: 15, color: "#ffffff", paddingVertical: 0 },
  qrSend: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#AB00FF", alignItems: "center", justifyContent: "center" },
  qrSendIcon: { fontSize: 17, color: "#fff", fontWeight: "700" },
  qrPlusBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  qrPlusBtnIcon: { fontSize: 22, color: "#fff", lineHeight: 26 },

  // Attached song card above the quick-reply input glass
  qrSongCard: {
    flexDirection: "row" as const, alignItems: "center" as const, gap: 10,
    backgroundColor: "rgba(29,185,84,0.12)",
    borderWidth: 1, borderColor: "rgba(29,185,84,0.28)",
    borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8,
    marginBottom: 8,
  },
  qrSongArt: { width: 36, height: 36, borderRadius: 8, backgroundColor: "#1a1a1c" },
  qrSongArtFallback: { alignItems: "center" as const, justifyContent: "center" as const },
  qrSongName: { fontSize: 13, fontWeight: "700" as const, color: "#fff" },
  qrSongArtist: { fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 1 },

  // Action menu sheet
  menuBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  menuSheet: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#111113", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  menuHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.18)", alignSelf: "center", marginTop: 10, marginBottom: 12 },

  menuHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14 },
  menuXBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  menuXBtnIcon: { fontSize: 12, color: "#fff", fontWeight: "700" },
  menuHeaderTitle: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "700", color: "#ffffff" },
  menuHeaderRight: { fontSize: 14, color: "#AB00FF", fontWeight: "600" },

  menuPhotoStrip: { paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  menuCameraBox: { width: 96, height: 96, borderRadius: 14, backgroundColor: "#1a1a1e", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  menuCameraIcon: { fontSize: 28 },
  menuCameraLabel: { fontSize: 12, color: "#fff", fontWeight: "600" },
  menuPhotoThumb: { width: 96, height: 96, borderRadius: 14, overflow: "hidden" },

  menuSectionDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.07)", marginHorizontal: 0, marginVertical: 2 },
  menuSection: { paddingHorizontal: 16 },
  menuRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, gap: 14 },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" },
  menuRowIconBox: { width: 30, alignItems: "center" },
  menuRowIconText: { fontSize: 18 },
  menuRowLabel: { flex: 1, fontSize: 15, color: "#ffffff", fontWeight: "400" },
  menuRowRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  menuRowRightText: { fontSize: 14, color: "rgba(255,255,255,0.4)" },
  menuRowChevron: { fontSize: 18, color: "rgba(255,255,255,0.25)", fontWeight: "300" },
  menuToggle: { marginLeft: "auto" as any },

  // Post detail overlay
  detailOverlay: { backgroundColor: "#0D0D0D", zIndex: 100 },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  detailBackBtn: { width: 40, height: 40, alignItems: "flex-start", justifyContent: "center" },
  detailBackIcon: { fontSize: 32, color: "#fff", fontWeight: "300", lineHeight: 36 },
  detailHeaderTitle: { fontSize: 16, fontWeight: "700", color: "#fff" },
  detailListContent: { paddingBottom: 120 },
  detailDivider: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
    marginBottom: 4,
  },
  detailDividerLabel: { fontSize: 13, color: "rgba(255,255,255,0.35)", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8 },

  // Comment rows
  commentWrap: { position: "relative" },
  commentReplyHint: { position: "absolute", right: 18, top: 0, bottom: 0, justifyContent: "center", alignItems: "center", gap: 2 },
  commentRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#0D0D0D" },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  commentAvatarText: { fontSize: 13, fontWeight: "800" },
  commentBody: { flex: 1, gap: 3 },
  commentMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  commentHandle: { fontSize: 13, fontWeight: "700", color: "#fff" },
  commentTime: { fontSize: 11, color: "rgba(255,255,255,0.3)" },
  commentText: { fontSize: 14, color: "rgba(255,255,255,0.82)", lineHeight: 20 },
  commentLikeBtn: { alignItems: "center", gap: 2, paddingLeft: 4, flexShrink: 0 },
  commentLikeIcon: { fontSize: 18, color: "rgba(255,255,255,0.3)" },
  commentLikeCount: { fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: "600" },
  commentSeparator: { height: 1, backgroundColor: "rgba(255,255,255,0.04)", marginHorizontal: 16 },

  // ── Threaded replies ────────────────────────────────────────────────────────
  repliesBlock: {
    flexDirection: "row",
    marginLeft: 52,        // align with bubble (avatar width + gap)
    marginTop: 2,
    marginBottom: 2,
  },
  threadLine: {
    width: 2,
    marginRight: 12,
    marginTop: 4,
    marginBottom: 4,
    borderRadius: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  replyRow: {
    flex: 1,
  },
  showMoreReplies: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 10,
    paddingBottom: 4,
  },
  showMoreDots: {
    flexDirection: "row",
    gap: 3,
    alignItems: "center",
  },
  showMoreDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(171,0,255,0.55)",
  },
  showMoreRepliesText: {
    fontSize: 12,
    color: "#AB00FF",
    fontWeight: "600",
  },

  // Detail reply bar
  detailReplyBarWrap: { position: "absolute", left: 16, right: 16 },
  detailReplyContext: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4, paddingBottom: 6 },
  detailReplyContextText: { fontSize: 12, color: "#AB00FF", fontWeight: "600" },
  detailReplyContextX: { fontSize: 18, color: "rgba(255,255,255,0.4)", lineHeight: 20 },
});
