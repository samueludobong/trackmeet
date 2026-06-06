// Lyrics lookup via lrclib.net (https://lrclib.net/docs), with a shared
// Supabase cache in front of it.
//
// Flow (getLyricsForTrack):
//   1. If we have a Spotify track id, check the `lyrics_cache` table — instant
//      hit for any song someone has already viewed (and we cache negatives too).
//   2. On a miss, query lrclib: exact /api/get first (best with a duration),
//      then fuzzy /api/search picking the closest result.
//   3. Write the raw result back to the cache for everyone after us.

import { supabase } from "../lib/supabase";
import * as FileSystem from "expo-file-system/legacy";

export type SyncedLine = { timeMs: number; text: string };

export type LyricsResult = {
  // Time-synced lines, sorted by timestamp. Null when the track only has plain
  // lyrics or none at all.
  synced: SyncedLine[] | null;
  // Plain, non-timestamped lyrics. Null when unavailable.
  plain: string | null;
};

// Raw lyric strings as stored/fetched (LRC text + plain text), before parsing.
type RawLyrics = { syncedLrc: string | null; plain: string | null };

type LrclibRecord = {
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
  duration?: number | null;
  instrumental?: boolean;
};

const BASE = "https://lrclib.net/api";
const HEADERS = { "Lrclib-Client": "TrackMeet (https://github.com/trackmeet)" };

// Build a query string manually — RN's URL/URLSearchParams polyfill is partial
// and unreliable, so we encode params ourselves.
function qs(params: Record<string, string | number | undefined>): string {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
}

/** Parse an LRC string into sorted, timestamped lines. Returns null if no timestamps found. */
export function parseLrc(lrc: string): SyncedLine[] | null {
  const tag = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
  const out: SyncedLine[] = [];

  for (const raw of lrc.split("\n")) {
    // A single line may carry multiple timestamps (repeated lines).
    const stamps: number[] = [];
    let m: RegExpExecArray | null;
    tag.lastIndex = 0;
    while ((m = tag.exec(raw))) {
      const min = Number(m[1]);
      const sec = Number(m[2]);
      const frac = m[3] ? Number(m[3].padEnd(3, "0")) : 0;
      stamps.push(min * 60_000 + sec * 1_000 + frac);
    }
    if (!stamps.length) continue;
    const text = raw.replace(tag, "").trim();
    for (const t of stamps) out.push({ timeMs: t, text });
  }

  if (!out.length) return null;
  out.sort((a, b) => a.timeMs - b.timeMs);
  return out;
}

/** Turn raw lyric strings into the parsed UI shape, or null if nothing usable. */
function toResult(raw: RawLyrics | null): LyricsResult | null {
  if (!raw) return null;
  const synced = raw.syncedLrc ? parseLrc(raw.syncedLrc) : null;
  const plain = raw.plain?.trim() || null;
  if (!synced && !plain) return null;
  return { synced, plain };
}

function rawFromRecord(rec: LrclibRecord | null): RawLyrics | null {
  if (!rec || rec.instrumental) return null;
  const syncedLrc = rec.syncedLyrics?.trim() || null;
  const plain = rec.plainLyrics?.trim() || null;
  if (!syncedLrc && !plain) return null;
  return { syncedLrc, plain };
}

/** Hit lrclib directly and return the raw LRC/plain strings (or null). */
async function fetchFromLrclib(opts: {
  trackName: string;
  artistName?: string | null;
  albumName?: string | null;
  durationMs?: number | null;
}): Promise<RawLyrics | null> {
  const { trackName, artistName, albumName, durationMs } = opts;
  if (!trackName) return null;
  const durationSec = durationMs ? Math.round(durationMs / 1000) : undefined;

  // 1) Exact match — most reliable, especially with a duration to disambiguate.
  try {
    const query = qs({
      track_name: trackName,
      artist_name: artistName ?? undefined,
      album_name: albumName ?? undefined,
      duration: durationSec,
    });
    const r = await fetch(`${BASE}/get?${query}`, { headers: HEADERS });
    if (r.ok) {
      const raw = rawFromRecord(await r.json());
      if (raw) return raw;
    }
  } catch {
    // fall through to search
  }

  // 2) Fuzzy search — pick the candidate closest in duration that has lyrics.
  try {
    const query = qs({ track_name: trackName, artist_name: artistName ?? undefined });
    const r = await fetch(`${BASE}/search?${query}`, { headers: HEADERS });
    if (r.ok) {
      const arr = (await r.json()) as LrclibRecord[];
      if (Array.isArray(arr) && arr.length) {
        const candidates = arr.filter((x) => x.syncedLyrics || x.plainLyrics);
        if (candidates.length) {
          const best = durationSec
            ? candidates.reduce((a, b) =>
                Math.abs((b.duration ?? 0) - durationSec) < Math.abs((a.duration ?? 0) - durationSec) ? b : a
              )
            : // Prefer the first synced result when we can't compare durations.
              candidates.find((x) => x.syncedLyrics) ?? candidates[0];
          const raw = rawFromRecord(best);
          if (raw) return raw;
        }
      }
    }
  } catch {
    // give up
  }

  return null;
}

// ── In-memory cache ───────────────────────────────────────────────────────────
// Session-lifetime cache so a prefetched song renders instantly (no Supabase
// round-trip) when the lyrics overlay opens. "none" = known to have no lyrics.
const _mem = new Map<string, LyricsResult | "none">();
// In-flight lookups keyed by track id, so a prefetch and an overlay-open for the
// same song share one request instead of racing.
const _inflight = new Map<string, Promise<LyricsResult | null>>();

