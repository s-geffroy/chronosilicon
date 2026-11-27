/**
 * @chronosilicon/ontology — typed contracts mirrored by schemas/*.schema.json
 * (CS-04). Code and schemas are in English; user-facing texts are FR/EN.
 */
import { toSI, isKnownUnit, unitKind, checkQuantiles, type QuantityKind } from '@chronosilicon/metrology';

export const SCHEMA_VERSION = '1.0.0' as const;

export type Domain =
  | 'physics' | 'logic' | 'cpu' | 'memory' | 'accelerator' | 'interconnect' | 'storage' | 'os'
  | 'network' | 'distributed' | 'ai' | 'peripheral' | 'human' | 'space' | 'emerging'
  | 'biology' | 'astronomy' | 'industry' | 'everyday'
  | 'chemistry' | 'cognition' | 'transport' | 'nature' | 'geology';

export const DOMAINS: readonly Domain[] = [
  'physics', 'logic', 'cpu', 'memory', 'accelerator', 'interconnect', 'storage', 'os',
  'network', 'distributed', 'ai', 'peripheral', 'human', 'space', 'emerging',
  'biology', 'astronomy', 'industry', 'everyday',
  'chemistry', 'cognition', 'transport', 'nature', 'geology',
];

/**
 * Universes (ADR-0012, editorial scope R1 = C): the atlas compares phenomena from very
 * different worlds on one time scale. Each domain belongs to exactly one universe.
 */
export type Universe =
  | 'computing' | 'physics' | 'chemistry' | 'biology' | 'physiology' | 'cognition' | 'everyday'
  | 'transport' | 'industry' | 'nature' | 'history-geology' | 'astronomy';
/** The twelve universes of directive R1 v2.1, in display order. */
export const UNIVERSES: readonly Universe[] = [
  'computing', 'physics', 'chemistry', 'biology', 'physiology', 'cognition', 'everyday',
  'transport', 'industry', 'nature', 'history-geology', 'astronomy',
];
export const UNIVERSE_OF: Readonly<Record<Domain, Universe>> = {
  logic: 'computing', cpu: 'computing', memory: 'computing', accelerator: 'computing', interconnect: 'computing',
  storage: 'computing', os: 'computing', network: 'computing', distributed: 'computing', ai: 'computing',
  peripheral: 'computing', emerging: 'computing',
  physics: 'physics', space: 'astronomy', astronomy: 'astronomy', biology: 'biology', human: 'physiology',
  industry: 'industry', everyday: 'everyday', chemistry: 'chemistry', cognition: 'cognition',
  transport: 'transport', nature: 'nature', geology: 'history-geology',
};

/**
 * Editorial projection (directive v2.1): a phenomenon keeps its canonical domain and may be shown
 * in several universes; the first one is its main universe (colour). Without an override, the
 * universe of its domain.
 */
export function universesOf(domain: Domain, override: readonly Universe[] | undefined): Universe[] {
  return override && override.length ? [...override] : [UNIVERSE_OF[domain]];
}

/** How a value came to be — orthogonal to its verification status. */
/**
 * `conventional`: a duration fixed by a rule, standard or recommendation (a football match, the 28-day
 * concrete test); `illustrative`: a typical everyday order of magnitude, given with a range (ADR-0012).
 * Both stay sourced and are flagged as such in the interface.
 */
export type ProvenanceType = 'measured' | 'documented' | 'calculated' | 'estimated' | 'conventional' | 'illustrative';
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
  /** Public corpus only: universes shown for this phenomenon, main first (editorial projection, v2.1). */
  readonly universes?: readonly Universe[];
}

export interface Statistics {
  /** n as stated by the source; null only when not published (then sampleCountNote explains). */
  readonly sampleCount: number | null;
  readonly sampleCountNote: string | null;
  readonly method: string;
  readonly quantiles: ReadonlyArray<{ readonly p: number; readonly value: number }>;
}

/**
 * Dispersion/uncertainty as published by the source (never computed or
 * guessed). `value` is a ± half-width in the measurement unit; a confidence
 * interval uses low/high/level instead.
 */
