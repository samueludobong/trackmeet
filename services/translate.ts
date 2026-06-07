// Lyrics translation via Claude (Haiku 4.5), through the `translate-lyrics`
// Supabase Edge Function. The Anthropic API key lives server-side in that
// function (Supabase secret) — never in the app bundle.
//
// Each (track, language) translation is cached in the shared `lyrics_translations`
// table (plus in-memory), so the Claude call happens exactly once, ever — every
// later viewer reads from the DB. The function also returns the detected source
// language, so there's no separate detection call.

import { supabase } from "../lib/supabase";
import { parseLrc, type LyricsResult, type SyncedLine } from "./lyrics";

export type Translation = { result: LyricsResult; source: string | null };

// Invoke the Edge Function. Returns parsed data or null on any failure.
async function callFn(body: Record<string, unknown>): Promise<any | null> {
  try {
    const { data, error } = await supabase.functions.invoke("translate-lyrics", { body });
    if (error) return null;
    return data ?? null;
  } catch {
    return null;
  }
}

export type Language = { code: string; name: string };

// Languages shown in the translation dropdown.
export const LANGUAGES: Language[] = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "nl", name: "Dutch" },
  { code: "ru", name: "Russian" },
  { code: "pl", name: "Polish" },
  { code: "tr", name: "Turkish" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese" },
  { code: "vi", name: "Vietnamese" },
  { code: "id", name: "Indonesian" },
  { code: "sv", name: "Swedish" },
  { code: "uk", name: "Ukrainian" },
  { code: "el", name: "Greek" },
];

export function languageName(code: string | null | undefined): string {
  if (!code) return "Original";
  return LANGUAGES.find((l) => l.code === code)?.name ?? code.toUpperCase();
}

// ── LRC (de)serialization for caching timestamped translations ────────────────
function msTag(ms: number): string {
  const cs = Math.max(0, Math.round(ms / 10)); // centiseconds
  const p2 = (n: number) => String(n).padStart(2, "0");
  return `[${p2(Math.floor(cs / 6000))}:${p2(Math.floor((cs % 6000) / 100))}.${p2(cs % 100)}]`;
}
function toLrc(lines: SyncedLine[]): string {
  return lines.map((l) => `${msTag(l.timeMs)}${l.text}`).join("\n");
}

// ── DB cache (shared across all users) ────────────────────────────────────────
async function readCache(trackId: string, target: string): Promise<Translation | null> {
  const { data, error } = await supabase
    .from("lyrics_translations")
    .select("synced_lyrics, plain_lyrics, source_lang")
    .eq("spotify_track_id", trackId)
    .eq("target_lang", target)
    .maybeSingle();
  if (error || !data) return null;
  const synced = data.synced_lyrics ? parseLrc(data.synced_lyrics) : null;
  const plain = data.plain_lyrics ?? null;
  if (!synced && !plain) return null;
  return { result: { synced, plain }, source: data.source_lang ?? null };
}

async function writeCache(trackId: string, target: string, t: Translation): Promise<void> {
  await supabase.from("lyrics_translations").upsert(
    {
      spotify_track_id: trackId,
      target_lang: target,
      source_lang: t.source,
      synced_lyrics: t.result.synced ? toLrc(t.result.synced) : null,
      plain_lyrics: t.result.plain ?? null,
    },
    { onConflict: "spotify_track_id,target_lang" },
  );
}

// In-memory cache so re-selecting a language within a session is instant.
const _mem = new Map<string, Translation>();

// Translate only the non-empty lines (so blank intro/instrumental gaps stay
// blank); returns the aligned full array plus the detected source language.
async function translateLines(
  texts: string[],
  target: string,
): Promise<{ lines: string[]; source: string | null } | null> {
  const idx: number[] = [];
  const toTranslate: string[] = [];
  texts.forEach((t, i) => { if (t.trim()) { idx.push(i); toTranslate.push(t); } });
  if (!toTranslate.length) return { lines: texts.slice(), source: null };

  const data = await callFn({ lines: toTranslate, target, targetName: languageName(target) });
  const out = data?.lines;
  if (!Array.isArray(out) || out.length !== toTranslate.length) return null;

  const lines = texts.slice();
  idx.forEach((origIndex, k) => { lines[origIndex] = String(out[k]); });
  return { lines, source: (data?.source as string) ?? null };
}

/**
 * Translate a resolved LyricsResult into `target`, preserving timestamps.
 * Checks the in-memory + DB cache first; only hits Claude on a true miss, then
 * writes the result back so it never happens again. Returns null on failure.
 */
export async function translateLyrics(
  trackId: string | null,
  lyrics: LyricsResult,
  target: string,
): Promise<Translation | null> {
  const key = trackId ? `${trackId}:${target}` : null;
  if (key && _mem.has(key)) return _mem.get(key)!;

  // Shared DB cache.
  if (trackId) {
    const cached = await readCache(trackId, target).catch(() => null);
    if (cached) { if (key) _mem.set(key, cached); return cached; }
  }

  // Miss → Claude.
  let out: Translation | null = null;
  if (lyrics.synced) {
    const r = await translateLines(lyrics.synced.map((l) => l.text), target);
    if (r) out = {
      result: { synced: lyrics.synced.map((l, i) => ({ timeMs: l.timeMs, text: r.lines[i] })), plain: lyrics.plain },
      source: r.source,
    };
  } else if (lyrics.plain) {
    const r = await translateLines(lyrics.plain.split("\n"), target);
    if (r) out = { result: { synced: null, plain: r.lines.join("\n") }, source: r.source };
  }
  if (!out) return null;

  if (trackId) writeCache(trackId, target, out).catch(() => {});
  if (key) _mem.set(key, out);
  return out;
}
