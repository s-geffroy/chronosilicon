/** Property and limit tests of CS-07 (multi-observer model). */
import { describe, expect, it } from 'vitest';
import { ValueError } from '@chronosilicon/metrology';
import {
  PEDAGOGICAL_OBSERVER, clockedObserver, toSubjective, fromSubjective, convertBetween,
  integrateSegments, validateSegments, cyclesAtConstantFrequency, idealTransferTime,
  quantilesToSubjective, convertBetweenDetailed, type Observer,
} from '@chronosilicon/observers';

// Deterministic pseudo-random generator for property tests (no external dep).
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}
const rnd = lcg(42);
const logUniform = (lo: number, hi: number) => 10 ** (Math.log10(lo) + rnd() * (Math.log10(hi) - Math.log10(lo)));

const gpu = clockedObserver(1.98e9, 1, 'gpu-test');
const mcu = clockedObserver(16e6, 1, 'mcu-test');
const instr: Observer = { id: 'instr', kind: 'reference-operation', referenceDurationSeconds: 1e-9, referenceDescription: 'test op', tauSeconds: 1 };

describe('identity and composition', () => {
  it('same reference → identity', () => {
    for (let i = 0; i < 200; i++) {
      const x = logUniform(1e-6, 1e12);
      expect(convertBetween(x, PEDAGOGICAL_OBSERVER, PEDAGOGICAL_OBSERVER)).toBeCloseTo(x, 6 - Math.log10(x));
    }
  });
  it('A→B→A within relative tolerance 1e-12', () => {
    for (const b of [gpu, mcu, instr]) {
      for (let i = 0; i < 200; i++) {
        const x = logUniform(1e-6, 1e15);
        const back = convertBetween(convertBetween(x, PEDAGOGICAL_OBSERVER, b), b, PEDAGOGICAL_OBSERVER);
        expect(Math.abs(back - x) / x).toBeLessThan(1e-12);
      }
    }
  });
  it('conversion never changes physical duration', () => {
    const dt = 3.7e-7;
    const a = toSubjective(dt, gpu).subjectiveSeconds;
    expect(fromSubjective(a, gpu)).toBeCloseTo(dt, 20);
  });
});

describe('monotonicity and limits', () => {
  it('strictly increasing in Δt for f > 0', () => {
    const xs = Array.from({ length: 300 }, () => logUniform(1e-15, 1e6)).sort((a, b) => a - b);
    const ys = xs.map((x) => toSubjective(x, PEDAGOGICAL_OBSERVER).subjectiveSeconds);
    for (let i = 1; i < ys.length; i++) if (xs[i]! > xs[i - 1]!) expect(ys[i]!).toBeGreaterThan(ys[i - 1]!);
  });
  it('zero duration → zero subjective time', () => {
    expect(toSubjective(0, PEDAGOGICAL_OBSERVER).subjectiveSeconds).toBe(0);
    expect(toSubjective(0, instr).subjectiveSeconds).toBe(0);
  });
  it('rejects negative, NaN and infinite durations', () => {
    for (const bad of [-1, NaN, Infinity, -Infinity]) expect(() => toSubjective(bad, PEDAGOGICAL_OBSERVER)).toThrow(ValueError);
  });
  it('rejects f <= 0 or non-finite', () => {
    for (const f of [0, -4e9, NaN, Infinity]) {
      expect(() => clockedObserver(f)).toThrow(ValueError);
      expect(() => cyclesAtConstantFrequency(1, f)).toThrow(ValueError);
    }
  });
  it('rejects tau <= 0', () => expect(() => clockedObserver(4e9, 0)).toThrow(ValueError));
});

