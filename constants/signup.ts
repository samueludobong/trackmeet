import { Dimensions, Platform } from "react-native";

const { width: SW, height: SH } = Dimensions.get("window");

export const SAVED_ACCOUNTS_KEY = "trackmeet_saved_accounts";

export const TOTAL_STEPS = 6;
export const DRUM_H = 58;
export const SAFE_BOTTOM = Platform.OS === "ios" ? 34 : 16;
// Expanded card starts this many px from the top of the screen
export const EXPANDED_TOP = SH * 0.13;

// ─── Static data ─────────────────────────────────────────────────────────────

export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
export const DAYS = Array.from({ length: 31 }, (_, i) =>
  String(i + 1).padStart(2, "0"),
);
export const YEARS = Array.from({ length: 80 }, (_, i) => String(2007 - i));

// fa5: FontAwesome5 brand icon name  |  text: fallback letter
export const STREAMING_SERVICES = [
  {
    id: "spotify",
    name: "Spotify",
    color: "#1DB954",
    iconType: "fa5",
    icon: "spotify",
  },
  {
    id: "apple",
    name: "Apple Music",
    color: "#FA233B",
    iconType: "fa5",
    icon: "apple",
  },
  // { id: "youtube",    name: "YouTube Music", color: "#FF0000", iconType: "fa5",  icon: "youtube"    },
  // { id: "tidal",      name: "Tidal",         color: "#000000", iconType: "text", icon: "T"          },
  // { id: "amazon",     name: "Amazon Music",  color: "#00A8E1", iconType: "fa5",  icon: "amazon"     },
  // { id: "soundcloud", name: "SoundCloud",    color: "#FF5500", iconType: "fa5",  icon: "soundcloud" },
];

export const DUMMY_ARTISTS = [
  {
    id: "a1",
    name: "Wizkid",
    genre: "Afrobeats",
    color: "#FF6B35",
    initials: "WK",
  },
  { id: "a2", name: "ROSÉ", genre: "K-Pop", color: "#AB00FF", initials: "RO" },
  {
    id: "a3",
    name: "Rema",
    genre: "Afrobeats",
    color: "#CAFF00",
    initials: "RE",
  },
  {
    id: "a4",
    name: "Bernadya",
    genre: "Indie Pop",
    color: "#FF3CAC",
    initials: "BD",
  },
  {
    id: "a5",
    name: "Ayra Starr",
    genre: "Afropop",
    color: "#00C2FF",
    initials: "AS",
  },
  { id: "a6", name: "SZA", genre: "R&B", color: "#7B61FF", initials: "SZ" },
  {
    id: "a7",
    name: "Burna Boy",
    genre: "Afrofusion",
    color: "#CAFF00",
    initials: "BB",
  },
  {
    id: "a8",
    name: "Olivia R.",
    genre: "Pop",
    color: "#FF6B35",
    initials: "OR",
  },
];

export const STEP_TITLES = [
  "Email",
  "Strong Password",
  "Your Username",
  "Birthday",
  "Link Streaming",
  "Artists for You",
];
export const STEP_SUBS = [
  "",
  "Make it something you won't forget.",
  "This is how the world finds you.",
  "You must be 16 or older to join.",
  "Sync your music taste automatically.",
  "Picked based on your streaming history.",
];
