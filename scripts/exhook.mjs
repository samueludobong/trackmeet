#!/usr/bin/env node
// Extract a component's pure-logic block (state + effects + handlers, before the
// JSX `return (`) into a hook under hooks/, auto-generating imports + return.
// Usage: node scripts/exhook.mjs <componentFile> <hookName> <paramsSig> <callArgs>
//   paramsSig: e.g. "{ visible, onClose }: { visible: boolean; onClose: () => void }"
//   callArgs:  e.g. "visible, onClose"
import fs from "node:fs";
import { MAP, TYPES, RN, REACT } from "./registry.mjs";

const [, , file, hookName, paramsSig, callArgs, endMarker] = process.argv;
let lines = fs.readFileSync(file, "utf8").split("\n");
const sig = lines.findIndex((l) => /^export (default )?function /.test(l));
const sigEnd = lines.findIndex((l, i) => i >= sig && /\)\s*\{\s*$/.test(l));
const start = lines.findIndex((l, i) => i > sigEnd && /^  const /.test(l));
let end = endMarker
  ? lines.findIndex((l, i) => i > start && l.includes(endMarker))
  : lines.findIndex((l, i) => i > start && /^  return \(\s*$/.test(l));
if (start < 0 || end < 0) { console.error("markers", start, end); process.exit(1); }
// keep render guards (e.g. `if (!visible) return null;`) in the component
const guard = lines.findIndex((l, i) => i > start && i < end && /return null;/.test(l));
if (guard > -1) end = guard;
const body = lines.slice(start, end);
const block = body.join("\n");

// collect return names (top-level 2-space consts)
const names = [];
const seen = new Set();
for (const l of body) {
  let m = l.match(/^  const \[([A-Za-z0-9_]+),\s*([A-Za-z0-9_]+)\]/);
  if (m) { for (const n of [m[1], m[2]]) if (!seen.has(n)) { seen.add(n); names.push(n); } continue; }
  m = l.match(/^  const ([A-Za-z0-9_]+)\s*[=:]/);
  if (m && !seen.has(m[1])) { seen.add(m[1]); names.push(m[1]); }
}

// build imports
const defined = new Set(names);
const has = (s) => !defined.has(s) && new RegExp("\\b" + s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b").test(block);
const out = [];
const rh = REACT.filter(has); if (rh.length) out.push(`import { ${rh.join(", ")} } from "react";`);
const rn = RN.filter(has); if (rn.length) out.push(`import { ${rn.join(", ")} } from "react-native";`);
if (/ImagePicker\./.test(block)) out.push(`import * as ImagePicker from "expo-image-picker";`);
if (/SecureStore\./.test(block)) out.push(`import * as SecureStore from "expo-secure-store";`);
if (/\bAudio\b/.test(block)) out.push(`import { Audio } from "expo-av";`);
for (const [mod, syms] of Object.entries(MAP)) {
  const found = syms.filter(has); if (!found.length) continue;
  const value = found.filter((x) => !TYPES.has(x));
  const types = found.filter((x) => TYPES.has(x));
  const parts = [...value, ...types.map((t) => `type ${t}`)];
  const path = mod.startsWith("REL/") ? "../" + mod.slice(4) : mod;
  out.push(`import { ${parts.join(", ")} } from "${path}";`);
}

const hookFile = `hooks/${hookName}.ts`;
fs.writeFileSync(hookFile,
  out.join("\n") + "\n\nexport function " + hookName + "(" + paramsSig + ") {\n" +
  block + "\n\n  return { " + names.join(", ") + " };\n}\n");

// replace in component
const repl = ["  const {", "    " + names.join(", "), `  } = ${hookName}(${callArgs});`, ""];
lines.splice(start, end - start, ...repl);
const depth = file.split("/").length - 1;
const pre = "../".repeat(depth);
const expLine = lines.findIndex((l) => /^export (default )?function /.test(l));
lines.splice(expLine, 0, `import { ${hookName} } from "${pre}hooks/${hookName}";`, "");
fs.writeFileSync(file, lines.join("\n"));
console.log(`extracted ${names.length} names -> ${hookFile}`);
