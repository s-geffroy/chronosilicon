/**
 * Built-site check of publication policy PUB-1 (REMEDIATION-02 / AUD02-002).
 * Scans every text file of apps/web/dist (HTML, JS, CSS, JSON, maps…) — the bundle that
 * also produces the JSON/CSV exports — for any run of OVERLAP_WORDS words of a withheld
 * third-party text (quote, uncertainty statement, raw quote of a non-open value), outside
 * the spans decided `publish` in data/publication/text-decisions.json. Fails on any hit.
 * Usage: npm run publication:check [-- <dir>]   (after npm run build; <dir> defaults to apps/web/dist)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { leaks, OVERLAP_WORDS, POLICY_ID } from '@chronosilicon/ontology';
import { ROOT, runPipeline } from './lib/corpus';

const DIST = process.argv[2] ? join(ROOT, process.argv[2]) : join(ROOT, 'apps/web/dist');
const r = runPipeline();
if (r.errors.length || !r.publicationCheck) {
  console.error(`publication:check FAILED: corpus pipeline errors (${r.errors.length})`);
  for (const e of r.errors.slice(0, 20)) console.error('  - ' + e);
  process.exit(1);
}
const { withheldTexts, approvedSpans, openTexts } = r.publicationCheck;
const files: string[] = [];
const stack = [DIST];
while (stack.length) {
  const d = stack.pop()!;
  for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) stack.push(p); else files.push(p); }
}
const TEXT = /\.(html|js|mjs|css|json|map|txt|svg|xml|webmanifest)$/i;
const scanned = files.filter((f) => TEXT.test(f));
const bad: string[] = [];
for (const f of scanned) {
  // JSON/JS strings escape non-ASCII and quotes; decode \uXXXX so the words compare equal.
  const text = readFileSync(f, 'utf8').replace(/\\u([0-9a-fA-F]{4})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)));
  for (const l of leaks(text, withheldTexts, approvedSpans, openTexts)) bad.push(`${relative(ROOT, f)}: ${l}`);
}
if (bad.length) {
  console.error(`publication:check FAILED (${bad.length})`);
  for (const b of bad.slice(0, 50)) console.error('  - ' + b);
  if (bad.length > 50) console.error(`  … ${bad.length - 50} more`);
  process.exit(1);
}
console.log(`publication:check OK policy=${POLICY_ID} files=${scanned.length}/${files.length} withheldTexts=${withheldTexts.length} window=${OVERLAP_WORDS} words`);
