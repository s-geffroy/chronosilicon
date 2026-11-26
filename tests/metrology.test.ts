import { describe, expect, it } from 'vitest';
import { toSI, fromSI, DimensionError, ValueError, checkQuantiles, UNITS, unitKind } from '@chronosilicon/metrology';
import { calendarParts, prefixDuration } from '@chronosilicon/observers';

describe('dimensions', () => {
  it('refuses incompatible units', () => {
    expect(() => toSI(1, 'GB/s', 'duration')).toThrow(DimensionError);
    expect(() => toSI(1, 'GT/s', 'throughput')).toThrow(DimensionError);
    expect(() => toSI(1, 'GHz', 'duration')).toThrow(DimensionError);
    expect(() => toSI(1, 'cycles', 'duration')).toThrow(DimensionError);
    expect(() => toSI(1, 'furlong', 'distance')).toThrow(DimensionError);
  });
  it('refuses non-finite and negative values', () => {
    for (const v of [NaN, Infinity, -1]) expect(() => toSI(v, 's', 'duration')).toThrow(ValueError);
  });
  it('bits vs bytes', () => {
    expect(toSI(8, 'Gbit/s', 'throughput')).toBe(1e9);
    expect(toSI(1, 'GiB', 'data_size')).toBe(1073741824);
  });
  it('round trip for every unit', () => {
    for (const [u, def] of Object.entries(UNITS)) {
      expect(fromSI(toSI(3.5, u, def.kind), u, def.kind)).toBeCloseTo(3.5, 10);
      expect(unitKind(u)).toBe(def.kind);
    }
  });
  it('astronomical unit is exact (IAU 2012)', () => expect(toSI(1, 'au', 'distance')).toBe(149_597_870_700));
});

describe('quantiles', () => {
  it('accepts ordered quantiles', () => expect(checkQuantiles([{ p: 0.5, value: 1 }, { p: 0.99, value: 2 }])).toEqual([]));
  it('detects disorder, duplicates and bad probabilities', () => {
    expect(checkQuantiles([{ p: 0.5, value: 3 }, { p: 0.99, value: 2 }]).length).toBe(1);
    expect(checkQuantiles([{ p: 0.5, value: 1 }, { p: 0.5, value: 1 }]).length).toBe(1);
    expect(checkQuantiles([{ p: 1, value: 1 }]).length).toBe(1);
  });
});

describe('display helpers (rounding only at display)', () => {
  it('calendar parts', () => {
    expect(calendarParts(30)).toEqual([{ unit: 'second', value: 30 }]);
    expect(calendarParts(86_400 * 2 + 3600 * 6)).toEqual([{ unit: 'day', value: 2 }, { unit: 'hour', value: 6 }]);
    expect(calendarParts(4e9)[0]).toEqual({ unit: 'year', value: 126 });
    expect(calendarParts(1e30)[0]!.unit).toBe('year');
  });
  it('SI prefix for durations', () => {
    const p = prefixDuration(2.5e-10);
    expect(p.unit).toBe('ps');
    expect(p.value).toBeCloseTo(250, 9);
    expect(prefixDuration(0.004).unit).toBe('ms');
    expect(prefixDuration(0)).toEqual({ value: 0, unit: 's' });
  });
});
