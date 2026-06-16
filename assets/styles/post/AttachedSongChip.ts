import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  chip: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "rgba(29,185,84,0.08)",
    borderWidth: 1, borderColor: "rgba(29,185,84,0.25)",
    borderRadius: 14, padding: 8, marginTop: 8,
  },
  art: { width: 40, height: 40, borderRadius: 8, backgroundColor: "#1a1a1a" },
  artFallback: { backgroundColor: "rgba(29,185,84,0.18)", alignItems: "center", justifyContent: "center" },
  name: { fontSize: 13, fontWeight: "700", color: "#fff" },
  artist: { fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 1 },
  openBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
});