describe('frequency segments (∫ f dt)', () => {
  it('constant segments equal constant-frequency result', () => {
    const r = integrateSegments(0, 1e-3, [{ start: 0, end: 1e-3, frequencyHz: 4e9 }]);
    expect(r.cycles).toBeCloseTo(4e6, 6);
    expect(r.gaps).toEqual([]);
  });
  it('variable frequency integrates piecewise', () => {
    const r = integrateSegments(0, 2, [
      { start: 0, end: 1, frequencyHz: 1e9 },
      { start: 1, end: 2, frequencyHz: 3e9 },
    ]);
    expect(r.cycles).toBe(4e9);
    expect(r.activeSeconds).toBe(2);
  });
  it('stopped clock is distinct from active time', () => {
    const r = integrateSegments(0, 3, [
      { start: 0, end: 1, frequencyHz: 2e9 },
      { start: 1, end: 3, frequencyHz: 0 },
    ]);
    expect(r.cycles).toBe(2e9);
    expect(r.stoppedSeconds).toBe(2);
  });
  it('unknown gaps are reported, never filled', () => {
    const r = integrateSegments(0, 3, [{ start: 1, end: 2, frequencyHz: 1e9 }]);
    expect(r.gaps).toEqual([[0, 1], [2, 3]]);
    const o: Observer = { id: 's', kind: 'clocked-segments', segments: [{ start: 1, end: 2, frequencyHz: 1e9 }], tauSeconds: 1 };
    expect(toSubjective(3, o, 0).incomplete).toBe(true);
  });
  it('overlapping or negative segments are invalid', () => {
    expect(validateSegments([{ start: 0, end: 2, frequencyHz: 1 }, { start: 1, end: 3, frequencyHz: 1 }])).not.toEqual([]);
    expect(validateSegments([{ start: 0, end: 1, frequencyHz: -1 }])).not.toEqual([]);
    expect(() => integrateSegments(0, 1, [{ start: 1, end: 0, frequencyHz: 1 }])).toThrow(ValueError);
  });
});

describe('throughput, quantiles', () => {
  it('ideal transfer time Q/B', () => expect(idealTransferTime(1e9, 1e9)).toBe(1));
  it('quantiles transform linearly and stay ordered', () => {
    const q = quantilesToSubjective([{ p: 0.5, value: 1e-7 }, { p: 0.99, value: 3e-7 }], PEDAGOGICAL_OBSERVER);
    expect(q[0]!.value).toBeCloseTo(400, 9);
    expect(q[1]!.value).toBeCloseTo(1200, 9);
  });
  it('segmented observers refuse quantile transform', () => {
    const o: Observer = { id: 's', kind: 'clocked-segments', segments: [], tauSeconds: 1 };
    expect(() => quantilesToSubjective([{ p: 0.5, value: 1 }], o)).toThrow(ValueError);
  });
});

describe('AUD-006: domains and finiteness of direct, inverse and integral conversions', () => {
  it('cycles at constant frequency refuse overflow (auditor probe)', () => {
    expect(() => cyclesAtConstantFrequency(1e308, 4e9)).toThrow(ValueError);
  });
  it('cycles at constant frequency refuse a non-zero result that underflows to 0', () => {
    expect(() => cyclesAtConstantFrequency(Number.MIN_VALUE, 0.5)).toThrow(ValueError);
    expect(cyclesAtConstantFrequency(0, 4e9)).toBe(0);
  });
  it('direct conversion refuses overflow and underflow of N·τ and Δt/δ·τ', () => {
    expect(() => toSubjective(1e10, clockedObserver(1, 1e300))).toThrow(ValueError);
    expect(() => toSubjective(1e-30, clockedObserver(1, 1e-300))).toThrow(ValueError);
    const ref: Observer = { id: 'r', kind: 'reference-operation', referenceDurationSeconds: 1e-10, referenceDescription: 'x', tauSeconds: 1 };
    expect(() => toSubjective(1e300, ref)).toThrow(ValueError);
  });
  it('inverse conversion refuses overflow and underflow', () => {
    expect(() => fromSubjective(1e300, clockedObserver(4e9, 1e-300))).toThrow(ValueError);
    expect(() => fromSubjective(Number.MIN_VALUE, PEDAGOGICAL_OBSERVER)).toThrow(ValueError);
    expect(() => fromSubjective(-1, PEDAGOGICAL_OBSERVER)).toThrow(ValueError);
    expect(fromSubjective(0, PEDAGOGICAL_OBSERVER)).toBe(0);
  });
  it('integral conversion refuses overflow, underflow and a non-finite end time', () => {
    expect(() => integrateSegments(0, 10, [{ start: 0, end: 10, frequencyHz: 1e308 }])).toThrow(ValueError);
    expect(() => integrateSegments(0, 1e-300, [{ start: 0, end: 1, frequencyHz: 1e-30 }])).toThrow(ValueError);
    const seg: Observer = { id: 's', kind: 'clocked-segments', segments: [{ start: 0, end: 1, frequencyHz: 1 }], tauSeconds: 1 };
    expect(() => toSubjective(Number.MAX_VALUE, seg, Number.MAX_VALUE)).toThrow(ValueError);
    expect(() => toSubjective(1, seg, NaN)).toThrow(ValueError);
  });
  it('a stopped clock (f = 0) still integrates to exactly 0 cycles (not an underflow)', () => {
    expect(integrateSegments(0, 1, [{ start: 0, end: 1, frequencyHz: 0 }]).cycles).toBe(0);
  });
});

