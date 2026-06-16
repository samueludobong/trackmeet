import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  slugRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14, paddingHorizontal: 12,
  },
  slugPrefix: { color: "rgba(255,255,255,0.45)", fontWeight: "800", fontSize: 15 },
  slugInput: { flex: 1, paddingVertical: 12, color: "#fff", fontSize: 14, fontWeight: "600" },
  errText: { fontSize: 12, color: "#FF4757", marginTop: 4, fontWeight: "600" },

  genreWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  genreChip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  genreChipActive: { backgroundColor: "rgba(171,0,255,0.18)", borderColor: "rgba(171,0,255,0.5)" },
  genreChipText: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.7)" },
  genreChipTextActive: { color: "#fff" },
  helper: { fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 6, fontWeight: "600" },

  bannerWrap: {
    width: "100%", height: 110, borderRadius: 14, overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.05)", marginBottom: 8,
  },
  bannerHint: {
    position: "absolute", left: 10, bottom: 10,
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5,
  },
  bannerHintText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  uploadOverlay: { backgroundColor: "rgba(0,0,0,0.5)" },
  colorRow: { flexDirection: "row", gap: 8 },
  swatch: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 2, borderColor: "transparent",
  },
  swatchActive: { borderColor: "#fff" },
});
