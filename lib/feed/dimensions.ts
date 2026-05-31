import { Dimensions } from "react-native";

// Screen dimensions, read once at module load (matches previous in-file behavior).
export const { width: SW, height: SH } = Dimensions.get("window");

// ─── Layout constants ─────────────────────────────────────────────────────────
export const NAVBAR_H = 70;
export const BOTTOM_INSET = 34;
export const COMPOSER_ABOVE_NAV = NAVBAR_H + BOTTOM_INSET + 8;

// Card inner width (card has marginHorizontal: 13 → SW - 26) used for collage layouts
export const COLLAGE_W = SW - 26;
export const COLLAGE_GAP = 2;
