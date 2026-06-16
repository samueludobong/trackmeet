import { StyleSheet } from "react-native";
import { BOTTOM_INSET, NAVBAR_H, SW } from "../dimensions";

// â”€â”€â”€ Song card embedded inside a comment bubble â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const songCardEmbeddedInsideACommentBubble = StyleSheet.create({
  commentSongCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 9,
    marginTop: 7,
    backgroundColor: "rgba(0, 54, 19, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(0, 121, 42, 0.22)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  commentSongArt: {
    width: 44,
    height: 44,
    borderRadius: 7,
    backgroundColor: "#1a1a1c",
  },
  commentSongArtFallback: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  commentSongName: { fontSize: 13, fontWeight: "700" as const, color: "#fff" },
  commentSongArtist: {
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
    marginTop: 1,
  },

});
