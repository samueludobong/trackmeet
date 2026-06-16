import { StyleSheet } from "react-native";
import { BOTTOM_INSET, NAVBAR_H, SW } from "../../../../lib/feed/dimensions";

// Floating composer
export const floatingComposer = StyleSheet.create({
  composerWrap: { position: "absolute", left: 16, right: 16 },
  composerGlass: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.70)",
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 16,
  },
  composerPlus: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  composerPlusIcon: { fontSize: 24, color: "#fff", lineHeight: 28 },
  composerInput: {
    flex: 1,
    fontSize: 15,
    color: "#ffffff",
    paddingVertical: 0,
    paddingHorizontal: 4,
    textAlignVertical: "center",
  },
  composerSend: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#AB00FF",
    alignItems: "center",
    justifyContent: "center",
  },
  composerSendIcon: { fontSize: 18, color: "#fff", fontWeight: "700" },

});
