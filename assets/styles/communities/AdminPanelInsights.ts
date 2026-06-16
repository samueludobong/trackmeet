import { StyleSheet } from "react-native";

export const st = StyleSheet.create({
  totalsRow: { flexDirection: "row", gap: 10 },
  totalCard: {
    flex: 1, gap: 4,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14, padding: 12,
  },
  totalValue: { fontSize: 20, fontWeight: "800", color: "#fff" },
  totalLabel: { fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: "600" },

  chartRow: {
    flexDirection: "row", alignItems: "flex-end", gap: 6,
    marginTop: 8, paddingHorizontal: 2,
  },
  chartCol: { flex: 1, alignItems: "center", gap: 4 },
  chartValue: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.5)", height: 14 },
  chartTrack: { width: "100%", height: 72, justifyContent: "flex-end" },
  chartBar: { width: "100%", borderRadius: 4, minHeight: 3 },
  chartDay: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.4)" },

  posterRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  posterRank: { width: 26, fontSize: 13, fontWeight: "800", color: "rgba(255,255,255,0.4)" },
  posterAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#222" },
  posterName: { flex: 1, fontSize: 14, fontWeight: "700", color: "#fff" },
  posterCount: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.5)" },
});
