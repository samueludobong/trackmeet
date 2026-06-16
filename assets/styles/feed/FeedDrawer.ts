import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0D0D0D" },
  sidebar: {
    position: "absolute", left: 0, top: 0, bottom: 0,
    backgroundColor: "#141416",
    paddingHorizontal: 14,
  },
  brand: { fontSize: 22, fontWeight: "900", color: "#fff", letterSpacing: -0.5, marginBottom: 22, paddingHorizontal: 6 },
  item: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: 12, paddingVertical: 14, borderRadius: 14, marginBottom: 4,
  },
  itemActive: { backgroundColor: "rgba(171,0,255,0.16)" },
  itemText: { fontSize: 16, fontWeight: "600", color: "rgba(255,255,255,0.6)" },
  itemTextActive: { color: "#fff", fontWeight: "800" },

  content: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0D0D0D" },

  placeholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 24 },
  placeholderTitle: { fontSize: 22, fontWeight: "800", color: "#fff" },
  placeholderSub: { fontSize: 14, color: "rgba(255,255,255,0.45)", textAlign: "center" },
});
