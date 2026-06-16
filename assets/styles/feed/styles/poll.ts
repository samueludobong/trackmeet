import { StyleSheet } from "react-native";
import { BOTTOM_INSET, NAVBAR_H, SW } from "../../../../lib/feed/dimensions";

// Poll
export const poll = StyleSheet.create({
  pollContainer: { paddingHorizontal: 16, paddingBottom: 4 },
  pollQuestion: {
    fontSize: 17,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 14,
  },
  pollOptions: { gap: 9, marginBottom: 10 },
  pollOption: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
    position: "relative",
    backgroundColor: "rgba(255,255,255,0.05)",
    minHeight: 46,
    justifyContent: "center",
  },
  pollFillBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 13,
  },
  pollOptionInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pollOptionLabel: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "500",
    flex: 1,
  },
  pollPct: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    fontWeight: "700",
    marginLeft: 8,
  },
  pollMeta: { fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 2 },

});
