// Lyrics translation via LibreTranslate (https://libretranslate.com/docs).
//
// Endpoint + optional API key are configurable via env so you can point at a
// self-hosted instance or a mirror:
//   EXPO_PUBLIC_LIBRETRANSLATE_URL      (default: https://libretranslate.com)
//   EXPO_PUBLIC_LIBRETRANSLATE_API_KEY  (optional)

import { type LyricsResult } from "./lyrics";

const API_KEY = process.env.EXPO_PUBLIC_LIBRETRANSLATE_API_KEY || "";

// Endpoints tried in order: your configured one first, then public mirrors.
// Set EXPO_PUBLIC_LIBRETRANSLATE_URL to your own/keyed instance for reliability —
// the public mirrors are rate-limited and frequently down.
const HOSTS = [
  process.env.EXPO_PUBLIC_LIBRETRANSLATE_URL,
  "https://translate.flossboxin.org.in",
  "https://lt.vern.cc",
  "https://libretranslate.com",
]
  .filter((h): h is string => !!h)
  .map((h) => h.replace(/\/+$/, ""));

// POST to the first host that responds OK. Returns parsed JSON or null.
async function post(path: string, body: Record<string, unknown>): Promise<any | null> {
  const payload = JSON.stringify({ ...body, ...(API_KEY ? { api_key: API_KEY } : {}) });
  for (const host of HOSTS) {
    try {
      const res = await fetch(`${host}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });
      if (res.ok) return await res.json();
    } catch {
      // try next host
    }
  }
  return null;
}

export type Language = { code: string; name: string };

// Common languages LibreTranslate supports — shown in the dropdown.
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

/** Detect the dominant language of a block of text. Returns an ISO code or null. */
export async function detectLanguage(text: string): Promise<string | null> {
  const q = text.replace(/\s+/g, " ").trim().slice(0, 500);
  if (!q) return null;
  const data = await post("/detect", { q });
  return Array.isArray(data) && data[0]?.language ? (data[0].language as string) : null;
}

/**
 * Translate a batch of strings, aligned 1:1 with the input. Tries the array
 * form first (one request); falls back to a newline-joined single string for
 * instances that don't support array `q`.
 */
async function translateBatch(lines: string[], target: string, source: string): Promise<string[] | null> {
  if (!lines.length) return [];
  const src = source || "auto";

  // 1) Array form (preferred — exact alignment).
  const a = await post("/translate", { q: lines, source: src, target, format: "text" });
  if (a && Array.isArray(a.translatedText) && a.translatedText.length === lines.length) {
    return a.translatedText as string[];
  }

  // 2) Fallback: join with newlines, translate as one string, split back.
  const b = await post("/translate", { q: lines.join("\n"), source: src, target, format: "text" });
  if (b && typeof b.translatedText === "string") {
    const parts = b.translatedText.split("\n");
    if (parts.length === lines.length) return parts;
  }
  return null;
}

// Translate only the non-empty lines (so blank intro/instrumental gaps stay
// blank) and map the results back onto the originals by index.
async function translateTexts(texts: string[], target: string, source: string): Promise<string[] | null> {
  const idx: number[] = [];
  const toTranslate: string[] = [];
  texts.forEach((t, i) => {
    if (t.trim()) { idx.push(i); toTranslate.push(t); }
  });
  const out = await translateBatch(toTranslate, target, source);
  if (!out || out.length !== toTranslate.length) return null;
  const result = texts.slice();
  idx.forEach((origIndex, k) => { result[origIndex] = out[k]; });
  return result;
}

/**
 * Translate a resolved LyricsResult into `target`, preserving timestamps.
 * Returns null on failure so the caller can fall back to the original.
 */
export async function translateLyrics(
  lyrics: LyricsResult,
  target: string,
  source: string = "auto",
): Promise<LyricsResult | null> {
  if (lyrics.synced) {
    const out = await translateTexts(lyrics.synced.map((l) => l.text), target, source);
    if (!out) return null;
    return {
      synced: lyrics.synced.map((l, i) => ({ timeMs: l.timeMs, text: out[i] })),
      plain: lyrics.plain,
    };
  }
  if (lyrics.plain) {
    const out = await translateTexts(lyrics.plain.split("\n"), target, source);
    if (!out) return null;
    return { synced: null, plain: out.join("\n") };
  }
  return null;
}
