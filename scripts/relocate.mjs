import fs from "node:fs";
import { execSync } from "node:child_process";

// 1) Fix internal imports inside the moved files.
const internalFixes = {
  "services/meets.ts": [["'./supabase'", "'../lib/supabase'"], ["'./notifications'", "'../lib/notifications'"]],
  "services/messages.ts": [["'./supabase'", "'../lib/supabase'"]],
  "services/follows.ts": [["'./supabase'", "'../lib/supabase'"]],
  "services/playlists.ts": [["'./supabase'", "'../lib/supabase'"]],
  "hooks/useNowPlaying.ts": [["'./supabase'", "'../lib/supabase'"], ["'./spotify'", "'../lib/spotify'"], ["'./backgroundSync'", "'../lib/backgroundSync'"]],
  "lib/meetSync.ts": [["'./meets'", "'../services/meets'"]],
};
for (const [file, pairs] of Object.entries(internalFixes)) {
  let t = fs.readFileSync(file, "utf8");
  for (const [a, b] of pairs) t = t.split(a).join(b);
  fs.writeFileSync(file, t);
}

// 2) Rewrite all importers across the repo.
const specMap = [
  ["lib/meets", "services/meets"],
  ["lib/messages", "services/messages"],
  ["lib/follows", "services/follows"],
  ["lib/playlists", "services/playlists"],
  ["lib/useNowPlaying", "hooks/useNowPlaying"],
  ["lib/albumColors", "hooks/albumColors"],
];
const files = execSync('git ls-files "*.ts" "*.tsx"', { encoding: "utf8" }).split("\n").filter(Boolean);
let count = 0;
for (const f of files) {
  let t = fs.readFileSync(f, "utf8");
  let changed = false;
  for (const [from, to] of specMap) {
    const re = new RegExp(from.replace(/\//g, "\\/") + "(['\"])", "g");
    if (re.test(t)) { t = t.replace(new RegExp(from.replace(/\//g, "\\/") + "(['\"])", "g"), to + "$1"); changed = true; }
  }
  if (changed) { fs.writeFileSync(f, t); count++; }
}
console.log("rewrote importers in", count, "files");

// 3) Update registry.mjs REL paths.
let r = fs.readFileSync("scripts/registry.mjs", "utf8");
for (const [from, to] of specMap) r = r.split('REL/' + from).join('REL/' + to);
fs.writeFileSync("scripts/registry.mjs", r);
console.log("registry updated");
