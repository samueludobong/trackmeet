import { StyleSheet } from "react-native";

export const rq = StyleSheet.create({
  message: { fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 3, fontStyle: "italic" },
  approveBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "#1DB954",
    alignItems: "center", justifyContent: "center",
  },
  denyBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "rgba(255,71,87,0.85)",
    alignItems: "center", justifyContent: "center",
  },
});
