import { StyleSheet } from "react-native";
import { BOTTOM_INSET, NAVBAR_H, SW } from "../dimensions";

// Intro / container
export const intro = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0D0D" },

  feedContent: { paddingBottom: NAVBAR_H + 64 + BOTTOM_INSET + 32 },

});
