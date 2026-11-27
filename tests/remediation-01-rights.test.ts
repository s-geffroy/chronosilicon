/**
 * REMEDIATION-01 AUD-012/017 (ADR-0011): the published corpus — which feeds the
 * site bundle, its source map and the JSON/CSV exports — carries no verbatim
 * third-party text unless every cited source allows redistribution.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { quotedSpans, MIN_REDACTED_WORDS, ALLOWED_UNDER_REVIEW } from '@chronosilicon/ontology';
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

// The REMEDIATION-01 unit tests of publicView() are superseded by tests/remediation-02-publication.test.ts:
// AUD02-002 replaced that heuristic by policy PUB-1 (explicit fields, text-by-text decisions).
