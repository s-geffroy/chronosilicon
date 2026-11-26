/**
 * @chronosilicon/observers — conversion of physical durations into the
 * subjective time of an observer (CS-03, CS-07).
 *
 * Physical time (SI seconds) is the single reference axis. An observer only
 * provides a conversion rule; converting never changes the physical duration
 * nor the causality of events.
 *
 *   clocked observer, constant f :  N = f · Δt,      T = N · τ
 *   clocked observer, segments   :  N = ∫ f(t) dt  (piecewise constant)
 *   reference-operation observer :  T = Δt / δ_ref · τ
 *
 * τ is the subjective duration granted to one reference unit (1 s by default).
 * The pedagogical reference is a 4 GHz core where one cycle = one subjective
 * second. This is a metaphor: no consciousness and no physical relativity.
 */
import { ValueError, assertFinite, SPEED_OF_LIGHT_M_PER_S } from '@chronosilicon/metrology';

export const PEDAGOGICAL_FREQUENCY_HZ = 4e9;
export const DEFAULT_TAU_S = 1;

export interface FrequencySegment {
  /** Physical start time of the segment, s (inclusive). */
  readonly start: number;
  /** Physical end time of the segment, s (exclusive). */
  readonly end: number;
  /** Clock frequency during the segment, Hz. 0 = clock stopped (gated). */
  readonly frequencyHz: number;
}

export type Observer =
  | {
      readonly id: string;
      readonly kind: 'clocked';
      readonly frequencyHz: number;
      readonly tauSeconds: number;
    }
  | {
      readonly id: string;
      readonly kind: 'clocked-segments';
      readonly segments: readonly FrequencySegment[];
      readonly tauSeconds: number;
    }
  | {
      readonly id: string;
      readonly kind: 'reference-operation';
      /** Physical duration of the reference operation (instruction, register access…), s. */
      readonly referenceDurationSeconds: number;
      /** What the reference operation is, with its conditions. */
      readonly referenceDescription: string;
      readonly tauSeconds: number;
    };

export const PEDAGOGICAL_OBSERVER: Observer = Object.freeze({
  id: 'obs-pedagogical-4ghz',
  kind: 'clocked',
  frequencyHz: PEDAGOGICAL_FREQUENCY_HZ,
  tauSeconds: DEFAULT_TAU_S,
});

export function clockedObserver(frequencyHz: number, tauSeconds = DEFAULT_TAU_S, id?: string): Observer {
  assertPositiveFinite(frequencyHz, 'frequency');
  assertPositiveFinite(tauSeconds, 'tau');
  return { id: id ?? `obs-clocked-${frequencyHz}`, kind: 'clocked', frequencyHz, tauSeconds };
}

function assertPositiveFinite(x: number, what: string): void {
  assertFinite(x, what);
  if (!(x > 0)) throw new ValueError(`${what} must be > 0, got ${x}`);
}

function assertDuration(dt: number): void {
  assertFinite(dt, 'duration');
  if (dt < 0) throw new ValueError(`duration must be >= 0, got ${dt}`);
}

/** Theoretical clock cycles in Δt at constant frequency: N = f·Δt. */
export function cyclesAtConstantFrequency(durationSeconds: number, frequencyHz: number): number {
  assertDuration(durationSeconds);
  assertPositiveFinite(frequencyHz, 'frequency');
  return frequencyHz * durationSeconds;
}

export interface SegmentIntegration {
  /** ∫ f dt over the covered part of [t0, t1]. */
  readonly cycles: number;
  /** Physical time covered by segments with f > 0, s. */
  readonly activeSeconds: number;
  /** Physical time covered by segments with f = 0 (clock stopped), s. */
  readonly stoppedSeconds: number;
  /** Uncovered intervals inside [t0, t1] — unknown clock state, never filled in. */
  readonly gaps: ReadonlyArray<readonly [number, number]>;
}

/** Validates segments: finite, ordered, non-overlapping, f >= 0. */
export function validateSegments(segments: readonly FrequencySegment[]): string[] {
  const problems: string[] = [];
  const sorted = [...segments].sort((a, b) => a.start - b.start);
  sorted.forEach((s, i) => {
    if (![s.start, s.end, s.frequencyHz].every(Number.isFinite)) problems.push(`segment ${i}: non-finite field`);
    if (s.end <= s.start) problems.push(`segment ${i}: end <= start`);
    if (s.frequencyHz < 0) problems.push(`segment ${i}: negative frequency`);
    const prev = sorted[i - 1];
    if (prev && s.start < prev.end) problems.push(`segment ${i}: overlaps previous segment`);
  });
  return problems;
}

