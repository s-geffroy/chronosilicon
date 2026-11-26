/** G4: the journal is derived from simulated events only, exact and bounded. */
import { describe, expect, it } from 'vitest';
import { clockedObserver, PEDAGOGICAL_OBSERVER } from '@chronosilicon/observers';
import { fsToSeconds } from '@chronosilicon/simulator';
import { corpus } from './corpus';
import { runScenario } from './scenarios';
import { narrate } from './narrative';
import { MESSAGES } from './i18n';

const label = (id: string) => id;
const templates = (lang: 'fr' | 'en') =>
  Object.entries(MESSAGES[lang])
    .filter(([k]) => k.startsWith('journal.'))
    .map(([, v]) => new RegExp('^' + v.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{\w+\}/g, '.+?') + '$'));

describe.each(corpus.scenarios.map((s) => [s.id, s] as const))('journal for %s', (_id, def) => {
  const run = runScenario(def);
  for (const lang of ['fr', 'en'] as const) {
    const lines = narrate(run.result, PEDAGOGICAL_OBSERVER, lang, label);
    it(`${lang}: exactly one line per simulated event, in order`, () => {
      expect(lines.filter((l) => l.kind === 'event').map((l) => l.seq)).toEqual(run.result.events.map((e) => e.seq));
    });
    it(`${lang}: gaps add up exactly to the simulated total duration`, () => {
      const last = lines[lines.length - 1]!;
      expect(last.physical).toBeCloseTo(fsToSeconds(run.result.makespan), 15);
      for (let i = 1; i < lines.length; i++) expect(lines[i]!.physical).toBeGreaterThanOrEqual(lines[i - 1]!.physical);
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
    expect(gaps[0]!.text).toMatch(/^23,084 years 328 days pass for me \(182\.1 s in real time\)\. In progress: uplink\./);
  });
});
