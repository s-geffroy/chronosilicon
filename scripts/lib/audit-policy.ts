/**
 * Vulnerability policy (AUD-014, corrected by REMEDIATION-02 / AUD02-001; SECURITY.md).
 * Pure function over two `npm audit --json` reports (format v2) and the exception file.
 *
 * Fails on:
 *  - a report or exception file whose format is not the one expected (no guessing);
 *  - any advisory reaching a production dependency;
 *  - any high or critical advisory, exception or not;
 *  - a development advisory not covered by an exception that matches it EXACTLY:
 *    same GHSA identifier, same vulnerable package, same severity, same affected range,
 *    scope `dev`, not expired;
 *  - a package reported only transitively (via other packages) unless every advisory it
 *    resolves to is covered and the covering exception names that package in `paths`;
 *  - a dangling `via` reference, an expired exception, an exception longer than 92 days.
 * An exception that no longer matches anything is reported as unused (warning only).
 */

export type Severity = 'info' | 'low' | 'moderate' | 'high' | 'critical';
const SEVERITIES: readonly Severity[] = ['info', 'low', 'moderate', 'high', 'critical'];
const GHSA_URL = /^https:\/\/github\.com\/advisories\/(GHSA(?:-[0-9a-z]{4}){3})$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_EXCEPTION_DAYS = 92;

export interface Advisory { id: string; url: string; package: string; severity: Severity; range: string }
export interface AuditException {
  advisory: string; url: string; package: string; range: string; severity: 'low' | 'moderate';
  scope: 'dev'; paths: string[]; reason: string; decidedAt: string; expires: string;
}
export interface PolicyResult {
  errors: string[]; warnings: string[];
  counts: Record<string, number>; advisories: string[]; exceptionsActive: number;
}

interface Entry { name: string; severity: Severity; direct: Advisory[]; via: string[] }

function isObj(x: unknown): x is Record<string, unknown> { return typeof x === 'object' && x !== null && !Array.isArray(x); }

/** Parses one report; every deviation from the expected v2 shape is an error, never a skip. */
export function parseReport(raw: unknown, label: string, errors: string[]): Map<string, Entry> {
  const out = new Map<string, Entry>();
  if (!isObj(raw)) { errors.push(`${label}: report is not a JSON object`); return out; }
  if ('error' in raw) { errors.push(`${label}: npm audit returned an error: ${JSON.stringify(raw.error)}`); return out; }
  if (raw.auditReportVersion !== 2) { errors.push(`${label}: unsupported auditReportVersion ${JSON.stringify(raw.auditReportVersion)} (expected 2)`); return out; }
  if (!isObj(raw.vulnerabilities)) { errors.push(`${label}: missing "vulnerabilities" object`); return out; }
  for (const [key, v] of Object.entries(raw.vulnerabilities)) {
    if (!isObj(v) || v.name !== key || !SEVERITIES.includes(v.severity as Severity) || !Array.isArray(v.via) || v.via.length === 0) {
      errors.push(`${label}: malformed entry "${key}"`); continue;
    }
    const e: Entry = { name: key, severity: v.severity as Severity, direct: [], via: [] };
    for (const x of v.via) {
      if (typeof x === 'string') { e.via.push(x); continue; }
      const m = isObj(x) && typeof x.url === 'string' ? GHSA_URL.exec(x.url) : null;
      if (!isObj(x) || !m || typeof x.name !== 'string' || !SEVERITIES.includes(x.severity as Severity) || typeof x.range !== 'string') {
        errors.push(`${label}: malformed advisory in "${key}": ${JSON.stringify(x)}`); continue;
      }
      e.direct.push({ id: m[1]!, url: x.url as string, package: x.name, severity: x.severity as Severity, range: x.range });
    }
    out.set(key, e);
  }
  for (const e of out.values()) for (const ref of e.via) if (!out.has(ref)) errors.push(`${label}: "${e.name}" refers to "${ref}", absent from the report`);
  return out;
}

