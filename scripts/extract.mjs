#!/usr/bin/env node
// Extract one or more components (+ their named StyleSheet blocks) out of
// app/feed.tsx into a new file with an auto-generated import header.
//
// Usage:
//   node scripts/extract.mjs <specJsonFile>
// spec = {
//   out: "components/post/PostCard.tsx",
//   rel: "../../",                 // path prefix from out dir to repo root
//   comps: [ ["startMarker","endMarker"], ... ],  // each a component span
//   styles: ["spCard","lbStyles"], // named const X = StyleSheet.create blocks
//   extraImports: ["import ... ;"] // optional manual imports appended
// }
// endMarker "__EOF__" = to end of file.
import fs from "node:fs";

const spec = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const SRC = "app/feed.tsx";
let lines = fs.readFileSync(SRC, "utf8").split("\n");

// Collect spans as [start,end) index ranges to remove.
const ranges = [];
const pieces = []; // text blocks for the out file, in declaration order

function findSpan(startMarker, endMarker) {
  const s = lines.findIndex((l) => l.includes(startMarker));
  if (s === -1) throw new Error("START not found: " + startMarker);
  let e;
  if (endMarker === "__EOF__") e = lines.length;
  else {
    e = lines.findIndex((l, i) => i > s && l.includes(endMarker));
    if (e === -1) throw new Error("END not found: " + endMarker);
  }
  return [s, e];
}

function findStyleSpan(name) {
  const s = lines.findIndex((l) => new RegExp(`^const ${name} = StyleSheet\\.create\\(`).test(l));
  if (s === -1) throw new Error("STYLE not found: " + name);
  // find closing line `});` at column 0
  let e = -1;
  for (let i = s + 1; i < lines.length; i++) {
    if (/^\}\);\s*$/.test(lines[i])) { e = i + 1; break; }
  }
  if (e === -1) throw new Error("STYLE end not found: " + name);
  return [s, e];
}

for (const [a, b] of spec.comps || []) {
  const [s, e] = findSpan(a, b);
  let block = lines.slice(s, e);
  while (block.length && block[block.length - 1].trim() === "") block.pop();
  // export every top-level (column-0) component declaration in the span
  block = block.map((l) =>
    /^function [A-Z]/.test(l) || /^const [A-Z][A-Za-z0-9]* *=/.test(l)
      ? "export " + l
      : l
  );
  ranges.push([s, e]);
  pieces.push({ s, text: block.join("\n") });
}
for (const name of spec.styles || []) {
  const [s, e] = findStyleSpan(name);
  // skip if this style block is already inside one of the component spans
  const inside = ranges.some(([rs, re]) => s >= rs && e <= re);
  if (inside) continue;
  ranges.push([s, e]);
  pieces.push({ s, text: lines.slice(s, e).join("\n") });
}

// safety: ensure no two ranges overlap (would corrupt the splice)
const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
for (let i = 1; i < sorted.length; i++) {
  if (sorted[i][0] < sorted[i - 1][1]) {
    throw new Error(`overlapping ranges ${sorted[i - 1]} and ${sorted[i]}`);
  }
}

// Build header by scanning all collected text.
const block = pieces.map((p) => p.text).join("\n");
const rel = spec.rel;
import { TYPES, MAP, RN, REACT } from "./registry.mjs";
// names defined within this file (the components being extracted) — never import these
const definedNames = new Set();
for (const l of block.split("\n")) {
  const m = l.match(/^export (?:function|const) ([A-Za-z0-9_]+)/);
  if (m) definedNames.add(m[1]);
}
const has = (sym) => !definedNames.has(sym) && new RegExp(`\\b${sym.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\b`).test(block);
const out = [`import React from "react";`];
const rn = RN.filter(has); if (rn.length) out.push(`import { ${rn.join(", ")} } from "react-native";`);
const rh = REACT.filter(has); if (rh.length) out.push(`import { ${rh.join(", ")} } from "react";`);
if (/ImagePicker\./.test(block)) out.push(`import * as ImagePicker from "expo-image-picker";`);
if (/SecureStore\./.test(block)) out.push(`import * as SecureStore from "expo-secure-store";`);
if (/\bAudio\b/.test(block)) out.push(`import { Audio } from "expo-av";`);
if (/useVideoPlayer|VideoView/.test(block)) out.push(`import { useVideoPlayer, VideoView } from "expo-video";`);
if (/useRouter|useLocalSearchParams/.test(block)) out.push(`import { ${["useRouter","useLocalSearchParams"].filter(has).join(", ")} } from "expo-router";`);
for (const [mod, syms] of Object.entries(MAP)) {
  const found = syms.filter(has); if (!found.length) continue;
  const value = found.filter((x) => !TYPES.has(x));
  const types = found.filter((x) => TYPES.has(x));
  const parts = [...value, ...types.map((t) => `type ${t}`)];
  const path = mod.startsWith("REL/") ? rel + mod.slice(4) : mod;
  out.push(`import { ${parts.join(", ")} } from "${path}";`);
}
for (const imp of spec.extraImports || []) out.push(imp);

// Write out file (pieces in source order).
pieces.sort((a, b) => a.s - b.s);
fs.writeFileSync(spec.out, out.join("\n") + "\n\n" + pieces.map((p) => p.text).join("\n\n") + "\n");

// Remove ranges from source (descending).
ranges.sort((a, b) => b[0] - a[0]);
for (const [s, e] of ranges) lines.splice(s, e - s);
fs.writeFileSync(SRC, lines.join("\n"));

console.log(`wrote ${spec.out}; removed ${ranges.length} blocks`);
