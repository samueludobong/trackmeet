import { SW } from "../lib/feed/dimensions";

// ─── Feed / meets / messages / profile layout constants ──────────────────────
// Sizing and spacing values extracted from app/feed.tsx.

// Live-meet stream cards
export const STREAM_CARD_GAP = 8;
export const STREAM_CARD_W = (SW - 32 - STREAM_CARD_GAP) / 2;
export const WAVE_HEIGHTS = [12, 22, 32, 18, 28, 10, 24, 16];

// Meet stream / banner cards
export const CARD_AVATAR_SIZE = 52;
export const CARD_AVATAR_OVERLAP = 18;
export const CARD_BANNER_H = 86;

// Messages header
export const MSG_HEADER_H = 72;

// Gradient toggle control
export const TOGGLE_W = 48;
export const TOGGLE_H = 28;
export const THUMB_SIZE = 22;
export const THUMB_TRAVEL = TOGGLE_W - THUMB_SIZE - 6; // 3px padding each side

// Profile banner / avatar
export const PROFILE_BANNER_H = 172;
export const PROFILE_AVATAR_SIZE = 86;
export const PROFILE_AVATAR_OVERLAP = Math.round(PROFILE_AVATAR_SIZE * 0.44);

// Banner color palette swatch
export const SWATCH_SIZE = Math.floor((SW - 40 - 30) / 4);
