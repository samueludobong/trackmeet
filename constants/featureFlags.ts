// Launch feature flags, driven by EXPO_PUBLIC_* env vars (inlined at build time
// — restart Metro with `expo start -c` after editing .env).
//
// Both gate features that depend on Spotify's locked-down Web API. For a launch
// build that never touches that API, set both to "false" in .env:
//
//   EXPO_PUBLIC_MEETS_ENABLED=false    → hides Meets (synced co-listening + DM jams)
//   EXPO_PUBLIC_SPOTIFY_ENABLED=false  → hides live now-playing + Connect-Spotify
//
// The intent is to gate only the *mounts and entry points*; with those removed
// the underlying services (meet sync, now-playing poll, Spotify auth) are never
// reached. Default to enabled when unset so dev builds keep their full feature set.

export const MEETS_ENABLED   = process.env.EXPO_PUBLIC_MEETS_ENABLED   !== "false";
export const SPOTIFY_ENABLED = process.env.EXPO_PUBLIC_SPOTIFY_ENABLED !== "false";
