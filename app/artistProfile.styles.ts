import { StyleSheet, Dimensions } from "react-native";

const { width: SW, height: SH } = Dimensions.get("window");
const HERO_H = Math.round(SH * 0.50);

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0D0D0D" },

  heroTopRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: 18, paddingTop: 6,
  },
  heroIconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.46)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.13)",
    alignItems: "center", justifyContent: "center",
  },
  heroBottom:  { position: "absolute", bottom: 20, left: 20, right: 20 },
  heroNameRow: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  heroName: {
    fontSize: 34, fontWeight: "900", color: "#fff",
    letterSpacing: -0.5, flexShrink: 1, lineHeight: 40,
  },
  verifiedBadge: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: "#1D9BF0",
    alignItems: "center", justifyContent: "center",
    flexShrink: 0, marginBottom: 4,
  },
  heroListeners: {
    fontSize: 13, fontWeight: "600",
    color: "rgba(255,255,255,0.52)", marginTop: 4,
  },

  badgeRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10, gap: 12,
  },
  badgeLeft: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, flex: 1 },
  spotifyBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: "rgba(29,185,84,0.14)",
    borderWidth: 1, borderColor: "rgba(29,185,84,0.28)",
  },
  spotifyBadgeText: { fontSize: 12, fontWeight: "700", color: "#1DB954" },
  appleBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.18)",
  },
  appleBadgeText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  genreChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
    backgroundColor: "rgba(171,0,255,0.12)",
    borderWidth: 1, borderColor: "rgba(171,0,255,0.26)",
  },
  genreText: { fontSize: 11, fontWeight: "600", color: "#AB00FF" },

  bio: {
    fontSize: 14, color: "rgba(255,255,255,0.58)", lineHeight: 22,
    paddingHorizontal: 20, marginBottom: 10,
  },
  labelRow: {
    flexDirection: "row", alignItems: "center", gap: 7,
    paddingHorizontal: 20, marginBottom: 20,
  },
  labelText: { fontSize: 12, color: "rgba(255,255,255,0.3)", fontWeight: "500" },

  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)",
  },
  tabBtn:        { flex: 1, alignItems: "center", paddingVertical: 14, position: "relative" },
  tabLabel:      { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.32)", letterSpacing: 0.7 },
  tabLabelActive:{ color: "#fff" },
  tabIndicator:  {
    position: "absolute", bottom: 0, left: "18%", right: "18%",
    height: 2, backgroundColor: "#FF6C1A", borderRadius: 2,
  },
  tabContent: { flex: 1, minHeight: 320 },
});

export const FEATURED_W = SW - 40;
export const RECENT_W   = 140;

