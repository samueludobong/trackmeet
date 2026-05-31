#!/usr/bin/env node
// Remove unused named imports, handling BOTH single-line and multi-line
// `import { ... } from "..."` blocks.
import fs from "node:fs";

for (const file of process.argv.slice(2)) {
  const src = fs.readFileSync(file, "utf8");
  // Tokenize into import-blocks vs other lines, joining multi-line imports.
  const lines = src.split("\n");
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^import\s*\{/.test(lines[i]) && !/\}/.test(lines[i])) {
      // multi-line: gather until a line containing `} from "..."`
      let j = i;
      const buf = [];
      while (j < lines.length && !/\}\s*from\s*['"][^'"]+['"]/.test(lines[j])) { buf.push(lines[j]); j++; }
      if (j < lines.length) buf.push(lines[j]);
      blocks.push({ type: "import-ml", text: buf.join("\n"), startLine: i });
      i = j;
    } else {
      blocks.push({ type: "line", text: lines[i] });
    }
  }
  const fullText = lines.join("\n");
  const out = [];
  for (const b of blocks) {
    const m = b.text.match(/^import\s*\{([\s\S]*?)\}\s*from\s*(['"][^'"]+['"])/);
    if (!m) { out.push(b.text); continue; }
    const mod = m[2];
    // usage = whole file minus this import block
    const rest = fullText.replace(b.text, "");
    const kept = m[1].split(",").map((s) => s.trim()).filter(Boolean).filter((spec) => {
      const cleaned = spec.replace(/^type\s+/, "").trim();
      const name = cleaned.includes(" as ") ? cleaned.split(/\s+as\s+/)[1].trim() : cleaned;
      return new RegExp("\\b" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b").test(rest);
    });
    if (kept.length === 0) continue;
    out.push(`import { ${kept.join(", ")} } from ${mod};`);
  }
  fs.writeFileSync(file, out.join("\n"));
  console.log("cleaned", file);
}
