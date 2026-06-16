import { StyleSheet } from "react-native";

export const shareStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", paddingHorizontal: 24 },
  menu: {
    width: "100%", maxWidth: 360,
    backgroundColor: "#1A1A1C",
    borderRadius: 18,
    paddingVertical: 6,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
  icon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(255,108,26,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  title: { fontSize: 15, fontWeight: "800", color: "#fff" },
  sub:   { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.5)", marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(255,255,255,0.07)", marginHorizontal: 16 },
});

export const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0e0d0d",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  contentRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 10, gap: 12,
  },
  left: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  art: { width: 38, height: 38, borderRadius: 8, backgroundColor: "#222" },
  artFallback: { alignItems: "center", justifyContent: "center" },
  titleLine: { fontSize: 14, color: "#fff" },
  title:  { fontWeight: "800", color: "#fff" },
  dot:    { color: "rgba(255,255,255,0.45)", fontWeight: "700" },
  artist: { color: "rgba(255,255,255,0.7)", fontWeight: "600" },

  deviceRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  deviceText: { fontSize: 11, fontWeight: "700", color: "#1DB954", flexShrink: 1 },

  actions: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: "center", justifyContent: "center",
  },

  // Tall transparent hit area so the 2px progress bar is easy to drag.
  progressHit: { paddingVertical: 6, marginTop: -6, justifyContent: "flex-end" },
  progressTrack: { height: 2, backgroundColor: "rgba(255,255,255,0.12)" },
  progressFill:  { height: 2, backgroundColor: "#1DB954" },
});
