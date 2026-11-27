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
  it('causality (with lag and release), reconstructed occupancy and work conservation on random DAGs', () => {
    const r = rnd(7);
    for (let n = 0; n < 60; n++) {
      const ts: Task[] = [];
      for (let i = 0; i < 20; i++) {
        const deps = ts.filter(() => r() < 0.15).map((t) => after(t.id, r() < 0.3 ? r() * 1e-6 : 0));
        ts.push(task(`t${i}`, 10 ** (-9 + r() * 6), {
          resourceId: r() < 0.7 ? (r() < 0.5 ? 'cpu' : 'io') : null, dependencies: deps, priority: Math.floor(r() * 3),
          ...(r() < 0.2 ? { releaseSeconds: r() * 1e-5 } : {}),
        }));
      }
      const caps: Record<string, number> = { cpu: 2, io: 1 };
      const res = simulate(scen(ts, [{ id: 'cpu', kind: 'cpu', capacity: 2 }, { id: 'io', kind: 'storage', capacity: 1 }]));
      for (const t of ts) {
        const tr = res.tasks.get(t.id)!;
        expect(tr.start! >= tr.ready!).toBe(true);
        if (t.releaseSeconds !== undefined) expect(tr.start! >= fs(t.releaseSeconds)).toBe(true);
        // causality includes the lag
        for (const d of t.dependencies) expect(tr.start! >= res.tasks.get(d.predecessor)!.end! + fs(d.lagSeconds)).toBe(true);
        // each task runs exactly its fixed duration (no stretching, no shortening)
        expect(tr.end! - tr.start!).toBe(fs((t.duration as { seconds: number }).seconds));
      }
      // occupancy reconstructed from the task intervals, independently of the engine counters
      for (const [rid, cap] of Object.entries(caps)) {
        const iv = ts.filter((t) => t.resourceId === rid).map((t) => res.tasks.get(t.id)!);
        const points = [...new Set(iv.map((x) => x.start!))];
        for (const p of points) expect(iv.filter((x) => x.start! <= p && x.end! > p).length).toBeLessThanOrEqual(cap);
      }
      for (let i = 1; i < res.events.length; i++) expect(res.events[i]!.time >= res.events[i - 1]!.time).toBe(true);
    }
  });
  it('critical path follows the binding constraint (resource wait vs dependency)', () => {
    // a (1 s) and b (3 s) share a capacity-1 resource; c depends on a only, d waits for the resource.
    const r = simulate(scen([
      task('b', 3, { resourceId: 'x', priority: 0 }),
      task('a', 1, { resourceId: 'x', priority: 1 }),
      task('c', 0.5, { dependencies: [after('a')] }),
    ], [{ id: 'x', kind: 'cpu', capacity: 1 }]));
    // b runs 0–3, a waits for the resource and runs 3–4, c runs 4–4.5: path b → a → c
    expect(r.tasks.get('a')!.start).toBe(fs(3));
    expect(r.makespan).toBe(fs(4.5));
    expect(r.criticalPath).toEqual(['b', 'a', 'c']);
  });
  it('release time delays the start', () => {
    const r = simulate(scen([task('a', 1, { releaseSeconds: 2 })]));
    expect(r.tasks.get('a')!.start).toBe(fs(2));
    expect(r.makespan).toBe(fs(3));
  });
  it('simultaneous events are ordered deterministically (priority, then declaration order)', () => {
    const ts = [task('b', 1, { resourceId: 'c', priority: 1 }), task('a', 1, { resourceId: 'c', priority: 0 }), task('d', 1, { resourceId: 'c', priority: 1 })];
    const r = simulate(scen(ts, [{ id: 'c', kind: 'cpu', capacity: 1 }]));
    const starts = r.events.filter((e) => e.kind === 'start').map((e) => e.taskId);
    expect(starts).toEqual(['a', 'b', 'd']);
    expect(serializeResult(simulate(scen(ts, [{ id: 'c', kind: 'cpu', capacity: 1 }])))).toBe(serializeResult(r));
  });
  it('seed: same seed → identical draws; different seeds → different draws (discriminant)', () => {
    const samples = [1e-6, 2e-6, 3e-6, 4e-6];
    const t = (id: string): Task => ({ ...task(id, 0), duration: { kind: 'empirical', samplesSeconds: samples, measurementId: 'fixture' } });
    const ts = Array.from({ length: 24 }, (_, i) => t(`x${i}`));
    const draws = (seed: number) => [...simulate(scen(ts, [], { seed })).tasks.values()].map((x) => x.duration);
    expect(draws(42)).toEqual(draws(42));
    expect(draws(42)).not.toEqual(draws(43));
    // every draw is one of the sourced samples (no invented value)
    for (const d of draws(42)) expect(samples.map(fs)).toContain(d);
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
  it('rejects duplicate resources, NaN priority, negative cancellation, invalid maxEvents', () => {
    const e = validateScenario(scen([task('a', 1, { priority: NaN, cancelAtSeconds: -1 })],
      [{ id: 'r', kind: 'cpu', capacity: 1 }, { id: 'r', kind: 'cpu', capacity: 2 }], { maxEvents: NaN })).join();
    expect(e).toMatch(/duplicate resource/); expect(e).toMatch(/priority/); expect(e).toMatch(/cancellation/); expect(e).toMatch(/maxEvents/);
  });
  it('cycle detection is iterative (20 000 tasks declared in reverse order)', () => {
    const ts = Array.from({ length: 20_000 }, (_, i) => task(`t${i}`, 1, i < 19_999 ? { dependencies: [after(`t${i + 1}`)] } : {}));
    expect(validateScenario(scen(ts))).toEqual([]);
    ts[19_999] = task('t19999', 1, { dependencies: [after('t0')] });
    expect(validateScenario(scen(ts)).join()).toMatch(/dependency cycle/);
  });
  it('event limit boundary: exactly maxEvents events pass, one fewer fails', () => {
    // The limit counts QUEUED events (ready, end, cancel); starts are immediate: 2 tasks → 4.
    const ts = [task('a', 1), task('b', 1)];
    expect(() => simulate(scen(ts, [], { maxEvents: 4 }))).not.toThrow();
    expect(() => simulate(scen(ts, [], { maxEvents: 3 }))).toThrow(/event limit/);
  });
  it('long cancellation cascades do not overflow the stack', () => {
    const ts = Array.from({ length: 20_000 }, (_, i) => task(`t${i}`, 1, i ? { dependencies: [after(`t${i - 1}`)] } : { cancelAtSeconds: 0.5 }));
    const r = simulate(scen(ts, [], { maxEvents: 100_000 }));
    expect([...r.tasks.values()].every((x) => x.status === 'cancelled')).toBe(true);
  });
  it('event limit', () => {
    const ts = Array.from({ length: 100 }, (_, i) => task(`t${i}`, 1));
    expect(() => simulate(scen(ts, [], { maxEvents: 50 }))).toThrow(/event limit/);
  });
});