describe('AUD-007: conversion between observers keeps completeness, coverage and origin', () => {
  const target: Observer = {
    id: 'seg', kind: 'clocked-segments', tauSeconds: 1,
    segments: [{ start: 0, end: 4, frequencyHz: 4e9 }, { start: 8, end: 10, frequencyHz: 2e9 }],
  };
  it('toSubjective reports incompleteness and coverage for the auditor target', () => {
    const r = toSubjective(10, target);
    expect(r.subjectiveSeconds).toBe(20e9);
    expect(r.incomplete).toBe(true);
    expect(r.coverage).toEqual({ startTime: 0, endTime: 10, activeSeconds: 6, stoppedSeconds: 0, gaps: [[4, 8]] });
  });
  it('convertBetween refuses to return a bare number for an incomplete result (auditor probe)', () => {
    expect(() => convertBetween(10, clockedObserver(1), target)).toThrow(ValueError);
  });
  it('convertBetweenDetailed preserves completeness, coverage and origin', () => {
    const r = convertBetweenDetailed(10, clockedObserver(1, 1, 'src'), target);
    expect(r).toEqual({
      subjectiveSeconds: 20e9, referenceUnits: 20e9, incomplete: true,
      coverage: { startTime: 0, endTime: 10, activeSeconds: 6, stoppedSeconds: 0, gaps: [[4, 8]] },
      physicalSeconds: 10, fromObserverId: 'src', toObserverId: 'seg',
    });
  });
  it('the physical origin of a segmented target is explicit', () => {
    const r = convertBetweenDetailed(2, clockedObserver(1), target, 7);
    expect(r.coverage).toEqual({ startTime: 7, endTime: 9, activeSeconds: 1, stoppedSeconds: 0, gaps: [[7, 8]] });
    expect(r.subjectiveSeconds).toBe(2e9);
    expect(r.incomplete).toBe(true);
  });
  it('a complete segmented target still converts to a number', () => {
    expect(convertBetween(4, clockedObserver(1), target)).toBe(16e9);
    expect(convertBetweenDetailed(4, clockedObserver(1), target).incomplete).toBe(false);
  });
  it('the undefined inverse of a segmented source is refused', () => {
    expect(() => convertBetween(1, target, PEDAGOGICAL_OBSERVER)).toThrow(ValueError);
    expect(() => convertBetweenDetailed(1, target, PEDAGOGICAL_OBSERVER)).toThrow(ValueError);
    expect(() => fromSubjective(1, target)).toThrow(ValueError);
  });
  it('constant-rate results are unchanged (no coverage field)', () => {
    expect(toSubjective(1, PEDAGOGICAL_OBSERVER)).toEqual({ subjectiveSeconds: 4e9, referenceUnits: 4e9, incomplete: false });
    expect(convertBetween(4e9, PEDAGOGICAL_OBSERVER, gpu)).toBe(toSubjective(1, gpu).subjectiveSeconds);
  });
});
