import { StyleSheet } from "react-native";

const DANGER = "#ff4d6d";

export const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0, right: 0, bottom: 0,
    backgroundColor: "#1a1a1f",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  title: {
    fontSize: 17, fontWeight: "800", color: "#fff",
    paddingHorizontal: 22, marginTop: 2,
  },
  subtitle: {
    fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.4)",
    paddingHorizontal: 22, paddingBottom: 8, marginTop: 2, letterSpacing: 0.4,
  },
  menuRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    marginVertical: 3,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  menuRowDanger: {
    backgroundColor: "rgba(255,77,109,0.08)",
    borderColor: "rgba(255,77,109,0.2)",
  },
  iconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center", justifyContent: "center",
  },
  iconWrapDanger: {
    backgroundColor: "rgba(255,77,109,0.14)",
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: "600" },

  // ── Delete confirm block ─────────────────────────────────────────────────
  confirmBlock: { paddingHorizontal: 22, paddingTop: 10, gap: 10 },
  confirmTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },
  confirmSub: {
    fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 18,
    marginBottom: 4,
  },
  deleteConfirmBtn: {
    backgroundColor: DANGER,
    borderRadius: 16, paddingVertical: 14, alignItems: "center",
  },
  deleteConfirmText: { fontSize: 15, fontWeight: "800", color: "#fff" },
  cancelBtn: {
    borderRadius: 16, paddingVertical: 12, alignItems: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  cancelText: { fontSize: 14, fontWeight: "700", color: "rgba(255,255,255,0.6)" },
});
