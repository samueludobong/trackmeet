import { serve } from "https://deno.land/std@0.131.0/http/server.ts";

const CLIENT_ID     = Deno.env.get("SPOTIFY_CLIENT_ID") ?? "";
const CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET") ?? "";

console.log("[spotify-public-token] boot — CLIENT_ID present:", !!CLIENT_ID, "SECRET present:", !!CLIENT_SECRET);

// Module-level cache — survives across warm invocations of the same isolate
let cachedToken    = "";
let tokenExpiresAt = 0;

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  // Return cached token if it has more than 30 seconds left
  if (cachedToken && Date.now() < tokenExpiresAt - 30_000) {
    return new Response(
      JSON.stringify({ access_token: cachedToken }),
      { headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }

  // Exchange client credentials for a fresh token
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "client_credentials",
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }).toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[spotify-public-token] token fetch failed:", err);
    return new Response(
      JSON.stringify({ error: "Failed to obtain Spotify token" }),
      { status: 502, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }

  const { access_token, expires_in } = await res.json();
  cachedToken    = access_token;
  tokenExpiresAt = Date.now() + expires_in * 1000;

  return new Response(
    JSON.stringify({ access_token }),
    { headers: { ...CORS, "Content-Type": "application/json" } },
  );
});
