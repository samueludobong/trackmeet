// One-shot codemod: swap react-native <Image> → <CachedImage> across the app so
// remote images route through expo-image's disk cache (saves Supabase egress).
//
// Conservative by design:
//   - Only touches files that import `Image` from "react-native" AND contain a
//     real <Image ...> JSX tag (skips <ImageBackground>, <ImagePicker>, etc.).
//   - Skips files importing Image from "expo-image" (already migrated/special).
//   - Removes the now-unused `Image` specifier from the react-native import and
//     adds a correctly-pathed CachedImage import.
//   - No file in this repo uses RN Image static methods (verified), so the swap
//     is behaviour-preserving (expo-image handles both {uri} and require()).
//
// Run once:  node scripts/codemod-cached-image.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["components", "app"];
const CACHED_IMAGE_ABS = path.join(ROOT, "components", "ui", "CachedImage");

/** Recursively collect .tsx files under the scan dirs. */
function collect(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      collect(full, out);
    } else if (entry.name.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

/** Relative import specifier from `file` to components/ui/CachedImage (posix, ./-prefixed). */
function importPathFor(file) {
  let rel = path.relative(path.dirname(file), CACHED_IMAGE_ABS).split(path.sep).join("/");
  if (!rel.startsWith(".")) rel = "./" + rel;
  return rel;
}

/** Remove the `Image` specifier from a `... } from "react-native"` import block. */
function stripImageSpecifier(source) {
  const importRe = /import\s*\{([^}]*)\}\s*from\s*["']react-native["'];?/;
  const m = source.match(importRe);
  if (!m) return { source, changed: false };
  const specs = m[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!specs.includes("Image")) return { source, changed: false };
  const kept = specs.filter((s) => s !== "Image");
  const rebuilt = `import {${kept.length ? " " + kept.join(", ") + " " : ""}} from "react-native";`;
  return { source: source.replace(importRe, rebuilt), changed: true };
}

const files = SCAN_DIRS.flatMap((d) => collect(path.join(ROOT, d)));
const changed = [];

for (const file of files) {
  let src = fs.readFileSync(file, "utf8");

  // Skip files that don't use the react-native Image component, or that already
  // use expo-image.
  if (!/from\s*["']react-native["']/.test(src)) continue;
  if (/from\s*["']expo-image["']/.test(src)) continue;
  // A real <Image> tag (not <ImageBackground>, <ImagePicker>, etc.).
  if (!/<Image(?![A-Za-z])/.test(src)) continue;

  const stripped = stripImageSpecifier(src);
  if (!stripped.changed) continue; // Image not imported from react-native here
  src = stripped.source;

  // Swap the JSX tags.
  src = src.replace(/<Image(?![A-Za-z])/g, "<CachedImage");
  src = src.replace(/<\/Image>/g, "</CachedImage>");

  // Add the CachedImage import right after the (now Image-less) react-native import.
  const spec = importPathFor(file);
  const rnImportRe = /(import\s*\{[^}]*\}\s*from\s*["']react-native["'];?)/;
  src = src.replace(rnImportRe, `$1\nimport { CachedImage } from "${spec}";`);

  fs.writeFileSync(file, src, "utf8");
  changed.push(path.relative(ROOT, file));
}

console.log(`Migrated ${changed.length} files:`);
for (const f of changed) console.log("  " + f);
