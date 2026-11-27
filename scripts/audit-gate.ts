/**
 * Vulnerability gate (AUD-014; matching made exact by REMEDIATION-02 / AUD02-001).
 * Rules: scripts/lib/audit-policy.ts and SECURITY.md.
 * Usage:
 *   npm run audit:gate                       # runs npm audit (needs the npm registry)
 *   npm run audit:gate -- --all A.json --prod P.json [--today YYYY-MM-DD]
 *                                            # replays saved reports (tests, evidence)
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/corpus';
import { evaluate } from './lib/audit-policy';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
}

function audit(args: string[]): unknown {
  let out: string;
  try {
    out = execFileSync('npm', ['audit', '--json', ...args], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    out = (e as { stdout?: string }).stdout ?? ''; // npm audit exits 1 when it finds advisories
  }
  try { return JSON.parse(out); } catch { return { error: `unparseable npm audit output (${out.length} bytes)` }; }
}

const file = (p: string): unknown => JSON.parse(readFileSync(p, 'utf8'));
const allPath = arg('--all');
const prodPath = arg('--prod');
const today = arg('--today') ?? new Date().toISOString().slice(0, 10);
const prod = prodPath ? file(prodPath) : audit(['--omit=dev']);
const all = allPath ? file(allPath) : audit([]);
const r = evaluate(prod, all, file(join(ROOT, 'security/audit-exceptions.json')), today);

for (const w of r.warnings) console.warn('  warning: ' + w);
if (r.errors.length) {
  console.error(`audit:gate FAILED (${r.errors.length})`);
  for (const e of r.errors) console.error('  - ' + e);
  process.exit(1);
}
console.log(`audit:gate OK production=0 dev=${JSON.stringify(r.counts)} advisories=${r.advisories.join(',') || 'none'} exceptions=${r.exceptionsActive}`);
