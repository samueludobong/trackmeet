import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  // Full-screen backdrop with the sheet at the bottom — flex-end pushes the
  // sheet up when KeyboardAvoidingView shrinks this container.
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "flex-end" },
  sheet: {
    height: "78%",
    backgroundColor: "#161618",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    // Rounded bottom too: stays hidden below the screen edge when the keyboard
    // is closed, and becomes visible when the keyboard lifts the sheet up.
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    paddingHorizontal: 16, paddingTop: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  title: { fontSize: 16, fontWeight: "800", color: "#fff" },

  npRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 12, paddingVertical: 12, borderRadius: 14,
    backgroundColor: "rgba(29,185,84,0.08)",
    borderWidth: 1, borderColor: "rgba(29,185,84,0.3)",
    marginBottom: 12,
  },
  npArt: { width: 44, height: 44, borderRadius: 8, backgroundColor: "#222" },
  npBadgeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  npDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#1DB954" },
  npBadge: { fontSize: 10, fontWeight: "800", color: "#1DB954", letterSpacing: 0.5, textTransform: "uppercase" },
  npName: { fontSize: 14, fontWeight: "700", color: "#fff" },
  npArtist: { fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 1 },
  attachBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "rgba(29,185,84,0.18)",
    alignItems: "center", justifyContent: "center",
  },

  searchRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 12, height: 42, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#fff", paddingVertical: 0 },

  resultRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 10, paddingHorizontal: 4,
  },
  resultArt: { width: 38, height: 38, borderRadius: 6, backgroundColor: "#222" },
  resultName: { fontSize: 13, fontWeight: "700", color: "#fff" },
  resultArtist: { fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 1 },

  artFallback: { alignItems: "center", justifyContent: "center" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyText: { fontSize: 13, color: "rgba(255,255,255,0.4)", textAlign: "center" },
});
