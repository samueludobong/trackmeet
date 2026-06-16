import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#0D0D0D", paddingTop: 18, paddingHorizontal: 18, paddingBottom: 28,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  title: { fontSize: 16, fontWeight: "800", color: "#fff", textAlign: "center" },
  subtitle: { fontSize: 12, color: "rgba(255,255,255,0.5)", textAlign: "center", marginTop: 4, fontWeight: "600" },
  center: { alignItems: "center", gap: 14, marginTop: 22, marginBottom: 22 },
  micWrap: { width: 100, height: 100, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(171,0,255,0.5)" },
  mic: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#AB00FF", alignItems: "center", justifyContent: "center" },
  micRecording: { backgroundColor: "#FF4757" },
  micDone: { backgroundColor: "#1DB954" },
  timer: { color: "#fff", fontVariant: ["tabular-nums"], fontSize: 14, fontWeight: "800" },
  progressTrack: { width: 200, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.1)", overflow: "hidden" },
  progressFill: { height: 4, backgroundColor: "#AB00FF" },
  btnRow: { flexDirection: "row", gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: "center" },
  cancelBtn: { backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  sendBtn: { backgroundColor: "#AB00FF" },
  actionText: { color: "#fff", fontWeight: "800", fontSize: 14 },
});
