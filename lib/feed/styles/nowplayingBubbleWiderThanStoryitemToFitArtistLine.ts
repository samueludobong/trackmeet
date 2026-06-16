import { StyleSheet } from "react-native";
import { BOTTOM_INSET, NAVBAR_H, SW } from "../dimensions";

// Now-playing bubble (wider than storyItem to fit artist line)
export const nowplayingBubbleWiderThanStoryitemToFitArtistLine = StyleSheet.create({
  nowPlayingItem: { alignItems: "center", width: 72 },
  nowPlayingBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#0D0D0D",
  },

});