export type UncertaintyType = 'standard-deviation' | 'standard-error' | 'unspecified-plus-minus' | 'confidence-interval';
export interface Uncertainty {
  readonly type: UncertaintyType;
  readonly value: number | null;
  readonly low: number | null;
  readonly high: number | null;
  readonly level: number | null;
  readonly sampleCount: number | null;
  /**
   * Literal wording of the source, e.g. "mean ± s.e.". Always present in curated
   * data; null only in the public view when the excerpt is withheld (AUD-012).
   */
  readonly statement: string | null;
  readonly locator: string;
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
  readonly uncertainty: Uncertainty | null;
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
  /** SI-normalised uncertainty (half-width or interval bounds), null if unknown. */
  readonly uncertaintySI: { readonly value: number | null; readonly low: number | null; readonly high: number | null } | null;
  /** SI-normalised quantiles of published statistics, null if none. */
  readonly quantilesSI: ReadonlyArray<{ readonly p: number; readonly value: number }> | null;
  /** Set by publicView (AUD-012/017): whether verbatim third-party text is published. */
  readonly excerpt?: ExcerptStatus;
}

export type ExcerptStatus =
  | { readonly status: 'published' }
  | { readonly status: 'withheld'; readonly reason: 'redistribution-not-established'; readonly redacted: readonly string[] };

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
  /**
   * Required for `same-protocol` (AUD-010): where the source states that every
   * member was obtained with one protocol. Sharing a source is not enough.
   */
  readonly protocolEvidence?: { readonly sourceId: string; readonly locator: string; readonly statement: string };
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
  /** Values kept out of the published corpus, with their status and reason (CS-11: keep contradictory data). */
  readonly withheld: ReadonlyArray<{ readonly id: string; readonly label: I18nText; readonly status: VerificationStatus; readonly reason: string }>;
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
    if (g.comparability === 'same-protocol') {
      // AUD-010: one source can describe several protocols, so same sources do not imply one protocol.
      const ev = g.protocolEvidence;
      if (!ev || !ev.locator.trim() || !ev.statement.trim()) {
        errors.push(`group ${g.id}: same-protocol requires protocolEvidence (source, locator, statement)`);
      } else {
        for (const id of g.members) {
          const m = byId.get(id);
          if (m && !m.sourceIds.includes(ev.sourceId)) errors.push(`group ${g.id}: member ${id} does not cite the protocolEvidence source ${ev.sourceId}`);
        }
      }
      for (const id of g.members) {
        const m = byId.get(id);
        if (m && !m.protocol) errors.push(`group ${g.id}: same-protocol member ${id} has no protocol`);
      }
    } else if (g.protocolEvidence) {
      errors.push(`group ${g.id}: protocolEvidence is only meaningful for same-protocol`);
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
/** True if `text` contains `x` as a whole number token (not as part of a longer number such as 25 in 125 or 2.5). */
function containsNumber(text: string, x: number): boolean {
  const lit = String(x).replace('.', '[.,]');
  return new RegExp(`(^|[^0-9.,])${lit}(?![0-9]|[.,][0-9])`).test(text);
}

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
    // ADR-0012: illustrative values are admitted, flagged, and must carry their range.
    if (m.provenanceType === 'illustrative' && (m.low === null || m.high === null)) errors.push(`${at}: an illustrative value needs a range (low and high)`);
    if (m.provenanceType === 'measured' && !m.protocol) errors.push(`${at}: measured value without protocol`);
    const u = m.uncertainty;
    if ((u || m.statistics) && !m.protocol) errors.push(`${at}: published dispersion or statistics require a protocol (CS-04)`);
    if (u && m.statistics && u.sampleCount !== null && m.statistics.sampleCount !== null && u.sampleCount !== m.statistics.sampleCount) {
      errors.push(`${at}: uncertainty and statistics disagree on n`);
    }
    if (u && (m.low === m.value || m.high === m.value)) errors.push(`${at}: a ± dispersion on a one-sided bound is not meaningful`);
    if (u) {
      const needed = u.type === 'confidence-interval' ? [u.low, u.high] : [u.value];
      if (u.statement === null) errors.push(`${at}: curated uncertainty needs the source wording (statement)`);
      else if (!needed.every((x) => x !== null && containsNumber(u.statement!, x))) errors.push(`${at}: the source wording must contain the dispersion value`);
    }
    if (u) {
      if (u.type === 'confidence-interval') {
        if (u.low === null || u.high === null || u.level === null || u.value !== null) errors.push(`${at}: a confidence interval needs low, high and level, and no ± value`);
        else if (!(u.low < u.high)) errors.push(`${at}: degenerate confidence interval`);
        else if (!(u.low <= m.value && m.value <= u.high)) errors.push(`${at}: confidence interval does not contain the value`);
      } else if (u.value === null || !(u.value > 0) || u.low !== null || u.high !== null || u.level !== null) {
        errors.push(`${at}: ${u.type} needs a positive ± value and no low/high/level`);
      }
      if (u.type === 'standard-error' && u.sampleCount === null) errors.push(`${at}: a standard error needs the sample count`);
      if (m.provenanceType === 'documented' || m.provenanceType === 'calculated') {
        errors.push(`${at}: published dispersion requires a measured or estimated value (got ${m.provenanceType})`);
      }
    }
    if (m.statistics) {
      if (m.statistics.sampleCount === null && !m.statistics.sampleCountNote) errors.push(`${at}: unknown n must be explained (sampleCountNote)`);
      for (const p of checkQuantiles(m.statistics.quantiles)) errors.push(`${at}: ${p}`);
    }
    if (m.provenanceType === 'calculated') {
      if (!m.calculation) errors.push(`${at}: calculated value without calculation`);
      else for (const i of m.calculation.inputs) {
        if (i === m.id) errors.push(`${at}: calculation uses itself as an input (AUD-009)`);
        else if (i.startsWith('src:')) {
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
  for (const c of calculationCycles(measurements)) errors.push(`calculation cycle: ${c.join(' -> ')} (AUD-009)`);
  return errors;
}

/**
 * Cycles in the graph "calculated value -> its measurement inputs" (AUD-009).
 * Iterative three-colour DFS (no recursion); self-loops are reported by the
 * caller with a dedicated message and skipped here. Each cycle is reported once,
 * starting from the node where it was closed.
 */
export function calculationCycles(measurements: readonly Pick<Measurement, 'id' | 'calculation'>[]): string[][] {
  const edges = new Map<string, string[]>();
  for (const m of measurements) {
    edges.set(m.id, (m.calculation?.inputs ?? []).filter((i) => !i.startsWith('src:') && i !== m.id));
  }
  const colour = new Map<string, 0 | 1 | 2>();
  const cycles: string[][] = [];
  for (const root of edges.keys()) {
    if (colour.get(root)) continue;
    const stack: Array<{ id: string; next: number }> = [{ id: root, next: 0 }];
    const path: string[] = [root];
    colour.set(root, 1);
    while (stack.length) {
      const top = stack[stack.length - 1]!;
      const out = edges.get(top.id) ?? [];
      if (top.next >= out.length) { colour.set(top.id, 2); stack.pop(); path.pop(); continue; }
      const n = out[top.next++]!;
      if (!edges.has(n)) continue; // unresolved input: reported elsewhere
      const c = colour.get(n) ?? 0;
      if (c === 1) cycles.push([...path.slice(path.indexOf(n)), n]);
      else if (c === 0) { colour.set(n, 1); stack.push({ id: n, next: 0 }); path.push(n); }
    }
  }
  return cycles;
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
      quantilesSI: m.statistics === null ? null : m.statistics.quantiles.map((q) => ({ p: q.p, value: toSI(q.value, m.unit, k) })),
      uncertaintySI: m.uncertainty === null ? null : {
        value: m.uncertainty.value === null ? null : toSI(m.uncertainty.value, m.unit, k),
        low: m.uncertainty.low === null ? null : toSI(m.uncertainty.low, m.unit, k),
        high: m.uncertainty.high === null ? null : toSI(m.uncertainty.high, m.unit, k),
      },
    };
  });
}

export {
  applyPublicationPolicy, quotedSpans, overlapSpans, grams, leaks, isOpenSource, decisionKey,
  MIN_REDACTED_WORDS, OVERLAP_WORDS, ALLOWED_UNDER_REVIEW, REDACTION, POLICY_ID, PUBLIC_FIELDS,
  type TextDecision, type Finding, type DecisionGround, type PublicationInput, type PublicationOutput,
} from './publication';
