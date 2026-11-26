/** CS-08 analytic tests: serial/parallel, capacity, causality, ties, seed, cancel, limits, conservation. */
import { describe, expect, it } from 'vitest';
import {
  simulate, validateScenario, secondsToFs, fsToSeconds, SimulationError, serializeResult,
  type Scenario, type Task,
} from '@chronosilicon/simulator';

const task = (id: string, seconds: number, extra: Partial<Task> = {}): Task => ({
  id, label: id, actor: 'a', resourceId: null, duration: { kind: 'fixed', seconds, measurementId: null }, priority: 0, dependencies: [], ...extra,
});
const fs = (s: number) => secondsToFs(s);
const scen = (tasks: Task[], resources: Scenario['resources'] = [], extra: Partial<Scenario> = {}): Scenario => ({
  id: 't', modelVersion: '1.0.0', seed: 1, resources, tasks, ...extra,
});
const after = (p: string, lagSeconds = 0) => ({ predecessor: p, relation: 'finish-to-start' as const, lagSeconds });

describe('time representation', () => {
  it('femtosecond BigInt is exact over 20+ orders of magnitude', () => {
    expect(secondsToFs(1e-15)).toBe(1n);
    expect(secondsToFs(86_400)).toBe(86_400n * 1_000_000_000_000_000n);
    expect(fsToSeconds(secondsToFs(0.25e-9))).toBe(0.25e-9);
    expect(secondsToFs(1e5) + secondsToFs(1e-15)).toBe(100_000_000_000_000_000_001n);
  });
  it('rejects negative and non-finite durations', () => {
    for (const x of [-1, NaN, Infinity]) expect(() => secondsToFs(x)).toThrow(SimulationError);
  });
});

describe('analytic scenarios', () => {
  it('serial chain: makespan = sum of durations', () => {
    const r = simulate(scen([task('a', 1e-9), task('b', 1e-7, { dependencies: [after('a')] }), task('c', 1e-3, { dependencies: [after('b')] })]));
    expect(r.makespan).toBe(fs(1e-9) + fs(1e-7) + fs(1e-3));
    expect(r.criticalPath).toEqual(['a', 'b', 'c']);
  });
  it('independent parallel tasks: makespan = max, not sum', () => {
    const r = simulate(scen([task('a', 3e-6), task('b', 5e-6), task('c', 1e-6)]));
    expect(r.makespan).toBe(fs(5e-6));
    expect(r.sumOfDurations).toBe(fs(9e-6));
    expect(r.criticalPath).toEqual(['b']);
  });
  it('lag is added after the predecessor', () => {
    const r = simulate(scen([task('a', 1), task('b', 1, { dependencies: [after('a', 0.5)] })]));
    expect(r.makespan).toBe(fs(2.5));
  });
  it('start-to-start dependency overlaps', () => {
    const r = simulate(scen([task('a', 2), task('b', 2, { dependencies: [{ predecessor: 'a', relation: 'start-to-start', lagSeconds: 1 }] })]));
    expect(r.makespan).toBe(fs(3));
  });
  it('capacity 1 serialises, capacity 2 overlaps', () => {
    const ts = ['x', 'y', 'z', 'w'].map((id) => task(id, 1e-7, { resourceId: 'ram' }));
    const r1 = simulate(scen(ts, [{ id: 'ram', kind: 'ram', capacity: 1 }]));
    const r2 = simulate(scen(ts, [{ id: 'ram', kind: 'ram', capacity: 2 }]));
    expect(r1.makespan).toBe(4n * fs(1e-7));
    expect(r2.makespan).toBe(2n * fs(1e-7));
    expect(r1.tasks.get('w')!.wait).toBe(3n * fs(1e-7));
    expect(r1.criticalPath).toEqual(['x', 'y', 'z', 'w']);
  });
  it('dependent memory reads (chain) vs independent concurrent reads', () => {
    const lat = 9e-8;
    const chain = simulate(scen([0, 1, 2, 3].map((i) => task(`r${i}`, lat, i ? { dependencies: [after(`r${i - 1}`)] } : {}))));
    const indep = simulate(scen([0, 1, 2, 3].map((i) => task(`r${i}`, lat, { resourceId: 'mem' })), [{ id: 'mem', kind: 'ram', capacity: 4 }]));
    expect(chain.makespan).toBe(4n * fs(lat));
    expect(indep.makespan).toBe(fs(lat));
  });
});

