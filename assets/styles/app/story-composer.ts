import { StyleSheet } from "react-native";

export const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0D0D0D", paddingTop: 50 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 10 },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  title: { color: "#fff", fontSize: 17, fontWeight: "800" },

  tabsRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  tab: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  tabActive: { backgroundColor: "#fff", borderColor: "#fff" },
  tabTxt: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: "700" },
  tabTxtActive: { color: "#0D0D0D" },

  searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginHorizontal: 16, marginTop: 10, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, color: "#fff" },

  sectionHeader: { color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", marginTop: 18, marginBottom: 6, marginHorizontal: 18 },

  trackRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  trackArt: { width: 44, height: 44, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.06)" },
  trackArtFallback: { alignItems: "center", justifyContent: "center" },
  trackName: { color: "#fff", fontSize: 14, fontWeight: "700" },
  trackArtist: { color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 2 },

  nowPlayingBadge:    { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", marginBottom: 3 },
  nowPlayingDot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: "#AB00FF" },
  nowPlayingBadgeTxt: { color: "#AB00FF", fontSize: 10, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" },

  emptyTxt: { color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "center", marginTop: 30 },

  connectWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 },
  connectTitle: { color: "#fff", fontWeight: "800", fontSize: 16, marginTop: 10 },
  connectSub: { color: "rgba(255,255,255,0.5)", fontSize: 13, textAlign: "center", marginTop: 4 },
});
