import { StyleSheet } from "react-native";
import { BOTTOM_INSET, NAVBAR_H, SW } from "../../../../lib/feed/dimensions";

// ── Threaded replies ────────────────────────────────────────────────────────
export const threadedReplies = StyleSheet.create({
  repliesBlock: {
    flexDirection: "row",
    marginLeft: 52, // align with bubble (avatar width + gap)
    marginTop: 2,
    marginBottom: 2,
  },
  threadLine: {
    width: 2,
    marginRight: 12,
    marginTop: 4,
    marginBottom: 4,
    borderRadius: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  replyRow: {
    flex: 1,
  },
  showMoreReplies: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 10,
    paddingBottom: 4,
  },
  showMoreDots: {
    flexDirection: "row",
    gap: 3,
    alignItems: "center",
  },
  showMoreDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(171,0,255,0.55)",
  },
  showMoreRepliesText: {
    fontSize: 12,
    color: "#AB00FF",
    fontWeight: "600",
  },

});
