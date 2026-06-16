import { StyleSheet, Platform, Dimensions } from "react-native";
import { SW, SH, NAVBAR_H, BOTTOM_INSET, COMPOSER_ABOVE_NAV, COLLAGE_W, COLLAGE_GAP } from "../../../../lib/feed/dimensions";
import { STREAM_CARD_GAP, STREAM_CARD_W, WAVE_HEIGHTS, CARD_AVATAR_SIZE, CARD_AVATAR_OVERLAP, CARD_BANNER_H, MSG_HEADER_H, TOGGLE_W, TOGGLE_H, THUMB_SIZE, THUMB_TRAVEL, PROFILE_BANNER_H, PROFILE_AVATAR_SIZE, PROFILE_AVATAR_OVERLAP, SWATCH_SIZE } from "../../../../constants/feedLayout";

// Component-scoped StyleSheets extracted from app/feed.tsx.


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


export const msgStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    height: MSG_HEADER_H,
  },
  dropdownTrigger: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerTitle: { fontSize: 32, fontWeight: "900", color: "#fff", letterSpacing: -0.5 },

  dropdown: {
    position: "absolute",
    top: MSG_HEADER_H,
    left: 16,
    right: 16,
    backgroundColor: "#1C1C1E",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  dropdownRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 15 },
  dropdownRowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  dropdownRowActive: { backgroundColor: "rgba(171,0,255,0.1)" },
  dropdownRowText: { fontSize: 16, fontWeight: "600", color: "rgba(255,255,255,0.4)" },
  dropdownRowTextActive: { color: "#fff" },
  dropdownBadge: { backgroundColor: "#E8000F", borderRadius: 10, minWidth: 22, height: 22, alignItems: "center", justifyContent: "center", paddingHorizontal: 7 },
  dropdownBadgeActive: { backgroundColor: "#AB00FF" },
  dropdownBadgeText: { fontSize: 11, color: "#fff", fontWeight: "800" },

  // Account red-dot beside the header title (unread nudge, IG-style).
  headerRedDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#E8000F", marginLeft: 8, marginTop: 4 },

  // Search pill below the header.
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginHorizontal: 14,
    marginTop: 2,
    marginBottom: 6,
    height: 40,
    borderRadius: 12,
    paddingHorizontal: 13,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  searchPlaceholder: { fontSize: 15, color: "rgba(255,255,255,0.4)" },

  // "Messages | Requests" sub-header above the thread list.
  listHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  listHeaderActive: { fontSize: 16, fontWeight: "800", color: "#fff", letterSpacing: -0.2 },
  listHeaderMuted: { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.45)" },

  // ── Direct messages ──
  dmRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 9,
    gap: 13,
  },
  dmAvatarWrap: { position: "relative" },
  dmAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  dmAvatarText: { fontSize: 18, fontWeight: "800", color: "#AB00FF" },
  onlineDot: {
    position: "absolute",
    bottom: 1, right: 1,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: "#2ED158",
    borderWidth: 2.5, borderColor: "#0D0D0D",
  },
  dmContent: { flex: 1, gap: 3 },
  dmName: { fontSize: 15, fontWeight: "700", color: "#fff" },
  dmNameRead: { fontWeight: "600", color: "rgba(255,255,255,0.92)" },
  dmPreview: { fontSize: 13.5, color: "rgba(255,255,255,0.5)" },
  dmPreviewRead: { color: "rgba(255,255,255,0.32)" },
  // Unread indicator dot on the right of a thread row.
  dmUnreadDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#AB00FF", marginLeft: 8 },

  // ── Group chats ──
  gcRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  gcAvatarStack: { width: 52, height: 52, position: "relative" },
  gcAvatarBack: {
    position: "absolute",
    bottom: 0, right: 0,
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 2, borderColor: "#0D0D0D",
    overflow: "hidden",
  },
  gcAvatarFront: {
    position: "absolute",
    top: 0, left: 0,
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 2, borderColor: "#0D0D0D",
    overflow: "hidden",
  },
  gcContent: { flex: 1 },
  gcTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 3 },
  gcName: { fontSize: 15, fontWeight: "600", color: "rgba(255,255,255,0.5)", flex: 1, marginRight: 8 },
  gcNameUnread: { color: "#fff", fontWeight: "800" },
  gcTime: { fontSize: 12, color: "rgba(255,255,255,0.28)" },
  gcBottomRow: { flexDirection: "row", alignItems: "flex-start" },
  gcPreview: { fontSize: 13, color: "rgba(255,255,255,0.28)" },
  gcPreviewUnread: { color: "rgba(255,255,255,0.55)" },
  gcSender: { fontWeight: "700", color: "rgba(255,255,255,0.45)" },
  gcMemberCount: { fontSize: 11, color: "rgba(255,255,255,0.22)", marginTop: 2 },
  gcUnreadBadge: {
    backgroundColor: "#FF6B35",
    borderRadius: 10, minWidth: 20, height: 20,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 6, marginLeft: 10, marginTop: 1,
  },
  gcUnreadBadgeText: { fontSize: 11, color: "#fff", fontWeight: "800" },

  // ── Community ──
  communityCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    padding: 16,
    gap: 12,
  },
  communityTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  communityLeftMeta: { flexDirection: "row", alignItems: "center", flex: 1 },
  activeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#00E5A0" },
  activeText: { fontSize: 12, color: "#00E5A0", fontWeight: "700", marginLeft: 5 },
  viewerStack: { flexDirection: "row" },
  viewerAvatarWrap: {
    marginLeft: -5,
    borderRadius: 9,
    borderWidth: 1.5, borderColor: "#0D0D0D",
    overflow: "hidden",
    width: 18, height: 18,
  },
  followerCount: { fontSize: 12, color: "rgba(255,255,255,0.35)", marginLeft: 8 },
  followCommunityBtn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#AB00FF",
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
  },
  followCommunityBtnActive: { backgroundColor: "rgba(171,0,255,0.15)", borderWidth: 1, borderColor: "#AB00FF" },
  followCommunityText: { fontSize: 13, color: "#fff", fontWeight: "700" },
  communityTitle: { fontSize: 20, fontWeight: "900", color: "#fff", letterSpacing: -0.3, lineHeight: 26 },
  communityTagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  communityTag: { backgroundColor: "rgba(202,255,0,0.08)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  communityTagText: { fontSize: 12, color: "#CAFF00", fontWeight: "700" },
  communityDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.06)" },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  authorName: { fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: "700" },
  authorFollowers: { fontSize: 11, color: "rgba(255,255,255,0.25)" },
  authorDate: { fontSize: 12, color: "rgba(255,255,255,0.25)" },

  // ── Now Playing strip — styled as IG "notes" (a song "note" floating above
  //    each listener's avatar, with the person's name beneath) ──
  nowPlayingSection: { paddingTop: 6, paddingBottom: 12 },
  nowPlayingRow: { paddingHorizontal: 14, gap: 12, alignItems: "flex-start" },

  noteItem: { alignItems: "center", width: 76 },
  // Fixed-height slot so 1- and 2-line notes still line their avatars up.
  noteBubbleSlot: { height: 44, justifyContent: "flex-end", alignItems: "center", marginBottom: 5 },
  noteBubble: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    maxWidth: 92,
    minWidth: 52,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 15,
    paddingHorizontal: 11,
    paddingVertical: 6,
    position: "relative",
  },
  noteBubbleText: { fontSize: 11, lineHeight: 13.5, fontWeight: "600", color: "rgba(255,255,255,0.92)", textAlign: "center", flexShrink: 1 },
  // Tiny album-art thumb inside a song note's bubble.
  noteBubbleArt: { width: 14, height: 14, borderRadius: 3, marginRight: 5 },
  // Two descending circles form the speech-bubble tail toward the avatar.
  noteTailBig:   { position: "absolute", bottom: -4, left: 16, width: 9, height: 9, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.14)" },
  noteTailSmall: { position: "absolute", bottom: -10, left: 12, width: 5, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.14)" },
  noteAvatarWrap: { width: 64, height: 64, position: "relative" },
  noteAvatar: { width: 64, height: 64, borderRadius: 32 },
  // Live broadcasts get a green ring so they read differently from notes.
  noteAvatarLiveRing: { borderWidth: 2.5, borderColor: "#2ED158" },
  noteAvatarFallback: { backgroundColor: "rgba(171,0,255,0.18)", alignItems: "center", justifyContent: "center" },
  noteAvatarInitials: { fontSize: 22, fontWeight: "800", color: "#AB00FF" },
  // Bottom-right corner badge shared by the +/edit (notes) and live indicators.
  noteCornerBadge: {
    position: "absolute",
    bottom: 0, right: 0,
    alignItems: "center", justifyContent: "center",
    borderWidth: 3, borderColor: "#0D0D0D",
  },
  noteAddBadge:  { width: 24, height: 24, borderRadius: 12, backgroundColor: "#AB00FF" },
  noteLiveBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#2ED158" },
  // Small green "now playing" pill that fills a live entry's bubble slot.
  liveSongPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    maxWidth: 90,
    backgroundColor: "rgba(46,209,88,0.16)",
    borderRadius: 17, paddingHorizontal: 8, paddingVertical: 8,
  },
  liveSongPillText: { fontSize: 10.5, fontWeight: "700", color: "#2ED158", flexShrink: 1 },
  noteName: { fontSize: 12, color: "rgba(255,255,255,0.55)", textAlign: "center", marginTop: 7, maxWidth: 74 },
  noteEmpty: { paddingHorizontal: 16, paddingVertical: 10, color: "rgba(255,255,255,0.35)", fontSize: 13 },
});


