import { Directory, File, Paths } from "expo-file-system";
import { Image } from "expo-image";
import { MEDIA_CACHE_ENABLED } from "../lib/config";

/**
 * On-device video byte-cache. `expo-video` does no disk caching of its own, so
 * a remote clip is re-streamed in full on every view — the dominant Supabase
 * egress drain. This caches each video to the OS cache directory on first play
 * and serves the local file thereafter.
 *
 * Images are handled separately by expo-image's native cache (see CachedImage);
 * this module is videos only. The filesystem is the single source of truth for
 * what's cached — no manifest to drift out of sync.
 */

const CACHE_DIR_NAME = "tm-media";
/** Soft cap on total cached video bytes; oldest files are evicted past this. */
const MAX_CACHE_BYTES = 500 * 1024 * 1024; // 500 MB

function cacheDir(): Directory {
  return new Directory(Paths.cache, CACHE_DIR_NAME);
}

function ensureDir(): Directory {
  const dir = cacheDir();
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

function isRemote(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/** Original file extension (sans query/hash), validated to look like an ext. */
function extOf(url: string): string {
  const path = url.split("?")[0].split("#")[0];
  const dot = path.lastIndexOf(".");
  if (dot === -1) return "";
  const ext = path.slice(dot + 1);
  return /^[a-zA-Z0-9]{1,5}$/.test(ext) ? ext.toLowerCase() : "";
}

/** Stable, synchronous cache filename for a URL (djb2 → base36) + extension. */
function fileNameFor(url: string): string {
  let hash = 5381;
  for (let i = 0; i < url.length; i++) {
    hash = ((hash << 5) + hash + url.charCodeAt(i)) >>> 0;
  }
  const base = hash.toString(36);
  const ext = extOf(url);
  return ext ? `${base}.${ext}` : base;
}

function fileFor(url: string): File {
  return new File(cacheDir(), fileNameFor(url));
}

/**
 * Local `file://` uri for an already-cached video, or `null` if it isn't cached
 * (or caching is disabled / the url isn't remote). Fully synchronous, so it's
 * safe to call during render to avoid a remote→local flash.
 */
export function getCachedVideoUriSync(url: string | null | undefined): string | null {
  if (!MEDIA_CACHE_ENABLED || !url || !isRemote(url)) return null;
  try {
    const file = fileFor(url);
    return file.exists ? file.uri : null;
  } catch {
    return null;
  }
}

/**
 * Ensure a video is cached locally and resolve to its local `file://` uri. On
 * any failure (offline, HTTP error, disabled) resolves to the original remote
 * url so playback still works.
 */
export async function cacheVideo(url: string): Promise<string> {
  if (!MEDIA_CACHE_ENABLED || !isRemote(url)) return url;
  try {
    ensureDir();
    const file = fileFor(url);
    if (file.exists) return file.uri;
    await File.downloadFileAsync(url, file, { idempotent: true });
    enforceSizeCap();
    return file.exists ? file.uri : url;
  } catch (e) {
    if (__DEV__) console.warn("[mediaCache] download failed, streaming remote:", e);
    return url;
  }
}

/** Delete oldest files until total cached size is back under the cap. */
function enforceSizeCap(): void {
  try {
    const dir = cacheDir();
    if (!dir.exists) return;
    const files = dir.list().filter((e): e is File => e instanceof File);
    let total = files.reduce((sum, f) => sum + (f.size || 0), 0);
    if (total <= MAX_CACHE_BYTES) return;
    files.sort((a, b) => (a.modificationTime ?? 0) - (b.modificationTime ?? 0));
    for (const f of files) {
      if (total <= MAX_CACHE_BYTES) break;
      const size = f.size || 0;
      try {
        f.delete();
        total -= size;
      } catch {}
    }
  } catch {}
}

/** Wipe the entire on-device media cache (cached videos + expo-image caches). */
export async function clearMediaCache(): Promise<void> {
  try {
    const dir = cacheDir();
    if (dir.exists) dir.delete();
  } catch {}
  try {
    await Image.clearDiskCache();
  } catch {}
  try {
    await Image.clearMemoryCache();
  } catch {}
}
