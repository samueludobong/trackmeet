import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0D0D0D" },
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 10,
  },
  iconCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center", justifyContent: "center",
  },
  topTitle: { flex: 1, textAlign: "center", fontSize: 14, fontWeight: "700", color: "#fff" },

  card: {
    flex: 1, backgroundColor: "#1A1A1A", borderRadius: 16, padding: 10, gap: 10,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  art: { width: "100%", aspectRatio: 1, borderRadius: 10, backgroundColor: "#222" },
  artFallback: { alignItems: "center", justifyContent: "center", backgroundColor: "rgba(171,0,255,0.18)" },
  meta: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatar: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#222" },
  avatarFallback: { backgroundColor: "rgba(171,0,255,0.5)", alignItems: "center", justifyContent: "center" },
  name: { fontSize: 13, fontWeight: "700", color: "#fff" },
  song: { fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 1 },

  followBtn: {
    paddingVertical: 8, borderRadius: 12,
    backgroundColor: "#AB00FF", alignItems: "center",
  },
  followBtnActive: { backgroundColor: "rgba(255,255,255,0.08)" },
  followText: { fontSize: 12, fontWeight: "800", color: "#fff" },
  followTextActive: { color: "rgba(255,255,255,0.7)" },
});
