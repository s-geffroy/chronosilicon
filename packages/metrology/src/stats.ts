/**
 * Sample statistics with an explicit, documented method (CS-06, CS-11 V03).
 * Quantiles: Hyndman & Fan type 7 (linear interpolation between order
 * statistics, the default of R and NumPy). Min/max are NOT a confidence
 * interval and are reported as such.
 */
import { assertFinite } from './index';

export const QUANTILE_METHOD = 'Hyndman-Fan type 7 (linear interpolation, R default)';

export interface SampleSummary {
  readonly n: number;
  readonly min: number;
  readonly max: number;
  readonly mean: number;
  readonly quantiles: ReadonlyArray<{ readonly p: number; readonly value: number }>;
  readonly method: string;
}

/**
 * Type-7 quantile of an ascending-sorted sample.
 * Contract (AUD-011): `sorted` must be non-empty, contain only finite numbers
 * and be in ascending order; this is CHECKED (O(n)) and a RangeError is thrown
 * otherwise, instead of silently returning a wrong value. Interpolation is
 * done so that it never overflows between two finite order statistics.
 */
export function quantileSorted(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) throw new RangeError('empty sample');
  if (!(p >= 0 && p <= 1)) throw new RangeError(`p must be in [0,1], got ${p}`);
  for (let i = 0; i < sorted.length; i++) {
    const x = sorted[i]!;
    if (typeof x !== 'number' || !Number.isFinite(x)) throw new RangeError(`sample[${i}] is not a finite number: ${String(x)}`);
    if (i > 0 && x < sorted[i - 1]!) throw new RangeError(`sample is not sorted in ascending order at index ${i}`);
  }
  const h = (sorted.length - 1) * p;
  const lo = Math.floor(h);
  const hi = Math.ceil(h);
  const a = sorted[lo]!;
  const b = sorted[hi]!;
  const w = h - lo;
  const d = b - a;
  // Usual form (unchanged results whenever b - a is finite); the convex form
  // (1-w)·a + w·b is used only when b - a overflows (e.g. [-MAX, MAX]).
  return Number.isFinite(d) ? a + w * d : (1 - w) * a + w * b;
}

/**
 * Arithmetic mean that never overflows for finite samples (AUD-011).
 * The naive sum is used whenever it is finite (bit-identical to the former
 * computation); otherwise every sample is scaled by a power of two (exact
 * division) before summing, and the result is scaled back. |mean| <= max|x|,
 * so the result is always finite. In that fallback, samples many orders of
 * magnitude below max|x| may lose precision (subnormal after scaling); their
 * weight in the mean is then below the double precision of the result.
 */
function finiteMean(xs: readonly number[]): number {
  const naive = xs.reduce((a, b) => a + b, 0);
  if (Number.isFinite(naive)) return naive / xs.length;
  const maxAbs = xs.reduce((m, x) => Math.max(m, Math.abs(x)), 0);
  // 2^k with k <= 1023 so that the scale itself is finite; |x / scale| <= 2.
  const scale = 2 ** Math.min(1023, Math.ceil(Math.log2(maxAbs)));
  const scaled = xs.reduce((a, x) => a + x / scale, 0);
  return (scaled / xs.length) * scale;
}

/**
 * Summary of a finite sample. Samples may be given in any order (they are
 * sorted here); every sample must be finite (ValueError otherwise). The mean
 * stays finite for any finite sample (see finiteMean).
 */
export function summarize(samples: readonly number[], ps: readonly number[] = [0.5, 0.95, 0.99]): SampleSummary {
  if (samples.length === 0) throw new RangeError('empty sample');
  for (const x of samples) assertFinite(x, 'sample');
  const sorted = [...samples].sort((a, b) => a - b);
  const mean = finiteMean(sorted);
  return {
    n: sorted.length,
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    mean,
    quantiles: ps.map((p) => ({ p, value: quantileSorted(sorted, p) })),
    method: QUANTILE_METHOD,
  };
}
