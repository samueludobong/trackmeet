import { StyleSheet } from "react-native";

export const s = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#15121A",
    borderRadius: 24,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    padding: 18,
  },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 16 },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  avatarFallback: { backgroundColor: "rgba(171,0,255,0.18)", alignItems: "center", justifyContent: "center" },
  avatarInitials: { fontSize: 16, fontWeight: "800", color: "#AB00FF" },
  authorName: { color: "#fff", fontSize: 15, fontWeight: "800" },
  timeLeft: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 },

  // Text note
  textBubble: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 18,
    paddingHorizontal: 18, paddingVertical: 22,
    alignItems: "center",
  },
  textBig: { color: "#fff", fontSize: 20, fontWeight: "700", textAlign: "center", lineHeight: 26 },

  // Song note
  songWrap: { alignItems: "center", paddingVertical: 4 },
  songArt: { width: 132, height: 132, borderRadius: 12, marginBottom: 14 },
  artFallback: { backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  songName: { color: "#fff", fontSize: 17, fontWeight: "800", textAlign: "center" },
  songArtist: { color: "rgba(255,255,255,0.55)", fontSize: 14, marginTop: 3, textAlign: "center" },
  openBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginTop: 16,
    backgroundColor: "#1DB954",
    borderRadius: 22, paddingHorizontal: 20, paddingVertical: 11,
  },
  openBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },
});
