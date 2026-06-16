import { StyleSheet } from "react-native";

const ACCENT = "#AB00FF";

export const s = StyleSheet.create({
  sheet: {
    // Anchored to the bottom and capped so it lifts cleanly above the keyboard
    // (the KeyboardAvoidingView pads its frame; an absolute bottom child rides
    // that padding up) and never grows tall enough to clip the input.
    position: "absolute", left: 0, right: 0, bottom: 0,
    maxHeight: "85%",
    backgroundColor: "#1a1a1f",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  title: { fontSize: 16, fontWeight: "800", color: "#fff", paddingHorizontal: 18, marginBottom: 12 },
  empty: { fontSize: 13, color: "rgba(255,255,255,0.35)", textAlign: "center", marginVertical: 24 },

  row: { flexDirection: "row", gap: 10 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#222" },
  avatarFallback: { backgroundColor: "rgba(171,0,255,0.18)", alignItems: "center", justifyContent: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { fontSize: 13, fontWeight: "800", color: "#fff", flexShrink: 1 },
  time: { fontSize: 11, color: "rgba(255,255,255,0.35)" },
  body: { fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 19, marginTop: 2 },

  inputRow: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    paddingHorizontal: 14, paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(255,255,255,0.08)",
  },
  input: {
    flex: 1, minHeight: 40, maxHeight: 100,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10,
    color: "#fff", fontSize: 14,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: ACCENT,
    alignItems: "center", justifyContent: "center",
  },
  lockedNote: {
    fontSize: 12, color: "rgba(255,255,255,0.35)", textAlign: "center",
    paddingTop: 12, paddingHorizontal: 18,
  },
});
