import fs from "node:fs";

// useSongPreview
let s = fs.readFileSync("hooks/useSongPreview.ts", "utf8");
s = s.replace(
  /const res = await fetch\(`https:\/\/api\.spotify\.com\/v1\/tracks\/\$\{song\.id\}`, \{[\s\S]*?\}\);\s*if \(!res\.ok \|\| !active\) return;\s*const data = await res\.json\(\);/,
  "const data = await fetchSpotifyTrackById(accessToken as string, song.id);\n        if (!data || !active) return;"
);
if (!/fetchSpotifyTrackById/.test(s.split("\n").slice(0, 12).join("\n"))) {
  const l = s.split("\n");
  const i = l.findIndex((x) => /^import /.test(x));
  l.splice(i + 1, 0, 'import { fetchSpotifyTrackById } from "../lib/spotify";');
  s = l.join("\n");
}
fs.writeFileSync("hooks/useSongPreview.ts", s);

// useArtistProfile
let a = fs.readFileSync("hooks/useArtistProfile.ts", "utf8");
a = a.replace(
  /fetch\(`https:\/\/api\.spotify\.com\/v1\/artists\/\$\{resolvedId\}`, \{[\s\S]*?\}\)/,
  "fetchSpotifyArtistById(token, resolvedId)"
);
a = a.replace("if (artistRes.ok) {\n        const a = await artistRes.json();", "if (artistRes) {\n        const a = artistRes;");
if (!/fetchSpotifyArtistById/.test(a.split("\n").slice(0, 12).join("\n"))) {
  const l = a.split("\n");
  const i = l.findIndex((x) => /^import /.test(x));
  l.splice(i + 1, 0, 'import { fetchSpotifyArtistById } from "../lib/spotify";');
  a = l.join("\n");
}
fs.writeFileSync("hooks/useArtistProfile.ts", a);
console.log("done");
