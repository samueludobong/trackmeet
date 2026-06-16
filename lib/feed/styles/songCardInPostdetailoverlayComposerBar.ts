import { StyleSheet } from "react-native";
import { BOTTOM_INSET, NAVBAR_H, SW } from "../dimensions";

// â”€â”€â”€ Song card in PostDetailOverlay composer bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const songCardInPostdetailoverlayComposerBar = StyleSheet.create({
  detailSongCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    backgroundColor: "rgba(29,185,84,0.10)",
    borderWidth: 1,
    borderColor: "rgba(29,185,84,0.25)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 8,
  },
  detailSongArt: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#1a1a1c",
  },
  detailSongArtFallback: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  detailSongName: { fontSize: 13, fontWeight: "700" as const, color: "#fff" },
  detailSongArtist: {
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
    marginTop: 1,
  },

});
