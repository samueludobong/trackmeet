import { StyleSheet } from "react-native";
import { BOTTOM_INSET, NAVBAR_H, SW } from "../../../../lib/feed/dimensions";

// Music player (visual only)
export const musicPlayer = StyleSheet.create({
  musicPlayerCard: { width: "100%", overflow: "hidden" },
  musicArtArea: { width: "100%", height: 280, position: "relative" },
  musicArtFill: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  musicArtEmoji: { fontSize: 72, opacity: 0.25 },
  musicGradientOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 110,
    opacity: 0.9,
  },
  musicTopRight: {
    position: "absolute",
    top: 14,
    right: 14,
    flexDirection: "row",
    gap: 8,
  },
  musicGlassBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  musicGlassBtnIcon: { fontSize: 16, color: "#fff" },
  musicInfoOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  musicInfoText: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  musicSongTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 2,
  },
  musicArtistName: { fontSize: 14, color: "rgba(255,255,255,0.65)" },
  musicProgressRow: { marginBottom: 4 },
  musicProgressTrack: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 2,
  },
  musicProgressFill: { height: 3, borderRadius: 2, position: "relative" },
  musicProgressThumb: {
    position: "absolute",
    right: -5,
    top: -4,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#fff",
  },
  musicTimestamps: { flexDirection: "row", justifyContent: "space-between" },
  musicTime: { fontSize: 11, color: "rgba(255,255,255,0.45)" },

});

