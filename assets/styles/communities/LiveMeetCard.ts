import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginHorizontal: 16, marginTop: 12, padding: 12,
    borderRadius: 18,
    backgroundColor: "#1A1A1A",
    borderWidth: 1, borderColor: "rgba(171,0,255,0.45)",
    shadowColor: "#AB00FF", shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  left: { width: 54, alignItems: "center", justifyContent: "center" },
  ringWrap: { width: 54, height: 54, alignItems: "center", justifyContent: "center" },
  ringPulse: {
    position: "absolute", width: 54, height: 54, borderRadius: 27,
    borderWidth: 2, borderColor: "#AB00FF",
  },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#222", borderWidth: 2, borderColor: "#AB00FF" },
  avatarFallback: { backgroundColor: "rgba(171,0,255,0.4)", alignItems: "center", justifyContent: "center" },

  center: { flex: 1, gap: 2 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  liveBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#AB00FF",
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" },
  liveText: { color: "#fff", fontWeight: "900", fontSize: 9, letterSpacing: 0.8 },
  listeners: { fontSize: 11, color: "rgba(255,255,255,0.55)", fontWeight: "600" },
  meetName: { fontSize: 14, fontWeight: "800", color: "#fff", marginTop: 2 },
  song: { fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: "600" },

  joinBtn: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14,
    backgroundColor: "#AB00FF",
  },
  joinText: { color: "#fff", fontWeight: "800", fontSize: 13 },
});
