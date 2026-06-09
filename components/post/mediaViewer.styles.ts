import { Dimensions, StyleSheet } from "react-native";

const { width: SW, height: SH } = Dimensions.get("window");
// PEEK is set per-post in MediaViewer (taller for videos to fit the scrub bar).
export const PEEK_IMAGE = 232;
export const PEEK_VIDEO = 312;
export const EXPANDED = Math.round(SH * 0.62);
export { SW, SH };

export const mvStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  topBar: {
    position: "absolute", top: 0, left: 0, right: 0, zIndex: 5,
    flexDirection: "row", justifyContent: "space-between",
    paddingHorizontal: 14, paddingBottom: 10,
  },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(40,40,40,0.85)", alignItems: "center", justifyContent: "center" },

  pager: {},
  page: { width: SW, alignItems: "center", justifyContent: "center" },
  media: { width: SW, height: "100%" },
  centerPlayOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  centerPlayBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
  dots: { position: "absolute", left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.4)" },
  dotActive: { backgroundColor: "#fff", width: 16 },

  sheet: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    height: EXPANDED, backgroundColor: "#0A0A0A",
    borderTopLeftRadius: 18, borderTopRightRadius: 18,
  },
  grabZone: { alignItems: "center", paddingTop: 7, paddingBottom: 4 },
  grabber: { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.28)" },

  headRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#222" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  author: { fontSize: 15, fontWeight: "800", color: "#fff", letterSpacing: -0.2 },
  handle: { fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 1 },
  followBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 16, backgroundColor: "#fff" },
  followText: { color: "#000", fontWeight: "800", fontSize: 13 },

  body: { fontSize: 15, color: "#fff", lineHeight: 21, fontWeight: "600" },
  timeMeta: { fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 12 },

  actions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  actionsFlat: { paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(255,255,255,0.12)" },
  action: { flexDirection: "row", alignItems: "center", gap: 7 },
  actionPill: { backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 18, paddingHorizontal: 12, paddingVertical: 7 },
  actionCircle: { width: 36, height: 36, borderRadius: 18, paddingHorizontal: 0, justifyContent: "center" },
  actionText: { color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: "700" },

  scrubInline: { marginHorizontal: -16, marginTop: 4 },
  replyBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.1)",
  },
  replyAvatar: { width: 32, height: 32, borderRadius: 16 },
  replyInput: { flex: 1, color: "#fff", fontSize: 15, paddingVertical: 9 },
});
