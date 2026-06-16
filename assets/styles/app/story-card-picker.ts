import { StyleSheet } from "react-native";

export const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0D0D0D", paddingTop: 50, paddingBottom: 32 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 10 },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  title: { color: "#fff", fontSize: 17, fontWeight: "800" },

  helper: { color: "rgba(255,255,255,0.4)", fontSize: 11, textAlign: "center", marginTop: 14, marginHorizontal: 28 },

  thumbWrap: { padding: 6, borderRadius: 18, alignItems: "center", borderWidth: 2, borderColor: "transparent", gap: 6 },
  thumbWrapActive: { borderColor: "#AB00FF" },
  thumbLabel: { color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: "700" },

  durationLabel: { color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: "700", textAlign: "center", marginBottom: 10, letterSpacing: 0.4, textTransform: "uppercase" },
  durationRow: { flexDirection: "row", justifyContent: "center", gap: 10, marginBottom: 20 },
  durationChip: {
    minWidth: 64, paddingVertical: 10, borderRadius: 999, alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.12)",
  },
  durationChipActive: { backgroundColor: "rgba(171,0,255,0.18)", borderColor: "#AB00FF" },
  durationChipTxt: { color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: "800" },

  postBtn: { backgroundColor: "#fff", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 16, paddingVertical: 14, borderRadius: 999 },
  postBtnTxt: { color: "#0D0D0D", fontSize: 14, fontWeight: "800" },
});
