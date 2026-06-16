import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  section: { marginTop: 18 },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, marginBottom: 10,
  },
  title: { fontSize: 14, fontWeight: "800", color: "#fff", letterSpacing: -0.2 },
  seeAll: { fontSize: 12, fontWeight: "700", color: "#AB00FF" },

  row: { paddingHorizontal: 16, gap: 10 },
  card: { width: 72, alignItems: "flex-start" },
  art: { width: 72, height: 72, borderRadius: 12, backgroundColor: "#1A1A1A" },
  artFallback: { alignItems: "center", justifyContent: "center", backgroundColor: "rgba(171,0,255,0.18)" },
  avatar: {
    position: "absolute", left: 4, top: 50,
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: "#0D0D0D",
    backgroundColor: "#1A1A1A",
  },
  avatarFallback: { backgroundColor: "rgba(171,0,255,0.5)", alignItems: "center", justifyContent: "center" },
  song: { width: 72, marginTop: 6, fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.75)" },

  emptyBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16, paddingVertical: 14, paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  emptyText: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.45)" },
});
