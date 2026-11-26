import { describe, expect, it } from 'vitest';
import { summarize, quantileSorted, checkQuantiles } from '@chronosilicon/metrology';

describe('type-7 quantiles (oracle values from R: quantile(x, type = 7))', () => {
  const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  it('matches R for 1..10', () => {
    // R: quantile(1:10, c(.5,.9,.95,.99)) = 5.5 9.1 9.55 9.91
    expect(quantileSorted(x, 0.5)).toBeCloseTo(5.5, 12);
    expect(quantileSorted(x, 0.9)).toBeCloseTo(9.1, 12);
    expect(quantileSorted(x, 0.95)).toBeCloseTo(9.55, 12);
    expect(quantileSorted(x, 0.99)).toBeCloseTo(9.91, 12);
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
