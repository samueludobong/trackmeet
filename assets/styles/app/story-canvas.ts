import { StyleSheet } from "react-native";
import { SW, SH } from "../../../lib/feed/dimensions";
import {
  CanvasTextView, CARD_BASE, TEXT_BASE_FONT, isDarkHex,
} from "../../../components/stories/StoryCanvasRenderer";

const TRASH_SIZE = 56;

export const s = StyleSheet.create({
  elementLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },

  guideV: { position: "absolute", left: SW / 2 - 0.5, top: 0, bottom: 0, width: 1, backgroundColor: "rgba(90,200,250,0.9)" },
  guideH: { position: "absolute", top: SH / 2 - 0.5, left: 0, right: 0, height: 1, backgroundColor: "rgba(90,200,250,0.9)" },

  trash: {
    position: "absolute",
    bottom: 60,
    left: SW / 2 - TRASH_SIZE / 2,
    width: TRASH_SIZE,
    height: TRASH_SIZE,
    borderRadius: TRASH_SIZE / 2,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.8)",
    alignItems: "center",
    justifyContent: "center",
  },

  topBar: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    paddingTop: 50,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  chromeBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  aaTxt: { color: "#fff", fontSize: 18, fontWeight: "800" },

  bottomBar: { position: "absolute", left: 0, right: 0, bottom: 32 },
  postBtn: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 999,
  },
  postBtnTxt: { color: "#0D0D0D", fontSize: 14, fontWeight: "800" },

  // Text editor overlay
  editorTopBar: {
    paddingTop: 50,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  bgToggle: {
    width: 36, height: 36, borderRadius: 10,
    borderWidth: 1.5, borderColor: "#fff",
    alignItems: "center", justifyContent: "center",
    marginLeft: 4,
  },
  bgToggleTxt: { color: "#fff", fontSize: 16, fontWeight: "800" },
  doneTxt: { color: "#fff", fontSize: 16, fontWeight: "800" },

  editorCenter: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  editorPill: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, maxWidth: SW * 0.85 },
  editorInput: {
    fontSize: TEXT_BASE_FONT,
    lineHeight: TEXT_BASE_FONT * 1.22,
    textAlign: "center",
    minWidth: 60,
  },

  fontsRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 10 },
  fontChip: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  fontChipActive: { backgroundColor: "#fff" },
  fontChipTxt: { color: "#fff", fontSize: 16 },

  colorsRow: { paddingHorizontal: 16, gap: 12, alignItems: "center", paddingBottom: 16 },
  swatch: { width: 30, height: 30, borderRadius: 15 },
});
