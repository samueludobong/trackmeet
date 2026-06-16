import { StyleSheet } from "react-native";

const DANGER = "#ff4d6d";

export const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0, right: 0, bottom: 0,
    backgroundColor: "#1a1a1f",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 22,
  },
  iconWrap: {
    alignSelf: "center",
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "rgba(255,77,109,0.14)",
    alignItems: "center", justifyContent: "center",
    marginTop: 4, marginBottom: 14,
  },
  title: { fontSize: 18, fontWeight: "800", color: "#fff", textAlign: "center", marginBottom: 6 },
  subtitle: {
    fontSize: 13, color: "rgba(255,255,255,0.55)",
    textAlign: "center", lineHeight: 18, marginBottom: 18,
  },
  confirmBtn: {
    backgroundColor: DANGER,
    borderRadius: 16, paddingVertical: 14, alignItems: "center",
  },
  confirmText: { fontSize: 15, fontWeight: "800", color: "#fff" },
  cancelBtn: {
    borderRadius: 16, paddingVertical: 12, alignItems: "center", marginTop: 8,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  cancelText: { fontSize: 14, fontWeight: "700", color: "rgba(255,255,255,0.6)" },
});
