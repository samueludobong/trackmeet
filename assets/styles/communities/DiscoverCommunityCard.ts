import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1A1A1A", borderRadius: 16, padding: 14, gap: 10,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  head: { flexDirection: "row", alignItems: "center", gap: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { fontSize: 15, fontWeight: "800", color: "#fff", letterSpacing: -0.2, maxWidth: 150 },
  members: { fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2, fontWeight: "600" },
  description: { fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 17 },
  joinBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16,
    backgroundColor: "#AB00FF",
  },
  joinBtnActive: { backgroundColor: "rgba(255,255,255,0.08)" },
  joinText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  joinTextActive: { color: "rgba(255,255,255,0.7)" },
  trendingBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "#FF6C1A", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  trendingText: { color: "#fff", fontSize: 9, fontWeight: "900", letterSpacing: 0.3 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  tagText: { color: "#fff", fontSize: 10, fontWeight: "700" },
});
