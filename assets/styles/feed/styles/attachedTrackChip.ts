import { StyleSheet } from "react-native";
import { BOTTOM_INSET, NAVBAR_H, SW } from "../../../../lib/feed/dimensions";

// Attached-track chip (shown below the now-playing banner once "+" is tapped)
export const attachedTrackChip = StyleSheet.create({
  attachedTrackChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgb(0,0,0)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(29,185,84,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  attachedTrackArt: { width: 36, height: 36, borderRadius: 8 },
  attachedTrackName: { fontSize: 12, fontWeight: "700", color: "#fff" },
  attachedTrackArtist: {
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
    marginTop: 1,
  },

});

