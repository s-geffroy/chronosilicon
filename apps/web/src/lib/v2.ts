/** V2 helpers: comparison ordering and multi-observer conversion (pure). */
import type { Group, NormalizedMeasurement, ResolvedObserver } from '@chronosilicon/ontology';
import { toSubjective, type Observer } from '@chronosilicon/observers';
import { measurementById } from './corpus';

/**
 * Members ordered by era (unknown last), then by curated order — NEVER by
 * value: a comparison must not read as a ranking (CS-06, CS-07).
 */
export function orderMembers(g: Group): NormalizedMeasurement[] {
  return g.members
    .map((id, i) => ({ m: measurementById.get(id)!, i }))
    .sort((a, b) => (a.m.era ?? 9999) - (b.m.era ?? 9999) || a.i - b.i)
    .map((x) => x.m);
}

export function toObserver(o: ResolvedObserver): Observer {
  return o.kind === 'clocked'
    ? { id: o.id, kind: 'clocked', frequencyHz: o.referenceSI, tauSeconds: 1 }
    : { id: o.id, kind: 'reference-operation', referenceDurationSeconds: o.referenceSI, referenceDescription: o.label.en, tauSeconds: 1 };
}

export interface ObserverRow {
  readonly observer: ResolvedObserver;
  readonly referenceUnits: number;
  readonly subjectiveSeconds: number;
}

/** The same physical duration seen by every observer. Physical time is unchanged. */
export function observeAll(durationSeconds: number, observers: readonly ResolvedObserver[]): ObserverRow[] {
  return observers.map((o) => {
    const r = toSubjective(durationSeconds, toObserver(o));
    return { observer: o, referenceUnits: r.referenceUnits, subjectiveSeconds: r.subjectiveSeconds };
  });
}
