/**
 * Builds simulator scenarios from curated definitions: every duration is a
 * qualified corpus value (fixed durations, no invented distribution).
 */
import { simulate, SIMULATOR_MODEL_VERSION, fsToSeconds, type Scenario, type SimulationResult } from '@chronosilicon/simulator';
import type { ScenarioDef } from '@chronosilicon/ontology';
import { measurementById } from './corpus';

export const SCENARIO_SEED = 1;

export function buildScenario(def: ScenarioDef, capacities: Readonly<Record<string, number>> = {}): Scenario {
  return {
    id: def.id,
    modelVersion: SIMULATOR_MODEL_VERSION,
    seed: SCENARIO_SEED,
    resources: def.resources.map((r) => ({ id: r.id, kind: r.kind, capacity: capacities[r.id] ?? r.capacity })),
    tasks: def.tasks.map((t, i) => {
      const m = measurementById.get(t.measurementId);
      if (!m || m.quantityKind !== 'duration') throw new Error(`scenario ${def.id}: ${t.measurementId} is not a qualified duration`);
      return {
        id: t.id,
        label: t.id,
        actor: def.id,
        resourceId: t.resourceId,
        duration: { kind: 'fixed', seconds: m.valueSI, measurementId: m.id },
        priority: i,
        dependencies: t.dependsOn.map((p) => ({ predecessor: p, relation: 'finish-to-start' as const, lagSeconds: 0 })),
      };
    }),
  };
}

export interface ScenarioSummary {
  readonly result: SimulationResult;
  readonly makespanSeconds: number;
  readonly sumSeconds: number;
  /** Time during which at least one step runs (union of execution intervals). */
  readonly activeSeconds: number;
  /** makespan − active time: nothing runs (release dates, lags). Not an overlap effect. */
  readonly idleSeconds: number;
  /**
   * 1 − active time / Σdurations: share of the summed step time hidden by
   * concurrency, in [0, 1) (0 = no two steps ever overlap). Idle time does not
   * enter it (AUD-004, ADR-0010 §6). null when Σdurations = 0 (undefined, not 0).
   */
  readonly overlapShare: number | null;
}

/** Overlap and idle indicators of a simulation result (ADR-0010 §6). */
export function overlapIndicators(result: SimulationResult): Omit<ScenarioSummary, 'result'> {
  const makespanSeconds = fsToSeconds(result.makespan);
  const sumSeconds = fsToSeconds(result.sumOfDurations);
  const activeSeconds = fsToSeconds(result.activeTime);
  return {
    makespanSeconds, sumSeconds, activeSeconds, idleSeconds: fsToSeconds(result.idleTime),
    overlapShare: result.sumOfDurations > 0n ? 1 - activeSeconds / sumSeconds : null,
  };
}

export function runScenario(def: ScenarioDef, capacities: Readonly<Record<string, number>> = {}): ScenarioSummary {
  const result = simulate(buildScenario(def, capacities));
  return { result, ...overlapIndicators(result) };
}
