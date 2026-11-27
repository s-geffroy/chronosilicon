/**
 * Vulnerability gate (AUD-014, SECURITY.md). Blocking rules:
 *  - production dependencies (npm audit --omit=dev): any advisory, any severity, fails;
 *  - development dependencies: high or critical fails; moderate or low fails unless a
 *    dated, unexpired exception in security/audit-exceptions.json covers the package;
 *  - an expired exception fails.
 * Usage: npm run audit:gate  (needs the npm registry; run in CI and in the gate).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/corpus';

interface Vuln { severity: 'info' | 'low' | 'moderate' | 'high' | 'critical'; via: Array<string | { url?: string; title?: string }> }
interface Exception { advisory: string; packages: string[]; severity: string; scope: 'dev'; reason: string; decidedAt: string; expires: string }

function audit(args: string[]): Record<string, Vuln> {
  let out: string;
  try {
    out = execFileSync('npm', ['audit', '--json', ...args], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    out = (e as { stdout?: string }).stdout ?? ''; // npm audit exits 1 when it finds advisories
  }
  const parsed = JSON.parse(out) as { vulnerabilities?: Record<string, Vuln>; error?: unknown };
  if (parsed.error || !parsed.vulnerabilities) throw new Error(`npm audit failed: ${JSON.stringify(parsed.error ?? 'no report')}`);
  return parsed.vulnerabilities;
}

const today = new Date().toISOString().slice(0, 10);
const { exceptions } = JSON.parse(readFileSync(join(ROOT, 'security/audit-exceptions.json'), 'utf8')) as { exceptions: Exception[] };
const errors: string[] = [];
for (const x of exceptions) if (x.expires < today) errors.push(`exception for ${x.advisory} expired on ${x.expires}`);

const prod = audit(['--omit=dev']);
for (const [name, v] of Object.entries(prod)) errors.push(`production dependency ${name}: ${v.severity} advisory`);

const all = audit([]);
const active = exceptions.filter((x) => x.expires >= today);
for (const [name, v] of Object.entries(all)) {
  if (prod[name]) continue;
  if (v.severity === 'high' || v.severity === 'critical') { errors.push(`dev dependency ${name}: ${v.severity} advisory (no exception allowed)`); continue; }
  if (!active.some((x) => x.packages.includes(name))) errors.push(`dev dependency ${name}: ${v.severity} advisory without a dated exception`);
}

const counted = Object.values(all).reduce<Record<string, number>>((acc, v) => ({ ...acc, [v.severity]: (acc[v.severity] ?? 0) + 1 }), {});
if (errors.length) {
  console.error(`audit:gate FAILED (${errors.length})`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log(`audit:gate OK production=0 dev=${JSON.stringify(counted)} exceptions=${active.length}`);
