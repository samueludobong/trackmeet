import { StyleSheet } from "react-native";
import { BOTTOM_INSET, NAVBAR_H, SW } from "../../../../lib/feed/dimensions";

// Bottom glass navbar
export const bottomGlassNavbar = StyleSheet.create({
  navBarWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: BOTTOM_INSET,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  navBarGlass: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "rgba(0,0,0,0.70)",
    borderRadius: 96,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    paddingVertical: 6,
    height: NAVBAR_H - 8,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 4,
  },
  navIcon: { fontSize: 30, color: "rgba(255,255,255,0.3)" },
  navIconActive: { color: "#AB00FF" },
  navLabel: { fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: "500" },
  navLabelActive: { color: "#AB00FF", fontWeight: "700" },

});
