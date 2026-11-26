/**
 * @chronosilicon/simulator — abstract discrete-event engine (CS-08).
 * Not a hardware emulator.
 *
 * Time representation: integer femtoseconds as BigInt (resolution 1 fs,
 * exact over the 20+ orders of magnitude between gate delays and deep-space
 * light times; 2^53 fs ≈ 9 s would overflow a double-precision integer).
 * Serialised as decimal strings. Inputs are IEEE doubles: near 86 400 s two
 * neighbouring doubles are ~15 ps apart, so exactness is that of the input.
 *
 * Ordering of simultaneous events is deterministic:
 * (time, event type [cancel < end < ready < start], priority, declaration order).
 * Consequence: a cancellation at the exact end time wins (the task is cancelled).
 */

export const SIMULATOR_MODEL_VERSION = '1.0.0';
export const FS_PER_S = 1_000_000_000_000_000n;

export type Fs = bigint;

/** Converts SI seconds (finite, >= 0) to integer femtoseconds (round half up). */
export function secondsToFs(seconds: number): Fs {
  if (!Number.isFinite(seconds) || seconds < 0) throw new SimulationError(`invalid duration ${seconds}`);
  // Split to keep precision for large values: integer seconds + fractional part.
  const whole = Math.floor(seconds);
  const frac = seconds - whole;
  return BigInt(whole) * FS_PER_S + BigInt(Math.round(frac * 1e15));
}
export const fsToSeconds = (t: Fs): number => Number(t / FS_PER_S) + Number(t % FS_PER_S) / 1e15;

export class SimulationError extends Error {
  override name = 'SimulationError';
}

export type DurationSpec =
  | { readonly kind: 'fixed'; readonly seconds: number; readonly measurementId: string | null }
  /** Draw uniformly among sourced empirical samples (no invented distribution). */
  | { readonly kind: 'empirical'; readonly samplesSeconds: readonly number[]; readonly measurementId: string };

export interface Dependency {
  readonly predecessor: string;
  readonly relation: 'finish-to-start' | 'start-to-start';
  /** Extra delay after the predecessor event, s (>= 0). */
  readonly lagSeconds: number;
}

export interface Task {
  readonly id: string;
  readonly label: string;
  readonly actor: string;
  readonly resourceId: string | null;
  readonly duration: DurationSpec;
  /** Lower value = served first among tasks ready at the same time. */
  readonly priority: number;
  readonly dependencies: readonly Dependency[];
  /** Earliest physical start, s (release time). */
  readonly releaseSeconds?: number;
  /** If set, the task is cancelled when this time is reached before it ends. */
  readonly cancelAtSeconds?: number;
}

export interface Resource {
  readonly id: string;
  readonly kind: 'cpu' | 'ram' | 'gpu' | 'storage' | 'network' | 'display' | 'other';
  readonly capacity: number;
}

export interface Scenario {
  readonly id: string;
  readonly modelVersion: string;
  readonly seed: number;
  readonly resources: readonly Resource[];
  readonly tasks: readonly Task[];
  readonly maxEvents?: number;
}

export type EventKind = 'ready' | 'start' | 'end' | 'cancel';
export interface SimEvent {
  readonly seq: number;
  readonly time: Fs;
  readonly kind: EventKind;
  readonly taskId: string;
  readonly resourceId: string | null;
}

export interface TaskResult {
  readonly id: string;
  readonly ready: Fs | null;
  readonly start: Fs | null;
  readonly end: Fs | null;
  /** Time spent waiting for a resource after being ready. */
  readonly wait: Fs;
  readonly duration: Fs;
  readonly status: 'done' | 'cancelled';
}

export interface ResourceUsage {
  readonly id: string;
  readonly busy: Fs; // ∫ occupied units dt
  readonly maxConcurrent: number;
  readonly capacity: number;
}

export interface SimulationResult {
  readonly scenarioId: string;
  readonly modelVersion: string;
  readonly seed: number;
  readonly makespan: Fs;
  readonly events: readonly SimEvent[];
  readonly tasks: ReadonlyMap<string, TaskResult>;
  readonly resources: readonly ResourceUsage[];
  /** Task ids on one critical path (dependency or resource-wait chain). */
  readonly criticalPath: readonly string[];
  /** Sum of all task durations — compare with makespan to see overlap. */
  readonly sumOfDurations: Fs;
}

