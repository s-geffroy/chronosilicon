import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('curation report', () => {
  it('has no unresolved bound warning (every bound wording is encoded or explicitly checked)', () => {
    const lines = readFileSync('data/curated/CURATION_REPORT.tsv', 'utf8').split('\n').filter((l) => l.includes('WARNING'));
    expect(lines).toEqual([]);
  });
});
