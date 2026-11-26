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

export type Comparability = 'same-protocol' | 'same-source' | 'same-definition' | 'heterogeneous';

/** A curated set of comparable measurements (V2). Displayed by era, never ranked by value. */
export interface Group {
  readonly id: string;
  readonly kind: 'comparison' | 'hierarchy';
  readonly quantityKind: QuantityKind;
  readonly label: I18nText;
  readonly members: readonly string[];
  readonly comparability: Comparability;
  readonly note: I18nText;
}

export interface ObserverDef {
  readonly id: string;
  readonly kind: 'clocked' | 'reference-operation';
  /** Qualified measurement the observer is derived from (null = project convention). */
  readonly measurementId: string | null;
  /** Only for convention observers (measurementId null). */
  readonly frequencyHz: number | null;
  readonly label: I18nText;
  readonly assumptions: I18nText;
}

/** Observer resolved against the corpus (derived, published). */
export interface ResolvedObserver extends ObserverDef {
  /** Clocked: frequency in Hz. Reference-operation: reference duration in s. */
  readonly referenceSI: number;
}

/** Curated discrete-event scenario (V3, CS-08). Durations reference qualified corpus values. */
export interface ScenarioDef {
  readonly id: string;
  readonly label: I18nText;
  readonly description: I18nText;
  /** What the scenario deliberately does NOT model. */
  readonly excluded: I18nText;
  readonly resources: ReadonlyArray<{
    readonly id: string;
    readonly kind: 'cpu' | 'ram' | 'gpu' | 'storage' | 'network' | 'display' | 'other';
    readonly capacity: number;
    readonly capacityAssumption: I18nText;
  }>;
  readonly tasks: ReadonlyArray<{
    readonly id: string;
    readonly measurementId: string;
    readonly resourceId: string | null;
    readonly dependsOn: readonly string[];
  }>;
}

/** Scenario invariants: every duration is a qualified corpus duration; references resolve. */
export function checkScenarios(scenarios: readonly ScenarioDef[], qualified: readonly NormalizedMeasurement[]): string[] {
  const errors: string[] = [];
  const byId = new Map(qualified.map((m) => [m.id, m]));
  const ids = new Set<string>();
  for (const sc of scenarios) {
    if (ids.has(sc.id)) errors.push(`duplicate scenario ${sc.id}`);
    ids.add(sc.id);
    const res = new Set(sc.resources.map((r) => r.id));
    const tasks = new Set(sc.tasks.map((t) => t.id));
    if (tasks.size !== sc.tasks.length) errors.push(`scenario ${sc.id}: duplicate task id`);
    for (const t of sc.tasks) {
      const m = byId.get(t.measurementId);
      if (!m) errors.push(`scenario ${sc.id}/${t.id}: ${t.measurementId} is not a qualified measurement`);
      else if (m.quantityKind !== 'duration') errors.push(`scenario ${sc.id}/${t.id}: ${t.measurementId} is not a duration`);
      if (t.resourceId !== null && !res.has(t.resourceId)) errors.push(`scenario ${sc.id}/${t.id}: unknown resource ${t.resourceId}`);
      for (const d of t.dependsOn) if (!tasks.has(d)) errors.push(`scenario ${sc.id}/${t.id}: unknown predecessor ${d}`);
    }
  }
  return errors;
}

export interface Corpus {
  readonly schemaVersion: typeof SCHEMA_VERSION;
  readonly corpusVersion: string;
  readonly inputs: Readonly<Record<string, string>>;
  readonly phenomena: readonly Phenomenon[];
  readonly measurements: readonly NormalizedMeasurement[];
  readonly sources: readonly Evidence[];
  readonly groups: readonly Group[];
  readonly observers: readonly ResolvedObserver[];
  readonly scenarios: readonly ScenarioDef[];
}

/**
 * V2 invariants (G2: data compatibility). Groups only reference qualified
 * measurements of the group's quantity kind; hierarchies must share a
 * protocol; observers derive from qualified values of the right kind.
 */
export function checkV2Invariants(
  groups: readonly Group[],
  observers: readonly ObserverDef[],
  qualified: readonly NormalizedMeasurement[],
): string[] {
  const errors: string[] = [];
  const byId = new Map(qualified.map((m) => [m.id, m]));
  const seen = new Set<string>();
  for (const g of groups) {
    if (seen.has(g.id)) errors.push(`duplicate group ${g.id}`);
    seen.add(g.id);
    if (g.kind === 'hierarchy' && g.comparability !== 'same-protocol' && g.comparability !== 'same-source') {
      errors.push(`group ${g.id}: a hierarchy must come from one source (same-protocol or same-source)`);
    }
    if (g.comparability === 'same-protocol' || g.comparability === 'same-source') {
      const srcs = new Set(g.members.map((id) => byId.get(id)?.sourceIds.join('+')));
      if (srcs.size > 1) errors.push(`group ${g.id}: declared ${g.comparability} but members cite different sources`);
    }
    for (const id of g.members) {
      const m = byId.get(id);
      if (!m) errors.push(`group ${g.id}: member ${id} is not a qualified measurement`);
      else if (m.quantityKind !== g.quantityKind) errors.push(`group ${g.id}: member ${id} is ${m.quantityKind}, group is ${g.quantityKind}`);
    }
  }
  const oseen = new Set<string>();
  for (const o of observers) {
    if (oseen.has(o.id)) errors.push(`duplicate observer ${o.id}`);
    oseen.add(o.id);
    if (o.measurementId === null) {
      if (o.kind !== 'clocked' || o.frequencyHz === null || !(o.frequencyHz > 0)) errors.push(`observer ${o.id}: convention observers must be clocked with frequencyHz > 0`);
      continue;
    }
    if (o.frequencyHz !== null) errors.push(`observer ${o.id}: frequency must come from its measurement`);
    const m = byId.get(o.measurementId);
    const want = o.kind === 'clocked' ? 'frequency' : 'duration';
    if (!m) errors.push(`observer ${o.id}: ${o.measurementId} is not a qualified measurement`);
    else if (m.quantityKind !== want) errors.push(`observer ${o.id}: needs a ${want}, got ${m.quantityKind}`);
    else if (!(m.valueSI > 0)) errors.push(`observer ${o.id}: reference must be > 0`);
  }
  return errors;
}

export function resolveObservers(observers: readonly ObserverDef[], qualified: readonly NormalizedMeasurement[]): ResolvedObserver[] {
  const byId = new Map(qualified.map((m) => [m.id, m]));
  return observers.map((o) => ({
    ...o,
    referenceSI: o.measurementId === null ? o.frequencyHz! : byId.get(o.measurementId)!.valueSI,
  }));
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
        if (i.startsWith('src:')) {
          if (!m.sourceIds.includes(i.slice(4))) errors.push(`${at}: calculation input ${i} is not a cited source`);
        } else if (!measIds.has(i)) errors.push(`${at}: calculation input ${i} unresolved`);
        else if (m.verificationStatus === 'qualified' && measurements.find((x) => x.id === i)?.verificationStatus !== 'qualified') {
          errors.push(`${at}: qualified calculation relies on non-qualified input ${i}`);
        }
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
