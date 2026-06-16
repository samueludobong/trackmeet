import { StyleSheet } from "react-native";

export const mb = StyleSheet.create({
  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12, paddingHorizontal: 12,
  },
  searchInput: { flex: 1, height: 40, color: "#fff", fontSize: 14 },
  unbanBtn: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12,
    backgroundColor: "rgba(29,185,84,0.14)",
    borderWidth: 1, borderColor: "rgba(29,185,84,0.4)",
  },
  unbanText: { fontSize: 12, fontWeight: "800", color: "#1DB954" },
});
