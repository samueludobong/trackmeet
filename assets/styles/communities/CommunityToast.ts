import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  toast: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: "rgba(171,0,255,0.1)",
    borderWidth: 1, borderColor: "rgba(171,0,255,0.28)",
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9,
  },
  text: { flex: 1, fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.78)" },
  slug: { color: "#AB00FF", fontWeight: "800" },
  close: { padding: 2 },
});
