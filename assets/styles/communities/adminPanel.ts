import { StyleSheet } from "react-native";

export const adminStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0D0D0D" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 10 },
  iconCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.07)", alignItems: "center", justifyContent: "center" },
  topTitle: { fontSize: 15, fontWeight: "800", color: "#fff", letterSpacing: -0.2 },
  saveBtn: { paddingHorizontal: 16, height: 36, borderRadius: 18, backgroundColor: "#AB00FF", alignItems: "center", justifyContent: "center", minWidth: 60 },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },

  tabsRow: { gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  tabPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  tabPillActive: { backgroundColor: "rgba(171,0,255,0.14)", borderColor: "rgba(171,0,255,0.5)" },
  tabPillDanger: { backgroundColor: "rgba(255,71,87,0.12)", borderColor: "rgba(255,71,87,0.5)" },
  tabPillText: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.7)" },

  avatarPick: { alignSelf: "center", width: 100, height: 100, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center", marginBottom: 18, overflow: "visible" },
  uploadOverlay: { backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 22, alignItems: "center", justifyContent: "center" },
  bannerPick: { width: "100%", height: 120, borderRadius: 16, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.05)", marginBottom: 10 },
  bannerPickHint: { position: "absolute", left: 10, bottom: 10, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5 },
  bannerPickHintText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  colorRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  colorSwatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: "transparent" },
  colorSwatchActive: { borderColor: "#fff" },
  editBadge: { position: "absolute", right: -4, bottom: -4, width: 28, height: 28, borderRadius: 14, backgroundColor: "#AB00FF", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#0D0D0D" },

  label: { fontSize: 11, fontWeight: "800", color: "rgba(255,255,255,0.45)", letterSpacing: 1, marginTop: 14, marginBottom: 6 },
  sectionTitle: { fontSize: 11, fontWeight: "800", color: "rgba(255,255,255,0.45)", letterSpacing: 1, marginTop: 4, marginBottom: 4 },
  input: { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: "#fff", fontSize: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },

  chip: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(171,0,255,0.12)", borderWidth: 1, borderColor: "rgba(171,0,255,0.3)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  chipImg: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#222" },
  chipFallback: { backgroundColor: "rgba(171,0,255,0.18)", alignItems: "center", justifyContent: "center" },
  chipName: { flex: 1, fontSize: 14, fontWeight: "700", color: "#fff" },

  suggestBox: { backgroundColor: "#0F0F11", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: 12, marginTop: 6, overflow: "hidden" },
  suggestRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.06)" },
  suggestImg: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#222" },
  suggestName: { flex: 1, fontSize: 14, fontWeight: "600", color: "#fff" },

  toggleRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.07)" },
  toggleLabel: { fontSize: 15, fontWeight: "700", color: "#fff" },
  toggleSub: { fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 },
  helper: { fontSize: 12, color: "rgba(255,255,255,0.45)", fontWeight: "600", marginBottom: 4 },

  memberRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  memberAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#222" },
  memberName: { fontSize: 14, fontWeight: "700", color: "#fff" },
  youTag: { color: "rgba(255,255,255,0.4)", fontWeight: "600" },
  memberRole: { fontSize: 10, fontWeight: "800", color: "#AB00FF", letterSpacing: 0.8, marginTop: 2 },
  memberMenu: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },

  postRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", borderRadius: 14, padding: 12 },
  postAuthor: { fontSize: 13, fontWeight: "700", color: "#fff" },
  postText: { fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 4 },
  songChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(171,0,255,0.1)", alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 6 },
  songText: { fontSize: 11, color: "#fff", fontWeight: "600" },
  deleteIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,71,87,0.12)", alignItems: "center", justifyContent: "center" },

  dangerBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#FF4757", borderRadius: 14, paddingVertical: 14 },
  dangerBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  dangerHint: { fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 18 },
});

