/**
 * REMEDIATION-02, AUD02-002: publication policy PUB-1 (packages/ontology/src/publication.ts).
 * Unit cases on synthetic inputs, then guards on the real public corpus.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { applyPublicationPolicy, normalize, REDACTION, type TextDecision } from '@chronosilicon/ontology';
import { ROOT, runPipeline } from '../scripts/lib/corpus';

const ph = [{ id: 'p', domain: 'cpu', quantityKind: 'duration', label: { fr: 'p', en: 'p' }, description: null }];
const QUOTE = 'the measured round trip stays below two milliseconds on every tested route';
const meas = (over: Record<string, unknown> = {}) => ({
  id: 'm1', phenomenonId: 'p', configuration: null, value: 1, unit: 's', low: null, high: null,
  conditions: { fr: 'plain', en: 'plain' }, protocol: null, provenanceType: 'documented', verificationStatus: 'qualified',
  sourceIds: ['b'], locator: "Table 2 'Round Trip Times'", quote: QUOTE, era: null, uncertainty: null, statistics: null,
  calculation: null, rawRef: 'x', notes: null, ...over,
});
const src = (id: string, redistribution: string) => ({ id, redistribution }) as never;
const dec = (scope: string, field: string, text: string, decision: 'publish' | 'redact', kind: 'quoted' | 'overlap' = 'quoted'): TextDecision =>
  ({ scope, field, text, kind, decision, ground: decision === 'redact' ? 'third-party-excerpt' : 'locating-label' });
const LOC = dec('measurement:m1', 'locator', "'Round Trip Times'", 'publish');
function run(m: Record<string, unknown>, decisions: TextDecision[], sources = [src('b', 'reference-only')], extra: Partial<Parameters<typeof applyPublicationPolicy>[0]> = {}) {
  return applyPublicationPolicy({
    measurements: normalize(ph as never, [m as never]), sources, groups: [], phenomena: [], observers: [], scenarios: [], withheld: [],
    rawQuotes: new Map(), withheldQuotes: new Map(), decisions, ...extra,
  });
}

describe('PUB-1 (unit)', () => {
  it('open scope: everything published, no decision needed', () => {
    const r = run(meas({ sourceIds: ['a'] }), [], [src('a', 'allowed')]);
    expect(r.problems).toEqual([]);
    expect(r.measurements[0]!.quote).toBe(QUOTE);
    expect(r.measurements[0]!.excerpt).toEqual({ status: 'published' });
  });
  it('non-open: quote withheld; every quoted span, even short, needs a decision', () => {
    const r = run(meas(), []);
    expect(r.measurements[0]!.quote).toBeNull();
    expect(r.problems.join()).toMatch(/undecided quoted text in measurement:m1 locator: "'Round Trip Times'"/);
    expect(run(meas(), [LOC]).problems).toEqual([]);
  });
  it('an unquoted copy of the withheld quote is found (the REMEDIATION-01 heuristic missed it)', () => {
    const notes = 'Vendor says the measured round trip stays below two milliseconds here.';
    const r = run(meas({ notes }), [LOC]);
    expect(r.problems.join()).toMatch(/undecided overlap text in measurement:m1 notes: "the measured round trip stays below two milliseconds"/);
    const ok = run(meas({ notes }), [LOC, dec('measurement:m1', 'notes', 'the measured round trip stays below two milliseconds', 'redact', 'overlap')]);
    expect(ok.problems).toEqual([]);
    expect(ok.measurements[0]!.notes).toBe(`Vendor says ${REDACTION} here.`);
    expect(ok.measurements[0]!.excerpt).toEqual({ status: 'withheld', reason: 'redistribution-not-established', redacted: ['quote', 'notes'] });
  });
  it('an overlap crossing a quoted span is one finding over the union (nothing skipped)', () => {
    const notes = "So 'the measured round trip' stays below two milliseconds on every tested route.";
    const r = run(meas({ notes }), [LOC]);
    expect(r.findings.filter((f) => f.field === 'notes').map((f) => [f.kind, f.text]))
      .toEqual([['overlap', "'the measured round trip' stays below two milliseconds on every tested route"]]);
  });
  it('a stale or duplicate decision fails', () => {
    expect(run(meas(), [LOC, dec('measurement:m1', 'notes', "'gone'", 'publish')]).problems.join()).toMatch(/stale decision/);
    expect(run(meas(), [LOC, LOC]).problems.join()).toMatch(/duplicate decision/);
  });
  it('a field outside PUBLIC_FIELDS makes publication throw (nothing is published by default)', () => {
    expect(() => run(meas({ secretNote: 'x' }), [LOC])).toThrow(/field "secretNote" of measurement:m1 is not in PUBLIC_FIELDS/);
  });
  it('the global check catches withheld wording copied into another scope (group note)', () => {
    const r = run(meas(), [LOC], undefined, { groups: [{ id: 'g', kind: 'comparison', quantityKind: 'duration', label: { fr: 'g', en: 'g' }, members: ['zz'], comparability: 'heterogeneous', note: { fr: 'x', en: `As noted, ${QUOTE}.` } }] as never });
    expect(r.problems.join()).toMatch(/withheld third-party wording published: "the measured round trip stays below"/);
  });
  it('raw quotes count as third-party text', () => {
    const notes = 'Raw source line: alpha beta gamma delta epsilon zeta eta.';
    const r = run(meas({ notes }), [LOC], undefined, { rawQuotes: new Map([['m1', ['alpha beta gamma delta epsilon zeta eta theta']]]) });
    expect(r.problems.join()).toMatch(/undecided overlap text .* "alpha beta gamma delta epsilon zeta eta"/);
  });
});

describe('PUB-1 on the real corpus', () => {
  const r = runPipeline();
  const decisions = (JSON.parse(readFileSync(join(ROOT, 'data/publication/text-decisions.json'), 'utf8')) as { decisions: TextDecision[] }).decisions;
  it('builds with no publication problem: every finding decided, no stale decision, no leak', () => {
    expect(r.errors).toEqual([]);
    expect(r.findings!.filter((f) => !f.decision)).toEqual([]);
  });
  it('decisions are complete records with a ground; reviewed ones carry a note', () => {
    expect(decisions.length).toBeGreaterThan(400);
    for (const d of decisions as Array<TextDecision & { basis?: string }>) {
      expect(d.basis === 'review' ? typeof d.note === 'string' && d.note.length > 10 : /^rule:/.test(d.basis ?? '')).toBe(true);
    }
  });
  it('the five residuals of AUD02-002 are decided one by one (basis review)', () => {
    const notes = (decisions as Array<TextDecision & { basis?: string }>).filter((d) => d.basis === 'review' && /^Residual \d\/5/.test(d.note ?? ''));
    expect(notes.map((d) => d.note!.slice(0, 12)).sort()).toEqual(['Residual 1/5', 'Residual 2/5', 'Residual 3/5', 'Residual 4/5', 'Residual 5/5']);
  });
  it('no review decision publishes a span that rc2 redacted (no loosening without the user)', () => {
    const rc2 = readFileSync(join(ROOT, 'tests/fixtures/publication/rc2-redacted-spans.json'), 'utf8');
    const spans = (JSON.parse(rc2) as { spans: Array<{ scope: string; field: string; text: string }> }).spans;
    expect(spans.length).toBeGreaterThan(20);
    const loosened = decisions.filter((d) => d.decision === 'publish' && spans.some((x) => x.scope === d.scope && x.field === d.field && d.text.includes(x.text)));
    expect(loosened).toEqual([]);
  });
});
