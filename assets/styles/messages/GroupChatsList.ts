import { StyleSheet } from "react-native";

export const s = StyleSheet.create({
  newRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 12 },
  newIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  newText: { fontSize: 15, fontWeight: "800", color: "#fff" },

  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 11 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  name: { fontSize: 15, fontWeight: "800", color: "#fff", flex: 1 },
  time: { fontSize: 12, color: "rgba(255,255,255,0.35)" },
  preview: { fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 2 },

  emptyTitle: { fontSize: 16, fontWeight: "700", color: "rgba(255,255,255,0.45)" },
  emptySub: { fontSize: 13, color: "rgba(255,255,255,0.3)", textAlign: "center", lineHeight: 18 },
});
