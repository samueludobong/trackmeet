import { getOrCacheSongPreviewUrl } from "./spotify";

/**
 * In-memory memo of resolved 30s-preview URLs, keyed by Spotify track id.
 *
 * `getOrCacheSongPreviewUrl` can be slow the first time a song is seen (it
 * scrapes Spotify's embed page, downloads the audio, and mirrors it into our
 * bucket). Caching the in-flight promise means:
 *   - repeat views of the same song are instant, and
 *   - we can *prefetch* upcoming songs so playback is ready by the time the
 *     user reaches them.
 *
 * Failures (null / throw) are evicted so a later attempt can retry.
 */
const cache = new Map<string, Promise<string | null>>();

export function resolveSongPreviewUrl(songId: string): Promise<string | null> {
  let p = cache.get(songId);
  if (!p) {
    p = getOrCacheSongPreviewUrl(songId)
      .then((url) => { if (!url) cache.delete(songId); return url; })
      .catch((e) => { cache.delete(songId); throw e; });
    cache.set(songId, p);
  }
  return p;
}

/** Warm the cache for a song without awaiting it (fire-and-forget). */
export function prefetchSongPreview(songId: string | null | undefined): void {
  if (songId) resolveSongPreviewUrl(songId).catch(() => {});
}
