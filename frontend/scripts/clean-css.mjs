#!/usr/bin/env node
/**
 * Dead CSS audit + removal for globals.css
 *
 *   node scripts/clean-css.mjs           # report only, changes nothing
 *   node scripts/clean-css.mjs --write   # remove the verified-dead ranges
 *
 * Two things happen here:
 *
 * 1. VERIFIED RANGES — blocks confirmed dead by reading the components that
 *    would use them. These are removed on --write. Each range is matched by
 *    its start and end anchor text rather than line numbers, so the script
 *    stays correct if the file shifts.
 *
 * 2. AUDIT — every class selector in globals.css is checked against all of
 *    src/. Anything never referenced is reported as a candidate. This is a
 *    heuristic: classes built dynamically (`sec-${tone}`) will show as unused
 *    when they aren't. Read the list, don't trust it blindly.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cssPath = join(root, "src/app/globals.css");
const srcDir = join(root, "src");

const WRITE = process.argv.includes("--write");

/* ------------------------------------------------------------------ */
/* 1. Verified dead ranges                                             */
/* ------------------------------------------------------------------ */

const DEAD_RANGES = [
  {
    name: ".metro-tile-* (v1 tile)",
    // metro-tile.tsx emits only mt2-* classes. Verified by reading the file.
    from: ".metro-tile {",
    to: ".metro-grid-fade {",
    reason: "metro-tile.tsx renders mt2-* only; .metro-grid-fade IS used and is kept",
  },
  {
    name: ".metro-home-* + tile-enter/dashboard-orbit-drift",
    // metro-home.tsx renders mh, mh-bar, mh-deck, mh-grid — never metro-home-*.
    from: ".metro-home-atmosphere {",
    to: ".section-tone-wash {",
    reason: "metro-home.tsx renders mh-* classes; these keyframes are only used here",
  },
];

function stripRanges(css) {
  let out = css;
  const removed = [];

  for (const range of DEAD_RANGES) {
    const start = out.indexOf(range.from);
    if (start === -1) {
      removed.push({ ...range, lines: 0, note: "start anchor not found — already removed?" });
      continue;
    }

    const end = out.indexOf(range.to, start);
    if (end === -1) {
      removed.push({ ...range, lines: 0, note: "END ANCHOR NOT FOUND — SKIPPED" });
      continue;
    }

    const slice = out.slice(start, end);
    removed.push({ ...range, lines: slice.split("\n").length - 1 });
    out = out.slice(0, start) + out.slice(end);
  }

  return { css: out, removed };
}

/* ------------------------------------------------------------------ */
/* 2. Usage audit                                                      */
/* ------------------------------------------------------------------ */

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, files);
    else if (/\.(tsx?|jsx?|mdx?)$/.test(entry)) files.push(full);
  }
  return files;
}

function auditSelectors(css, sourceText) {
  // Class selectors only. Ignores pseudo-classes, attributes, keyframes.
  const found = new Set();
  const re = /\.(-?[_a-zA-Z][\w-]*)/g;
  let match;
  while ((match = re.exec(css))) found.add(match[1]);

  const unused = [];
  for (const name of found) {
    // Skip Tailwind-ish and utility names that legitimately appear only in CSS.
    if (/^(dark|group|peer|sr-only|container)$/.test(name)) continue;
    if (!sourceText.includes(name)) unused.push(name);
  }

  return unused.sort();
}

function groupByPrefix(names) {
  const groups = new Map();
  for (const name of names) {
    const prefix = name.split("-")[0];
    if (!groups.has(prefix)) groups.set(prefix, []);
    groups.get(prefix).push(name);
  }
  return [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
}

/* ------------------------------------------------------------------ */

const original = readFileSync(cssPath, "utf8");
const beforeLines = original.split("\n").length;

const { css: cleaned, removed } = stripRanges(original);
const afterLines = cleaned.split("\n").length;

console.log("\n=== Verified dead ranges ===\n");
for (const entry of removed) {
  const status = entry.note ? `  [${entry.note}]` : "";
  console.log(`  ${entry.lines.toString().padStart(4)} lines  ${entry.name}${status}`);
  console.log(`             ${entry.reason}\n`);
}

const sourceText = walk(srcDir)
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");

const unused = auditSelectors(cleaned, sourceText);

console.log("=== Selectors never referenced in src/ ===");
console.log("(heuristic — dynamically built class names will false-positive)\n");

for (const [prefix, names] of groupByPrefix(unused)) {
  if (names.length < 2) continue;
  console.log(`  ${prefix}-*  (${names.length})`);
  console.log(`    ${names.slice(0, 12).join(", ")}${names.length > 12 ? ", …" : ""}\n`);
}

console.log("=== Totals ===\n");
console.log(`  globals.css: ${beforeLines} -> ${afterLines} lines`);
console.log(`  unreferenced selectors remaining: ${unused.length}\n`);

if (WRITE) {
  writeFileSync(cssPath, cleaned, "utf8");
  console.log("  WRITTEN. Run `npm run build` and check every route before committing.\n");
} else {
  console.log("  Dry run. Re-run with --write to apply.\n");
}
