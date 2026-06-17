import { StyleSheet } from "react-native";

const ACCENT = "#AB00FF";

export const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0D0D0D" },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)",
  },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  headerBtn: { color: "rgba(255,255,255,0.55)", fontSize: 15, fontWeight: "600" },
  headerBtnAccent: { color: ACCENT, fontSize: 15, fontWeight: "800" },

  // ── Hero (avatar + name) ────────────────────────────────────────────────────
  hero: { alignItems: "center", paddingHorizontal: 24, paddingTop: 28, paddingBottom: 22, gap: 10 },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarFallback: { backgroundColor: "rgba(171,0,255,0.18)", alignItems: "center", justifyContent: "center" },
  avatarInitials: { fontSize: 30, fontWeight: "800", color: ACCENT },
  heroName: { color: "#fff", fontSize: 20, fontWeight: "800" },
  heroHandle: { color: "rgba(255,255,255,0.45)", fontSize: 13 },

  // ── Section ────────────────────────────────────────────────────────────────
  section: { paddingHorizontal: 16, paddingTop: 18 },
  sectionLabel: {
    fontSize: 11, fontWeight: "800", letterSpacing: 0.9,
    color: "rgba(255,255,255,0.4)", marginBottom: 10,
  },

  input: {
    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: "#fff",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  inputHint: { fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 6 },

  // ── Color palettes ─────────────────────────────────────────────────────────
  swatchRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  swatch: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 2, borderColor: "transparent",
    alignItems: "center", justifyContent: "center",
  },
  swatchSelected: { borderColor: "#fff" },
  swatchClear: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.18)",
  },

  // ── Background image ───────────────────────────────────────────────────────
  bgPickerBox: {
    height: 96, borderRadius: 16,
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.15)",
    borderStyle: "dashed" as const,
    alignItems: "center", justifyContent: "center", gap: 6,
    overflow: "hidden", backgroundColor: "rgba(255,255,255,0.04)",
  },
  bgPickerHint: { fontSize: 13, color: "rgba(255,255,255,0.45)", fontWeight: "600" },
  bgPickerOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.42)",
    alignItems: "center", justifyContent: "center", gap: 6,
  },

  // ── Playlists ──────────────────────────────────────────────────────────────
  playlistRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.07)",
    marginBottom: 8,
  },
  playlistArt: { width: 44, height: 44, borderRadius: 8, backgroundColor: "rgba(171,0,255,0.18)" },
  playlistArtFallback: { alignItems: "center", justifyContent: "center" },
  playlistName: { color: "#fff", fontSize: 14, fontWeight: "700" },
  playlistMeta: { color: "rgba(255,255,255,0.42)", fontSize: 12, marginTop: 2 },
  playlistEmpty: {
    color: "rgba(255,255,255,0.45)", fontSize: 13,
    paddingVertical: 14, textAlign: "center",
  },

  newPlaylistBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(171,0,255,0.12)",
    borderWidth: 1, borderColor: "rgba(171,0,255,0.35)",
  },
  newPlaylistBtnText: { color: ACCENT, fontSize: 14, fontWeight: "800" },
});
