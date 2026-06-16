import { StyleSheet } from "react-native";
import { BOTTOM_INSET, NAVBAR_H, SW } from "../../../../lib/feed/dimensions";

// Post detail overlay
export const postDetailOverlay = StyleSheet.create({
  detailOverlay: { backgroundColor: "#0D0D0D", zIndex: 100 },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  detailBackBtn: {
    width: 40,
    height: 40,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  detailBackIcon: {
    fontSize: 32,
    color: "#fff",
    fontWeight: "300",
    lineHeight: 36,
  },
  detailHeaderTitle: { fontSize: 16, fontWeight: "700", color: "#fff" },
  detailListContent: { paddingBottom: 120 },
  detailDivider: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
    marginBottom: 4,
  },
  detailDividerLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.35)",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

});
