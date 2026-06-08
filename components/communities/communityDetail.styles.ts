import { StyleSheet } from "react-native";

export const detailStyles = StyleSheet.create({
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
  topTitle: {
    flex: 1, textAlign: "center", fontSize: 14, fontWeight: "700",
    color: "rgba(255,255,255,0.55)", letterSpacing: -0.2,
  },
  nameBlock: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, marginTop: 16 },
  description: {
    paddingHorizontal: 20, marginTop: 16,
    fontSize: 14, lineHeight: 21,
    color: "rgba(255,255,255,0.75)", fontWeight: "500",
  },
  communityName: { fontSize: 24, fontWeight: "900", color: "#fff", letterSpacing: -0.5, lineHeight: 28 },
  communityHandle: { fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 2, fontWeight: "600" },
  genreRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 20, marginTop: 12 },
  genrePill: {
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8,
  },
  genrePillText: { color: "#fff", fontSize: 11, fontWeight: "700" },

  statsRow: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 20, marginTop: 18, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)",
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)",
  },
  stat: { flex: 1 },
  statNumber: { fontSize: 20, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },
  statLabel: { fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 3, fontWeight: "700", letterSpacing: 0.3 },
  statDivider: { width: 1, height: 30, backgroundColor: "rgba(255,255,255,0.08)" },

  composer: {
    marginHorizontal: 16, marginTop: 18,
    backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 20,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    flexDirection: "row", alignItems: "center",
    paddingLeft: 16, paddingRight: 6, paddingVertical: 6, gap: 8,
  },
  composerInput: { flex: 1, fontSize: 14, color: "#fff", maxHeight: 80, paddingVertical: 6 },
  postBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#AB00FF", alignItems: "center", justifyContent: "center",
  },

  empty: { alignItems: "center", paddingTop: 36, gap: 12 },
  emptyText: { fontSize: 15, color: "rgba(255,255,255,0.3)" },
});
