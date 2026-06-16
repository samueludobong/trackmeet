import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "rgba(171,0,255,0.08)",
    borderWidth: 1, borderColor: "rgba(171,0,255,0.28)",
    borderRadius: 16, paddingHorizontal: 10, paddingVertical: 10,
    // Inset to line up with the post header/text above (which pad 16px), and a
    // little bottom margin so it isn't flush against the action row.
    marginTop: 8, marginBottom: 4, marginHorizontal: 16,
  },
  playBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
  // space-between spreads the fixed-width bars evenly across the full row so
  // the waveform fills the width instead of clumping on the left.
  barsWrap: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 26 },
  time: { fontSize: 11, color: "rgba(255,255,255,0.6)", fontVariant: ["tabular-nums"], fontWeight: "700", minWidth: 64, textAlign: "right" },
});
