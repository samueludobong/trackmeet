import { StyleSheet } from "react-native";

const ACCENT = "#AB00FF";

export const s = StyleSheet.create({
  sheet: {
    position: "absolute",
    // Floated up off the bottom edge with side gaps so it reads as a pulled-up
    // card — all four corners rounded.
    bottom: 12, left: 10, right: 10,
    backgroundColor: "#15121A",
    borderRadius: 26,
    paddingBottom: 18,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  grabber: { alignSelf: "center", width: 38, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.18)", marginTop: 9, marginBottom: 4 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 10 },
  title: { color: "#fff", fontSize: 18, fontWeight: "800" },

  // Preview bubble
  previewWrap: { alignItems: "center", marginTop: 4, marginBottom: 14 },
  previewBubble: {
    flexDirection: "row", alignItems: "center",
    maxWidth: 220,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 9,
  },
  previewArt: { width: 18, height: 18, borderRadius: 4, marginRight: 7 },
  previewText: { color: "rgba(255,255,255,0.92)", fontSize: 13, fontWeight: "600", flexShrink: 1 },
  previewTail: { width: 9, height: 9, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.14)", marginTop: 3, marginLeft: -28 },

  // Toggle
  toggleRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  seg: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
    paddingVertical: 11, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.07)",
  },
  segActive: { backgroundColor: "rgba(171,0,255,0.18)", borderColor: ACCENT },
  segText: { color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: "700" },
  segTextActive: { color: "#fff" },

  // Colour picker
  colorRow: { flexDirection: "row", justifyContent: "center", gap: 12, paddingHorizontal: 16, marginBottom: 14 },
  swatch: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "transparent" },
  swatchDefault: { backgroundColor: "rgba(255,255,255,0.08)" },
  swatchActive: { borderColor: "#fff" },

  // Text mode
  textWrap: { marginHorizontal: 16, marginBottom: 6 },
  textInput: {
    minHeight: 64, maxHeight: 120,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12,
    color: "#fff", fontSize: 15, textAlignVertical: "top",
  },
  counter: { alignSelf: "flex-end", color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 5, marginRight: 2 },

  // Song chosen
  chosenRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginHorizontal: 16, marginBottom: 6,
    padding: 10, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  chosenArt: { width: 46, height: 46, borderRadius: 8 },
  chosenName: { color: "#fff", fontSize: 14, fontWeight: "700" },
  chosenArtist: { color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 2 },
  changeBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.08)" },
  changeBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  // Song search
  songSearch: { marginBottom: 4 },
  searchRow: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 16, marginBottom: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  searchInput: { flex: 1, color: "#fff", fontSize: 14, padding: 0 },
  resultRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 7 },
  resultArt: { width: 42, height: 42, borderRadius: 6 },
  resultName: { color: "#fff", fontSize: 13.5, fontWeight: "700" },
  resultArtist: { color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 1 },
  artFallback: { backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  empty: { color: "rgba(255,255,255,0.35)", textAlign: "center", paddingVertical: 22, fontSize: 13 },

  // Footer
  footer: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingTop: 10 },
  removeText: { color: "#FF5A5A", fontSize: 14, fontWeight: "700" },
  shareBtn: { minWidth: 96, height: 44, borderRadius: 22, backgroundColor: ACCENT, alignItems: "center", justifyContent: "center", paddingHorizontal: 22 },
  shareBtnOff: { backgroundColor: "rgba(171,0,255,0.35)" },
  shareBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