describe('invariants', () => {
  const rnd = (seed: number) => { let s = seed; return () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31); };
  it('causality and resource conservation on random DAGs', () => {
    const r = rnd(7);
    for (let n = 0; n < 50; n++) {
      const ts: Task[] = [];
      for (let i = 0; i < 20; i++) {
        const deps = ts.filter(() => r() < 0.15).map((t) => after(t.id, r() < 0.3 ? r() * 1e-6 : 0));
        ts.push(task(`t${i}`, 10 ** (-9 + r() * 6), { resourceId: r() < 0.7 ? (r() < 0.5 ? 'cpu' : 'io') : null, dependencies: deps, priority: Math.floor(r() * 3) }));
      }
      const res = simulate(scen(ts, [{ id: 'cpu', kind: 'cpu', capacity: 2 }, { id: 'io', kind: 'storage', capacity: 1 }]));
      for (const t of ts) {
        const tr = res.tasks.get(t.id)!;
        expect(tr.start! >= tr.ready!).toBe(true);
        for (const d of t.dependencies) expect(tr.start! >= res.tasks.get(d.predecessor)!.end!).toBe(true);
      }
      for (const u of res.resources) expect(u.maxConcurrent).toBeLessThanOrEqual(u.capacity);
      // busy integral equals the sum of durations of tasks on the resource
      for (const u of res.resources) {
        const sum = ts.filter((t) => t.resourceId === u.id).reduce((a, t) => a + res.tasks.get(t.id)!.duration, 0n);
        expect(u.busy).toBe(sum);
      }
      // monotone event times
      for (let i = 1; i < res.events.length; i++) expect(res.events[i]!.time >= res.events[i - 1]!.time).toBe(true);
    }
  });
  it('simultaneous events are ordered deterministically (priority, then declaration order)', () => {
    const ts = [task('b', 1, { resourceId: 'c', priority: 1 }), task('a', 1, { resourceId: 'c', priority: 0 }), task('d', 1, { resourceId: 'c', priority: 1 })];
    const r = simulate(scen(ts, [{ id: 'c', kind: 'cpu', capacity: 1 }]));
    const starts = r.events.filter((e) => e.kind === 'start').map((e) => e.taskId);
    expect(starts).toEqual(['a', 'b', 'd']);
    expect(serializeResult(simulate(scen(ts, [{ id: 'c', kind: 'cpu', capacity: 1 }])))).toBe(serializeResult(r));
  });
  it('seed reproducibility with sourced empirical samples', () => {
    const t = (id: string): Task => ({ ...task(id, 0), duration: { kind: 'empirical', samplesSeconds: [1e-6, 2e-6, 3e-6, 4e-6], measurementId: 'fixture' } });
    const a = simulate(scen([t('x'), t('y'), t('z')], [], { seed: 42 }));
    const b = simulate(scen([t('x'), t('y'), t('z')], [], { seed: 42 }));
    const c = simulate(scen([t('x'), t('y'), t('z')], [], { seed: 43 }));
    expect(serializeResult(a)).toBe(serializeResult(b));
    expect([a, c].map((r) => [...r.tasks.values()].map((x) => x.duration).join())).not.toEqual(['', '']);
  });
  it('cancellation stops the task and cascades to dependents', () => {
    const r = simulate(scen([task('a', 10, { cancelAtSeconds: 2, resourceId: 'n' }), task('b', 1, { dependencies: [after('a')] }), task('c', 1, { resourceId: 'n' })], [{ id: 'n', kind: 'network', capacity: 1 }]));
    expect(r.tasks.get('a')!.status).toBe('cancelled');
    expect(r.tasks.get('b')!.status).toBe('cancelled');
    expect(r.tasks.get('c')!.start).toBe(fs(2)); // resource freed by cancellation
    expect(r.makespan).toBe(fs(3));
  });
});

describe('rejections', () => {
  it('cycles are detected as impossible causes', () => {
    const s = scen([task('a', 1, { dependencies: [after('b')] }), task('b', 1, { dependencies: [after('a')] })]);
    expect(validateScenario(s).join()).toMatch(/cycle/);
    expect(() => simulate(s)).toThrow(SimulationError);
  });
  it('unknown references, bad capacity, negative lag', () => {
    const e = validateScenario(scen([task('a', 1, { resourceId: 'zz', dependencies: [after('nope', -1)] })], [{ id: 'r', kind: 'cpu', capacity: 0 }])).join();
    expect(e).toMatch(/unknown resource/); expect(e).toMatch(/unknown predecessor/); expect(e).toMatch(/negative/); expect(e).toMatch(/capacity/);
  });
  it('event limit', () => {
    const ts = Array.from({ length: 100 }, (_, i) => task(`t${i}`, 1));
    expect(() => simulate(scen(ts, [], { maxEvents: 50 }))).toThrow(/event limit/);
  });
});
