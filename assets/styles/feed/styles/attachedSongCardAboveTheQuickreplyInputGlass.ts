import { StyleSheet } from "react-native";
import { BOTTOM_INSET, NAVBAR_H, SW } from "../../../../lib/feed/dimensions";

// Attached song card above the quick-reply input glass
export const attachedSongCardAboveTheQuickreplyInputGlass = StyleSheet.create({
  qrSongCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    backgroundColor: "rgba(29,185,84,0.12)",
    borderWidth: 1,
    borderColor: "rgba(29,185,84,0.28)",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  qrSongArt: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#1a1a1c",
  },
  qrSongArtFallback: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  qrSongName: { fontSize: 13, fontWeight: "700" as const, color: "#fff" },
  qrSongArtist: { fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 1 },

});
