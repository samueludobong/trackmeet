import { StyleSheet } from "react-native";

const ACCENT = "#1DB954"; // Spotify-green accent, matches the inspiration shot.

const ROW_H = 70;

const BLOCK_GAP = 2;

const BLOCK_H = 12;

export const styles = StyleSheet.create({
  screen: { backgroundColor: "#0F141A" },

  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: {
    width: "100%", height: 380,
    backgroundColor: "#1a1a1a",
    position: "relative", overflow: "hidden",
  },
  mosaicCell: { width: "50%", height: "50%" },
  heroGradient: { position: "absolute", left: 0, right: 0, bottom: 0, height: 140 },
  heroTopBar: {
    position: "absolute", left: 16, right: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  iconCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  floatingPlay: {
    position: "absolute", right: 18,
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: ACCENT,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 8,
    zIndex: 9999, elevation: 30,
  },

  // ── Title + meta ──────────────────────────────────────────────────────────
  metaBlock: { paddingHorizontal: 22, paddingTop: 38, paddingBottom: 14 },
  bigTitle: { fontSize: 26, fontWeight: "800", color: "#fff", letterSpacing: -0.3, marginBottom: 6 },
  description: { fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 18, marginBottom: 10 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  metaText: { fontSize: 13, color: "rgba(255,255,255,0.55)", fontWeight: "500" },
  profileBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    marginTop: 12,
  },
  profileBtnOn: {
    backgroundColor: "rgba(29,185,84,0.14)",
    borderColor: "rgba(29,185,84,0.55)",
  },
  profileBtnText: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.7)" },

  // ── Action row ────────────────────────────────────────────────────────────
  actionRow: { flexDirection: "row", paddingHorizontal: 14, paddingVertical: 14, marginBottom: 8 },
  actionBtn: { flex: 1, alignItems: "center", justifyContent: "center" },

  // ── Song row ──────────────────────────────────────────────────────────────
  rowWrap: { position: "absolute", left: 0, right: 0 },
  songCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    paddingLeft: 16, paddingRight: 8, paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#1B232B",
    borderWidth: 1.5, borderColor: "transparent",
    gap: 12,
    height: ROW_H,
  },
  songCardDragging: {
    borderColor: "rgba(29,185,84,0.6)",
    backgroundColor: "#1F2A33",
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 12,
  },
  // The card itself stays a base dark — the green band + waveform paint over.
  songCardActive: {
    borderColor: ACCENT,
    overflow: "hidden",
  },
  // ── Active-state band: paints on top of everything in the row ──
  // Spans from roughly the middle of the row out to just before the drag
  // handle, so the gradient sits on the right half of the text/art area and
  // the waveform overlays the album art.
  activeBand: {
    position: "absolute",
    top: 0, bottom: 0,
    right: 64,     // ends just past the album art, before the trash/drag area
    width: 200,
  },
  // Gradient fills the left ~50% of the band, fading transparent → green.
  gradientZone: {
    position: "absolute",
    top: 0, bottom: 0,
    left: 0,
    right: 76,     // leaves a 76px slot for the waveform on the right
  },
  // Waveform sits on the right side of the band, overlapping the album art.
  // Its LEFT edge (the rotated "bottom") sits at the gradient's bright tip.
  waveSlot: {
    position: "absolute",
    top: 0, bottom: 0,
    right: 6,
    width: 70,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  // Dark scrim behind the waveform bars — they need contrast against bright
  // album art to remain readable.
  waveScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 6,
  },
  waveformStack: {
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "center",
  },
  // One horizontal bar of blocks.
  waveRowH: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: BLOCK_GAP,
    height: BLOCK_H,
  },
  // Tiny dot under the shuffle icon when active, to make the on-state obvious.
  shuffleDot: {
    position: "absolute",
    bottom: 6,
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: ACCENT,
  },
  songTitle: { fontSize: 15, fontWeight: "700", color: "#fff", marginBottom: 3 },
  songArtist: { fontSize: 12, color: "rgba(255,255,255,0.5)" },
  artWrap: { width: 50, height: 50, position: "relative" },
  songArt: { width: 50, height: 50, borderRadius: 8 },
  songArtFallback: {
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center", justifyContent: "center",
  },
  dragHandle: {
    paddingHorizontal: 6, paddingVertical: 12,
    alignItems: "center", justifyContent: "center",
  },

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyTitle: { color: "rgba(255,255,255,0.45)", fontSize: 15, fontWeight: "600" },
  emptySub: { color: "rgba(255,255,255,0.25)", fontSize: 13, marginTop: 6 },
});
