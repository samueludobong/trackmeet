import { StyleSheet } from "react-native";

const ACCENT = "#AB00FF";

export const s = StyleSheet.create({
  sheet: {
    position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "88%",
    backgroundColor: "#161618", borderTopLeftRadius: 28, borderTopRightRadius: 28, borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    borderTopWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 20, paddingBottom: 24,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  cancel: { color: "rgba(255,255,255,0.55)", fontSize: 15, fontWeight: "600" },
  title: { color: "#fff", fontSize: 16, fontWeight: "800" },
  create: { color: ACCENT, fontSize: 15, fontWeight: "800" },

  label: { fontSize: 11, fontWeight: "800", letterSpacing: 0.9, color: "rgba(255,255,255,0.4)", marginBottom: 8, marginTop: 14 },
  input: {
    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: "#fff", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  removeBtn: { padding: 2 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, marginTop: 2 },
  addText: { fontSize: 14, fontWeight: "700", color: ACCENT },
});
