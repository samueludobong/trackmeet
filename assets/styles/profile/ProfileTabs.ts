import { StyleSheet } from "react-native";

export const cStyles = StyleSheet.create({
  createBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 13, borderRadius: 14,
    backgroundColor: "rgba(171,0,255,0.08)", borderWidth: 1, borderColor: "rgba(171,0,255,0.25)",
  },
  createBtnText: { fontSize: 15, fontWeight: "800", color: "#AB00FF" },
  avatar: { width: 46, height: 46, borderRadius: 14, backgroundColor: "#1A1A1C" },
  avatarFallback: { alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
});
