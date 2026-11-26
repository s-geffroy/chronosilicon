/**
 * Browser measurements (CS-06): they measure THE BROWSER (timer resolution,
 * clamping, scheduling, JIT), never native CPU latency. Raw samples are kept.
 *
 * Two different statistical objects (review G4/G5 MAJ-1):
 *  - timer granularity: each sample is one observed clock step → quantiles
 *    describe the distribution of steps;
 *  - call cost: each sample is the MEAN over a batch of k calls. Only the
 *    median of batch means is reported, with its resolution g/k; quantiles of
 *    batch means are NOT the distribution of single-call costs.
 */
import { summarize, type SampleSummary } from '@chronosilicon/metrology';

export interface Environment {
  readonly userAgent: string;
  readonly crossOriginIsolated: boolean;
  readonly hardwareConcurrency: number | null;
  readonly measuredAt: string;
}

export interface GranularityMeasurement {
  readonly kind: 'timer-granularity';
  readonly unit: 's';
  readonly samples: readonly number[];
  readonly summary: SampleSummary;
  readonly environment: Environment;
  readonly protocol: string;
}

export interface CallCostMeasurement {
  readonly kind: 'now-call-cost';
  readonly unit: 's';
  /** Mean cost per call of each retained batch (after warm-up). */
  readonly batchMeans: readonly number[];
  readonly batchSize: number;
  readonly warmupBatches: number;
  /** Median timer step used to size the batches. */
  readonly granularity: number;
  /** Median of batch means. */
  readonly medianPerCall: number;
  /** Resolution of a batch mean: granularity / k. */
  readonly resolution: number;
  /** True when the median is not above the resolution (value not resolved). */
  readonly unresolved: boolean;
  readonly environment: Environment;
  readonly protocol: string;
  /** Accumulator kept in the result so the measured calls cannot be optimised away. */
  readonly sink: number;
}

export type BrowserMeasurement = GranularityMeasurement | CallCostMeasurement;

export class MeasurementError extends Error {
  override name = 'MeasurementError';
}

function env(): Environment {
  return {
    userAgent: navigator.userAgent,
    crossOriginIsolated: globalThis.crossOriginIsolated === true,
    hardwareConcurrency: navigator.hardwareConcurrency ?? null,
    measuredAt: new Date().toISOString(),
  };
}

function collectSteps(n: number, maxSpins: number): { samples: number[]; spins: number } {
  const samples: number[] = [];
  let spins = 0;
  let last = performance.now();
  while (samples.length < n && spins < maxSpins) {
    const t = performance.now();
    spins++;
    if (t !== last) {
      samples.push((t - last) / 1000);
      last = t;
    }
  }
  if (samples.length === 0) throw new MeasurementError('the clock did not advance (frozen or fingerprinting protection)');
  return { samples, spins };
}

/** Smallest observable increment of performance.now(): n consecutive distinct steps. */
export function measureTimerGranularity(n = 200, maxSpins = 5_000_000): GranularityMeasurement {
  const { samples, spins } = collectSteps(n, maxSpins);
  return {
    kind: 'timer-granularity', unit: 's', samples, summary: summarize(samples), environment: env(),
    protocol: `Busy loop on performance.now(); each sample is the difference between two consecutive distinct readings (n = ${samples.length}, ${spins} calls). Reflects the browser's timer coarsening and jitter, not the CPU.`,
  };
}

/**
 * Mean cost of one performance.now() call. Batches are sized so that one
 * batch lasts at least 100 timer steps; warm-up batches are discarded.
 */
export function measureNowCallCost(retained = 30, warmup = 5, maxK = 20_000_000): CallCostMeasurement {
  const g = summarize(collectSteps(50, 5_000_000).samples).quantiles[0]!.value; // median step
  let sink = 0;
  const batch = (k: number) => {
    const t0 = performance.now();
    for (let j = 0; j < k; j++) sink += performance.now();
    return (performance.now() - t0) / 1000;
  };
  let k = 1000;
  while (k < maxK && batch(k) < 100 * g) k *= 2;
  const means: number[] = [];
  for (let i = 0; i < warmup + retained; i++) {
    const d = batch(k) / k;
    if (i >= warmup) means.push(d);
  }
  const median = summarize(means).quantiles[0]!.value;
  const resolution = g / k;
  return {
    kind: 'now-call-cost', unit: 's', batchMeans: means, batchSize: k, warmupBatches: warmup, granularity: g,
    medianPerCall: median, resolution, unresolved: !(median > resolution), environment: env(), sink,
    protocol: `Timer step g measured first (median of 50 steps). Batches of k = ${k} consecutive performance.now() calls, k doubled until one batch lasts ≥ 100 g; ${warmup} warm-up batches discarded; ${retained} batches retained. Reported value: median of batch means, resolution ± g/k. Batch means do not describe the spread of single calls.`,
  };
}
