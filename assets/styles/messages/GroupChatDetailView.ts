import { StyleSheet } from "react-native";

export const g = StyleSheet.create({
  headerAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },

  tabBar: { flexDirection: "row", paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" },
  tab: { paddingHorizontal: 14, paddingVertical: 12, alignItems: "center" },
  tabText: { fontSize: 14, fontWeight: "800", color: "rgba(255,255,255,0.45)" },
  tabUnderline: { height: 2.5, borderRadius: 2, marginTop: 7, width: "100%", position: "absolute", bottom: 0 },

  row: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 2 },
  rowMe: { justifyContent: "flex-end" },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#222" },
  senderName: { fontSize: 12, fontWeight: "800", marginBottom: 3, marginLeft: 2 },

  locked: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.07)" },
  lockedText: { fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: "600" },

  emptyText: { fontSize: 14, color: "rgba(255,255,255,0.35)", textAlign: "center", marginTop: 40, paddingHorizontal: 30, lineHeight: 20 },
  sectionLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.9, color: "rgba(255,255,255,0.4)" },

  // Events
  eventCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(255,255,255,0.045)", borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  eventDate: { width: 50, height: 54, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  eventMonth: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  eventDay: { fontSize: 20, fontWeight: "800", color: "#fff" },
  eventTitle: { fontSize: 15, fontWeight: "700", color: "#fff", flexShrink: 1 },
  eventTime: { fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2 },
  eventDesc: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4, lineHeight: 16 },

  // Polls
  pollCard: { backgroundColor: "rgba(255,255,255,0.045)", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  pollQ: { flex: 1, fontSize: 15, fontWeight: "800", color: "#fff", lineHeight: 20 },
  pollOption: { borderRadius: 12, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  pollFill: { position: "absolute", top: 0, bottom: 0, left: 0 },
  pollOptionRow: { flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 12, paddingVertical: 11 },
  pollOptText: { flex: 1, fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.85)" },
  pollPct: { fontSize: 13, fontWeight: "800", color: "rgba(255,255,255,0.5)" },
  pollMeta: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 10, fontWeight: "600" },

  // Media
  mediaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  mediaCell: { width: "31.5%", aspectRatio: 1, borderRadius: 12, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.06)" },

  fab: { position: "absolute", right: 18, bottom: 24, width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
});
