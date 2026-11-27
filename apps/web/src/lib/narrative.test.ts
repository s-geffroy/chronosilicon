/** G4: the journal is derived from simulated events only, exact and bounded. */
import { describe, expect, it } from 'vitest';
import { clockedObserver, PEDAGOGICAL_OBSERVER, toSubjective, type Observer } from '@chronosilicon/observers';
import { fsToSeconds, simulate, type Scenario } from '@chronosilicon/simulator';
import { corpus } from './corpus';
import { runScenario } from './scenarios';
import { narrate } from './narrative';
import { MESSAGES } from './i18n';
import { formatCalendar } from './format';

const label = (id: string) => id;
const templates = (lang: 'fr' | 'en') =>
  Object.entries(MESSAGES[lang])
    .filter(([k]) => k.startsWith('journal.'))
    .map(([, v]) => new RegExp('^' + v.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{\w+\}/g, '.*?') + '$'));

describe.each(corpus.scenarios.map((s) => [s.id, s] as const))('journal for %s', (_id, def) => {
  const run = runScenario(def);
  for (const lang of ['fr', 'en'] as const) {
    const lines = narrate(run.result, PEDAGOGICAL_OBSERVER, lang, label);
    it(`${lang}: exactly one line per simulated event, in order`, () => {
      expect(lines.filter((l) => l.kind === 'event').map((l) => l.seq)).toEqual(run.result.events.map((e) => e.seq));
    });
    it(`${lang}: each gap equals the time between consecutive distinct events; gaps sum to the total`, () => {
      const times = [...new Set(run.result.events.map((e) => e.time))].sort((a, b) => (a < b ? -1 : 1));
      const gaps = lines.filter((l) => l.kind === 'gap');
      expect(gaps).toHaveLength(times.length - 1);
      gaps.forEach((g, i) => {
        expect(g.physical).toBe(fsToSeconds(times[i]!));
        expect(g.physicalEnd).toBe(fsToSeconds(times[i + 1]!));
        expect(g.gapSeconds).toBe(fsToSeconds(times[i + 1]! - times[i]!));
      });
      const total = gaps.reduce((a, g) => a + g.gapSeconds!, 0);
      expect(Math.abs(total - fsToSeconds(run.result.makespan))).toBeLessThan(1e-12 * Math.max(1, total));
    });
    it(`${lang}: running/waiting sets match the task intervals (independent recomputation)`, () => {
      const tasks = [...run.result.tasks.values()];
      for (const g of lines.filter((l) => l.kind === 'gap')) {
        const a = g.physical, b = g.physicalEnd!;
        const running = tasks.filter((t) => fsToSeconds(t.start!) <= a && fsToSeconds(t.end!) >= b).map((t) => t.id).sort();
        const waiting = tasks.filter((t) => fsToSeconds(t.ready!) <= a && fsToSeconds(t.start!) >= b).map((t) => t.id).sort();
        expect([...g.running].sort()).toEqual(running);
        expect([...g.waiting].sort()).toEqual(waiting);
        // never "in progress" and "waiting" at the same time
        expect(g.running.filter((x) => g.waiting.includes(x))).toEqual([]);
      }
    });
    it(`${lang}: subjective time = 4e9 × physical time at every line`, () => {
      for (const l of lines) expect(Math.abs(l.subjective - 4e9 * l.physical)).toBeLessThanOrEqual(1e-6 * Math.max(1, l.subjective));
    });
    it(`${lang}: every sentence is a fixed template (no invented activity)`, () => {
      const tpl = templates(lang);
      for (const l of lines) expect(tpl.some((re) => re.test(l.text)), l.text).toBe(true);
    });
  }
});

describe('journal content oracles', () => {
  it('Mars command: the long wait is narrated as elapsed time, never as work', () => {
    const run = runScenario(corpus.scenarios.find((s) => s.id === 'sc-mars-command')!);
    const lines = narrate(run.result, clockedObserver(4e9), 'en', label);
    const gaps = lines.filter((l) => l.kind === 'gap');
    expect(gaps).toHaveLength(2);
    for (const g of gaps) expect(g.text).toMatch(/The model does not say what I do meanwhile/);
    // 182.126 s × 4e9 = 7.28504e11 s = 23 084.898 Julian years
    expect(gaps[0]!.text).toMatch(/^Elapsed for me: 23,084 years 328 days \(182\.1 s in real time\)\. In progress: uplink\./);
  });
});