// ---------------------------------------------------------------------------
// AUDIT-01 remediation (ADR-0010). Each block reproduces an auditor probe and
// fixes the semantics; see docs/audits/AUDIT-01/remediation/notes-simulator.md.
// ---------------------------------------------------------------------------
const ss = (p: string, lagSeconds = 0) => ({ predecessor: p, relation: 'start-to-start' as const, lagSeconds });
const kinds = (r: ReturnType<typeof simulate>) => r.events.map((e) => `${e.kind}:${e.taskId}@${fsToSeconds(e.time)}`);
const cpu1 = [{ id: 'r', kind: 'cpu' as const, capacity: 1 }];

/** Replays the critical links: each start must follow from its declared cause, and the chain must end at completedEnd. */
const replayCriticalPath = (s: Scenario, r: ReturnType<typeof simulate>) => {
  const byId = new Map(s.tasks.map((t) => [t.id, t]));
  expect(r.criticalLinks.map((l) => l.taskId)).toEqual(r.criticalPath);
  if (r.completedEnd === null) { expect(r.criticalPath).toEqual([]); return; }
  r.criticalLinks.forEach((l, i) => {
    const tr = r.tasks.get(l.taskId)!;
    if (i === 0) expect(l.from).toBeNull(); else expect(l.from).toBe(r.criticalLinks[i - 1]!.taskId);
    const from = l.from === null ? null : r.tasks.get(l.from)!;
    const expected = {
      origin: 0n,
      release: fs(byId.get(l.taskId)!.releaseSeconds ?? 0),
      'finish-to-start': from ? from.end! + l.lag : -1n,
      'start-to-start': from ? from.start! + l.lag : -1n,
      resource: from ? from.end! : -1n,
    }[l.via];
    expect(tr.start).toBe(expected);
  });
  const lastTask = r.tasks.get(r.criticalPath[r.criticalPath.length - 1]!)!;
  expect(lastTask.status).toBe('done');
  expect(lastTask.end).toBe(r.completedEnd);
};

