import { StyleSheet } from "react-native";

const ACCENT = "#AB00FF";

export const s = StyleSheet.create({
  sheet: {
    position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "88%",
    backgroundColor: "#161618", borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderTopWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 20, paddingBottom: 24,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  cancel: { color: "rgba(255,255,255,0.55)", fontSize: 15, fontWeight: "600" },
  title: { color: "#fff", fontSize: 16, fontWeight: "800" },
  save: { color: ACCENT, fontSize: 15, fontWeight: "800" },

  label: { fontSize: 11, fontWeight: "800", letterSpacing: 0.9, color: "rgba(255,255,255,0.4)", marginBottom: 8, marginTop: 14 },
  input: {
    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: "#fff", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  chipRow: { gap: 8, paddingRight: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  chipActive: { backgroundColor: "rgba(171,0,255,0.18)", borderColor: ACCENT },
  chipText: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.6)" },
  chipTextActive: { color: "#fff" },

  meetRow: { flexDirection: "row", alignItems: "center", marginTop: 20, paddingVertical: 8 },
  meetLabel: { fontSize: 15, fontWeight: "700", color: "#fff" },
  meetSub: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 },
  preview: { marginTop: 16, fontSize: 13, fontWeight: "700", color: ACCENT, textAlign: "center" },
});
