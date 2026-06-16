import { StyleSheet } from "react-native";

export const x = StyleSheet.create({
  rulesCard: {
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: "rgba(171,0,255,0.06)",
    borderWidth: 1, borderColor: "rgba(171,0,255,0.2)",
    borderRadius: 14, padding: 12,
  },
  rulesHead: { flexDirection: "row", alignItems: "center", gap: 7 },
  rulesTitle: { flex: 1, fontSize: 13, fontWeight: "800", color: "#fff" },
  rulesBody: { fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 19, marginTop: 10 },

  composerIconBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center", justifyContent: "center",
    alignSelf: "flex-end", marginBottom: 2,
  },
  announceNote: {
    fontSize: 11, fontWeight: "700", color: "#FFD24A",
    paddingHorizontal: 22, marginTop: 6,
  },

  attachedChip: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 16, marginTop: 8,
    backgroundColor: "rgba(29,185,84,0.08)",
    borderWidth: 1, borderColor: "rgba(29,185,84,0.2)",
    borderRadius: 12, padding: 8,
  },
  attachedArt: { width: 36, height: 36, borderRadius: 7 },
  attachedName: { fontSize: 13, fontWeight: "700", color: "#fff" },
  attachedArtist: { fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 1 },

  songSearch: {
    marginHorizontal: 16, marginTop: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14, padding: 8, gap: 6,
  },
  songSearchRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 8,
  },
  songSearchInput: { flex: 1, height: 38, color: "#fff", fontSize: 13 },
  songResult: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 8, paddingVertical: 6,
    borderRadius: 10,
  },
});
