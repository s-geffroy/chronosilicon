/**
 * REMEDIATION-02, AUD02-001, preuve « avant ». Applique aux fixtures la logique de décision
 * de scripts/audit-gate.ts tel qu'au tag remediation-01-rc2 (lignes 30-44), recopiée sans
 * modification, sauf la source des rapports : fichiers au lieu de `npm audit`, et date injectée.
 * Usage : npx tsx docs/audits/AUDIT-02/remediation/old-gate-harness.ts
 */
import { readFileSync, readdirSync } from 'node:fs';
interface Vuln { severity: string }
interface Exception { advisory: string; packages: string[]; expires: string }
const F = 'tests/fixtures/npm-audit/';
const load = (n: string) => (JSON.parse(readFileSync(F + n, 'utf8')) as { vulnerabilities: Record<string, Vuln> }).vulnerabilities;
const { exceptions } = JSON.parse(readFileSync('security/audit-exceptions.rc2.json', 'utf8')) as { exceptions: Exception[] };
function oldGate(prod: Record<string, Vuln>, all: Record<string, Vuln>, today: string): string[] {
  const errors: string[] = [];
  for (const x of exceptions) if (x.expires < today) errors.push(`exception for ${x.advisory} expired on ${x.expires}`);
  for (const [name, v] of Object.entries(prod)) errors.push(`production dependency ${name}: ${v.severity} advisory`);
  const active = exceptions.filter((x) => x.expires >= today);
  for (const [name, v] of Object.entries(all)) {
    if (prod[name]) continue;
    if (v.severity === 'high' || v.severity === 'critical') { errors.push(`dev dependency ${name}: ${v.severity} advisory (no exception allowed)`); continue; }
    if (!active.some((x) => x.packages.includes(name))) errors.push(`dev dependency ${name}: ${v.severity} advisory without a dated exception`);
  }
  return errors;
}
const cases: Array<[string, string, string, string]> = readdirSync(F).filter((n) => n.endsWith('.all.json'))
  .map((n) => [n.replace('.all.json', ''), n, 'real-2026-11-27.prod.json', '2026-11-27'] as [string, string, string, string]);
cases.push(['production-advisory', 'real-2026-11-27.all.json', 'production-advisory.prod.json', '2026-11-27']);
cases.push(['expired-exception', 'real-2026-11-27.all.json', 'real-2026-11-27.prod.json', '2027-02-01']);
for (const [name, all, prod, today] of cases) {
  let out: string;
  try { const e = oldGate(load(prod), load(all), today); out = e.length ? `FAIL ${e.join(' | ')}` : 'PASS'; }
  catch (err) { out = `CRASH ${(err as Error).message}`; }
  console.log(`${name}: ${out}`);
}