describe('AUD-002: completed end, effective end and queue horizon are distinct notions', () => {
  it('cancellation only: nothing completes, the run still lasts until the cancellation', () => {
    const r = simulate(scen([task('A', 10, { cancelAtSeconds: 5 })]));
    expect(kinds(r)).toEqual(['ready:A@0', 'start:A@0', 'cancel:A@5']);
    expect(r.completedEnd).toBeNull();
    expect(r.makespan).toBe(fs(5)); // effective end = last recorded event, cancellations included
    expect(r.horizon).toBe(fs(5)); // the stale end at 10 s does not advance the clock
    expect(r.discardedEvents).toBe(1);
    expect(r.sumOfDurations).toBe(fs(5)); // executed (truncated) work
    expect(r.criticalPath).toEqual([]);
  });
  it('mixed: the cancellation ends after the last completion', () => {
    const r = simulate(scen([task('A', 10, { cancelAtSeconds: 5 }), task('B', 2)]));
    expect(r.completedEnd).toBe(fs(2));
    expect(r.makespan).toBe(fs(5));
    expect(r.horizon).toBe(fs(5));
    expect(r.criticalPath).toEqual(['B']);
  });
  it('mixed: a completion after the cancellation', () => {
    const r = simulate(scen([task('A', 10, { cancelAtSeconds: 5 }), task('B', 8)]));
    expect(r.completedEnd).toBe(fs(8));
    expect(r.makespan).toBe(fs(8));
    expect(r.horizon).toBe(fs(8));
  });
  it('a task cancelled before its release never starts; its ready event is discarded', () => {
    const r = simulate(scen([task('A', 1, { releaseSeconds: 3, cancelAtSeconds: 1 })]));
    expect(kinds(r)).toEqual(['cancel:A@1']);
    expect(r.tasks.get('A')).toMatchObject({ status: 'cancelled', ready: null, start: null, end: null, duration: 0n });
    expect(r.makespan).toBe(fs(1));
    expect(r.horizon).toBe(fs(1));
    expect(r.completedEnd).toBeNull();
    expect(r.sumOfDurations).toBe(0n);
    expect(r.discardedEvents).toBe(1);
  });
});

