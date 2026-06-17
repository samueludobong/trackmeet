import { StyleSheet, Platform, Dimensions } from "react-native";
import { SW, SH, NAVBAR_H, BOTTOM_INSET, COMPOSER_ABOVE_NAV, COLLAGE_W, COLLAGE_GAP } from "../../../lib/feed/dimensions";
import { STREAM_CARD_GAP, STREAM_CARD_W, WAVE_HEIGHTS, CARD_AVATAR_SIZE, CARD_AVATAR_OVERLAP, CARD_BANNER_H, MSG_HEADER_H, TOGGLE_W, TOGGLE_H, THUMB_SIZE, THUMB_TRAVEL, PROFILE_BANNER_H, PROFILE_AVATAR_SIZE, PROFILE_AVATAR_OVERLAP, SWATCH_SIZE } from "../../../constants/feedLayout";

// Component-scoped StyleSheets extracted from app/feed.tsx.

/** Used by components/messages/MessagesView.tsx (notes strip, conversation list rows, top header). */
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

  // â”€â”€ Direct messages â”€â”€
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

  // â”€â”€ Group chats â”€â”€
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

  // â”€â”€ Now Playing strip â€” styled as IG "notes" (a song "note" floating above
  //    each listener's avatar, with the person's name beneath) â”€â”€
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
