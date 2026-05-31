import fs from "node:fs";
const file = process.argv[2];
const names = process.argv.slice(3);
let lines = fs.readFileSync(file, "utf8").split("\n");
for (const n of names) {
  const i = lines.findIndex((l) => new RegExp("^(export )?type " + n + "\\b").test(l));
  if (i === -1) { console.log("NOT FOUND", n); continue; }
  const opens = (lines[i].match(/\{/g) || []).length;
  const closes = (lines[i].match(/\}/g) || []).length;
  let end = i;
  if (opens > closes) { // multi-line object type
    let j = i;
    while (j < lines.length && !/^\};?\s*$/.test(lines[j])) j++;
    end = j;
  }
  lines.splice(i, end - i + 1);
}
fs.writeFileSync(file, lines.join("\n"));
console.log("done");
