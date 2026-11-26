/**
 * Browser measurements (CS-06): they measure THE BROWSER (timer resolution,
 * clamping, scheduling), never native CPU latency. Raw samples are kept and
 * summarised with a documented quantile method.
 */
import { summarize, type SampleSummary } from '@chronosilicon/metrology';

export interface BrowserMeasurement {
  readonly kind: 'timer-granularity' | 'now-call-cost';
  readonly unit: 's';
  readonly samples: readonly number[];
  readonly summary: SampleSummary;
  readonly environment: {
    readonly userAgent: string;
    readonly crossOriginIsolated: boolean;
    readonly hardwareConcurrency: number | null;
    readonly measuredAt: string;
  };
  readonly protocol: string;
}

function env() {
  return {
    userAgent: navigator.userAgent,
    crossOriginIsolated: globalThis.crossOriginIsolated === true,
    hardwareConcurrency: navigator.hardwareConcurrency ?? null,
    measuredAt: new Date().toISOString(),
  };
}

/** Smallest observable increment of performance.now(): n distinct consecutive deltas. */
export function measureTimerGranularity(n = 200, maxSpins = 5_000_000): BrowserMeasurement {
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
  return {
    kind: 'timer-granularity', unit: 's', samples, summary: summarize(samples), environment: env(),
    protocol: `Busy loop on performance.now(); each sample is the difference between two consecutive distinct readings (n = ${samples.length}, ${spins} calls). Reflects browser timer clamping and jitter.`,
  };
}

/** Mean cost of one performance.now() call, from n batches of k calls. */
export function measureNowCallCost(n = 100, k = 10_000): BrowserMeasurement {
  const samples: number[] = [];
  let sink = 0;
  for (let i = 0; i < n; i++) {
    const t0 = performance.now();
    for (let j = 0; j < k; j++) sink += performance.now();
    const t1 = performance.now();
    samples.push((t1 - t0) / 1000 / k);
  }
  if (sink === -1) samples.push(0); // keeps the loop observable (never true)
  return {
    kind: 'now-call-cost', unit: 's', samples, summary: summarize(samples), environment: env(),
    protocol: `n = ${n} batches of k = ${k} consecutive performance.now() calls; sample = batch duration / k. Limited by timer granularity; includes JIT and loop overhead.`,
  };
}