describe('AUD-003: cancellations at one instant are atomic', () => {
  it('auditor probe: no parasitic start of a dependent that is cancelled in the same cascade', () => {
    const r = simulate(scen([task('A', 10, { resourceId: 'r', cancelAtSeconds: 5 }), task('B', 10, { resourceId: 'r', dependencies: [ss('A')] })], cpu1));
    expect(kinds(r)).toEqual(['ready:A@0', 'start:A@0', 'ready:B@0', 'cancel:A@5', 'cancel:B@5']);
    expect(r.tasks.get('B')).toMatchObject({ status: 'cancelled', start: null, end: null });
    expect(r.resources[0]).toMatchObject({ busy: fs(5), maxConcurrent: 1 });
  });
  it('separate cancel events at the same instant are all applied before the resource is reallocated', () => {
    const r = simulate(scen([
      task('A', 10, { resourceId: 'r', cancelAtSeconds: 5 }),
      task('B', 10, { resourceId: 'r', cancelAtSeconds: 5 }),
      task('C', 1, { resourceId: 'r' }),
    ], cpu1));
    expect(kinds(r)).toEqual(['ready:A@0', 'start:A@0', 'ready:B@0', 'ready:C@0', 'cancel:A@5', 'cancel:B@5', 'start:C@5', 'end:C@6']);
    expect(r.tasks.get('B')!.start).toBeNull();
    expect(r.tasks.get('C')).toMatchObject({ start: fs(5), wait: fs(5) });
    expect(r.resources[0]).toMatchObject({ busy: fs(6), maxConcurrent: 1 });
    expect(r.criticalPath).toEqual(['A', 'C']);
    expect(r.criticalLinks[1]).toMatchObject({ via: 'resource', from: 'A' });
  });
  it('a cancellation at the exact end time wins (cancel < end)', () => {
    const r = simulate(scen([task('A', 5, { cancelAtSeconds: 5 }), task('B', 1, { dependencies: [after('A')] })]));
    expect(r.tasks.get('A')).toMatchObject({ status: 'cancelled', end: fs(5) });
    expect(r.tasks.get('B')!.status).toBe('cancelled');
    expect(r.completedEnd).toBeNull();
  });
});

describe('AUD-004: activity, idle time and overlap are separate quantities', () => {
  it('release date: idle time is not counted as negative overlap', () => {
    const r = simulate(scen([task('A', 10, { releaseSeconds: 5 })]));
    expect(r.makespan).toBe(fs(15));
    expect(r.activeTime).toBe(fs(10));
    expect(r.idleTime).toBe(fs(5));
    expect(r.sumOfDurations).toBe(fs(10));
  });
  it('active time is the measure of the union of execution intervals', () => {
    const r = simulate(scen([task('a', 2), task('b', 2), task('c', 1, { releaseSeconds: 10 }), task('z', 0, { releaseSeconds: 4 })]));
    expect(r.activeTime).toBe(fs(3));
    expect(r.idleTime).toBe(fs(8));
    expect(r.makespan).toBe(fs(11));
    expect(r.sumOfDurations).toBe(fs(5));
  });
});

describe('AUD-005: the critical path is a chain of binding constraints', () => {
  it('auditor probe: start-to-start lag — the path is A → B and explains completedEnd = 10 s (not Σ durations = 11 s)', () => {
    const s = scen([task('A', 10), task('B', 1, { dependencies: [ss('A', 9)] })]);
    const r = simulate(s);
    expect(r.criticalPath).toEqual(['A', 'B']);
    expect(r.criticalLinks).toEqual([
      { taskId: 'A', via: 'origin', from: null, lag: 0n },
      { taskId: 'B', via: 'start-to-start', from: 'A', lag: fs(9) },
    ]);
    expect(r.completedEnd).toBe(fs(10));
    replayCriticalPath(s, r);
  });
  it('tie at the end: the anchor is the last-declared task among those finishing at completedEnd', () => {
    const r = simulate(scen([task('B', 1, { dependencies: [ss('A', 9)] }), task('A', 10)]));
    expect(r.criticalPath).toEqual(['A']);
  });
  it('a release date that dominates the dependency cuts the path', () => {
    const s = scen([task('A', 1), task('B', 1, { dependencies: [after('A')], releaseSeconds: 10 })]);
    const r = simulate(s);
    expect(r.criticalPath).toEqual(['B']);
    expect(r.criticalLinks[0]).toMatchObject({ via: 'release', from: null });
    replayCriticalPath(s, r);
  });
  it('a dependency that ties with the release date is retained as the cause', () => {
    const s = scen([task('A', 1), task('B', 1, { dependencies: [after('A', 1)], releaseSeconds: 2 })]);
    const r = simulate(s);
    expect(r.criticalPath).toEqual(['A', 'B']);
    replayCriticalPath(s, r);
  });
  it('capacity 2: the waiting task is linked to the task that freed its unit', () => {
    const s = scen(['x', 'y', 'z'].map((id) => task(id, 1, { resourceId: 'r' })), [{ id: 'r', kind: 'cpu', capacity: 2 }]);
    const r = simulate(s);
    expect(r.makespan).toBe(fs(2));
    expect(r.criticalPath).toEqual(['x', 'z']);
    expect(r.criticalLinks[1]).toMatchObject({ via: 'resource', from: 'x' });
    replayCriticalPath(s, r);
  });
});

