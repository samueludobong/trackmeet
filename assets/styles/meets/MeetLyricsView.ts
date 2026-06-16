import { StyleSheet } from "react-native";

const SHADOW = { textShadowColor: "rgba(0,0,0,0.6)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 };

export const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 6, paddingBottom: 6 },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerText: { fontSize: 14, fontWeight: "800", color: "#fff", ...SHADOW },
  body: { flex: 1, paddingHorizontal: 22 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  empty: { fontSize: 22, fontWeight: "800", color: "#fff", textAlign: "center", lineHeight: 30, ...SHADOW },
  line: { fontSize: 26, fontWeight: "800", letterSpacing: -0.4, lineHeight: 33, marginVertical: 9, ...SHADOW },
  active: { color: "#fff" },
  idle: { color: "rgba(255,255,255,0.4)" },
  plain: { fontSize: 20, lineHeight: 28, color: "rgba(255,255,255,0.9)", marginVertical: 3, fontWeight: "700" },
});
