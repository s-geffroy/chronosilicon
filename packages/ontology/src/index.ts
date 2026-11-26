/**
 * @chronosilicon/ontology — typed contracts mirrored by schemas/*.schema.json
 * (CS-04). Code and schemas are in English; user-facing texts are FR/EN.
 */
import { toSI, isKnownUnit, unitKind, checkQuantiles, type QuantityKind } from '@chronosilicon/metrology';

export const SCHEMA_VERSION = '1.0.0' as const;

export type Domain =
  | 'physics' | 'logic' | 'cpu' | 'memory' | 'accelerator' | 'interconnect' | 'storage' | 'os'
  | 'network' | 'distributed' | 'ai' | 'peripheral' | 'human' | 'space' | 'emerging';

export const DOMAINS: readonly Domain[] = [
  'physics', 'logic', 'cpu', 'memory', 'accelerator', 'interconnect', 'storage', 'os',
  'network', 'distributed', 'ai', 'peripheral', 'human', 'space', 'emerging',
];

/** How a value came to be — orthogonal to its verification status. */
export type ProvenanceType = 'measured' | 'documented' | 'calculated' | 'estimated' | 'illustrative';
export type VerificationStatus = 'pending' | 'qualified' | 'contested' | 'rejected';
export type Redistribution = 'allowed' | 'reference-only' | 'unknown';

export interface I18nText { readonly fr: string; readonly en: string }

export interface Evidence {
  readonly id: string;
  readonly title: string;
  readonly author: string | null;
  readonly publisher: string;
  readonly url: string;
  readonly doi: string | null;
  readonly publishedDate: string | null;
  readonly version: string | null;
  readonly accessedAt: string;
  readonly license: string;
  readonly redistribution: Redistribution;
  readonly accessNotes: string;
  readonly verificationStatus: VerificationStatus;
}

export interface Phenomenon {
  readonly id: string;
  readonly domain: Domain;
  readonly quantityKind: QuantityKind;
  readonly label: I18nText;
  readonly description: I18nText | null;
}

export interface Statistics {
  readonly sampleCount: number;
  readonly method: string;
  readonly quantiles: ReadonlyArray<{ readonly p: number; readonly value: number }>;
}

export interface Measurement {
  readonly id: string;
  readonly phenomenonId: string;
  readonly configuration: string | null;
  readonly value: number;
  readonly unit: string;
  readonly low: number | null;
  readonly high: number | null;
  readonly conditions: I18nText;
  readonly protocol: string | null;
  readonly provenanceType: ProvenanceType;
  readonly verificationStatus: VerificationStatus;
  readonly sourceIds: readonly string[];
  readonly locator: string;
  readonly quote: string | null;
  readonly era: number | null;
  /** Unknown uncertainty is an explicit null (CS-04). */
  readonly uncertainty: null;
  readonly statistics: Statistics | null;
  readonly calculation: { readonly formula: string; readonly inputs: readonly string[] } | null;
  readonly rawRef: string;
  readonly notes: string | null;
}

/** Normalised measurement (derived, never hand-edited). */
export interface NormalizedMeasurement extends Measurement {
  readonly quantityKind: QuantityKind;
  readonly valueSI: number;
  readonly lowSI: number | null;
  readonly highSI: number | null;
}

export interface Corpus {
  readonly schemaVersion: typeof SCHEMA_VERSION;
  readonly corpusVersion: string;
  readonly inputs: Readonly<Record<string, string>>;
  readonly phenomena: readonly Phenomenon[];
  readonly measurements: readonly NormalizedMeasurement[];
  readonly sources: readonly Evidence[];
}

export interface InvariantInput {
  readonly sources: readonly Evidence[];
  readonly phenomena: readonly Phenomenon[];
  readonly measurements: readonly Measurement[];
}

/**
 * Semantic invariants not expressible in JSON Schema (CS-04, CS-11 V00–V04).
 * Returns the list of violations; empty list = pass.
 */
export function checkInvariants({ sources, phenomena, measurements }: InvariantInput): string[] {
  const errors: string[] = [];
  const dup = (kind: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) errors.push(`duplicate ${kind} id ${id}`);
      seen.add(id);
    }
    return seen;
  };
  const srcIds = dup('source', sources.map((s) => s.id));
  const phIds = dup('phenomenon', phenomena.map((p) => p.id));
  dup('measurement', measurements.map((m) => m.id));
  const phById = new Map(phenomena.map((p) => [p.id, p]));
  const srcById = new Map(sources.map((s) => [s.id, s]));
  const measIds = new Set(measurements.map((m) => m.id));

  for (const m of measurements) {
    const at = `measurement ${m.id}`;
    if (!phIds.has(m.phenomenonId)) errors.push(`${at}: unknown phenomenon ${m.phenomenonId}`);
    for (const s of m.sourceIds) if (!srcIds.has(s)) errors.push(`${at}: unknown source ${s}`);
    const ph = phById.get(m.phenomenonId);
    if (!isKnownUnit(m.unit)) errors.push(`${at}: unknown unit ${m.unit}`);
    else if (ph && unitKind(m.unit) !== ph.quantityKind) {
      errors.push(`${at}: unit ${m.unit} (${unitKind(m.unit)}) incompatible with ${ph.quantityKind}`);
    }
    if (!Number.isFinite(m.value)) errors.push(`${at}: non-finite value`);
    if (m.low !== null && m.high !== null && m.low > m.high) errors.push(`${at}: low > high`);
    if (m.low !== null && m.value < m.low) errors.push(`${at}: value < low`);
    if (m.high !== null && m.value > m.high) errors.push(`${at}: value > high`);
    if (m.provenanceType === 'illustrative') errors.push(`${at}: illustrative values are not admissible in the corpus`);
    if (m.provenanceType === 'measured' && !m.protocol) errors.push(`${at}: measured value without protocol`);
    if (m.statistics) {
      if (!m.protocol) errors.push(`${at}: statistics without protocol`);
      for (const p of checkQuantiles(m.statistics.quantiles)) errors.push(`${at}: ${p}`);
    }
    if (m.provenanceType === 'calculated') {
      if (!m.calculation) errors.push(`${at}: calculated value without calculation`);
      else for (const i of m.calculation.inputs) {
        if (!measIds.has(i) && !i.startsWith('const:')) errors.push(`${at}: calculation input ${i} unresolved`);
      }
    }
    if (m.verificationStatus === 'qualified') {
      for (const s of m.sourceIds) {
        const src = srcById.get(s);
        if (src && src.verificationStatus === 'rejected') errors.push(`${at}: qualified value relies on rejected source ${s}`);
      }
      if (!m.locator.trim()) errors.push(`${at}: qualified value without locator`);
    }
  }
  return errors;
}

/** Derives SI-normalised measurements (pure; throws on dimensional errors). */
export function normalize(phenomena: readonly Phenomenon[], measurements: readonly Measurement[]): NormalizedMeasurement[] {
  const kind = new Map(phenomena.map((p) => [p.id, p.quantityKind]));
  return measurements.map((m) => {
    const k = kind.get(m.phenomenonId);
    if (!k) throw new Error(`measurement ${m.id}: unknown phenomenon ${m.phenomenonId}`);
    return {
      ...m,
      quantityKind: k,
      valueSI: toSI(m.value, m.unit, k),
      lowSI: m.low === null ? null : toSI(m.low, m.unit, k),
      highSI: m.high === null ? null : toSI(m.high, m.unit, k),
    };
  });
}
