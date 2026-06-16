import { StyleSheet } from "react-native";

export const s = StyleSheet.create({
  card: { borderRadius: 28, overflow: "hidden" },

  minName:     { fontSize: 18, fontWeight: "800", letterSpacing: -0.4 },
  minSubtitle: { fontSize: 12, marginTop: 2 },

  heroTitle: { color: "#fff", fontWeight: "800", fontSize: 16, marginTop: 6, letterSpacing: -0.3 },
  heroSub:   { color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 4, textAlign: "center", lineHeight: 16 },
  heroPill:  { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center", flex: 1 },
  heroPillTxt: { color: "#fff", fontSize: 12, fontWeight: "700" },

  actionBtn:    { flex: 1, paddingVertical: 10, borderRadius: 999, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  actionBtnTxt: { fontSize: 12, fontWeight: "700" },

  profileBtn:    { borderRadius: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  profileBtnTxt: { fontSize: 13, fontWeight: "700" },
});