/** Mulberry32 — small deterministic PRNG for reproducible sampling. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Validates the scenario statically: ids, references, cycles, values. */
export function validateScenario(s: Scenario): string[] {
  const errs: string[] = [];
  const ids = new Set<string>();
  for (const t of s.tasks) {
    if (ids.has(t.id)) errs.push(`duplicate task ${t.id}`);
    ids.add(t.id);
  }
  const res = new Map(s.resources.map((r) => [r.id, r]));
  if (res.size !== s.resources.length) errs.push('duplicate resource id');
  if (s.maxEvents !== undefined && !(Number.isInteger(s.maxEvents) && s.maxEvents > 0)) errs.push('maxEvents must be a positive integer');
  for (const r of s.resources) if (!(Number.isInteger(r.capacity) && r.capacity >= 1)) errs.push(`resource ${r.id}: capacity must be an integer >= 1`);
  for (const t of s.tasks) {
    if (t.resourceId !== null && !res.has(t.resourceId)) errs.push(`task ${t.id}: unknown resource ${t.resourceId}`);
    for (const d of t.dependencies) {
      if (!ids.has(d.predecessor)) errs.push(`task ${t.id}: unknown predecessor ${d.predecessor}`);
      if (d.predecessor === t.id) errs.push(`task ${t.id}: depends on itself`);
      if (!Number.isFinite(d.lagSeconds) || d.lagSeconds < 0) errs.push(`task ${t.id}: negative or invalid lag`);
    }
    const dur = t.duration;
    if (dur.kind === 'fixed' && !(Number.isFinite(dur.seconds) && dur.seconds >= 0)) errs.push(`task ${t.id}: invalid duration`);
    if (dur.kind === 'empirical' && (dur.samplesSeconds.length === 0 || dur.samplesSeconds.some((x) => !(Number.isFinite(x) && x >= 0)))) errs.push(`task ${t.id}: invalid samples`);
    if (t.releaseSeconds !== undefined && !(Number.isFinite(t.releaseSeconds) && t.releaseSeconds >= 0)) errs.push(`task ${t.id}: invalid release`);
    if (t.cancelAtSeconds !== undefined && !(Number.isFinite(t.cancelAtSeconds) && t.cancelAtSeconds >= 0)) errs.push(`task ${t.id}: invalid cancellation time`);
    if (!Number.isFinite(t.priority)) errs.push(`task ${t.id}: priority must be finite`);
  }
  // Cycle detection (DFS) — an impossible causal chain is a deadlock.
  const byId = new Map(s.tasks.map((t) => [t.id, t]));
  const state = new Map<string, 0 | 1 | 2>();
  const visit = (id: string, stack: string[]): void => {
    const st = state.get(id) ?? 0;
    if (st === 2) return;
    if (st === 1) { errs.push(`dependency cycle: ${[...stack, id].join(' → ')}`); return; }
    state.set(id, 1);
    for (const d of byId.get(id)?.dependencies ?? []) if (byId.has(d.predecessor)) visit(d.predecessor, [...stack, id]);
    state.set(id, 2);
  };
  for (const t of s.tasks) visit(t.id, []);
  return errs;
}

interface QueueItem { time: Fs; prio: number; order: number; kind: EventKind; taskId: string }
const KIND_ORDER: Record<EventKind, number> = { cancel: 0, end: 1, ready: 2, start: 3 };

/** Binary min-heap ordered by (time, priority, kind, stable id). */
class EventQueue {
  private h: QueueItem[] = [];
  private static less(a: QueueItem, b: QueueItem): boolean {
    if (a.time !== b.time) return a.time < b.time;
    if (KIND_ORDER[a.kind] !== KIND_ORDER[b.kind]) return KIND_ORDER[a.kind] < KIND_ORDER[b.kind];
    if (a.prio !== b.prio) return a.prio < b.prio;
    return a.order < b.order;
  }
  get size() { return this.h.length; }
  push(x: QueueItem) {
    const h = this.h; h.push(x);
    let i = h.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (!EventQueue.less(h[i]!, h[p]!)) break; [h[i], h[p]] = [h[p]!, h[i]!]; i = p; }
  }
  pop(): QueueItem | undefined {
    const h = this.h; if (!h.length) return undefined;
    const top = h[0]!; const last = h.pop()!;
    if (h.length) {
      h[0] = last; let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < h.length && EventQueue.less(h[l]!, h[m]!)) m = l;
        if (r < h.length && EventQueue.less(h[r]!, h[m]!)) m = r;
        if (m === i) break; [h[i], h[m]] = [h[m]!, h[i]!]; i = m;
      }
    }
    return top;
  }
}

