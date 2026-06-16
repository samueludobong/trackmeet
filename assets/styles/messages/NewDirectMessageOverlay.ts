import { StyleSheet } from "react-native";

const ACCENT = "#AB00FF";

export const s = StyleSheet.create({
  sheet: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    maxHeight: "88%",
    backgroundColor: "#161618",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    borderTopWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 20, paddingBottom: 24,
  },

  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  cancel: { color: "rgba(255,255,255,0.55)", fontSize: 15, fontWeight: "600" },
  title: { color: "#fff", fontSize: 16, fontWeight: "800" },

  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  searchInput: { flex: 1, color: "#fff", fontSize: 14 },

  sectionLabel: {
    fontSize: 11, fontWeight: "800", letterSpacing: 0.9,
    color: "rgba(255,255,255,0.4)", marginTop: 6, marginBottom: 6,
  },

  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 10, paddingHorizontal: 6,
    borderRadius: 12,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.06)" },
  avatarFallback: { alignItems: "center", justifyContent: "center", backgroundColor: "rgba(171,0,255,0.18)" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { color: "#fff", fontSize: 14, fontWeight: "700" },
  handle: { color: "rgba(255,255,255,0.45)", fontSize: 12 },

  empty: {
    color: "rgba(255,255,255,0.45)", fontSize: 13,
    textAlign: "center", paddingHorizontal: 24, paddingVertical: 24,
  },
});
