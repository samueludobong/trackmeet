import { StyleSheet } from "react-native";
import { BOTTOM_INSET, NAVBAR_H, SW } from "../../../../lib/feed/dimensions";

// Media
export const media = StyleSheet.create({
  mediaBlock: {
    width: "100%",
    height: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaImageFull: { width: SW - 26, height: 260 },
  mediaPlaceholder: { fontSize: 44, opacity: 0.25 },
  collageMoreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  collageMoreText: { color: "#fff", fontSize: 26, fontWeight: "800" },
  videoPlayCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  videoPlayIcon: { fontSize: 20, color: "#fff", marginLeft: 3 },
  durationBadge: {
    position: "absolute",
    bottom: 10,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  durationText: { fontSize: 12, color: "#fff", fontWeight: "600" },

});
