/** Data guard: a dispersion or percentile published for a measured value is never left in prose only. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const corpus = JSON.parse(readFileSync('data/validated/corpus.json', 'utf8')) as {
  measurements: Array<{ id: string; provenanceType: string; quote: string | null; conditions: { en: string }; uncertainty: unknown; statistics: unknown }>;
};

describe('published dispersions are structured', () => {
  it('every measured value whose excerpt or conditions publish ±, SD, s.e., CI or percentiles has uncertainty or statistics', () => {
    const missing = corpus.measurements
      .filter((m) => m.provenanceType === 'measured')
      .filter((m) => /±|\bs\.e\.|standard (deviation|error)|confidence interval|\bP(5|50|95|99)\b|\bp(5|50|95)\b/.test(`${m.quote ?? ''} ${m.conditions.en}`))
      .filter((m) => m.uncertainty === null && m.statistics === null)
      .map((m) => m.id);
    expect(missing).toEqual([]);
  });
});
