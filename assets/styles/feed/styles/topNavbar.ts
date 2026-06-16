import { StyleSheet } from "react-native";
import { BOTTOM_INSET, NAVBAR_H, SW } from "../../../../lib/feed/dimensions";

// Top navbar
export const topNavbar = StyleSheet.create({
  navbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 12,
  },
  navTitle: {
    fontSize: 48,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: -1,
    lineHeight: 52,
  },
  navBrand: {
    flex: 1,
    textAlign: "center",
    fontSize: 25,
    fontFamily: "Pacifico_400Regular",
    color: "#AB00FF",
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

});
