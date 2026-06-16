import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0, right: 0, bottom: 0,
    backgroundColor: "#1a1a1f",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  title: {
    fontSize: 12, fontWeight: "800", letterSpacing: 1,
    color: "rgba(255,255,255,0.5)",
    paddingHorizontal: 22, paddingBottom: 10, marginTop: 2,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 12, paddingVertical: 11,
    marginVertical: 3,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  rowDanger: {
    backgroundColor: "rgba(255,59,48,0.08)",
    borderColor: "rgba(255,59,48,0.18)",
  },
  iconWrap: {
    width: 32, height: 32, borderRadius: 9,
    alignItems: "center", justifyContent: "center",
  },
  label: { flex: 1, fontSize: 14, fontWeight: "600", color: "#fff" },
  divider: { height: 8 },
});
