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

/** Type-7 quantile of an ascending-sorted sample. */
export function quantileSorted(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) throw new RangeError('empty sample');
  if (!(p >= 0 && p <= 1)) throw new RangeError(`p must be in [0,1], got ${p}`);
  const h = (sorted.length - 1) * p;
  const lo = Math.floor(h);
  const hi = Math.ceil(h);
  return sorted[lo]! + (h - lo) * (sorted[hi]! - sorted[lo]!);
}

export function summarize(samples: readonly number[], ps: readonly number[] = [0.5, 0.95, 0.99]): SampleSummary {
  if (samples.length === 0) throw new RangeError('empty sample');
  for (const x of samples) assertFinite(x, 'sample');
  const sorted = [...samples].sort((a, b) => a - b);
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  return {
    n: sorted.length,
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    mean,
    quantiles: ps.map((p) => ({ p, value: quantileSorted(sorted, p) })),
    method: QUANTILE_METHOD,
  };
}
