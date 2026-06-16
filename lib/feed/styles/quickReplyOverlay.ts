import { StyleSheet } from "react-native";
import { BOTTOM_INSET, NAVBAR_H, SW } from "../dimensions";

// Quick reply overlay
export const quickReplyOverlay = StyleSheet.create({
  qrBackdrop: { backgroundColor: "rgb(10, 10, 14)" },
  qrCardWrap: { position: "absolute", top: 60, left: 12, right: 12 },
  qrCloseBtn: { position: "absolute", top: -13, right: -13, zIndex: 20 },
  qrCloseBtnCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(35,35,40,0.98)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  qrCloseBtnIcon: { fontSize: 12, color: "#fff", fontWeight: "700" },
  qrInputRow: { position: "absolute", left: 16, right: 16 },
  qrInputGlass: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1c1c22",
    borderRadius: 28,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 10,
  },
  qrAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  qrAvatarText: { fontSize: 14, fontWeight: "800" },
  qrInputInner: { flex: 1 },
  qrReplyingTo: {
    fontSize: 11,
    color: "rgba(255,255,255,0.35)",
    marginBottom: 2,
  },
  qrInput: { fontSize: 15, color: "#ffffff", paddingVertical: 0 },
  qrSend: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#AB00FF",
    alignItems: "center",
    justifyContent: "center",
  },
  qrSendIcon: { fontSize: 17, color: "#fff", fontWeight: "700" },
  qrPlusBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  qrPlusBtnIcon: { fontSize: 22, color: "#fff", lineHeight: 26 },

});
