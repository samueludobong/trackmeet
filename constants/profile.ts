// Profile banner customization constants.

export const BANNER_PALETTE = [
  "#FF3B30", "#FF6C1A", "#FF9500", "#FFCC00",
  "#A3D977", "#30D158", "#00C7BE", "#0A84FF",
  "#6E6AE8", "#BF5AF2", "#FF375F", "#FF2D55",
  "#8E8E93", "#3A3A3C", "#1C1C1E", "#0D0D0D",
];
// 4 swatches per row, 10px gap between them, 20px padding on each side
export const PALETTE_ROWS: string[][] = [];
for (let i = 0; i < BANNER_PALETTE.length; i += 4) {
  PALETTE_ROWS.push(BANNER_PALETTE.slice(i, i + 4));
}

export const BANNER_SHAPES = [
  { key: "none",     label: "None"     },
  { key: "circle",   label: "Circle"   },
  { key: "ring",     label: "Ring"     },
  { key: "square",   label: "Square"   },
  { key: "diamond",  label: "Diamond"  },
  { key: "triangle", label: "Triangle" },
  { key: "oval",     label: "Oval"     },
  { key: "plus",     label: "Plus"     },
  { key: "arc",      label: "Arc"      },
];
export const SHAPE_ROWS: { key: string; label: string }[][] = [];
for (let i = 0; i < BANNER_SHAPES.length; i += 4) {
  SHAPE_ROWS.push(BANNER_SHAPES.slice(i, i + 4));
}

// Local-storage key for the saved-accounts switcher in Settings.
export const SAVED_ACCOUNTS_KEY = "trackmeet_saved_accounts";
