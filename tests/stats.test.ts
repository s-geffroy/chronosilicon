import { describe, expect, it } from 'vitest';
import { summarize, quantileSorted, checkQuantiles } from '@chronosilicon/metrology';

describe('type-7 quantiles (oracle values recomputed by hand from the type-7 definition; they equal R quantile(x, type = 7))', () => {
  const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  it('matches R for 1..10', () => {
    // R: quantile(1:10, c(.5,.9,.95,.99)) = 5.5 9.1 9.55 9.91
    expect(quantileSorted(x, 0.5)).toBeCloseTo(5.5, 12);
    expect(quantileSorted(x, 0.9)).toBeCloseTo(9.1, 12);
    expect(quantileSorted(x, 0.95)).toBeCloseTo(9.55, 12);
    expect(quantileSorted(x, 0.99)).toBeCloseTo(9.91, 12);
  });
  it('irregular sample with a large gap (hand-computed type-7 values, same as R quantile(type = 7))', () => {
    const y = [1, 2, 3, 4, 10];
    // h = (n-1)p: p=.5 → 3 ; p=.95 → x4 + 0.8·(10-4) = 8.8 ; p=.99 → x4 + 0.96·6 = 9.76
    expect(quantileSorted(y, 0.5)).toBe(3);
    expect(quantileSorted(y, 0.95)).toBeCloseTo(8.8, 12);
    expect(quantileSorted(y, 0.99)).toBeCloseTo(9.76, 12);
    expect(quantileSorted([2, 2, 2, 5], 0.5)).toBe(2);
  });
  it('limits and single sample', () => {
    expect(quantileSorted([7], 0.99)).toBe(7);
    expect(quantileSorted(x, 0)).toBe(1);
    expect(quantileSorted(x, 1)).toBe(10);
    expect(() => quantileSorted([], 0.5)).toThrow(RangeError);
    expect(() => quantileSorted(x, 1.1)).toThrow(RangeError);
  });
  it('summary is ordered, documented, and rejects non-finite samples', () => {
    const s = summarize([3, 1, 2, 10, 4]);
    expect(s.n).toBe(5);
    expect(s.min).toBe(1);
    expect(s.max).toBe(10);
    expect(s.mean).toBe(4);
    expect(checkQuantiles(s.quantiles)).toEqual([]);
    expect(s.method).toMatch(/type 7/);
    expect(() => summarize([1, NaN])).toThrow();
  });
});

describe('AUD-011: finiteness and sort contract of summary statistics', () => {
  const M = Number.MAX_VALUE;
  it('mean of large finite samples stays finite (auditor probe)', () => {
    expect(summarize([M, M]).mean).toBe(M);
    expect(summarize([M, M, M]).mean).toBe(M);
    expect(summarize([M, -M]).mean).toBe(0);
    expect(summarize([1e308, 1e308, 1e308, 1e308]).mean).toBe(1e308);
  });
  it('type-7 interpolation does not overflow between extreme order statistics', () => {
    expect(quantileSorted([-M, M], 0.5)).toBe(0);
    expect(Number.isFinite(quantileSorted([-M, M], 0.99))).toBe(true);
    const s = summarize([M, -M]);
    for (const q of s.quantiles) expect(Number.isFinite(q.value)).toBe(true);
    expect(checkQuantiles(s.quantiles)).toEqual([]);
  });
  it('quantileSorted refuses an unsorted or non-finite sample instead of presuming the sort', () => {
    expect(() => quantileSorted([3, 1, 2], 0.5)).toThrow(RangeError);
    expect(() => quantileSorted([1, NaN, 3], 0.5)).toThrow(RangeError);
    expect(() => quantileSorted([1, Infinity], 0.5)).toThrow(RangeError);
  });
  it('ordinary samples keep the naive mean exactly (no behaviour change)', () => {
    expect(summarize([3, 1, 2, 10, 4]).mean).toBe(4);
    expect(summarize([0.1, 0.2, 0.3]).mean).toBe((0.1 + 0.2 + 0.3) / 3);
  });
});
