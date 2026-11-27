/** G3: analytic oracles on the published scenarios (durations from the corpus). */
import { describe, expect, it } from 'vitest';
import { checkScenarios } from '@chronosilicon/ontology';
import { corpus } from './corpus';
import { simulate, type Task } from '@chronosilicon/simulator';
import { overlapIndicators, runScenario } from './scenarios';

const sc = (id: string) => corpus.scenarios.find((s) => s.id === id)!;
const rel = (a: number, b: number) => Math.abs(a - b) / b;

describe('published scenarios', () => {
  it('pass the scenario invariants', () => expect(checkScenarios(corpus.scenarios, corpus.measurements)).toEqual([]));
  it('reject a non-duration or unqualified reference', () => {
    const bad = { ...sc('sc-mars-command'), tasks: [{ id: 'x', measurementId: 'intel-8086-initial-clock-m1', resourceId: null, dependsOn: [] }] };
    expect(checkScenarios([bad], corpus.measurements).join()).toMatch(/not a duration/);
    const bad2 = { ...sc('sc-mars-command'), tasks: [{ id: 'x', measurementId: 'samsung-990pro-qd1-read-latency-derived-m1', resourceId: null, dependsOn: [] }] };
    expect(checkScenarios([bad2], corpus.measurements).join()).toMatch(/not a qualified/);
  });
});

describe('analytic oracles', () => {
  it('8 dependent DRAM reads = 8 × 80 ns = 640 ns, whatever the capacity', () => {
    for (const cap of [1, 4, 8]) {
      const r = runScenario(sc('sc-dram-dependent-reads'), { mem: cap });
      expect(r.result.makespan).toBe(8n * 80_000_000n); // exact, in femtoseconds
      expect(r.overlapShare).toBeCloseTo(0, 12);
      expect(r.result.criticalPath).toEqual(['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8']);
    }
  });
  it('8 independent reads: ceil(8 / capacity) × 80 ns', () => {
    for (const [cap, waves] of [[1, 8], [2, 4], [3, 3], [4, 2], [8, 1], [64, 1]] as const) {
      const r = runScenario(sc('sc-dram-independent-reads'), { mem: cap });
      expect(rel(r.makespanSeconds, waves * 80e-9)).toBeLessThan(1e-9);
      expect(r.result.resources[0]!.maxConcurrent).toBe(Math.min(cap, 8));
      expect(rel(r.sumSeconds, 640e-9)).toBeLessThan(1e-9); // work is conserved
    }
  });
  it('TCP first response = 2 × 83 ms RTT', () => {
    expect(rel(runScenario(sc('sc-tcp-first-response')).makespanSeconds, 0.166)).toBeLessThan(1e-9);
  });
  it('click to reaction (declared assumptions, order of magnitude) = 1 ms + 1/60 s + 213 ms', () => {
    expect(rel(runScenario(sc('sc-click-to-reaction')).makespanSeconds, 0.001 + 1 / 60 + 0.213)).toBeLessThan(1e-9);
  });
  it('Mars command and acknowledgement = 2 × 54.6e9 m / c', () => {
    expect(rel(runScenario(sc('sc-mars-command')).makespanSeconds, (2 * 54.6e9) / 299_792_458)).toBeLessThan(1e-9);
  });
  it('the same scenario always gives the same result (determinism; durations are fixed, no draw)', () => {
    const a = runScenario(sc('sc-dram-independent-reads'), { mem: 3 });
    const b = runScenario(sc('sc-dram-independent-reads'), { mem: 3 });
    expect(a.result.events).toEqual(b.result.events);
  });
});

describe('AUD-004: overlap is separated from idle time (ADR-0010 §6)', () => {
  const task = (id: string, seconds: number, extra: Partial<Task> = {}): Task => ({
    id, label: id, actor: 'audit', resourceId: null, duration: { kind: 'fixed', seconds, measurementId: null }, priority: 0, dependencies: [], ...extra,
  });
  const run = (tasks: Task[]) => simulate({ id: 'audit', modelVersion: '1.0.0', seed: 1, tasks, resources: [] });
  it('auditor probe: a release date is idle time, not negative overlap (was −0.5)', () => {
    const k = overlapIndicators(run([task('A', 10, { releaseSeconds: 5 })]));
    expect(k).toEqual({ makespanSeconds: 15, sumSeconds: 10, activeSeconds: 10, idleSeconds: 5, overlapShare: 0 });
  });
  it('mixed overlap and idle time: overlap = 1 − active/Σ, independent of the idle gap', () => {
    const k = overlapIndicators(run([task('a', 2), task('b', 2), task('c', 1, { releaseSeconds: 10 })]));
    expect(k.idleSeconds).toBe(8);
    expect(k.activeSeconds).toBe(3);
    expect(k.overlapShare).toBeCloseTo(1 - 3 / 5, 12);
  });
  it('Σ durations = 0: the indicator is undefined (null), not clamped to 0', () => {
    expect(overlapIndicators(run([task('z', 0)])).overlapShare).toBeNull();
  });
  it('published scenarios have no idle time, so the new definition gives the former values exactly', () => {
    for (const def of corpus.scenarios) for (const cap of [1, 2, 3, 4, 8]) {
      const r = runScenario(def, def.resources[0] ? { [def.resources[0].id]: cap } : {});
      expect(r.result.idleTime).toBe(0n);
      expect(r.result.completedEnd).toBe(r.result.makespan);
      expect(r.overlapShare).toBe(r.sumSeconds > 0 ? 1 - r.makespanSeconds / r.sumSeconds : 0);
    }
  });
});
