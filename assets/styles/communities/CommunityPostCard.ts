import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.045)", borderRadius: 20,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", padding: 14,
  },
  cardAnnouncement: {
    borderColor: "rgba(255,210,74,0.35)",
    backgroundColor: "rgba(255,210,74,0.05)",
  },
  badgeRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(171,0,255,0.12)", borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  badgeAnnouncement: { backgroundColor: "rgba(255,210,74,0.12)" },
  badgeText: { fontSize: 11, fontWeight: "800", color: "#AB00FF" },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 11 },
  cardAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#222" },
  cardAvatarFallback: { backgroundColor: "rgba(171,0,255,0.3)", alignItems: "center", justifyContent: "center" },
  cardAvatarText: { fontSize: 15, fontWeight: "800", color: "#fff" },
  cardNameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  cardName: { fontSize: 15, fontWeight: "700", color: "#fff" },
  cardTime: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 },
  cardText: { fontSize: 15, color: "rgba(255,255,255,0.9)", lineHeight: 21, marginTop: 12, fontWeight: "600" },

  songChip: {
    flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12,
    backgroundColor: "rgba(29,185,84,0.08)", borderRadius: 12, padding: 8,
    borderWidth: 1, borderColor: "rgba(29,185,84,0.2)",
  },
  songArt: { width: 40, height: 40, borderRadius: 8 },
  playBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#1DB954",
    alignItems: "center", justifyContent: "center",
  },
  songName: { fontSize: 13, fontWeight: "700", color: "#fff" },
  songArtist: { fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 1 },

  reactRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14, paddingHorizontal: 11, paddingVertical: 7,
  },
  viewsChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 4 },
  hotFlame: { fontSize: 16, marginRight: 4 },
  chipText: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.6)" },
});
