import { StyleSheet } from "react-native";
import { BOTTOM_INSET, NAVBAR_H, SW } from "../../../../lib/feed/dimensions";

// Swipe container + reply indicator
export const swipeContainerReplyIndicator = StyleSheet.create({
  swipeContainer: { position: "relative" },
  replyIndicator: {
    position: "absolute",
    right: 22,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    gap: 3,
  },
  replyIndicatorArrow: { fontSize: 20, color: "#AB00FF" },
  replyIndicatorLabel: {
    fontSize: 11,
    color: "#AB00FF",
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },

});
