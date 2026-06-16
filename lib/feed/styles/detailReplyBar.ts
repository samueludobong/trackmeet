import { StyleSheet } from "react-native";
import { BOTTOM_INSET, NAVBAR_H, SW } from "../dimensions";

// Detail reply bar
export const detailReplyBar = StyleSheet.create({
  detailReplyBarWrap: { position: "absolute", left: 16, right: 16 },
  detailReplyContext: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
  detailReplyContextText: { fontSize: 12, color: "#AB00FF", fontWeight: "600" },
  detailReplyContextX: {
    fontSize: 18,
    color: "rgba(255,255,255,0.4)",
    lineHeight: 20,
  },
});
