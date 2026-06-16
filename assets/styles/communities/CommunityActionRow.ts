import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, marginTop: 14 },
  joinPill: {
    paddingHorizontal: 22, paddingVertical: 11, borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
  },
  joinPillActive: { backgroundColor: "rgba(171,0,255,0.18)", borderColor: "rgba(171,0,255,0.5)" },
  joinText: { fontSize: 14, fontWeight: "800", color: "#fff" },
  joinTextActive: { color: "#AB00FF" },

  iconBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  iconBtnActive: { backgroundColor: "rgba(171,0,255,0.12)", borderColor: "rgba(171,0,255,0.45)" },
  iconBtnAdmin: { backgroundColor: "rgba(171,0,255,0.18)", borderColor: "rgba(171,0,255,0.45)" },
});
