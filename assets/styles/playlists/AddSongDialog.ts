import { StyleSheet } from "react-native";

const ACCENT = "#1DB954";

export const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    backgroundColor: "#10161D",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    height: "88%",
    borderTopWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22, paddingBottom: 12,
  },
  title: { color: "#fff", fontSize: 19, fontWeight: "800" },

  // â”€â”€ Now Playing banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  nowBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16, marginBottom: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: "rgba(29,185,84,0.10)",
    borderRadius: 14,
    borderWidth: 1, borderColor: "rgba(29,185,84,0.35)",
  },
  nowDot: {
    width: 7, height: 7, borderRadius: 4, backgroundColor: ACCENT,
    marginRight: 2,
  },
  nowArt: { width: 38, height: 38, borderRadius: 6 },
  nowLabel: {
    color: ACCENT, fontSize: 9, fontWeight: "800", letterSpacing: 1,
    marginBottom: 2,
  },
  nowName: { color: "#fff", fontSize: 13, fontWeight: "700" },
  nowArtist: { color: "rgba(255,255,255,0.55)", fontSize: 11, marginTop: 1 },

  // â”€â”€ Tabs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)",
    marginBottom: 8,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabText: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.4)" },
  tabTextActive: { color: "#fff" },
  tabUnderline: {
    position: "absolute",
    bottom: -1, left: "20%", right: "20%",
    height: 2, borderRadius: 2,
    backgroundColor: ACCENT,
  },

  // â”€â”€ Search â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  searchRow: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 16, marginBottom: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  searchInput: { flex: 1, color: "#fff", fontSize: 14, padding: 0 },

  // â”€â”€ Sub-header (Spotify drill-in) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  subHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 10,
  },
  subHeaderTitle: { flex: 1, color: "#fff", fontSize: 14, fontWeight: "700", marginHorizontal: 12, textAlign: "center" },

  // â”€â”€ Track row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  trackRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  trackArt: { width: 46, height: 46, borderRadius: 7 },
  trackName: { color: "#fff", fontSize: 14, fontWeight: "700" },
  trackArtist: { color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 2 },
  artFallback: {
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center", justifyContent: "center",
  },

  // â”€â”€ Playlist row (Spotify tab) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  playlistRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  playlistArt: { width: 50, height: 50, borderRadius: 8 },
  likedArt: {
    backgroundColor: "rgba(29,185,84,0.14)",
    alignItems: "center", justifyContent: "center",
  },
  playlistName: { color: "#fff", fontSize: 14, fontWeight: "700" },
  playlistMeta: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 },

  // â”€â”€ Add button â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  addBtn: {
    minWidth: 56, height: 32, borderRadius: 16,
    paddingHorizontal: 14,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  addBtnDone: {
    backgroundColor: "rgba(29,185,84,0.18)",
    borderColor: "rgba(29,185,84,0.55)",
  },
  addBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  addBtnTextDone: { color: ACCENT },

  // â”€â”€ Misc â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  emptyText: {
    color: "rgba(255,255,255,0.35)",
    textAlign: "center",
    paddingHorizontal: 22, paddingVertical: 30,
    fontSize: 13,
  },
  recsHint: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12, fontWeight: "500",
    paddingHorizontal: 22, paddingBottom: 10,
  },
});
