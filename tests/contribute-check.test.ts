import { describe, expect, it } from 'vitest';
import { checkExtraction } from '../scripts/contribute-check';

const ok = () => ({
  accessedAt: '2026-11-26',
  sources: [{ id: 'src-x', title: 'T', publisher: 'P', url: 'https://example.org', license: 'CC BY 4.0', redistribution: 'allowed', accessNotes: 'html' }],
  items: [{ id: 'x-item', labelEn: 'X', labelFr: 'X', domain: 'cpu', quantityKind: 'duration', value: 1, unit: 'ns', conditions: 'model Y, setup Z', provenanceType: 'documented', sourceId: 'src-x', locator: 'Table 1', quote: 'x is 1 ns' }],
  excluded: [],
});

describe('contribute:check (G5: contribution quality)', () => {
  it('strict mode rejects null quote, meaningless locator, host-less URL, unit/kind mismatch, measured without protocol, empty calculation', () => {
    const a = ok(); a.items[0]!.quote = null as unknown as string;
    expect(checkExtraction(a).join()).toMatch(/excerpt/);
    const b = ok(); b.items[0]!.locator = '??';
    expect(checkExtraction(b).join()).toMatch(/locator/);
    const c = ok(); c.sources[0]!.url = 'https://';
    expect(checkExtraction(c).join()).toMatch(/host/);
    const d = ok(); d.items[0]!.unit = 'GB/s';
    expect(checkExtraction(d).join()).toMatch(/incompatible/);
    const e = ok(); e.items[0]!.provenanceType = 'measured';
    expect(checkExtraction(e).join()).toMatch(/without protocol/);
    const f = ok() as ReturnType<typeof ok> & { items: Array<Record<string, unknown>> }; f.items[0]!.provenanceType = 'calculated'; f.items[0]!.calculation = {};
    expect(checkExtraction(f).join()).toMatch(/formula and at least one input/);
  });
  it('accepts a complete extraction', () => expect(checkExtraction(ok())).toEqual([]));
  it('rejects missing locator, unknown unit, unknown source, illustrative values', () => {
    const a = ok(); delete (a.items[0] as Record<string, unknown>).locator;
    expect(checkExtraction(a).join()).toMatch(/locator/);
    const b = ok(); b.items[0]!.unit = 'parsec/fortnight';
    expect(checkExtraction(b).join()).toMatch(/unknown unit/);
    const c = ok(); c.items[0]!.sourceId = 'src-nope';
    expect(checkExtraction(c).join()).toMatch(/unknown source/);
    const d = ok(); d.items[0]!.provenanceType = 'illustrative';
    expect(checkExtraction(d).length).toBeGreaterThan(0);
  });
  it('rejects calculated values without calculation, and over-long quotes', () => {
    const a = ok(); a.items[0]!.provenanceType = 'calculated';
    expect(checkExtraction(a).join()).toMatch(/without calculation/);
    const b = ok(); b.items[0]!.quote = 'x'.repeat(301);
    expect(checkExtraction(b).length).toBeGreaterThan(0);
  });
});
