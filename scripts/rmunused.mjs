#!/usr/bin/env node
// Remove unused *named* imports from a TS/TSX file. Conservative: only touches
// `import { a, b, type C } from "..."` lines; leaves default/namespace imports.
// A name is "used" if it appears (word-boundary) anywhere outside its own import line.
import fs from "node:fs";

for (const file of process.argv.slice(2)) {
  const src = fs.readFileSync(file, "utf8");
  const lines = src.split("\n");
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^import\s*\{([^}]*)\}\s*from\s*(['"][^'"]+['"]);?\s*$/);
    if (!m) { out.push(line); continue; }
    const rest = lines.filter((_, j) => j !== i).join("\n");
    const kept = m[1].split(",").map((s) => s.trim()).filter(Boolean).filter((spec) => {
      // for aliased imports (`x as y`), the locally-used name is the alias
      const cleaned = spec.replace(/^type\s+/, "").trim();
      const name = cleaned.includes(" as ") ? cleaned.split(/\s+as\s+/)[1].trim() : cleaned;
      return new RegExp("\\b" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b").test(rest);
    });
    if (kept.length === 0) continue; // drop whole import
    out.push(`import { ${kept.join(", ")} } from ${m[2]};`);
  }
  fs.writeFileSync(file, out.join("\n"));
  console.log("cleaned", file);
}
