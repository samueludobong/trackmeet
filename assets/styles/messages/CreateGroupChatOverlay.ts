import { StyleSheet } from "react-native";

const ACCENT = "#AB00FF";

export const s = StyleSheet.create({
  sheet: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    maxHeight: "88%",
    backgroundColor: "#161618",
    borderTopLeftRadius: 28, borderTopRightRadius: 28, borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    borderTopWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 20, paddingBottom: 24,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  cancel: { color: "rgba(255,255,255,0.55)", fontSize: 15, fontWeight: "600" },
  title: { color: "#fff", fontSize: 16, fontWeight: "800" },
  create: { color: ACCENT, fontSize: 15, fontWeight: "800" },

  label: { fontSize: 11, fontWeight: "800", letterSpacing: 0.9, color: "rgba(255,255,255,0.4)", marginBottom: 8, marginTop: 6 },
  input: {
    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#fff",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(171,0,255,0.16)", borderRadius: 20,
    paddingLeft: 4, paddingRight: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: "rgba(171,0,255,0.4)", maxWidth: 160,
  },
  chipAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#222" },
  chipFallback: { backgroundColor: "rgba(171,0,255,0.18)", alignItems: "center", justifyContent: "center" },
  chipText: { fontSize: 13, fontWeight: "700", color: "#fff", flexShrink: 1 },

  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, paddingHorizontal: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  searchInput: { flex: 1, height: 44, color: "#fff", fontSize: 15 },

  resultRow: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 4 },
  resultAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#222" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  resultName: { fontSize: 14, fontWeight: "700", color: "#fff", flexShrink: 1 },
  resultHandle: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 1 },
  noResults: { fontSize: 13, color: "rgba(255,255,255,0.35)", textAlign: "center", marginTop: 16 },
});
