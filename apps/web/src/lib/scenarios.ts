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
  /** 1 − makespan / Σdurations: share of time saved by overlap (0 = fully serial). */
  readonly overlapShare: number;
}

export function runScenario(def: ScenarioDef, capacities: Readonly<Record<string, number>> = {}): ScenarioSummary {
  const result = simulate(buildScenario(def, capacities));
  const makespanSeconds = fsToSeconds(result.makespan);
  const sumSeconds = fsToSeconds(result.sumOfDurations);
  return { result, makespanSeconds, sumSeconds, overlapShare: sumSeconds > 0 ? 1 - makespanSeconds / sumSeconds : 0 };
}
