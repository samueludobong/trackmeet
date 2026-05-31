import fs from "node:fs";
const helpers = "lib/feed/helpers.ts";
let h = fs.readFileSync(helpers, "utf8").split("\n");
const start = h.findIndex((l) => /^export function parseSpotifyUrl/.test(l));
// end = end of fetchSpotifyLinkInfo (the closing `}` of `} catch { return null; }` block)
let end = -1;
for (let i = start; i < h.length; i++) {
  if (/^\}\s*$/.test(h[i]) && i > start && h.slice(start, i).join("\n").includes("fetchSpotifyLinkInfo")) { end = i; break; }
}
const block = h.slice(start, end + 1).join("\n");
// append to lib/spotify.ts
fs.appendFileSync("lib/spotify.ts", "\n\n// ─── Spotify link parsing / metadata (moved from lib/feed/helpers) ──────────\n" + block + "\n");
// remove from helpers, add re-export
h.splice(start, end - start + 1, 'export { parseSpotifyUrl, fetchSpotifyLinkInfo, type SpotifyLinkInfo } from "../spotify";');
fs.writeFileSync(helpers, h.join("\n"));
console.log("moved link-info to lib/spotify.ts");
