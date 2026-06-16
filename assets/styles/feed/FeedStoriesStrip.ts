import { StyleSheet } from "react-native";

export const s = StyleSheet.create({
  npCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 14,
  },
  npArt:         { width: 44, height: 44, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.06)" },
  npArtFallback: { alignItems: "center", justifyContent: "center" },
  npLabel:       { color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
  npTitle:       { color: "#fff", fontSize: 14, fontWeight: "700", marginTop: 2 },
  npSubtitle:    { color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 1 },
  npShareBtn:    { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  npShareTxt:    { color: "#0D0D0D", fontSize: 12, fontWeight: "800" },
});
