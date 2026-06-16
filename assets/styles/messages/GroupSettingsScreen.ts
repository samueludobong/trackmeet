import { StyleSheet } from "react-native";

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0D0D0D" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingBottom: 10 },
  iconCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  topTitle: { flex: 1, fontSize: 15, fontWeight: "800", color: "#fff", textAlign: "center", marginHorizontal: 8 },

  identity: { alignItems: "center", paddingTop: 8, paddingBottom: 18, gap: 6 },
  avatar: { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  nameInput: { fontSize: 22, fontWeight: "800", color: "#fff", minWidth: 160, paddingVertical: 2 },
  nameStatic: { fontSize: 22, fontWeight: "800", color: "#fff" },
  sub: { fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: "600" },

  callRow: { flexDirection: "row", gap: 12, paddingHorizontal: 16, marginBottom: 8 },
  callBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14, paddingVertical: 13,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  callText: { fontSize: 14, fontWeight: "800" },

  section: { fontSize: 11, fontWeight: "800", letterSpacing: 0.9, color: "rgba(255,255,255,0.4)", paddingHorizontal: 16, marginTop: 22, marginBottom: 10 },
  swatchRow: { flexDirection: "row", gap: 12, paddingHorizontal: 16 },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: "transparent" },
  swatchActive: { borderColor: "#fff" },
  emojiRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 16 },
  emojiChip: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.1)" },

  lockRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginTop: 20, paddingVertical: 6 },
  lockLabel: { fontSize: 15, fontWeight: "700", color: "#fff" },
  lockSub: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 },

  empty: { fontSize: 13, color: "rgba(255,255,255,0.35)", paddingHorizontal: 16 },
  mediaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16 },
  mediaCell: { width: "22%", aspectRatio: 1, borderRadius: 10, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.06)" },
  mediaImg: { width: "100%", height: "100%" },

  memberHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingRight: 16 },
  addMemberBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 12 },
  addMemberText: { fontSize: 13, fontWeight: "800" },
  addBox: { paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12, paddingHorizontal: 12 },
  searchInput: { flex: 1, height: 42, color: "#fff", fontSize: 14 },

  memberRow: { flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 16, paddingVertical: 7 },
  memberAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#222" },
  fallback: { backgroundColor: "rgba(171,0,255,0.18)", alignItems: "center", justifyContent: "center" },
  memberName: { fontSize: 14, fontWeight: "700", color: "#fff" },
  memberHandle: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 1 },
  you: { fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: "600" },
  roleChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  roleText: { fontSize: 11, fontWeight: "800" },

  leaveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,71,87,0.4)" },
  leaveText: { fontSize: 15, fontWeight: "800", color: "#FF4757" },
  deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: "#FF4757" },
  deleteText: { fontSize: 15, fontWeight: "800", color: "#fff" },
});
