import { StyleSheet } from "react-native";
import { BOTTOM_INSET, NAVBAR_H, SW } from "../../../../lib/feed/dimensions";

// Now-playing composer banner
export const nowplayingComposerBanner = StyleSheet.create({
  nowPlayingBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(18,18,24,0.95)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(171,0,255,0.22)",
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 8,
    shadowColor: "#AB00FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  nowPlayingBarSwatch: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  nowPlayingBarSong: { fontSize: 12, color: "#fff", fontWeight: "700" },
  nowPlayingBarArtist: {
    fontSize: 11,
    color: "rgba(255,255,255,0.38)",
    marginTop: 1,
  },
  nowPlayingWaves: { flexDirection: "row", alignItems: "center", gap: 2 },
  nowPlayingWaveBar: { width: 3, borderRadius: 2 },
  nowPlayingShareBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(171,0,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(171,0,255,0.3)",
  },

});
