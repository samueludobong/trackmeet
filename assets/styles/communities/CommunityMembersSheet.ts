import { StyleSheet } from "react-native";

const ACCENT = "#AB00FF";

export const s = StyleSheet.create({
  sheet: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    maxHeight: "85%",
    backgroundColor: "#1a1a1f",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  title: { fontSize: 16, fontWeight: "800", color: "#fff", paddingHorizontal: 18, marginBottom: 12 },

  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14, paddingHorizontal: 12,
  },
  searchInput: { flex: 1, height: 42, color: "#fff", fontSize: 14 },

  count: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.4)", marginBottom: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: 11 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#222" },
  avatarFallback: { backgroundColor: "rgba(171,0,255,0.18)", alignItems: "center", justifyContent: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  name: { fontSize: 14, fontWeight: "700", color: "#fff", flexShrink: 1 },
  handle: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 1 },
  roleChip: {
    backgroundColor: "rgba(171,0,255,0.14)", borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  roleChipOwner: { backgroundColor: "rgba(255,210,74,0.12)" },
  roleText: { fontSize: 11, fontWeight: "800", color: ACCENT },
});
