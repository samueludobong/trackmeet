import { StyleSheet } from "react-native";

export const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#1A1A1C",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingBottom: 36,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderBottomWidth: 0,
    maxHeight: "80%",
  },
  handle: {
    width: 38, height: 4, borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignSelf: "center", marginTop: 12, marginBottom: 18,
  },
  title: { fontSize: 18, fontWeight: "800", color: "#fff", marginBottom: 16 },

  trackRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingBottom: 16, marginBottom: 6,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)",
  },
  trackArt: { width: 44, height: 44, borderRadius: 8 },
  trackArtFallback: {
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center", justifyContent: "center",
  },
  trackName:   { fontSize: 15, fontWeight: "700", color: "#fff" },
  trackArtist: { fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 2 },

  newRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 12,
  },
  newIcon: {
    width: 44, height: 44, borderRadius: 8,
    backgroundColor: "rgba(255,108,26,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  newInput: {
    flex: 1, fontSize: 15, fontWeight: "600", color: "#fff",
    paddingVertical: 0,
  },
  createBtn: {
    paddingHorizontal: 14, height: 34, borderRadius: 10,
    backgroundColor: "#FF6C1A",
    alignItems: "center", justifyContent: "center",
  },
  createBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },

  loadingWrap: { height: 80, alignItems: "center", justifyContent: "center" },
  empty: {
    fontSize: 13, color: "rgba(255,255,255,0.35)",
    textAlign: "center", paddingVertical: 24,
  },

  list: { marginTop: 4 },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 10,
  },
  cover: { width: 44, height: 44, borderRadius: 8 },
  coverFallback: {
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center", justifyContent: "center",
  },
  rowName: { flex: 1, fontSize: 15, fontWeight: "600", color: "#fff" },

  doneBtn: {
    marginTop: 18, height: 50, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center", justifyContent: "center",
  },
  doneBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
