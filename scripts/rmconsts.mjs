import fs from "node:fs";
const file = process.argv[2];
const names = process.argv.slice(3);
let lines = fs.readFileSync(file, "utf8").split("\n");

function removeOne(name) {
  const i = lines.findIndex((l) => new RegExp("^const " + name + "\\b").test(l));
  if (i === -1) { console.log("NOT FOUND", name); return; }
  // balance brackets across the declaration statement
  let depth = 0, j = i, started = false;
  do {
    const l = lines[j];
    for (const ch of l) {
      if (ch === "[" || ch === "{" || ch === "(") { depth++; started = true; }
      else if (ch === "]" || ch === "}" || ch === ")") depth--;
    }
    if (!started && /;\s*$/.test(l)) break; // single-line, no brackets
    j++;
  } while (j < lines.length && depth > 0);
  let end = depth > 0 ? i : j - (started ? 0 : 1);
  if (!started) end = i;
  else end = j - 1;
  // also absorb a following `for (...) { ... }` loop that builds this const
  let k = end + 1;
  while (k < lines.length && lines[k].trim() === "") k++;
  if (k < lines.length && /^for \(/.test(lines[k])) {
    let d = 0, m = k, op = false;
    do {
      for (const ch of lines[m]) { if (ch === "{") { d++; op = true; } else if (ch === "}") d--; }
      m++;
    } while (m < lines.length && (d > 0 || !op));
    end = m - 1;
  }
  lines.splice(i, end - i + 1);
}

for (const n of names) removeOne(n);
fs.writeFileSync(file, lines.join("\n"));
console.log("done");
