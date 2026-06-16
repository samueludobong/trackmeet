import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  section: { marginTop: 4, marginBottom: 18 },
  header: {
    fontSize: 14, fontWeight: "800", color: "#fff",
    paddingHorizontal: 20, marginBottom: 10, letterSpacing: -0.2,
  },
  row: { paddingHorizontal: 16, gap: 12 },
  item: { width: 64, alignItems: "center", gap: 6 },
  unreadDot: {
    position: "absolute", top: -2, right: -2,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: "#AB00FF",
    borderWidth: 2, borderColor: "#0D0D0D",
  },
  name: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.75)", maxWidth: 64, textAlign: "center" },
});
