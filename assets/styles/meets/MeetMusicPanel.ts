import { StyleSheet, Platform, Dimensions } from "react-native";
import { SW, SH, NAVBAR_H, BOTTOM_INSET, COMPOSER_ABOVE_NAV, COLLAGE_W, COLLAGE_GAP } from "../../../lib/feed/dimensions";
import { STREAM_CARD_GAP, STREAM_CARD_W, WAVE_HEIGHTS, CARD_AVATAR_SIZE, CARD_AVATAR_OVERLAP, CARD_BANNER_H, MSG_HEADER_H, TOGGLE_W, TOGGLE_H, THUMB_SIZE, THUMB_TRAVEL, PROFILE_BANNER_H, PROFILE_AVATAR_SIZE, PROFILE_AVATAR_OVERLAP, SWATCH_SIZE } from "../../../constants/feedLayout";

// Component-scoped StyleSheets extracted from app/feed.tsx.

/** Used by components/meets/MeetMusicPanel.tsx (the music picker overlay inside MeetLiveScreen). */
export const mmStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.70)",
  },
  sheet: {
    // Fixed height anchored to the bottom. Keyboard slides over the bottom portion;
    // the inner ScrollView lets the user reach everything by scrolling.
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    height: SH * 0.85,
    backgroundColor: "#111113",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignSelf: "center",
    marginTop: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#fff" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.55)",
    marginTop: 18,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  labelMuted: { fontWeight: "400", textTransform: "none", letterSpacing: 0 },

  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#fff",
  },
  inputMultiline: {
    minHeight: 88,
    textAlignVertical: "top",
  },

  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  toggleLabel: { fontSize: 15, color: "#fff", fontWeight: "500" },

  tagInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tagInput: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: "#fff",
  },
  tagAddBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: "rgba(171,0,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(171,0,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  tagChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(171,0,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(171,0,255,0.32)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagChipText: { fontSize: 13, color: "#AB00FF", fontWeight: "600" },

  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 28,
    paddingVertical: 15,
    borderRadius: 24,
    backgroundColor: "#AB00FF",
  },
  startBtnDisabled: { opacity: 0.40 },
  startBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
});
