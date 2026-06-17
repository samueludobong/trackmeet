import { Dimensions, StyleSheet } from "react-native";

const { width: SW, height: SH } = Dimensions.get("window");
export { SW, SH };

export const mvStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },

  // Media fills the entire viewport — overlays sit on top via absolute positioning.
  pager: { flex: 1 },
  page: { width: SW, height: SH, alignItems: "center", justifyContent: "center", backgroundColor: "#000" },
  media: { width: SW, height: SH },
  playOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  playBadge: {
    width: 78, height: 78, borderRadius: 39,
    backgroundColor: "rgba(0,0,0,0.32)",
    alignItems: "center", justifyContent: "center",
  },

  // Top + bottom dimming so the white text/icons stay legible over any photo.
  topScrim: { position: "absolute", top: 0, left: 0, right: 0 },
  bottomScrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: 280 },

  // Top bar — back · pager dots (multi-media) · search-style action
  topBar: {
    position: "absolute", top: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingBottom: 10,
  },
  topBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  dotsRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.45)" },
  dotActive: { width: 18, backgroundColor: "#fff" },

  // Right-side action rail — avatar+follow, like, comment, bookmark, share
  rail: {
    position: "absolute", right: 10,
    alignItems: "center", gap: 18,
  },
  profileWrap: { width: 50, height: 60, alignItems: "center", justifyContent: "flex-start", marginBottom: 4 },
  railAvatar: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 2, borderColor: "#fff",
    backgroundColor: "#222",
  },
  followPlus: {
    position: "absolute", bottom: 0, alignSelf: "center",
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: "#FF3B6F",
    borderWidth: 2, borderColor: "#000",
    alignItems: "center", justifyContent: "center",
  },
  railBtn: { alignItems: "center", justifyContent: "center", gap: 4, minWidth: 50 },
  railCount: {
    color: "#fff", fontSize: 12, fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.45)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },

  // Bottom info overlay — community chip, handle, caption, music row, progress
  bottom: {
    position: "absolute", left: 0, right: 80, bottom: 0,
    paddingHorizontal: 14, paddingTop: 12,
    gap: 8,
  },
  tag: {
    alignSelf: "flex-start",
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,210,74,0.18)",
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  tagText: { color: "#FFE39A", fontSize: 12, fontWeight: "700" },

  handleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  handleAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#222" },
  handle: {
    color: "#fff", fontSize: 15, fontWeight: "800", letterSpacing: -0.2,
    textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },

  caption: {
    color: "#fff", fontSize: 14, lineHeight: 19, fontWeight: "500",
    textShadowColor: "rgba(0,0,0,0.55)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  seeMore: { color: "rgba(255,255,255,0.7)", fontWeight: "700" },

  musicRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 4,
  },
  musicText: {
    flex: 1,
    color: "#fff", fontSize: 13, fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.55)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },

  progressOuter: {
    height: 2, borderRadius: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginTop: 4, marginRight: -80, // extend full width under the rail
    overflow: "hidden",
  },
  progressFill: { height: 2, backgroundColor: "#fff" },
});
