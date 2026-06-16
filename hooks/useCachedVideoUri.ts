import { useEffect, useState } from "react";
import { MEDIA_CACHE_ENABLED } from "../lib/config";
import { cacheVideo, getCachedVideoUriSync } from "../services/mediaCache";

/**
 * Resolves a playable URI for a remote video, preferring the on-device cache.
 *
 * - If already cached, returns the local `file://` uri immediately (no flash).
 * - Otherwise returns the remote url so playback starts right away, and — once
 *   the clip is actually `active` (playing) — downloads it in the background so
 *   the *next* view plays from disk with zero egress.
 *
 * The local uri is intentionally NOT swapped in mid-playback (that would
 * restart the player); the cached file is picked up on the next mount, which is
 * exactly the scroll-back / re-open case that was re-downloading before. Gating
 * the download on `active` avoids caching clips the user scrolled straight past.
 */
export function useCachedVideoUri(remoteUrl?: string, active?: boolean): string | undefined {
  const [uri, setUri] = useState<string | undefined>(
    () => getCachedVideoUriSync(remoteUrl) ?? remoteUrl,
  );

  // Re-resolve when the source url changes (also picks up a now-cached file).
  useEffect(() => {
    setUri(getCachedVideoUriSync(remoteUrl) ?? remoteUrl);
  }, [remoteUrl]);

  // Cache on first real playback so subsequent views are local.
  useEffect(() => {
    if (!MEDIA_CACHE_ENABLED || !remoteUrl || !active) return;
    if (getCachedVideoUriSync(remoteUrl)) return; // already local
    void cacheVideo(remoteUrl);
  }, [remoteUrl, active]);

  return uri;
}
