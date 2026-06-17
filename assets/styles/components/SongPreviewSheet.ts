import { StyleSheet, Dimensions } from "react-native";

const ART_SIZE = Math.min(Dimensions.get("window").width - 80, 220);

export const ps = StyleSheet.create({
  root: { zIndex: 300 },

  sheet: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    backgroundColor: "#1A1A1C",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingBottom: 44,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderBottomWidth: 0,
  },

  handle: {
    width: 38, height: 4, borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginTop: 12, marginBottom: 26,
  },

  artWrap:    { marginBottom: 20 },
  art:        { width: ART_SIZE, height: ART_SIZE, borderRadius: 20 },
  artFallback:{
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center", justifyContent: "center",
  },

  trackName: {
    fontSize: 20, fontWeight: "800", color: "#fff",
    textAlign: "center", marginBottom: 5, alignSelf: "stretch",
  },
  artist: {
    fontSize: 14, color: "rgba(255,255,255,0.45)",
    textAlign: "center", marginBottom: 22, alignSelf: "stretch",
  },

  progressTrack: {
    alignSelf: "stretch", height: 3,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 2, marginBottom: 6,
  },
  progressFill: { height: 3, backgroundColor: "#1DB954", borderRadius: 2 },

  times: {
    alignSelf: "stretch",
    flexDirection: "row", justifyContent: "space-between",
    marginBottom: 22,
  },
  time: { fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: "600" },

  playBtn: {
    width: 62, height: 62, borderRadius: 31,
    backgroundColor: "#1DB954",
    alignItems: "center", justifyContent: "center",
    marginBottom: 28,
  },

  loadingWrap: {
    height: 90, alignItems: "center", justifyContent: "center",
  },
  noPreview: {
    fontSize: 13, color: "rgba(255,255,255,0.3)", textAlign: "center",
  },

  actions: {
    flexDirection: "row", gap: 12, alignSelf: "stretch",
  },
  openBtn: {
    flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8,
    height: 48, borderRadius: 14,
    backgroundColor: "rgba(29,185,84,0.12)",
    borderWidth: 1, borderColor: "rgba(29,185,84,0.3)",
  },
  openBtnText: { fontSize: 14, fontWeight: "700", color: "#1DB954" },
  saveBtn: {
    flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8,
    height: 48, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  savedBtn:     { backgroundColor: "rgba(29,185,84,0.12)", borderColor: "rgba(29,185,84,0.3)" },
  saveBtnText:  { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.5)" },
  savedBtnText: { color: "#1DB954" },
});
