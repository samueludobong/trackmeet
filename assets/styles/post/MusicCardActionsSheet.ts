import { StyleSheet } from "react-native";

export const local = StyleSheet.create({
  lyricsBtn: {
    alignSelf: "stretch",
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    height: 48, borderRadius: 14,
    backgroundColor: "#FF6C1A",
    marginTop: 12,
    shadowColor: "#FF6C1A",
    shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  lyricsBtnText: { fontSize: 14, fontWeight: "800", color: "#fff", letterSpacing: 0.2 },
});
