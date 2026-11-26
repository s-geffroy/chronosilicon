/**
 * Oracle tests — exact or computed examples of CS-03 (not measurements).
 * Reference observer: 4 GHz core, 1 cycle = 1 subjective second.
 */
import { describe, expect, it } from 'vitest';
import { JULIAN_YEAR_S, SPEED_OF_LIGHT_M_PER_S, toSI } from '@chronosilicon/metrology';
import { PEDAGOGICAL_OBSERVER, toSubjective, propagationDelay, calendarParts } from '@chronosilicon/observers';

const subj = (dt: number) => toSubjective(dt, PEDAGOGICAL_OBSERVER).subjectiveSeconds;
const rel = (a: number, b: number) => Math.abs(a - b) / Math.abs(b);

describe('CS-03 oracle at 4 GHz', () => {
  const exact: Array<[string, number, string, number]> = [
    ['0.25 ns', 0.25, 'ns', 1],
    ['1 ns', 1, 'ns', 4],
    ['100 ns', 100, 'ns', 400],
    ['1 µs', 1, 'µs', 4000],
    ['100 µs', 100, 'µs', 400_000],
    ['1 ms', 1, 'ms', 4e6],
    ['1 s', 1, 's', 4e9],
  ];
  for (const [label, v, u, expected] of exact) {
    it(`${label} → ${expected} s`, () => {
      expect(rel(subj(toSI(v, u, 'duration')), expected)).toBeLessThan(1e-12);
    });
  }
  it('100 µs → 4.62963 d', () => expect(subj(100e-6) / 86_400).toBeCloseTo(4.62963, 5));
  it('1 ms → 46.2963 d', () => expect(subj(1e-3) / 86_400).toBeCloseTo(46.2963, 4));
  it('1 s → 126.752 Julian years', () => expect(subj(1) / JULIAN_YEAR_S).toBeCloseTo(126.752, 3));
  it('1/60 s → 2.1125 years', () => expect(subj(1 / 60) / JULIAN_YEAR_S).toBeCloseTo(2.1125, 4));
  it('250 ms → 31.688 years', () => expect(subj(0.25) / JULIAN_YEAR_S).toBeCloseTo(31.688, 3));
  it('1 km in vacuum → ≈13342.6 s (3 h 42 min)', () => {
    const t = subj(propagationDelay(1000));
    expect(t).toBeCloseTo(13342.564, 2);
    const parts = calendarParts(t);
    expect(parts[0]).toEqual({ unit: 'hour', value: 3 });
    expect(Math.floor(parts[1]!.value)).toBe(42);
  });
  it('Earth–Moon 384 400 km (illustrative) → 1.282 s, ~162.5 years', () => {
    const dt = propagationDelay(384_400e3);
    expect(dt).toBeCloseTo(1.282, 3);
    expect(subj(dt) / JULIAN_YEAR_S).toBeCloseTo(162.5, 1);
  });
  it('c is exact', () => expect(SPEED_OF_LIGHT_M_PER_S).toBe(299_792_458));
});
