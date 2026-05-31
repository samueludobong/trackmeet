#!/usr/bin/env node
// Resolve "Cannot find name 'X'" TS errors in a target file by inserting the
// appropriate import (looked up in the shared registry). Inserts component/lib
// imports before a stable anchor (or after the last import line).
// Usage: node scripts/fiximports.mjs <targetFile> [anchorSubstring]
import fs from "node:fs";
import { execSync } from "node:child_process";
import { MAP, TYPES } from "./registry.mjs";
import path from "node:path";

const target = process.argv[2];
const anchorSub = process.argv[3] || null;

// reverse map: symbol -> module key (prefer component/lib modules)
const sym2mod = new Map();
for (const [mod, syms] of Object.entries(MAP)) {
  for (const s of syms) if (!sym2mod.has(s)) sym2mod.set(s, mod);
}

// run tsc, collect missing names in target
let tsc = "";
try { execSync("npx tsc --noEmit", { encoding: "utf8" }); }
catch (e) { tsc = (e.stdout || "") + (e.stderr || ""); }
const norm = target.replace(/\\/g, "/");
const missing = new Set();
for (const line of tsc.split("\n")) {
  if (!line.replace(/\\/g, "/").startsWith(norm)) continue;
  const m = line.match(/Cannot find name '([A-Za-z0-9_]+)'/);
  if (m) missing.add(m[1]);
}
if (!missing.size) { console.log("no missing names in", target); process.exit(0); }

// compute rel prefix from target dir to repo root
const targetDir = path.dirname(norm);
const rel = path.relative(targetDir, ".").replace(/\\/g, "/");
const relPrefix = rel === "" ? "./" : rel + "/";

// group missing by module
const byMod = new Map();
const unresolved = [];
for (const name of missing) {
  const mod = sym2mod.get(name);
  if (!mod) { unresolved.push(name); continue; }
  if (!byMod.has(mod)) byMod.set(mod, []);
  byMod.get(mod).push(name);
}

const importLines = [];
for (const [mod, names] of byMod) {
  const parts = names.map((n) => (TYPES.has(n) ? `type ${n}` : n));
  const p = mod.startsWith("REL/") ? relPrefix + mod.slice(4) : mod;
  importLines.push(`import { ${parts.join(", ")} } from "${p}";`);
}

const lines = fs.readFileSync(target, "utf8").split("\n");
let at;
if (anchorSub) at = lines.findIndex((l) => l.includes(anchorSub));
if (at == null || at === -1) {
  // after last top-level import line
  let last = -1;
  for (let i = 0; i < lines.length; i++) if (/^import /.test(lines[i])) last = i;
  at = last + 1;
}
lines.splice(at, 0, ...importLines);
fs.writeFileSync(target, lines.join("\n"));
console.log(`inserted ${importLines.length} import(s) into ${target}`);
if (unresolved.length) console.log("UNRESOLVED (manual):", unresolved.join(", "));
