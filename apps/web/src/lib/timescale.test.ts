import { describe, expect, it } from 'vitest';
import { BANDS, JULIAN_YEAR_S, WINDOW, axisWindow, bandOf, bandWindow, clampZoom, decades, labelStep, position } from './timescale';
import { clockedObserver, toSubjective } from '@chronosilicon/observers';

describe('universal chronology (R1 v2.1)', () => {
  it('initial window is [-18, 18]: 36 decades, 37 integer ticks', () => {
    expect(WINDOW).toEqual([-18, 18]);
    expect(decades(WINDOW)).toHaveLength(37);
    expect(decades(WINDOW)[0]).toBe(-18);
    expect(decades(WINDOW).at(-1)).toBe(18);
  });
  it('thirteen contiguous bands, lower bound included, upper excluded', () => {
    expect(BANDS).toHaveLength(13);
    for (let i = 1; i < BANDS.length; i++) expect(BANDS[i]!.lo).toBe(BANDS[i - 1]!.hi);
    expect(bandOf(1e-18)).toBe('attosecond');
    expect(bandOf(1e-15)).toBe('femtosecond');
    expect(bandOf(0.999)).toBe('millisecond');
    expect(bandOf(1)).toBe('second');
    expect(bandOf(59.999)).toBe('second');
    expect(bandOf(60)).toBe('minute');
    expect(bandOf(86_400)).toBe('day');
    expect(bandOf(JULIAN_YEAR_S)).toBe('year');
    expect(bandOf(31_557_600_000)).toBe('millennium');
    expect(bandOf(31_557_600_000_000)).toBe('deep');
    expect(bandOf(4.35e17)).toBe('deep');
  });
  it('zero, negative, non-finite and sub-attosecond durations have no band', () => {
    expect(bandOf(0)).toBeNull();
    expect(bandOf(-1)).toBeNull();
    expect(bandOf(Number.NaN)).toBeNull();
    expect(bandOf(Infinity)).toBeNull();
    expect(bandOf(5.39e-44)).toBeNull();
  });
  it('Julian year is 365.25 days', () => expect(JULIAN_YEAR_S).toBe(365.25 * 86_400));
  it('the window extends for a value outside it and never shrinks', () => {
    expect(axisWindow([1e-9, 1])).toEqual([-18, 18]);
    expect(axisWindow([5.39e-44, 4.35e17])).toEqual([-44, 18]);
    expect(axisWindow([1e20])).toEqual([-18, 20]);
    expect(axisWindow([0, -3, Number.NaN])).toEqual([-18, 18]);
  });
  it('positions are logarithmic and clamped', () => {
    expect(position(1, WINDOW)).toBe(50);
    expect(position(1e-18, WINDOW)).toBe(0);
    expect(position(1e18, WINDOW)).toBe(100);
    expect(position(1e30, WINDOW)).toBe(100);
  });
  it('labels stay readable; zoom is clamped and at least one decade wide', () => {
    expect(labelStep(WINDOW)).toBe(6); // 10⁻¹⁸, 10⁻¹², …, 10¹⁸
    expect(labelStep([-9, -3])).toBe(1);
    expect(clampZoom([-30, 40], WINDOW)).toEqual([-18, 18]);
    expect(clampZoom([2, 2], WINDOW)).toEqual([2, 3]);
    expect(clampZoom([5, -5], WINDOW)).toEqual([-5, 5]);
    expect(bandWindow(BANDS[3]!, WINDOW)).toEqual([-9, -6]);
    expect(bandWindow(BANDS[12]!, WINDOW)).toEqual([13, 18]);
  });
  it('subjective reference: 4 GHz, one cycle = 250 ps = 1 subjective second; 1 s ≈ 126.75 Julian years', () => {
    const o = clockedObserver(4e9);
    expect(toSubjective(250e-12, o).subjectiveSeconds).toBeCloseTo(1, 12);
    expect(toSubjective(1, o).subjectiveSeconds / JULIAN_YEAR_S).toBeCloseTo(126.75, 2);
  });
});

import { formatDecade, formatDecadeSubjective, pow10 } from './format';
describe('decade labels are readable (no 1E18, no long digit strings)', () => {
  it('formats every decade of the window', () => {
    expect(pow10(-18)).toBe('10⁻¹⁸');
    expect(formatDecade(-18, 'en')).toBe('1 as');
    expect(formatDecade(-10, 'en')).toBe('100 ps');
    expect(formatDecade(0, 'en')).toBe('1 s');
    expect(formatDecade(1, 'en')).toBe('10 s');
    expect(formatDecade(18, 'fr')).toBe('3,2 × 10¹⁰ a'); // 1e18 s = 3.17e10 Julian years
    expect(formatDecade(-44, 'en')).toBe('10⁻⁴⁴ s');
    for (let e = -18; e <= 18; e++) for (const l of ['fr', 'en'] as const) {
      const x = formatDecade(e, l);
      expect(x).not.toMatch(/E\d|\d{5,}/);
    }
    expect(formatDecadeSubjective(4e27, 'en')).toBe('1.3 × 10²⁰ y');
  });
});