describe('ADR-0010: simultaneity semantics', () => {
  it('at one instant: ends are logged before ready events', () => {
    const r = simulate(scen([task('A', 1, { resourceId: 'r' }), task('B', 1, { resourceId: 'r', releaseSeconds: 1 })], cpu1));
    expect(kinds(r)).toEqual(['ready:A@0', 'start:A@0', 'end:A@1', 'ready:B@1', 'start:B@1', 'end:B@2']);
    expect(r.tasks.get('B')!.wait).toBe(0n);
  });
  it('the resource queue is served by ready time first, then priority, then declaration order', () => {
    const r = simulate(scen([
      task('A', 2, { resourceId: 'r' }),
      task('B', 1, { resourceId: 'r', priority: 5 }),
      task('C', 1, { resourceId: 'r', priority: 0, releaseSeconds: 1 }),
    ], cpu1));
    expect(r.events.filter((e) => e.kind === 'start').map((e) => e.taskId)).toEqual(['A', 'B', 'C']);
  });
  it('simultaneous cancel events are applied by priority, then declaration order', () => {
    const r = simulate(scen([task('b', 3, { cancelAtSeconds: 1, priority: 1 }), task('a', 3, { cancelAtSeconds: 1, priority: 0 }), task('c', 3, { cancelAtSeconds: 1, priority: 1 })]));
    expect(r.events.filter((e) => e.kind === 'cancel').map((e) => e.taskId)).toEqual(['a', 'b', 'c']);
  });
});

describe('resource occupancy counter (busy) and deadlock guard', () => {
  it('busy = ∫ occupied units dt, capacity 2, tasks without resource excluded', () => {
    const r = simulate(scen([task('a', 1, { resourceId: 'r' }), task('b', 2, { resourceId: 'r' }), task('c', 3, { resourceId: 'r' }), task('free', 7)], [{ id: 'r', kind: 'cpu', capacity: 2 }]));
    // a 0–1, b 0–2, c 1–4 (freed by a)
    expect(r.resources[0]).toMatchObject({ busy: fs(6), maxConcurrent: 2, capacity: 2 });
    expect(r.makespan).toBe(fs(7));
  });
  it('busy counts truncated work of cancelled tasks only up to the cancellation', () => {
    const r = simulate(scen([task('a', 10, { resourceId: 'r', cancelAtSeconds: 3 }), task('b', 1, { resourceId: 'r' })], cpu1));
    expect(r.resources[0]!.busy).toBe(fs(4));
  });
  it('a task left open when the queue empties is reported as a deadlock (defensive guard)', () => {
    // White-box: the scenario becomes cyclic only after static validation (simulate reads
    // `seed` after validateScenario), so the defensive post-run guard is exercised.
    let validated = false;
    const a = task('a', 1), b = task('b', 1);
    const s = {
      id: 'dl', modelVersion: '1.0.0', resources: [],
      get seed() { validated = true; return 1; },
      tasks: [
        { ...a, get dependencies() { return validated ? [after('b')] : []; } },
        { ...b, get dependencies() { return validated ? [after('a')] : []; } },
      ],
    } as unknown as Scenario;
    expect(() => simulate(s)).toThrow(/deadlock or impossible cause: tasks never completed: a, b/);
  });
});

