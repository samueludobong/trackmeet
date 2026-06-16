import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000" },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 18, paddingBottom: 16, gap: 12,
  },
  chip: { flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 1 },
  chipArt: { width: 42, height: 42, borderRadius: 9, backgroundColor: "#222" },
  chipArtFallback: { alignItems: "center", justifyContent: "center" },
  chipTitle: { fontSize: 15, fontWeight: "800", color: "#fff" },
  chipArtist: { fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 1 },
  menuBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center",
  },

  // Translation dropdown trigger + picker sheet.
  langPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    maxWidth: 130,
    paddingHorizontal: 11, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  langPillText: { fontSize: 13, fontWeight: "700", color: "#fff", flexShrink: 1 },
  langOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  langSheet: {
    backgroundColor: "#161618",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 12, paddingTop: 10,
    borderTopWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  langHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.18)", alignSelf: "center", marginBottom: 14 },
  langTitle: { fontSize: 16, fontWeight: "800", color: "#fff", paddingHorizontal: 8, marginBottom: 8 },
  langRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.06)",
  },
  langRowText: { fontSize: 15, color: "rgba(255,255,255,0.7)", fontWeight: "600" },
  langRowTextSel: { color: "#fff", fontWeight: "800" },
  transErr: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(200,40,60,0.92)",
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11,
  },
  transErrText: { fontSize: 13, fontWeight: "700", color: "#fff" },

  panel: {
    flex: 1,
    marginHorizontal: 14,
    borderRadius: 34,
    overflow: "hidden",
    paddingHorizontal: 28,
  },

  // First-discovery banner (sits between the header and the panel).
  bannerWrap: { paddingHorizontal: 16, paddingBottom: 12 },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: {
    fontSize: 26, fontWeight: "800", color: "#fff", textAlign: "center", lineHeight: 34,
  },

  // Lyric lines — left-aligned, heavy, tight.
  lyricLine: {
    fontSize: 30, fontWeight: "800", letterSpacing: -0.6, lineHeight: 36,
    marginVertical: 11, textAlign: "left",
  },
  lyricActive: { color: "#fff" },
  lyricIdle: {
    color: "#fff",
    opacity: 0.28,
    textShadowColor: "rgba(255,255,255,0.18)",
    textShadowOffset: { width: 4, height: 0 },
    textShadowRadius: 15,
  },
  // Press feedback for tap-to-seek: brighten + a soft glow so the tapped line
  // visibly lifts while held.
  lyricPressed: {
    color: "rgba(0, 0, 0, 0.1)",
    textShadowColor: "rgba(0, 0, 0, 0.35)",
    opacity: 0.92,
    textShadowOffset: { width: 0, height: 5 },
    textShadowRadius: 16,
  },
  lyricPlain: { fontSize: 22, lineHeight: 30, color: "rgba(255,255,255,0.9)", marginVertical: 4 },

  // Intro "…" indicator — three dots that fill in as the lead-in plays out.
  introRow: { flexDirection: "row", alignItems: "center", gap: 11, height: 36, marginVertical: 11 },
  introDot: { width: 13, height: 13, borderRadius: 7, backgroundColor: "#fff" },

  controls: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 18,
  },

  // Owner seek bar (sits above the transport controls).
  // (styles live in `seekStyles` below.)
  ctrlGroup: { flexDirection: "row", alignItems: "center", gap: 12 },
  ctrlSquare: {
    width: 54, height: 54, borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center",
  },

  // Non-owner action row.
  controlsAlt: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12,
    paddingHorizontal: 20, paddingTop: 18,
  },
  pillBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 18, paddingVertical: 14, borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.14)",
  },
  spotifyPill: { backgroundColor: "#1DB954", borderColor: "#1DB954" },
  pillText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});

export const seekStyles = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingTop: 4 },
  // Tall, invisible hit area so the thin bar is easy to grab and drag.
  hit: { paddingVertical: 12, justifyContent: "center" },
  // height + borderRadius are animated inline (grow-on-touch).
  track: { width: "100%", backgroundColor: "rgba(255,255,255,0.22)", overflow: "hidden", justifyContent: "center" },
  fill: { height: "100%", backgroundColor: "rgba(255,255,255,0.95)" },
  timeRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  time: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.45)", fontVariant: ["tabular-nums"] },
  timeActive: { color: "rgba(255,255,255,0.95)" },
});