export const disc = StyleSheet.create({
  center:       { paddingTop: 56, alignItems: "center", gap: 12 },
  emptyText:    { fontSize: 15, fontWeight: "700", color: "rgba(255,255,255,0.22)" },
  emptySubtext: { fontSize: 13, color: "rgba(255,255,255,0.16)", marginTop: 4 },

  featuredCard: {
    marginHorizontal: 20, marginTop: 24, marginBottom: 6,
    backgroundColor: "#161618", borderRadius: 20, overflow: "hidden",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  featuredArtWrap:    { width: FEATURED_W - 2, height: FEATURED_W - 2, backgroundColor: "#1a1a1c" },
  featuredArtFallback:{ alignItems: "center", justifyContent: "center" },
  newBadge: {
    position: "absolute", top: 14, left: 14,
    backgroundColor: "#FF6C1A", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
  },
  newBadgeText:  { fontSize: 10, fontWeight: "900", color: "#fff", letterSpacing: 1 },
  featuredInfo:  { padding: 18 },
  featuredTitle: { fontSize: 19, fontWeight: "800", color: "#fff", lineHeight: 26, marginBottom: 5 },
  featuredMeta:  { fontSize: 12, color: "rgba(255,255,255,0.38)", fontWeight: "500" },

  trackList: {
    marginHorizontal: 20, marginBottom: 28,
    backgroundColor: "#161618", borderRadius: 16, overflow: "hidden",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.07)",
  },
  trackRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingVertical: 13, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)",
  },
  trackNum:  { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.22)", width: 22, textAlign: "right" },
  trackName: { flex: 1, fontSize: 14, fontWeight: "600", color: "#fff" },
  trackDur:  { fontSize: 12, color: "rgba(255,255,255,0.32)", fontWeight: "500" },

  sectionTitle: { fontSize: 17, fontWeight: "800", color: "#fff", marginHorizontal: 20, marginBottom: 14 },
  recentScroll: { paddingHorizontal: 20, gap: 16, paddingBottom: 4 },
  recentCard:   { width: RECENT_W },
  recentArt:    { width: RECENT_W, height: RECENT_W, borderRadius: 14, backgroundColor: "#1a1a1c" },
  recentArtFallback: { alignItems: "center", justifyContent: "center" },
  recentTitle:  { fontSize: 13, fontWeight: "700", color: "#fff", marginTop: 9, lineHeight: 18 },
  recentYear:   { fontSize: 11, color: "rgba(255,255,255,0.32)", marginTop: 3, fontWeight: "500" },

  // ── View toggle ───────────────────────────────────────────────────────────
  toggleRow: {
    flexDirection: "row", gap: 10,
    marginHorizontal: 20, marginTop: 20, marginBottom: 4,
  },
  toggleBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center", justifyContent: "center",
  },
  toggleBtnActive: {
    backgroundColor: "rgba(171,0,255,0.18)",
    borderColor: "rgba(171,0,255,0.50)",
  },
  toggleLabel:      { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.38)" },
  toggleLabelActive:{ color: "#AB00FF" },

  // ── Open in Spotify button (inside featured card) ─────────────────────────
  openBtn: {
    flexDirection: "row", alignItems: "center", gap: 7,
    alignSelf: "flex-start",
    marginTop: 12, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: "rgba(29,185,84,0.12)",
    borderWidth: 1, borderColor: "rgba(29,185,84,0.30)",
  },
  openBtnText: { fontSize: 12, fontWeight: "700", color: "#1DB954" },

  // ── All Releases list ─────────────────────────────────────────────────────
  allList: { marginHorizontal: 20, marginTop: 16 },
  allRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)",
  },
  allArt:         { width: 52, height: 52, borderRadius: 10, backgroundColor: "#1a1a1c" },
  allArtFallback: { alignItems: "center", justifyContent: "center" },
  allTitle:       { fontSize: 14, fontWeight: "700", color: "#fff" },
  allMeta:        { fontSize: 12, color: "rgba(255,255,255,0.36)", fontWeight: "500" },
  allSpotifyBtn:  {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "rgba(29,185,84,0.10)",
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
});

export const comm = StyleSheet.create({
  center:       { paddingTop: 60, alignItems: "center", gap: 12 },
  emptyText:    { fontSize: 15, fontWeight: "700", color: "rgba(255,255,255,0.22)" },
  emptySubtext: { fontSize: 13, color: "rgba(255,255,255,0.16)", marginTop: 4 },
});

export const ev = StyleSheet.create({
  container: { paddingTop: 8, paddingBottom: 50 },
  row: {
    flexDirection: "row", alignItems: "center", gap: 18,
    paddingHorizontal: 22, paddingVertical: 18,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)",
  },
  rowLast:  { borderBottomWidth: 0 },
  dateCol:  { width: 46, alignItems: "center" },
  month:    { fontSize: 10, fontWeight: "800", color: "#FF6C1A", letterSpacing: 0.8, textTransform: "uppercase" },
  day:      { fontSize: 28, fontWeight: "900", color: "#fff", lineHeight: 34 },
  info:     { flex: 1, gap: 3 },
  venue:    { fontSize: 15, fontWeight: "700", color: "#fff" },
  city:     { fontSize: 13, color: "rgba(255,255,255,0.42)" },
  footer:     { paddingTop: 28, alignItems: "center" },
  footerText: { fontSize: 13, color: "rgba(255,255,255,0.2)" },
});

