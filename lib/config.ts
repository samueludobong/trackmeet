/**
 * App-wide runtime config derived from env.
 *
 * EXPO_PUBLIC_DEVELOPMENT_STATUS gates the media cache: in "Production" we serve
 * cached images/videos from the device so each Supabase asset is only fetched
 * once (saving egress); in development we pull fresh so edits show immediately.
 *
 * NOTE: EXPO_PUBLIC_* values are inlined into the bundle at build time, so a
 * change requires a Metro reload (`expo start -c`).
 */
export const DEVELOPMENT_STATUS = process.env.EXPO_PUBLIC_DEVELOPMENT_STATUS ?? "Development";

export const IS_PRODUCTION = DEVELOPMENT_STATUS === "Production";

/** Whether the on-device video file cache is active. */
export const MEDIA_CACHE_ENABLED = IS_PRODUCTION;

/**
 * expo-image cache policy. Production persists to disk (each URL fetched once,
 * served from disk forever); development keeps images in memory only so an app
 * relaunch always re-fetches the latest.
 */
export const IMAGE_CACHE_POLICY: "none" | "disk" | "memory" | "memory-disk" =
  IS_PRODUCTION ? "memory-disk" : "memory";
