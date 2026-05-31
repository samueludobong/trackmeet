#!/usr/bin/env node
// Insert one or more import lines into app/feed.tsx just before the
// stable marker `export { FeedUserCtx }`. Usage:
//   node scripts/addimport.mjs "import { X } from '../components/..'" ...
import fs from "node:fs";
const SRC = "app/feed.tsx";
const lines = fs.readFileSync(SRC, "utf8").split("\n");
const anchor = lines.findIndex((l) => l.includes("export { FeedUserCtx }"));
if (anchor === -1) { console.error("anchor not found"); process.exit(2); }
const imports = process.argv.slice(2);
lines.splice(anchor, 0, ...imports);
fs.writeFileSync(SRC, lines.join("\n"));
console.log("added", imports.length, "import(s)");
