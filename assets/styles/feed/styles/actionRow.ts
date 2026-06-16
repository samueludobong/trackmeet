import { StyleSheet } from "react-native";
import { BOTTOM_INSET, NAVBAR_H, SW } from "../../../../lib/feed/dimensions";

// Action row
export const actionRow = StyleSheet.create({
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionIcon: { fontSize: 30, color: "#555" },
  actionIconLiked: { color: "#FF3CAC" },
  actionCount: { fontSize: 13, color: "#888", fontWeight: "600" },
  actionCountLiked: { color: "#E8000F" },
  moreIcon: { fontSize: 18, color: "#bbb", letterSpacing: 2 },

});
