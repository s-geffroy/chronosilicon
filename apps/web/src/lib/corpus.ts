/** Access to the validated corpus (built at compile time from data/validated). */
import corpusJson from '../../../../data/validated/corpus.json';
import type { Corpus, Evidence, NormalizedMeasurement, Phenomenon } from '@chronosilicon/ontology';

export const corpus = corpusJson as unknown as Corpus;
export const phenomenonById: ReadonlyMap<string, Phenomenon> = new Map(corpus.phenomena.map((p) => [p.id, p]));
export const sourceById: ReadonlyMap<string, Evidence> = new Map(corpus.sources.map((s) => [s.id, s]));
export const measurementById: ReadonlyMap<string, NormalizedMeasurement> = new Map(corpus.measurements.map((m) => [m.id, m]));

export function phenomenonOf(m: NormalizedMeasurement): Phenomenon {
  const p = phenomenonById.get(m.phenomenonId);
  if (!p) throw new Error(`corpus integrity: ${m.id} → ${m.phenomenonId}`);
  return p;
}