function days(a: string, b: string): number { return (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000; }

export function parseExceptions(raw: unknown, today: string, errors: string[]): AuditException[] {
  if (!isObj(raw) || raw.schemaVersion !== 2 || !Array.isArray(raw.exceptions)) {
    errors.push('exceptions: expected {"schemaVersion": 2, "exceptions": [...]}'); return [];
  }
  const out: AuditException[] = [];
  const seen = new Set<string>();
  raw.exceptions.forEach((x: unknown, i: number) => {
    const where = `exceptions[${i}]`;
    if (!isObj(x)) { errors.push(`${where}: not an object`); return; }
    const str = (k: string) => typeof x[k] === 'string' && (x[k] as string).length > 0;
    const missing = ['advisory', 'url', 'package', 'range', 'severity', 'scope', 'reason', 'decidedAt', 'expires'].filter((k) => !str(k));
    if (missing.length || !Array.isArray(x.paths) || !x.paths.every((p) => typeof p === 'string')) {
      errors.push(`${where}: missing or invalid fields ${missing.concat(Array.isArray(x.paths) ? [] : ['paths']).join(', ')}`); return;
    }
    const e = x as unknown as AuditException;
    const m = GHSA_URL.exec(e.url);
    if (!m || m[1] !== e.advisory) errors.push(`${where}: url ${e.url} does not match advisory ${e.advisory}`);
    if (e.scope !== 'dev') errors.push(`${where}: scope must be "dev" (production advisories are never excepted)`);
    if (e.severity !== 'low' && e.severity !== 'moderate') errors.push(`${where}: severity ${e.severity} cannot be excepted`);
    if (!ISO_DATE.test(e.decidedAt) || !ISO_DATE.test(e.expires)) errors.push(`${where}: dates must be YYYY-MM-DD`);
    else {
      if (days(e.decidedAt, e.expires) < 0) errors.push(`${where}: expires before it was decided`);
      if (days(e.decidedAt, e.expires) > MAX_EXCEPTION_DAYS) errors.push(`${where}: lasts more than ${MAX_EXCEPTION_DAYS} days`);
      if (e.expires < today) errors.push(`exception ${e.advisory} (${e.package}) expired on ${e.expires}`);
    }
    const key = `${e.advisory}|${e.package}`;
    if (seen.has(key)) errors.push(`${where}: duplicate exception for ${key}`);
    seen.add(key);
    out.push(e);
  });
  return out;
}

/** Advisories an entry resolves to, following `via` names (cycle-safe). */
function roots(name: string, report: Map<string, Entry>, seen = new Set<string>()): Advisory[] {
  if (seen.has(name)) return [];
  seen.add(name);
  const e = report.get(name);
  if (!e) return [];
  return [...e.direct, ...e.via.flatMap((v) => roots(v, report, seen))];
}

export function evaluate(prodRaw: unknown, allRaw: unknown, exceptionsRaw: unknown, today: string): PolicyResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!ISO_DATE.test(today)) errors.push(`invalid date ${today}`);
  const exceptions = parseExceptions(exceptionsRaw, today, errors);
  const active = exceptions.filter((x) => x.expires >= today);
  const prod = parseReport(prodRaw, 'production report', errors);
  const all = parseReport(allRaw, 'full report', errors);
  const used = new Set<AuditException>();
  const advisories = new Set<string>();

  for (const e of prod.values()) {
    const ids = roots(e.name, prod).map((a) => a.id);
    errors.push(`production dependency ${e.name}: ${e.severity} advisory ${[...new Set(ids)].join(', ') || '(unresolved)'} — never excepted`);
  }

  const cover = (a: Advisory) => active.find((x) => x.advisory === a.id && x.package === a.package && x.severity === a.severity && x.range === a.range);
  for (const e of all.values()) {
    if (prod.has(e.name)) continue;
    if (e.severity === 'high' || e.severity === 'critical') errors.push(`dev dependency ${e.name}: ${e.severity} (never excepted)`);
    for (const a of e.direct) {
      advisories.add(a.id);
      if (a.severity === 'high' || a.severity === 'critical') { errors.push(`dev dependency ${e.name}: ${a.severity} advisory ${a.id} (never excepted)`); continue; }
      const x = cover(a);
      if (!x) {
        const near = active.find((y) => y.package === a.package || y.advisory === a.id);
        const why = near ? ` (exception ${near.advisory}/${near.package} differs: ${[
          near.advisory !== a.id && `advisory ${a.id}`, near.package !== a.package && `package ${a.package}`,
          near.severity !== a.severity && `severity ${a.severity}`, near.range !== a.range && `range ${a.range}`,
        ].filter(Boolean).join(', ')})` : '';
        errors.push(`dev dependency ${e.name}: advisory ${a.id} (${a.severity}, ${a.range}) has no exact exception${why}`);
      } else used.add(x);
    }
    if (e.direct.length === 0) {
      const rs = roots(e.name, all);
      if (rs.length === 0) { errors.push(`dev dependency ${e.name}: no advisory reachable through "via"`); continue; }
      for (const a of rs) {
        const x = cover(a);
        if (!x) continue; // the vulnerable package itself is already reported above
        if (!x.paths.includes(e.name)) errors.push(`dev dependency ${e.name}: reached by ${a.id} through an unjustified path (not in exception "paths")`);
      }
    }
  }
  for (const x of active) if (!used.has(x)) warnings.push(`exception ${x.advisory} (${x.package}) matches no current advisory: remove it`);

  const counts: Record<string, number> = {};
  for (const e of all.values()) counts[e.severity] = (counts[e.severity] ?? 0) + 1;
  return { errors, warnings, counts, advisories: [...advisories].sort(), exceptionsActive: active.length };
}
