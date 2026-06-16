import { StyleSheet } from "react-native";
import { SW, SH } from "../../../lib/feed/dimensions";
import { TEXT_BASE_FONT } from "../../../components/stories/StoryCanvasRenderer";

export const t = StyleSheet.create({
  elementLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  wrap: {
    maxWidth: SW * 0.85,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  text: {
    fontSize: TEXT_BASE_FONT,
    lineHeight: TEXT_BASE_FONT * 1.22,
    textAlign: "center",
  },
  shadow: {
    textShadowColor: "rgba(0,0,0,0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
});
