import { describe, expect, it } from 'vitest';
import { toSI, fromSI, DimensionError, ValueError, checkQuantiles, UNITS, unitKind } from '@chronosilicon/metrology';
import { calendarParts, prefixDuration } from '@chronosilicon/observers';

describe('dimensions', () => {
  it('refuses incompatible units', () => {
    expect(() => toSI(1, 'GB/s', 'duration')).toThrow(DimensionError);
    expect(() => toSI(1, 'GT/s', 'throughput')).toThrow(DimensionError);
    expect(() => toSI(1, 'GHz', 'duration')).toThrow(DimensionError);
    expect(() => toSI(1, 'cycles', 'duration')).toThrow(DimensionError);
    expect(() => toSI(1, 'Pflop/s', 'frequency')).toThrow(DimensionError);
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
  it('absolute factors of every unit (independent table, review M-8)', () => {
    const expected: Record<string, number> = {
      fs: 1e-15, ps: 1e-12, ns: 1e-9, us: 1e-6, 'µs': 1e-6, ms: 1e-3, s: 1, min: 60, h: 3600, d: 86400, a: 31557600,
      Hz: 1, kHz: 1e3, MHz: 1e6, GHz: 1e9, THz: 1e12,
      'B/s': 1, 'kB/s': 1e3, 'MB/s': 1e6, 'GB/s': 1e9, 'TB/s': 1e12, 'KiB/s': 1024, 'MiB/s': 1048576, 'GiB/s': 1073741824,
      'bit/s': 0.125, 'kbit/s': 125, 'Mbit/s': 125000, 'Gbit/s': 125000000, 'Tbit/s': 125000000000,
      'T/s': 1, 'MT/s': 1e6, 'GT/s': 1e9, mm: 1e-3, cm: 1e-2, m: 1, km: 1e3, au: 149597870700, 'm/s': 1, 'km/s': 1e3,
      bit: 0.125, B: 1, kB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, KiB: 1024, MiB: 1048576, GiB: 1073741824, cycles: 1,
      'flop/s': 1, 'Gflop/s': 1e9, 'Tflop/s': 1e12, 'Pflop/s': 1e15, 'Eflop/s': 1e18,
    };
    expect(Object.keys(UNITS).sort()).toEqual(Object.keys(expected).sort());
    for (const [u, f] of Object.entries(expected)) expect(toSI(1, u, unitKind(u)), u).toBeCloseTo(f, 12 - Math.max(0, Math.log10(f)));
  });
  it('decimal sub-units convert without floating noise (review lot 2, m2)', () => {
    expect(toSI(43, 'ms', 'duration')).toBe(0.043);
    expect(toSI(180, 'us', 'duration')).toBe(0.00018);
    expect(toSI(397.8, 'ms', 'duration')).toBe(0.3978);
    expect(toSI(6.72, 'ns', 'duration')).toBe(6.72e-9);
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