describe('AUDIT-01 invariants on random DAGs with cancellations, start-to-start, lag, release, capacity 1–2', () => {
  const rnd = (seed: number) => { let x = seed; return () => ((x = (x * 1103515245 + 12345) % 2 ** 31) / 2 ** 31); };
  it('atomic cancellation, causality, occupancy, horizon and replayable critical path', () => {
    const r = rnd(11);
    const caps: Record<string, number> = { cpu: 2, io: 1 };
    for (let n = 0; n < 80; n++) {
      const ts: Task[] = [];
      for (let i = 0; i < 16; i++) {
        const deps = ts.filter(() => r() < 0.15).map((t) => (r() < 0.3 ? ss(t.id, Math.floor(r() * 3)) : after(t.id, Math.floor(r() * 2))));
        ts.push(task(`t${i}`, Math.floor(r() * 4), {
          resourceId: r() < 0.7 ? (r() < 0.5 ? 'cpu' : 'io') : null, dependencies: deps, priority: Math.floor(r() * 3),
          ...(r() < 0.2 ? { releaseSeconds: Math.floor(r() * 5) } : {}),
          ...(r() < 0.15 ? { cancelAtSeconds: Math.floor(r() * 8) } : {}),
        }));
      }
      const s = scen(ts, [{ id: 'cpu', kind: 'cpu', capacity: 2 }, { id: 'io', kind: 'storage', capacity: 1 }]);
      const res = simulate(s);
      const cancelAt = new Map(res.events.filter((e) => e.kind === 'cancel').map((e) => [e.taskId, e.time]));
      for (const t of ts) {
        const tr = res.tasks.get(t.id)!;
        if (tr.status === 'cancelled') {
          // never started at (or after) its own cancellation instant: no parasitic start
          if (tr.start !== null) expect(tr.start < cancelAt.get(t.id)!).toBe(true);
          continue;
        }
        expect(tr.start! >= tr.ready!).toBe(true);
        for (const d of t.dependencies) {
          const p = res.tasks.get(d.predecessor)!;
          expect(p.status).toBe('done');
          expect(tr.start! >= (d.relation === 'finish-to-start' ? p.end! : p.start!) + fs(d.lagSeconds)).toBe(true);
        }
      }
      for (const [rid, cap] of Object.entries(caps)) {
        const iv = ts.map((t) => ({ t, x: res.tasks.get(t.id)! })).filter(({ t, x }) => t.resourceId === rid && x.start !== null).map(({ x }) => x);
        for (const p of new Set(iv.map((x) => x.start!))) expect(iv.filter((x) => x.start! <= p && x.end! > p).length).toBeLessThanOrEqual(cap);
        expect(res.resources.find((u) => u.id === rid)!.busy).toBe(iv.reduce((a, x) => a + (x.end! - x.start!), 0n));
      }
      const lastEvent = res.events.reduce((m, e) => (e.time > m ? e.time : m), 0n);
      expect(res.makespan).toBe(lastEvent);
      expect(res.horizon).toBe(res.makespan);
      const done = [...res.tasks.values()].filter((x) => x.status === 'done');
      expect(res.completedEnd).toBe(done.length ? done.reduce((m, x) => (x.end! > m ? x.end! : m), 0n) : null);
      expect(res.activeTime + res.idleTime).toBe(res.makespan);
      expect(res.activeTime <= res.sumOfDurations).toBe(true);
      replayCriticalPath(s, res);
    }
  });
});
