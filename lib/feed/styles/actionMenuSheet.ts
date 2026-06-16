import { StyleSheet } from "react-native";
import { BOTTOM_INSET, NAVBAR_H, SW } from "../dimensions";

// Action menu sheet
export const actionMenuSheet = StyleSheet.create({
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  menuSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#111113",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  menuHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 12,
  },

  menuHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  menuXBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  menuXBtnIcon: { fontSize: 12, color: "#fff", fontWeight: "700" },
  menuHeaderTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  menuHeaderRight: { fontSize: 14, color: "#AB00FF", fontWeight: "600" },

  menuPhotoStrip: { paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  menuCameraBox: {
    width: 96,
    height: 96,
    borderRadius: 14,
    backgroundColor: "#1a1a1e",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  menuCameraIcon: { fontSize: 28 },
  menuCameraLabel: { fontSize: 12, color: "#fff", fontWeight: "600" },
  menuPhotoThumb: {
    width: 96,
    height: 96,
    borderRadius: 14,
    overflow: "hidden",
  },

  menuSectionDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    marginHorizontal: 0,
    marginVertical: 2,
  },
  menuSection: { paddingHorizontal: 16 },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  menuRowIconBox: { width: 30, alignItems: "center" },
  menuRowIconText: { fontSize: 18 },
  menuRowLabel: { flex: 1, fontSize: 15, color: "#ffffff", fontWeight: "400" },
  menuRowRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  menuRowRightText: { fontSize: 14, color: "rgba(255,255,255,0.4)" },
  menuRowChevron: {
    fontSize: 18,
    color: "rgba(255,255,255,0.25)",
    fontWeight: "300",
  },
  menuToggle: { marginLeft: "auto" as any },

});
