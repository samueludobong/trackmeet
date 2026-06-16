import { StyleSheet } from "react-native";
import { BOTTOM_INSET, NAVBAR_H, SW } from "../../../../lib/feed/dimensions";

// Stories
export const stories = StyleSheet.create({
  storiesStrip: { paddingBottom: 16 },
  storiesContent: { paddingHorizontal: 16, gap: 28 },
  storyItem: { alignItems: "center", width: 60 },
  storyRing: {
    width: 82,
    height: 82,
    borderRadius: 78,
    borderWidth: 5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  storyAvatar: {
    width: 76,
    height: 76,
    borderRadius: 78,
    alignItems: "center",
    justifyContent: "center",
  },
  storyInitials: { fontSize: 17, fontWeight: "800" },
  storyName: {
    fontSize: 10,
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
  },
  storyArtistSub: {
    fontSize: 9,
    color: "rgba(255,255,255,0.22)",
    textAlign: "center",
  },
  stripDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    marginBottom: 12,
  },

});