export function simulate(s: Scenario): SimulationResult {
  const problems = validateScenario(s);
  if (problems.length) throw new SimulationError(`invalid scenario: ${problems.join('; ')}`);
  const maxEvents = s.maxEvents ?? 1_000_000;
  const rng = mulberry32(s.seed);
  const order = new Map(s.tasks.map((t, i) => [t.id, i]));
  const tasks = new Map(s.tasks.map((t) => [t.id, t]));
  // Durations drawn once, in declaration order, for reproducibility.
  const duration = new Map<string, Fs>();
  for (const t of s.tasks) {
    const d = t.duration;
    const sec = d.kind === 'fixed' ? d.seconds : d.samplesSeconds[Math.floor(rng() * d.samplesSeconds.length)]!;
    duration.set(t.id, secondsToFs(sec));
  }
  const successors = new Map<string, Array<{ id: string; dep: Dependency }>>();
  for (const t of s.tasks) for (const dep of t.dependencies) {
    const arr = successors.get(dep.predecessor) ?? [];
    arr.push({ id: t.id, dep });
    successors.set(dep.predecessor, arr);
  }
  const pendingDeps = new Map(s.tasks.map((t) => [t.id, t.dependencies.length]));
  const earliest = new Map<string, Fs>(s.tasks.map((t) => [t.id, secondsToFs(t.releaseSeconds ?? 0)]));
  /** Which predecessor event determined readiness (for the critical path). */
  const readyCause = new Map<string, string | null>(s.tasks.map((t) => [t.id, null]));
  const startCause = new Map<string, string | null>();

  const res = new Map(s.resources.map((r) => [r.id, { ...r, inUse: 0, maxConcurrent: 0, busy: 0n, lastChange: 0n, waiting: [] as string[], lastFreedBy: null as string | null }]));
  const q = new EventQueue();
  const events: SimEvent[] = [];
  const out = new Map<string, { ready: Fs | null; start: Fs | null; end: Fs | null; status: 'done' | 'cancelled' | 'open' }>(
    s.tasks.map((t) => [t.id, { ready: null, start: null, end: null, status: 'open' }]),
  );
  let now = 0n;
  const push = (time: Fs, kind: EventKind, taskId: string) => {
    if (time < now) throw new SimulationError(`causality violation: event at ${time} < now ${now}`);
    q.push({ time, prio: tasks.get(taskId)!.priority, order: order.get(taskId)!, kind, taskId });
  };
  for (const t of s.tasks) {
    if (t.dependencies.length === 0) push(earliest.get(t.id)!, 'ready', t.id);
    if (t.cancelAtSeconds !== undefined) push(secondsToFs(t.cancelAtSeconds), 'cancel', t.id);
  }
  const accrue = (r: { inUse: number; busy: bigint; lastChange: bigint }) => {
    r.busy += BigInt(r.inUse) * (now - r.lastChange);
    r.lastChange = now;
  };
  const tryStart = (rid: string) => {
    const r = res.get(rid)!;
    r.waiting.sort((a, b) => {
      const ra = out.get(a)!.ready!, rb = out.get(b)!.ready!;
      if (ra !== rb) return ra < rb ? -1 : 1;
      const pa = tasks.get(a)!.priority, pb = tasks.get(b)!.priority;
      return pa !== pb ? pa - pb : order.get(a)! - order.get(b)!;
    });
    while (r.inUse < r.capacity && r.waiting.length) {
      const id = r.waiting.shift()!;
      accrue(r);
      r.inUse++;
      r.maxConcurrent = Math.max(r.maxConcurrent, r.inUse);
      startTask(id, out.get(id)!.ready! < now ? r.lastFreedBy : null);
    }
  };
  const startTask = (id: string, waitedFor: string | null) => {
    const o = out.get(id)!;
    o.start = now;
    startCause.set(id, waitedFor);
    events.push({ seq: events.length, time: now, kind: 'start', taskId: id, resourceId: tasks.get(id)!.resourceId });
    push(now + duration.get(id)!, 'end', id);
    for (const s2 of successors.get(id) ?? []) if (s2.dep.relation === 'start-to-start') satisfy(s2.id, now + secondsToFs(s2.dep.lagSeconds), id);
  };
  const satisfy = (id: string, at: Fs, by: string) => {
    if (at > earliest.get(id)!) { earliest.set(id, at); readyCause.set(id, by); }
    else if (readyCause.get(id) === null && at === earliest.get(id)) readyCause.set(id, by);
    const n = pendingDeps.get(id)! - 1;
    pendingDeps.set(id, n);
    if (n === 0 && out.get(id)!.status === 'open') push(earliest.get(id)!, 'ready', id);
  };
  /** Iterative cascade (no recursion: long chains must not overflow the stack). */
  const cancelCascade = (rootId: string) => {
    const stack = [rootId];
    while (stack.length) {
      const id = stack.pop()!;
      const o = out.get(id)!;
      if (o.status !== 'open') continue;
      o.status = 'cancelled';
      events.push({ seq: events.length, time: now, kind: 'cancel', taskId: id, resourceId: tasks.get(id)!.resourceId });
      const rid = tasks.get(id)!.resourceId;
      if (rid) {
        const r = res.get(rid)!;
        const wi = r.waiting.indexOf(id);
        if (wi >= 0) r.waiting.splice(wi, 1);
        else if (o.start !== null) { accrue(r); r.inUse--; r.lastFreedBy = id; o.end = now; tryStart(rid); }
      } else if (o.start !== null) o.end = now;
      for (const s2 of successors.get(id) ?? []) stack.push(s2.id);
    }
  };

  let processed = 0;
  while (q.size) {
    if (++processed > maxEvents) throw new SimulationError(`event limit ${maxEvents} exceeded`);
    const e = q.pop()!;
    now = e.time;
    const o = out.get(e.taskId)!;
    const t = tasks.get(e.taskId)!;
    if (e.kind === 'cancel') { if (o.status === 'open') cancelCascade(e.taskId); continue; }
    if (o.status !== 'open') continue;
    if (e.kind === 'ready') {
      o.ready = now;
      events.push({ seq: events.length, time: now, kind: 'ready', taskId: t.id, resourceId: t.resourceId });
      if (t.resourceId === null) startTask(t.id, null);
      else { res.get(t.resourceId)!.waiting.push(t.id); tryStart(t.resourceId); }
    } else if (e.kind === 'end') {
      o.end = now;
      o.status = 'done';
      events.push({ seq: events.length, time: now, kind: 'end', taskId: t.id, resourceId: t.resourceId });
      if (t.resourceId) { const r = res.get(t.resourceId)!; accrue(r); r.inUse--; r.lastFreedBy = t.id; tryStart(t.resourceId); }
      for (const s2 of successors.get(t.id) ?? []) if (s2.dep.relation === 'finish-to-start') satisfy(s2.id, now + secondsToFs(s2.dep.lagSeconds), t.id);
    }
  }
  const stuck = [...out.entries()].filter(([, o]) => o.status === 'open').map(([id]) => id);
  if (stuck.length) throw new SimulationError(`deadlock or impossible cause: tasks never completed: ${stuck.join(', ')}`);
  for (const r of res.values()) accrue(r);

  const results = new Map<string, TaskResult>();
  let makespan = 0n;
  let sum = 0n;
  let last: string | null = null;
  for (const t of s.tasks) {
    const o = out.get(t.id)!;
    const d = o.start !== null && o.end !== null ? o.end - o.start : 0n;
    results.set(t.id, {
      id: t.id, ready: o.ready, start: o.start, end: o.end, duration: d,
      wait: o.ready !== null && o.start !== null ? o.start - o.ready : 0n,
      status: o.status === 'cancelled' ? 'cancelled' : 'done',
    });
    sum += d;
    if (o.end !== null && o.end >= makespan && o.status === 'done') { makespan = o.end; last = t.id; }
  }
  // Critical path: walk back from the last-finishing task through whichever
  // cause (resource wait, then dependency) determined each start time.
  const path: string[] = [];
  const seen = new Set<string>();
  let cur = last;
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    path.unshift(cur);
    cur = startCause.get(cur) ?? readyCause.get(cur) ?? null;
  }
  return {
    scenarioId: s.id, modelVersion: SIMULATOR_MODEL_VERSION, seed: s.seed, makespan, events, tasks: results,
    resources: [...res.values()].map((r) => ({ id: r.id, busy: r.busy, maxConcurrent: r.maxConcurrent, capacity: r.capacity })),
    criticalPath: path, sumOfDurations: sum,
  };
}

/** JSON-safe serialisation (BigInt → decimal string of femtoseconds). */
export function serializeResult(r: SimulationResult): string {
  return JSON.stringify({ ...r, tasks: Object.fromEntries(r.tasks) }, (_k, v) => (typeof v === 'bigint' ? v.toString() : v));
}
