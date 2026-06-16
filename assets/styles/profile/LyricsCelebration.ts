import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  shadowWrap: {
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    borderRadius: 18,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  iconWrap: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center", justifyContent: "center",
  },
  text: { flex: 1, fontSize: 14, fontWeight: "800", color: "#fff", lineHeight: 19 },

  loaderWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 22 },
  glowRing: {
    position: "absolute",
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 2,
  },
  loaderText: { fontSize: 15, fontWeight: "700", color: "rgba(255,255,255,0.92)", letterSpacing: 0.3 },
});
