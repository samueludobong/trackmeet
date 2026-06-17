import { StyleSheet } from "react-native";
import { SW } from "../../../lib/feed/dimensions";

/** Used by components/messages/SpotifyTrackCard.tsx (the Spotify chat bubble card). */
export const spCard = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    alignSelf: "flex-start",       // don't stretch to fill parent
    backgroundColor: "#000000",
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    maxWidth: SW * 0.72,
    borderColor: "rgba(255, 255, 255, 0.07)",
  },
  cardMe: { alignSelf: "flex-end" },
  art: { width: 54, height: 54, borderRadius: 10, overflow: "hidden" },
  artFallback: {
    width: 54,
    height: 54,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "rgba(29,185,84,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1, gap: 2 },
  spotifyRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  spotifyLabel: { fontSize: 10, fontWeight: "700", color: "#1DB954", letterSpacing: 0.5 },
  trackName: { fontSize: 13, fontWeight: "700", color: "#fff", letterSpacing: -0.2 },
  artistName: { fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 8 },
  btnRow: { flexDirection: "row", gap: 7 },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: "rgb(0, 250, 87)",
    borderWidth: 1,
  },
  openBtnText: { fontSize: 11, fontWeight: "700", color: "#000" },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: "rgb(255, 255, 255)",
  },
  savedBtn: {
    backgroundColor: "rgba(29,185,84,0.12)",
    borderColor: "rgba(29,185,84,0.3)",
  },
  saveBtnText: { fontSize: 11, fontWeight: "600", color: "rgb(0, 0, 0)" },
  savedBtnText: { color: "#1DB954" },
});
