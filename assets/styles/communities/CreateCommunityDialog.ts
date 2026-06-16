import { StyleSheet } from "react-native";

export const tr = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.07)" },
  label: { fontSize: 15, fontWeight: "700", color: "#fff" },
  sub: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 },
  moreToggle: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
    paddingVertical: 12, marginTop: 4,
  },
  moreToggleText: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.5)" },
});
