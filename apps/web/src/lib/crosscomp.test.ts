import { describe, expect, it } from 'vitest';
import { CROSS_PAIRS, crossComparisons } from './crosscomp';
import { corpus } from './corpus';
import { formatCount } from './format';

describe('cross-universe comparisons (R1 v2.1)', () => {
  it('every pair refers to published durations', () => {
    const ids = new Set(corpus.measurements.filter((m) => m.quantityKind === 'duration').map((m) => m.id));
    for (const p of CROSS_PAIRS) {
      if (p.a !== 'cycle') expect(ids.has(p.a), p.a).toBe(true);
      if (p.b !== 'cycle') expect(ids.has(p.b), p.b).toBe(true);
    }
    expect(crossComparisons(corpus.measurements, 4e9)).toHaveLength(CROSS_PAIRS.length);
  });
  it('ratios come from the corpus values, the cycle from the observer frequency', () => {
    const r = crossComparisons(corpus.measurements, 4e9);
    const hb = r.find((x) => x.id === 'cycle-heartbeat')!;
    expect(hb.aSeconds).toBe(2.5e-10);
    expect(hb.ratio).toBeCloseTo(hb.b!.valueSI * 4e9, 3);
    const ram = r.find((x) => x.id === 'ram-reflex')!;
    expect(ram.ratio).toBeCloseTo(ram.b!.valueSI / ram.a!.valueSI, 6);
    const pc = r.find((x) => x.id === 'pulse-cycle')!;
    expect(pc.bSeconds).toBe(2.5e-10);
    expect(pc.ratio).toBeCloseTo(2.5e-10 / pc.a!.valueSI, 6);
    expect(crossComparisons(corpus.measurements, 2e9).find((x) => x.id === 'cycle-heartbeat')!.ratio).toBeCloseTo(hb.ratio / 2, 0);
  });
  it('counts read as words', () => {
    expect(formatCount(3e9, 'fr')).toBe('3 milliards');
    expect(formatCount(4.26e6, 'en')).toBe('4.3 million');
    expect(formatCount(2.65e13, 'en')).toBe('27 trillion');
  });
  it('pairs never include a missing value silently', () => {
    expect(crossComparisons([], 4e9)).toEqual([]);
  });
});