// Per-session memo of tracks already known to be discovered, so we don't retry
// the claim insert on every re-open.
const _claimed = new Map<string, boolean>();

/**
 * Atomically claim the first discovery of a song by inserting into
 * `lyrics_discoveries` (track id is the primary key). Returns true ONLY for the
 * single caller that inserted the row — everyone else hits a unique violation.
 * So the celebration fires exactly once, ever, across all users/devices, and
 * nothing in the lyrics-cache write path can reset it.
 */
export async function claimFirstDiscovery(trackId: string): Promise<boolean> {
  if (_claimed.get(trackId)) return false; // already known discovered this session
  const { data, error } = await supabase
    .from("lyrics_discoveries")
    .insert({ spotify_track_id: trackId })
    .select("spotify_track_id");
  if (!error) {
    _claimed.set(trackId, true);
    return (data?.length ?? 0) > 0; // inserted ⇒ we're the first
  }
  // 23505 = unique violation ⇒ someone already claimed it ⇒ definitely discovered.
  if ((error as any).code === "23505") { _claimed.set(trackId, true); return false; }
  return false; // transient error — don't memo, allow a later retry
}

// ── Local "already celebrated" guard ──────────────────────────────────────────
// A persistent on-device set of track ids whose discovery animation has already
// played here. Belt-and-suspenders so the confetti can NEVER replay on this
// device, even if the DB claim misbehaves or the migration isn't applied yet.
const CELEBRATED_FILE = FileSystem.documentDirectory + "lyrics_celebrated.json";
let _celebrated: Set<string> | null = null;

async function loadCelebrated(): Promise<Set<string>> {
  if (_celebrated) return _celebrated;
  try {
    const txt = await FileSystem.readAsStringAsync(CELEBRATED_FILE);
    _celebrated = new Set<string>(JSON.parse(txt));
  } catch {
    _celebrated = new Set<string>();
  }
  return _celebrated;
}

/** Has this device already played the discovery animation for this track? */
export async function hasCelebrated(trackId: string): Promise<boolean> {
  return (await loadCelebrated()).has(trackId);
}

/** Persist that this device has played the discovery animation for this track. */
export async function markCelebrated(trackId: string): Promise<void> {
  const set = await loadCelebrated();
  if (set.has(trackId)) return;
  set.add(trackId);
  try {
    await FileSystem.writeAsStringAsync(CELEBRATED_FILE, JSON.stringify([...set]));
  } catch {
    // non-fatal — worst case the animation could replay after an app restart
  }
}

/** Synchronous peek into the in-memory cache. Returns null when not warmed yet. */
export function peekLyrics(trackId: string | null | undefined): LyricsResult | "none" | null {
  if (!trackId) return null;
  return _mem.get(trackId) ?? null;
}

// ── Supabase cache ──────────────────────────────────────────────────────────

// "none" = we've looked this track up before and it genuinely has no lyrics.
// null   = not in the cache yet (caller should fetch from lrclib).
async function readCache(trackId: string): Promise<LyricsResult | "none" | null> {
  const { data, error } = await supabase
    .from("lyrics_cache")
    .select("synced_lyrics, plain_lyrics, not_found")
    .eq("spotify_track_id", trackId)
    .maybeSingle();
  if (error || !data) return null;
  if (data.not_found) return "none";
  return toResult({ syncedLrc: data.synced_lyrics, plain: data.plain_lyrics });
}

async function writeCache(
  trackId: string,
  trackName: string,
  artistName: string | null,
  raw: RawLyrics | null,
): Promise<void> {
  await supabase.from("lyrics_cache").upsert(
    {
      spotify_track_id: trackId,
      track_name: trackName,
      track_artist: artistName,
      synced_lyrics: raw?.syncedLrc ?? null,
      plain_lyrics: raw?.plain ?? null,
      not_found: toResult(raw) === null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "spotify_track_id" },
  );
}

/**
 * Resolve lyrics for a track, using the shared DB cache when a Spotify track id
 * is available. Returns null when no usable lyrics exist. Cache writes are
 * fire-and-forget so a slow/failed write never blocks the UI.
 */
export async function getLyricsForTrack(opts: {
  trackId?: string | null;
  trackName: string;
  artistName?: string | null;
  durationMs?: number | null;
}): Promise<LyricsResult | null> {
  const { trackId, trackName, artistName, durationMs } = opts;
  if (!trackName) return null;

  // 1) In-memory cache — instant.
  if (trackId) {
    const mem = _mem.get(trackId);
    if (mem !== undefined) return mem === "none" ? null : mem;
    // Share an in-flight lookup instead of starting a duplicate, slower request.
    const existing = _inflight.get(trackId);
    if (existing) return existing;
  }

  const job = (async (): Promise<LyricsResult | null> => {
    // 2) Shared DB cache.
    if (trackId) {
      const cached = await readCache(trackId).catch(() => null);
      if (cached === "none") { _mem.set(trackId, "none"); return null; }
      if (cached) { _mem.set(trackId, cached); return cached; }
    }

    // 3) Miss → hit lrclib, then persist for everyone after us (memory + DB,
    //    including the negative result).
    const raw = await fetchFromLrclib({ trackName, artistName, durationMs });
    const result = toResult(raw);
    if (trackId) {
      _mem.set(trackId, result ?? "none");
      writeCache(trackId, trackName, artistName ?? null, raw).catch(() => {});
    }
    return result;
  })();

  if (trackId) {
    _inflight.set(trackId, job);
    job.finally(() => { if (_inflight.get(trackId) === job) _inflight.delete(trackId); });
  }
  return job;
}
