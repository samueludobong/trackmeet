import { StyleSheet, Dimensions, Platform } from "react-native";

const { width: SW, height: SH } = Dimensions.get("window");
const DRUM_H = 58;
const SAFE_BOTTOM = Platform.OS === "ios" ? 34 : 16;
const EXPANDED_TOP = SH * 0.13;

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a0030" },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,0,25,0.35)",
  },
  safeArea: { flex: 1, justifyContent: "flex-end" },

  // Title (above normal card)
  titleArea: { paddingHorizontal: 32, paddingBottom: 28 },
  title: {
    fontSize: 42,
    fontFamily: "Inter_900Black",
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: -1,
    lineHeight: 50,
  },
  titleSub: { fontSize: 15, color: "rgba(255,255,255,0.55)", marginTop: 10 },

  // Normal bottom card
  bottomCard: {
    borderRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 28,
    marginHorizontal: 8,
    marginBottom: -19,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  modeBlock: { gap: 12 },
  bottomCardHidden: { opacity: 0 },

  // ── Expanded card container ──
  // Floats with 40px margin on every side — completely detached from bottom sheet
  expandedContainer: {
    position: "absolute",
    right: 10,
    left: 10,
    top: EXPANDED_TOP,
    bottom: 40,
  },
  expandedCard: {
    flex: 1,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    overflow: "hidden",
  },
  expandedTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 3,
  },
  expandedTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  expandedSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.38)",
    marginTop: 3,
    textAlign: "center",
  },
  // flexGrow:1 + justifyContent:"center" means short content is vertically centered;
  // tall content (steps 5-6) simply overflows and scrolls naturally.
  expandedScroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    gap: 20,
  },

  // Saved accounts
  savedAccountCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  savedAccountAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: "rgba(171,0,255,0.5)",
  },
  savedAccountAvatarFallback: {
    backgroundColor: "rgba(171,0,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  savedAccountInitials: {
    fontSize: 20,
    fontWeight: "800",
    color: "#AB00FF",
  },
  savedAccountName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -0.2,
  },
  savedAccountHandle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
    marginTop: 2,
  },
  anotherAccountBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  anotherAccountText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.55)",
  },

  // Step dots
  stepDots: { flexDirection: "row", justifyContent: "center", gap: 5 },
  stepDot: { height: 4, borderRadius: 2 },
  stepDotDone: { backgroundColor: "#AB00FF" },
  stepDotActive: { backgroundColor: "#ffffff" },
  stepDotPending: { backgroundColor: "rgba(255,255,255,0.15)" },

  // Field
  field: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  usernameHint: {
    fontSize: 12,
    color: "rgba(255,255,255,0.28)",
    textAlign: "center",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(2, 2, 2, 0.51)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(232,0,15,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: { flex: 1, fontSize: 13, color: "#E8000F", fontWeight: "600" },

  // Drum picker
  drumWrap: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    overflow: "hidden",
  },
  drumDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 18,
  },

  // Streaming list rows
  streamRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: "rgb(0, 0, 0)",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  streamIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  streamSymbol: { fontSize: 16, color: "#fff", fontWeight: "900" },
  streamRowName: { flex: 1, fontSize: 15, fontWeight: "700", color: "#000" },
  streamConnectedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#000",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  streamConnectedText: { fontSize: 12, fontWeight: "700" },

  // Artists
  artistCard: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 14,
    alignItems: "center",
    gap: 5,
  },
  artistAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    marginBottom: 3,
  },
  artistInitials: { fontSize: 17, fontWeight: "900" },
  artistName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  artistGenre: { fontSize: 11, color: "rgba(255,255,255,0.35)" },
  artistFollowBtn: {
    marginTop: 4,
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#AB00FF",
  },
  artistFollowBtnActive: {
    backgroundColor: "rgba(171,0,255,0.15)",
    borderWidth: 1,
    borderColor: "#AB00FF",
  },
  artistFollowText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  artistFollowTextActive: { color: "#AB00FF" },

  // Buttons
  primaryBtn: {
    backgroundColor: "#ffffff",
    borderRadius: 50,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 4,
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "Inter_900Black",
    color: "#1a0030",
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    backgroundColor: "rgba(171,0,255,0.25)",
    borderRadius: 50,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(171,0,255,0.4)",
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Inter_900Black",
    color: "#ffffff",
    letterSpacing: 0.2,
  },

  // Social / divider
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  dividerText: { color: "rgba(255,255,255,0.4)", fontSize: 13 },
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    paddingVertical: 15,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  socialIcon: { fontSize: 16, color: "#ffffff", fontWeight: "700" },
  socialBtnText: { color: "#ffffff", fontWeight: "600", fontSize: 15 },
  switchText: {
    textAlign: "center",
    color: "rgba(255,255,255,0.45)",
    fontSize: 13,
    paddingBottom: 4,
  },
  switchLink: { color: "#AB00FF", fontWeight: "700" },
});