/** N = ∫ f(t) dt for a piecewise-constant frequency; reports gaps instead of guessing. */
export function integrateSegments(t0: number, t1: number, segments: readonly FrequencySegment[]): SegmentIntegration {
  assertFinite(t0, 't0');
  assertFinite(t1, 't1');
  if (t1 < t0) throw new ValueError('t1 must be >= t0');
  const problems = validateSegments(segments);
  if (problems.length) throw new ValueError(`invalid segments: ${problems.join('; ')}`);
  const sorted = [...segments].sort((a, b) => a.start - b.start);
  let cycles = 0;
  let active = 0;
  let stopped = 0;
  const gaps: Array<[number, number]> = [];
  let cursor = t0;
  for (const s of sorted) {
    const a = Math.max(s.start, t0);
    const b = Math.min(s.end, t1);
    if (b <= a) continue;
    if (a > cursor) gaps.push([cursor, a]);
    const dt = b - a;
    cycles += s.frequencyHz * dt;
    if (s.frequencyHz > 0) active += dt;
    else stopped += dt;
    cursor = Math.max(cursor, b);
  }
  if (cursor < t1) gaps.push([cursor, t1]);
  return { cycles, activeSeconds: active, stoppedSeconds: stopped, gaps };
}

export interface SubjectiveResult {
  /** Subjective duration, in subjective seconds. */
  readonly subjectiveSeconds: number;
  /** Number of reference units (cycles or reference operations). */
  readonly referenceUnits: number;
  /** True when the result is incomplete (segments with gaps). */
  readonly incomplete: boolean;
}

/** Converts a physical duration (s) into the observer's subjective time. */
export function toSubjective(durationSeconds: number, observer: Observer, startTime = 0): SubjectiveResult {
  assertDuration(durationSeconds);
  switch (observer.kind) {
    case 'clocked': {
      assertPositiveFinite(observer.tauSeconds, 'tau');
      const n = cyclesAtConstantFrequency(durationSeconds, observer.frequencyHz);
      return { subjectiveSeconds: n * observer.tauSeconds, referenceUnits: n, incomplete: false };
    }
    case 'clocked-segments': {
      assertPositiveFinite(observer.tauSeconds, 'tau');
      const r = integrateSegments(startTime, startTime + durationSeconds, observer.segments);
      return { subjectiveSeconds: r.cycles * observer.tauSeconds, referenceUnits: r.cycles, incomplete: r.gaps.length > 0 };
    }
    case 'reference-operation': {
      assertPositiveFinite(observer.tauSeconds, 'tau');
      assertPositiveFinite(observer.referenceDurationSeconds, 'reference duration');
      const n = durationSeconds / observer.referenceDurationSeconds;
      return { subjectiveSeconds: n * observer.tauSeconds, referenceUnits: n, incomplete: false };
    }
  }
}

/**
 * Inverse conversion for constant-rate observers: subjective seconds → physical s.
 * Not defined for segmented observers (non-invertible when the clock stops).
 */
export function fromSubjective(subjectiveSeconds: number, observer: Observer): number {
  assertDuration(subjectiveSeconds);
  switch (observer.kind) {
    case 'clocked':
      assertPositiveFinite(observer.frequencyHz, 'frequency');
      assertPositiveFinite(observer.tauSeconds, 'tau');
      return subjectiveSeconds / observer.tauSeconds / observer.frequencyHz;
    case 'reference-operation':
      assertPositiveFinite(observer.referenceDurationSeconds, 'reference duration');
      assertPositiveFinite(observer.tauSeconds, 'tau');
      return (subjectiveSeconds / observer.tauSeconds) * observer.referenceDurationSeconds;
    case 'clocked-segments':
      throw new ValueError('fromSubjective is not defined for segmented observers');
  }
}

/** Subjective time of observer A re-expressed for observer B (through physical time). */
export function convertBetween(subjectiveSecondsA: number, a: Observer, b: Observer): number {
  return toSubjective(fromSubjective(subjectiveSecondsA, a), b).subjectiveSeconds;
}

/** Propagation delay Δt = d / v (s). Default v = c in vacuum. */
export function propagationDelay(distanceMeters: number, speedMetersPerSecond = SPEED_OF_LIGHT_M_PER_S): number {
  assertDuration(distanceMeters);
  assertPositiveFinite(speedMetersPerSecond, 'speed');
  return distanceMeters / speedMetersPerSecond;
}

/**
 * Ideal transfer time Q / B (s): serialisation only. Latency, protocol
 * overhead and overlap are NOT included and must be modelled separately.
 */
export function idealTransferTime(bytes: number, bytesPerSecond: number): number {
  assertDuration(bytes);
  assertPositiveFinite(bytesPerSecond, 'throughput');
  return bytes / bytesPerSecond;
}

/**
 * Linear transform of quantiles at fixed positive frequency (valid: the
 * conversion is a monotone linear map). Never use to add quantiles.
 */
export function quantilesToSubjective(
  quantiles: ReadonlyArray<{ p: number; value: number }>,
  observer: Observer,
): Array<{ p: number; value: number }> {
  if (observer.kind === 'clocked-segments') throw new ValueError('quantile transform requires a constant-rate observer');
  return quantiles.map((q) => ({ p: q.p, value: toSubjective(q.value, observer).subjectiveSeconds }));
}

export * from './format';
