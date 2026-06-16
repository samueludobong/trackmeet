import { StyleSheet } from "react-native";

export const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  // Top padding lives on the chrome (not the root) so full-screen canvas
  // stories use the exact same coordinate space as the composer.
  chrome: { paddingTop: 50 },

  progressRow: { flexDirection: "row", gap: 4, paddingHorizontal: 12, marginBottom: 8 },
  progressTrack: { flex: 1, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.18)", overflow: "hidden" },
  progressFill:  { height: "100%", backgroundColor: "#fff" },

  headerRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 8 },
  avatarFallback: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#AB00FF", alignItems: "center", justifyContent: "center" },
  authorName: { color: "#fff", fontSize: 14, fontWeight: "800" },
  timeTxt:    { color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 1 },
  iconBtn:    { width: 36, height: 36, alignItems: "center", justifyContent: "center" },

  tapLeft:  { position: "absolute", left: 0, top: 0, bottom: 0, width: "30%" },
  tapRight: { position: "absolute", right: 0, top: 0, bottom: 0, width: "70%" },
});
