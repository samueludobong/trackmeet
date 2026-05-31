#!/usr/bin/env node
// Move a span of lines out of app/feed.tsx into a new component file.
// Usage: node scripts/mvcomp.mjs <startMarker> <endMarker> <outFile> <headerFile>
//   startMarker: unique substring identifying the first line of the block
//   endMarker:   unique substring identifying the first line AFTER the block
//                (typically the next top-level declaration). Use "__EOF__" to
//                go to end of file.
//   outFile:     path of the new component file to create
//   headerFile:  path of a file whose contents are prepended (imports, etc.)
import fs from "node:fs";

const [, , startMarker, endMarker, outFile, headerFile] = process.argv;
const SRC = "app/feed.tsx";
const lines = fs.readFileSync(SRC, "utf8").split("\n");

const startIdx = lines.findIndex((l) => l.includes(startMarker));
if (startIdx === -1) { console.error("START not found:", startMarker); process.exit(2); }

let endIdx;
if (endMarker === "__EOF__") {
  endIdx = lines.length;
} else {
  endIdx = lines.findIndex((l, i) => i > startIdx && l.includes(endMarker));
  if (endIdx === -1) { console.error("END not found:", endMarker); process.exit(3); }
}

let block = lines.slice(startIdx, endIdx);
// trim trailing blank lines from block
while (block.length && block[block.length - 1].trim() === "") block.pop();

// ensure exported
block[0] = block[0]
  .replace(/^(\s*)function /, "$1export function ")
  .replace(/^(\s*)const /, "$1export const ")
  .replace(/^export export /, "export ");

const header = fs.readFileSync(headerFile, "utf8").replace(/\s*$/, "") + "\n\n";
fs.writeFileSync(outFile, header + block.join("\n") + "\n");

// remove from source
const remaining = [...lines.slice(0, startIdx), ...lines.slice(endIdx)];
fs.writeFileSync(SRC, remaining.join("\n"));

console.log(`moved ${block.length} lines -> ${outFile} (src ${startIdx + 1}..${endIdx})`);
