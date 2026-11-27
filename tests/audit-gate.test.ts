/**
 * REMEDIATION-02, AUD02-001: the vulnerability gate matches each advisory to an exact
 * exception. Fixtures: tests/fixtures/npm-audit/ (real 2026-11-27 capture + single mutations).
 * The "before" behaviour of these same fixtures is in docs/audits/AUDIT-02/remediation/logs/.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { evaluate } from '../scripts/lib/audit-policy';
import { ROOT } from '../scripts/lib/corpus';

const fx = (n: string): unknown => JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/npm-audit', n), 'utf8'));
const exceptions = JSON.parse(readFileSync(join(ROOT, 'security/audit-exceptions.json'), 'utf8')) as {
  schemaVersion: number; exceptions: Array<Record<string, unknown>> };
const PROD = fx('real-2026-11-27.prod.json');
const ALL = fx('real-2026-11-27.all.json');
const TODAY = '2026-11-27';
const run = (all: unknown, prod: unknown = PROD, exc: unknown = exceptions, today = TODAY) => evaluate(prod, all, exc, today);
const withException = (patch: Record<string, unknown>) => ({ ...exceptions, exceptions: [{ ...exceptions.exceptions[0], ...patch }] });

describe('audit gate: positive case', () => {
  it('the real report is covered by the exact exception, with no warning', () => {
    const r = run(ALL);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
    expect(r.advisories).toEqual(['GHSA-g3hv-75wg-m249']);
    expect(r.counts).toEqual({ moderate: 8 });
  });
});

describe('audit gate: negative cases (each must fail)', () => {
  const fails = (r: ReturnType<typeof run>, pattern: RegExp) => {
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.errors.join('\n')).toMatch(pattern);
  };
  it('another advisory on an already-excepted package', () => fails(run(fx('other-advisory-same-package.all.json')), /GHSA-fixt-ure0-0001.*no exact exception/));
  it('two advisories on the package, one unknown', () => {
    const r = run(fx('two-advisories-one-unknown.all.json'));
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toMatch(/minimatch: advisory GHSA-fixt-ure0-0001/);
  });
  it('an unknown package reached transitively', () => fails(run(fx('unjustified-transitive.all.json')), /fixture-new-tool: reached by GHSA-g3hv-75wg-m249 through an unjustified path/));
  it('the same advisory with a different affected range', () => fails(run(fx('range-changed.all.json')), /range >=3\.0\.0 <11\.0\.1/));
  it('high severity, even on the excepted advisory', () => fails(run(fx('high-on-allowed-advisory.all.json')), /high advisory GHSA-g3hv-75wg-m249 \(never excepted\)/));
  it('any production advisory', () => fails(run(ALL, fx('production-advisory.prod.json')), /production dependency d3-array: low advisory GHSA-fixt-ure0-0001/));
  it('an expired exception', () => fails(run(ALL, PROD, exceptions, '2027-02-01'), /expired on 2027-01-31/));
  it('an unknown report version', () => fails(run(fx('unknown-report-version.all.json')), /unsupported auditReportVersion 1/));
  it('an advisory without a GHSA url', () => fails(run(fx('advisory-without-url.all.json')), /malformed advisory in "minimatch"/));
  it('a dangling via reference', () => fails(run(fx('dangling-via.all.json')), /"eslint" refers to "fixture-ghost"/));
  it('an npm audit error or unparseable output', () => fails(run({ error: { code: 'ENOTFOUND' } }), /npm audit returned an error/));
  it('an exception file in the old schema (package list, no exact match)', () => fails(run(ALL, PROD, { exceptions: [] }), /schemaVersion": 2/));
  it('an exception in production scope, or for high severity, or lasting more than 92 days', () => {
    fails(run(ALL, PROD, withException({ scope: 'prod' })), /scope must be "dev"/);
    fails(run(ALL, PROD, withException({ severity: 'high' })), /cannot be excepted/);
    fails(run(ALL, PROD, withException({ expires: '2027-03-31' })), /more than 92 days/);
  });
  it('an exception whose url does not match its identifier', () => fails(run(ALL, PROD, withException({ url: 'https://github.com/advisories/GHSA-aaaa-bbbb-cccc' })), /does not match advisory/));
  it('an exception without the transitive path loses those packages', () => fails(run(ALL, PROD, withException({ paths: ['eslint'] })), /typescript-eslint: reached by GHSA-g3hv-75wg-m249 through an unjustified path/));
});

describe('audit gate: hygiene', () => {
  it('an exception matching nothing is reported as unused (warning, not failure)', () => {
    const r = run({ auditReportVersion: 2, vulnerabilities: {} });
    expect(r.errors).toEqual([]);
    expect(r.warnings.join()).toMatch(/matches no current advisory/);
  });
  it('the committed exception expires on 2027-01-31 and is not longer than 92 days', () => {
    expect(exceptions.exceptions.map((x) => [x.advisory, x.decidedAt, x.expires])).toEqual([['GHSA-g3hv-75wg-m249', '2026-11-27', '2027-01-31']]);
  });
});
