import { StyleSheet, Dimensions } from "react-native";

const { width: SW } = Dimensions.get("window");
const COVER_H = Math.round(SW * 0.52);

export const styles = StyleSheet.create({
  cover: {
    width: SW - 32, height: COVER_H,
    marginHorizontal: 16, borderRadius: 22, overflow: "hidden",
    backgroundColor: "#1A1A1C",
  },
  privateBadge: {
    position: "absolute", top: 12, right: 12,
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4,
  },
  privateBadgeText: { fontSize: 11, fontWeight: "800", color: "#fff", letterSpacing: 0.2 },
});
