/**
 * REMEDIATION-01 AUD-012/017 (ADR-0011): the published corpus — which feeds the
 * site bundle, its source map and the JSON/CSV exports — carries no verbatim
 * third-party text unless every cited source allows redistribution.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { publicView, quotedSpans, MIN_REDACTED_WORDS, ALLOWED_UNDER_REVIEW, normalize } from '@chronosilicon/ontology';
import { ROOT } from '../scripts/lib/corpus';

interface PubM { id: string; sourceIds: string[]; quote: string | null; notes: string | null; protocol: string | null;
  conditions: { fr: string; en: string }; uncertainty: { statement: string | null } | null; excerpt?: { status: string } }
const corpus = JSON.parse(readFileSync(join(ROOT, 'data/validated/corpus.json'), 'utf8')) as {
  measurements: PubM[]; sources: Array<{ id: string; redistribution: string }> };
const allowed = new Set(corpus.sources.filter((s) => s.redistribution === 'allowed' && !ALLOWED_UNDER_REVIEW.has(s.id)).map((s) => s.id));
const restricted = corpus.measurements.filter((m) => !m.sourceIds.every((s) => allowed.has(s)));

describe('published corpus: excerpt policy (data guard)', () => {
  it('there are values whose sources do not all allow redistribution (the guard is not vacuous)', () => {
    expect(restricted.length).toBeGreaterThan(100);
  });
  it('no quote and no uncertainty wording is published for them', () => {
    expect(restricted.filter((m) => m.quote !== null).map((m) => m.id)).toEqual([]);
    expect(restricted.filter((m) => m.uncertainty && m.uncertainty.statement !== null).map((m) => m.id)).toEqual([]);
  });
  it(`no quoted passage of ${MIN_REDACTED_WORDS}+ words in their notes, protocol or conditions`, () => {
    const bad = restricted.flatMap((m) => [m.notes, m.protocol, m.conditions.fr, m.conditions.en]
      .filter((t): t is string => t !== null)
      .flatMap((t) => quotedSpans(t).filter((q) => q.words >= MIN_REDACTED_WORDS).map((q) => `${m.id}: ${q.inner}`)));
    expect(bad).toEqual([]);
  });
  it('every published value declares its excerpt status; allowed-only values keep their quote', () => {
    expect(corpus.measurements.filter((m) => !m.excerpt).map((m) => m.id)).toEqual([]);
    const open = corpus.measurements.filter((m) => m.sourceIds.every((s) => allowed.has(s)));
    expect(open.every((m) => m.excerpt?.status === 'published')).toBe(true);
    expect(open.some((m) => m.quote !== null)).toBe(true);
  });
});

describe('publicView (unit)', () => {
  const ph = [{ id: 'p', domain: 'cpu', quantityKind: 'duration', label: { fr: 'p', en: 'p' }, description: null }];
  const m = (sourceIds: string[], notes: string) => ({
    id: 'm1', phenomenonId: 'p', configuration: null, value: 1, unit: 's', low: null, high: null,
    conditions: { fr: "l'unité « une phrase de six mots au moins ici »", en: 'plain' }, protocol: null,
    provenanceType: 'documented', verificationStatus: 'qualified', sourceIds, locator: "Table 2 'Cache Parameters of the Skylake Client Microarchitecture'",
    quote: 'a verbatim sentence from the source', era: null, uncertainty: null, statistics: null, calculation: null, rawRef: 'x', notes,
  });
  const src = (id: string, redistribution: string) => ({ id, redistribution }) as never;
  it('keeps everything when all sources are allowed', () => {
    const [v] = publicView(normalize(ph as never, [m(['a'], 'n') as never]), [src('a', 'allowed')]);
    expect(v!.quote).toBe('a verbatim sentence from the source');
    expect(v!.excerpt).toEqual({ status: 'published' });
  });
  it('withholds quote, redacts long quoted passages, keeps short ones, apostrophes and locators', () => {
    const notes = "Source says 'this is a long quoted passage of words' and 'short one'; l'apostrophe reste.";
    const [v] = publicView(normalize(ph as never, [m(['a', 'b'], notes) as never]), [src('a', 'allowed'), src('b', 'reference-only')]);
    expect(v!.quote).toBeNull();
    expect(v!.notes).toBe("Source says […] and 'short one'; l'apostrophe reste.");
    expect(v!.conditions.fr).toBe("l'unité […]");
    expect(v!.locator).toContain('Cache Parameters of the Skylake Client Microarchitecture');
    expect(v!.excerpt).toEqual({ status: 'withheld', reason: 'redistribution-not-established', redacted: ['quote', 'notes', 'conditions.fr'] });
  });
});
