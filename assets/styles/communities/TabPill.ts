import { StyleSheet } from "react-native";

export const pillStyles = StyleSheet.create({
  badge: {
    minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5,
    backgroundColor: "#FF3B6F",
    alignItems: "center", justifyContent: "center",
    marginLeft: 2,
  },
  badgeText: { fontSize: 10, fontWeight: "800", color: "#fff" },
});
