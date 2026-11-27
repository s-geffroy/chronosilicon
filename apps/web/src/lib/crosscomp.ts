/**
 * Cross-universe comparisons (directive R1 v2.1): pairs of corpus durations from different
 * universes, compared on the same scale. Everything is computed from corpus values at display
 * time; nothing is hard-coded. `cycle` compares with one clock cycle at the observer frequency
 * (the 4 GHz teaching convention), which is not a measurement.
 */
import type { NormalizedMeasurement } from '@chronosilicon/ontology';

export interface CrossPair { id: string; a: string | 'cycle'; b: string }
export const CROSS_PAIRS: readonly CrossPair[] = [
  { id: 'cycle-heartbeat', a: 'cycle', b: 'physio-heartbeat-interval-m1' },
  { id: 'ram-reflex', a: 'intel-xeon5500-local-dram-latency-m1', b: 'human-simple-visual-reaction-time-m1' },
  { id: 'network-marathon', a: 'azure-rtt-eastus-westeurope-m1', b: 'day-marathon-best-men-m1' },
  { id: 'mars-football', a: 'earth-mars-light-time-min-m1', b: 'day-football-match-m1' },
  { id: 'sleep-earth', a: 'physio-sleep-cycle-m1', b: 'astro-age-of-earth-m1' },
];

export interface CrossResult { id: string; a: NormalizedMeasurement | null; b: NormalizedMeasurement; aSeconds: number; bSeconds: number; ratio: number }

/** Pairs whose values are all present in the corpus, with b/a ratio (b is the longer one). */
export function crossComparisons(measurements: readonly NormalizedMeasurement[], frequencyHz: number): CrossResult[] {
  const byId = new Map(measurements.map((m) => [m.id, m]));
  const out: CrossResult[] = [];
  for (const p of CROSS_PAIRS) {
    const b = byId.get(p.b);
    const a = p.a === 'cycle' ? null : byId.get(p.a);
    if (!b || (p.a !== 'cycle' && !a)) continue;
    const aSeconds = a ? a.valueSI : 1 / frequencyHz;
    out.push({ id: p.id, a: a ?? null, b, aSeconds, bSeconds: b.valueSI, ratio: b.valueSI / aSeconds });
  }
  return out;
}
