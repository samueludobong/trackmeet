// Translates song lyrics with Claude (Haiku 4.5), keeping the Anthropic API key
// server-side. Body: { lines: string[], target: string, targetName?: string }.
// Returns { source: "<iso>" | null, lines: string[] } — `lines` is 1:1 with the
// input (same count + order), and `source` is the detected input language so the
// caller doesn't need a separate detection call.
//
// Requires the ANTHROPIC_API_KEY secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// Supabase verifies the caller's JWT by default, so only signed-in users can spend credits.

import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import Anthropic from "npm:@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") ?? "" });
const MODEL = "claude-haiku-4-5";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

function textOf(msg: any): string {
  return (msg?.content ?? []).filter((b: any) => b?.type === "text").map((b: any) => b.text).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const body = await req.json();
    const lines: string[] = Array.isArray(body?.lines) ? body.lines : [];
    const target: string = String(body?.target ?? "");
    const targetName: string = String(body?.targetName ?? target);
    if (!lines.length || !target) return json({ error: "lines and target required" }, 400);

    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system:
        `You are a professional song-lyrics translator. The user sends a JSON array of lyric lines. ` +
        `Detect the language of the input, then translate every line into ${targetName} (ISO 639-1 "${target}"). ` +
        `Respond with ONLY a JSON object of the form {"source":"<ISO 639-1 code of the input language>","lines":[...]} ` +
        `where "lines" has EXACTLY one translated line per input line, in the same order (blank input → ""). ` +
        `Translate naturally and singably — capture meaning and tone, not word-for-word. ` +
        `No notes, numbering, romanization, or commentary. Output nothing but the JSON object.`,
      messages: [{ role: "user", content: JSON.stringify(lines) }],
    });

    // Strip any accidental code fences, then parse.
    const raw = textOf(msg).trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch { return json({ error: "bad model output" }, 502); }

    const out = parsed?.lines;
    if (!Array.isArray(out) || out.length !== lines.length) return json({ error: "line count mismatch" }, 502);

    const source = typeof parsed?.source === "string" && /^[a-z]{2,3}$/i.test(parsed.source.trim())
      ? parsed.source.trim().toLowerCase()
      : null;

    return json({ source, lines: out.map((x: unknown) => String(x ?? "")) });
  } catch (e) {
    console.error("[translate-lyrics]", e);
    return json({ error: "translation failed" }, 500);
  }
});