describe('contention is narrated (DRAM independent reads, capacity 4)', () => {
  it('reads r5–r8 are reported as waiting for a resource during the first 80 ns', () => {
    const run = runScenario(corpus.scenarios.find((s) => s.id === 'sc-dram-independent-reads')!, { mem: 4 });
    const first = narrate(run.result, PEDAGOGICAL_OBSERVER, 'en', label).find((l) => l.kind === 'gap')!;
    expect([...first.running].sort()).toEqual(['r1', 'r2', 'r3', 'r4']);
    expect([...first.waiting].sort()).toEqual(['r5', 'r6', 'r7', 'r8']);
    expect(first.gapSeconds).toBe(80e-9);
    expect(first.text).toMatch(/Waiting for a resource: r5, r6, r7, r8\./);
  });
});

describe('AUD-008: gaps are integrated over their absolute physical interval', () => {
  // Two 1 s tasks in sequence: distinct event times 0, 1, 2 s (illustrative, not a measurement).
  const scenario: Scenario = {
    id: 'aud-008', modelVersion: 'test', seed: 1, resources: [],
    tasks: [
      { id: 'a', label: 'a', actor: 'x', resourceId: null, duration: { kind: 'fixed', seconds: 1, measurementId: null }, priority: 0, dependencies: [] },
      { id: 'b', label: 'b', actor: 'x', resourceId: null, duration: { kind: 'fixed', seconds: 1, measurementId: null }, priority: 0,
        dependencies: [{ predecessor: 'a', relation: 'finish-to-start', lagSeconds: 0 }] },
    ],
  };
  const result = simulate(scenario);
  const variable: Observer = {
    id: 'var', kind: 'clocked-segments', tauSeconds: 1,
    segments: [{ start: 0, end: 1, frequencyHz: 4e9 }, { start: 1, end: 2, frequencyHz: 2e9 }],
  };
  it('gap subjective durations sum to 6e9, not 8e9 (auditor probe)', () => {
    const gaps = narrate(result, variable, 'en', label).filter((l) => l.kind === 'gap');
    expect(gaps.map((g) => g.gapSubjective)).toEqual([4e9, 2e9]);
    expect(gaps.reduce((a, g) => a + g.gapSubjective!, 0)).toBe(6e9);
    expect(gaps[1]!.text).toContain(formatCalendar(2e9, 'en'));
    expect(gaps.every((g) => !g.incomplete)).toBe(true);
  });
  it('event/gap consistency: each gap equals the difference of the subjective times of its bounds', () => {
    for (const obs of [variable, PEDAGOGICAL_OBSERVER, clockedObserver(16e6)]) {
      const lines = narrate(result, obs, 'fr', label);
      lines.forEach((l, i) => {
        if (l.kind !== 'gap') return;
        const next = lines.slice(i + 1).find((x) => x.kind === 'event')!;
        expect(Math.abs(l.subjective + l.gapSubjective! - next.subjective)).toBeLessThanOrEqual(1e-12 * next.subjective);
      });
    }
  });
  it('incompleteness of a partially covered clock is kept on gap and event lines', () => {
    const partial: Observer = { id: 'p', kind: 'clocked-segments', tauSeconds: 1, segments: [{ start: 0, end: 1, frequencyHz: 4e9 }] };
    const lines = narrate(result, partial, 'en', label);
    const gaps = lines.filter((l) => l.kind === 'gap');
    expect(gaps.map((g) => g.incomplete)).toEqual([false, true]);
    expect(gaps[1]!.gapSubjective).toBe(0);
    const last = lines[lines.length - 1]!;
    expect(last.physical).toBe(2);
    expect(last.incomplete).toBe(true);
    expect(lines.filter((l) => l.kind === 'event' && l.physical <= 1).every((l) => !l.incomplete)).toBe(true);
  });
  it('constant observers: gap values identical to the former toSubjective(gap) computation', () => {
    for (const def of corpus.scenarios) {
      const run = runScenario(def);
      for (const obs of [PEDAGOGICAL_OBSERVER, clockedObserver(1.98e9), clockedObserver(16e6)]) {
        for (const g of narrate(run.result, obs, 'en', label).filter((l) => l.kind === 'gap')) {
          expect(g.gapSubjective).toBe(toSubjective(g.gapSeconds!, obs).subjectiveSeconds);
          expect(g.incomplete).toBe(false);
          expect(g.text).toContain(formatCalendar(toSubjective(g.gapSeconds!, obs).subjectiveSeconds, 'en'));
        }
      }
    }
  });
});