export const chatStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  backBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, minWidth: 0 },
  headerOnlineDot: {
    position: "absolute", bottom: 0, right: 0,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: "#00E5A0",
    borderWidth: 2, borderColor: "#0D0D0D",
  },
  headerName: { fontSize: 15, fontWeight: "800", color: "#fff" },
  headerStatus: { fontSize: 11, color: "#00E5A0", fontWeight: "600" },

  // Start Jam pill
  jamBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#CAFF00", borderRadius: 20,
    paddingHorizontal: 11, paddingVertical: 6,
  },
  jamBtnText: { fontSize: 12, color: "#0D0D0D", fontWeight: "800" },
  // Active state when a jam is live in this conversation.
  jamBtnActive: { backgroundColor: "#AB00FF" },
  // Full-width strip under the header announcing a live jam.
  jamBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 10, marginTop: 2, marginBottom: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#AB00FF",
  },
  jamBannerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#CAFF00" },
  jamBannerText: { flex: 1, fontSize: 13.5, fontWeight: "700", color: "#fff" },
  jamBannerJoin: { backgroundColor: "rgba(255,255,255,0.22)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5 },
  jamBannerJoinText: { fontSize: 12.5, fontWeight: "800", color: "#fff" },

  // Call / video icon buttons
  headerIconBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.09)",
  },

  // Messages list
  messagesContent: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 },
  // No `gap` here — inter-message spacing is set per-row via marginTop so groups
  // can breathe differently from singles. A gap would also force space between a
  // bubble and its own timestamp / a card and its time.
  msgWrap: { alignSelf: "flex-start", maxWidth: SW * 0.74 },
  msgWrapMe: { alignSelf: "flex-end" },
  bubble: { paddingHorizontal: 14, paddingTop: 9, paddingBottom: 7, borderRadius: 20 },
  // When a bubble carries a reply quote, pin it to a fixed width so the quote
  // panel always renders at a consistent size — the body text wraps within this
  // width and the bubble height grows to fit, instead of the bubble (and quote)
  // shrinking to hug a short message.
  bubbleWithReply: { width: SW * 0.66 },
  bubbleThem: { backgroundColor: "#1C1C1E" },
  bubbleMe:   { backgroundColor: "#AB00FF" },
  // Keep the bubble hugging its own side when a detached reply card sitting
  // above it has stretched the message column wider than the bubble's text.
  bubbleSelfStart: { alignSelf: "flex-start", maxWidth: "100%" },
  bubbleSelfEnd:   { alignSelf: "flex-end",   maxWidth: "100%" },
  // X-style reply header above a reply bubble: a reply arrow + the name of the
  // person being replied to, aligned to the message's own side.
  replyHeader: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: 6, marginBottom: 3 },
  replyHeaderMe: { alignSelf: "flex-end" },
  replyHeaderName: { fontSize: 12.5, fontWeight: "600", color: "rgba(255,255,255,0.5)" },
  bubbleText: { fontSize: 16, color: "rgba(255,255,255,0.82)", lineHeight: 21, fontWeight: "700" },
  bubbleTextMe: { color: "#fff" },
  bubbleTime: { fontSize: 8, color: "rgba(255,255,255,0.3)", textAlign: "right", marginTop: 3 },
  bubbleTimeMe: { color: "rgba(255,255,255,0.55)" },

  // Input bar — no longer absolute, sits in document flow
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: BOTTOM_INSET,
    backgroundColor: "#0D0D0D",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.07)",
  },
  inputPlusBtn: { paddingBottom: 7 },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  input: { flex: 1, fontSize: 15, color: "#fff", maxHeight: 100, paddingVertical: 7 },
  inputAction: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  sendBtn: { backgroundColor: "#AB00FF", borderRadius: 15 },

  // Reply quote — nested *inside* the bubble above the body: left accent bar,
  // quoted sender name, then the quoted preview text.
  replyQuote: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderRadius: 10,
    marginBottom: 7,
    overflow: "hidden",
  },
  // On the purple "me" bubble the quote sits on a lighter translucent panel.
  replyQuoteMe: { backgroundColor: "rgba(255, 255, 255, 0.18)" },
  // Detached variant: the quote is lifted *out* of the bubble and floated above
  // it as its own card on the dark chat backdrop, with a gap to the bubble.
  // Fixed width so it reads consistently regardless of the reply's length, and
  // aligns to the message's own side.
  replyQuoteDetached: {
    width: SW * 0.78,
    alignSelf: "flex-start",
    marginBottom: 5,
    borderRadius: 50,
    paddingBottom: 3,
    paddingTop: 3,

    backgroundColor: "rgba(255, 255, 255, 0.15)",
    marginTop: 7, // lift it up to visually connect with the bubble's text
  },
  replyQuoteDetachedMe: { alignSelf: "flex-end" },
  // Replying to your own message: border-only, no fill.
  replyQuoteDetachedSelf: { backgroundColor: "transparent",borderWidth: 1.5, borderColor: "rgba(255, 255, 255, 0.35)" },
  // No accent bar on the detached card — it's a fully-rounded pill, so the body
  // carries its own horizontal inset to clear the curved ends.
  replyQuoteBodyDetached: { paddingVertical: 7, paddingHorizontal: 16 },
  // Song reply: album-art thumb + text on one row.
  replyQuoteBodyRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 8 },
  replyQuoteArt: { width: 26, height: 26, borderRadius: 5 },
  replyQuoteAccent: { width: 3, backgroundColor: "#AB00FF" },
  replyQuoteAccentMe: { backgroundColor: "rgba(255,255,255,0.85)" },
  replyQuoteBody: { flex: 1, paddingVertical: 5, paddingHorizontal: 9 },
  replyQuoteName: { fontSize: 12, fontWeight: "800", color: "#C77DFF", marginBottom: 1 },
  replyQuoteNameMe: { color: "#fff" },
  replyQuoteText: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.32)",
    lineHeight: 16,
    fontWeight: "600",
  },
  replyQuoteTextMe: { color: "rgba(255, 255, 255, 0.44)" },

  // Reply-to strip above input bar
  replyBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  replyBarAccent: { width: 3, height: 32, borderRadius: 2, backgroundColor: "#AB00FF" },
  replyBarName: { fontSize: 11, fontWeight: "700", color: "#AB00FF", marginBottom: 2 },
  replyBarPreview: { fontSize: 12, color: "rgba(255,255,255,0.5)" },
  // Song reply — album-art thumb + title · artist on one detail line.
  replyBarArt: { width: 34, height: 34, borderRadius: 5 },
  replyBarArtFallback: { backgroundColor: "rgba(171,0,255,0.18)", alignItems: "center", justifyContent: "center" },
  replyBarSongRow: { flexDirection: "row", alignItems: "center" },
  replyBarSongTitle: { fontSize: 12.5, fontWeight: "700", color: "rgba(255,255,255,0.82)", flexShrink: 1 },
  replyBarSongArtist: { fontSize: 12, color: "rgba(255,255,255,0.45)", flexShrink: 1 },

  // Typing indicator
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1C1C1E",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  typingName: { fontSize: 11, color: "rgba(255,255,255,0.3)" },
});
