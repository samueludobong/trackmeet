import { StyleSheet, Platform, Dimensions } from "react-native";
import { SW, SH, NAVBAR_H, BOTTOM_INSET, COMPOSER_ABOVE_NAV, COLLAGE_W, COLLAGE_GAP } from "../../../lib/feed/dimensions";
import { STREAM_CARD_GAP, STREAM_CARD_W, WAVE_HEIGHTS, CARD_AVATAR_SIZE, CARD_AVATAR_OVERLAP, CARD_BANNER_H, MSG_HEADER_H, TOGGLE_W, TOGGLE_H, THUMB_SIZE, THUMB_TRAVEL, PROFILE_BANNER_H, PROFILE_AVATAR_SIZE, PROFILE_AVATAR_OVERLAP, SWATCH_SIZE } from "../../../constants/feedLayout";

// Component-scoped StyleSheets extracted from app/feed.tsx.

/** Used by components/meets/StartMeetOverlay.tsx (create-meet sheet). */
export const csStyles = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(0,0,0,0.65)" },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0, height: "90%",
    backgroundColor: "#111113",
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    overflow: "hidden",
    borderTopWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)",
  },
  title: { fontSize: 16, fontWeight: "700", color: "#fff" },
  cancelBtn: { fontSize: 15, color: "rgba(255,255,255,0.5)" },
  postBtn: {
    backgroundColor: "#AB00FF", borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 7,
    minWidth: 56, alignItems: "center",
  },
  postBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },

  composeRow: { flexDirection: "row", alignItems: "flex-start", padding: 18, gap: 12 },
  avatar: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: "#AB00FF",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
    overflow: "hidden",
  },
  avatarInitials: { fontSize: 16, fontWeight: "800", color: "#fff" },
  textInput: {
    flex: 1, fontSize: 16, color: "#fff",
    lineHeight: 24, minHeight: 80,
    textAlignVertical: "top",
  },

  imageStrip: { paddingHorizontal: 18, paddingBottom: 16, gap: 10, flexDirection: "row", alignItems: "center" },
  thumbImage: { width: 88, height: 88, borderRadius: 12 },
  thumbRemove: {
    position: "absolute", top: 4, right: 4,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center", justifyContent: "center",
  },
  thumbRemoveText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  thumbAdd: {
    width: 88, height: 88, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    borderStyle: "dashed",
    alignItems: "center", justifyContent: "center",
  },

  pollSection: { paddingHorizontal: 18, paddingBottom: 12, gap: 10 },
  pollQuestion: {
    backgroundColor: "#1A1A1C", borderRadius: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    color: "#fff", fontSize: 16, fontWeight: "600",
    paddingHorizontal: 16, paddingVertical: 13,
  },
  pollOptionRow: { flexDirection: "row", alignItems: "center" },
  pollOptionInput: {
    flex: 1, backgroundColor: "#1A1A1C", borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    color: "#fff", fontSize: 14,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  addOptionBtn: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 10, paddingHorizontal: 4,
  },
  addOptionText: { fontSize: 14, color: "#AB00FF", fontWeight: "600" },

  toolbar: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.07)",
    gap: 4,
  },
  toolBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
  },
  toolBtnActive: { backgroundColor: "rgba(171,0,255,0.12)" },
  audienceChip: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  audienceText: { fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: "600" },

  // â”€â”€â”€ Media source picker panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  mediaPicker: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.12)",
    paddingVertical: 16, paddingHorizontal: 16,
  },
  mediaPickerBtn: { flex: 1, alignItems: "center", gap: 7 },
  mediaPickerLabel: { color: "#fff", fontSize: 12, fontWeight: "600", opacity: 0.85 },
  mediaPickerDivider: {
    width: StyleSheet.hairlineWidth, height: 38,
    backgroundColor: "rgba(255,255,255,0.15)", marginHorizontal: 6,
  },
  mediaPickerClose: { paddingLeft: 14, paddingRight: 2, alignSelf: "center" },
});
