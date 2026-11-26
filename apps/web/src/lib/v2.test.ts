import { describe, expect, it } from 'vitest';
import { checkV2Invariants, type Group, type ObserverDef } from '@chronosilicon/ontology';
import { corpus, measurementById } from './corpus';
import { orderMembers, observeAll, toObserver } from './v2';
import { fromSubjective } from '@chronosilicon/observers';

const qualified = corpus.measurements;
const g = (over: Partial<Group>): Group => ({
  id: 'g-test', kind: 'comparison', quantityKind: 'duration', label: { fr: 'x', en: 'x' },
  members: ['tcp-min-rto-m1', 'tcp-initial-rto-m1'], comparability: 'heterogeneous', note: { fr: 'n', en: 'n' }, ...over,
});
const o = (over: Partial<ObserverDef>): ObserverDef => ({
  id: 'obs-test', kind: 'clocked', measurementId: 'intel-8086-initial-clock-m1', frequencyHz: null,
  label: { fr: 'x', en: 'x' }, assumptions: { fr: 'a', en: 'a' }, ...over,
});

describe('G2 data compatibility: invariants reject non-comparable data', () => {
  it('the published groups and observers pass', () => {
    expect(checkV2Invariants(corpus.groups, corpus.observers, qualified)).toEqual([]);
  });
  it('rejects a member of another quantity kind (duration vs cycles)', () => {
    expect(checkV2Invariants([g({ members: ['tcp-min-rto-m1', 'amd-zen4-l1d-load-to-use-m1'] })], [], qualified).join()).toMatch(/cycle_count, group is duration/);
  });
  it('rejects a non-qualified member', () => {
    expect(checkV2Invariants([g({ members: ['tcp-min-rto-m1', 'samsung-990pro-qd1-read-latency-derived-m1'] })], [], qualified).join()).toMatch(/not a qualified/);
  });
  it('rejects a heterogeneous hierarchy and a false same-protocol claim', () => {
    expect(checkV2Invariants([g({ kind: 'hierarchy' })], [], qualified).join()).toMatch(/hierarchy must come from one source/);
    const bad = g({ comparability: 'same-protocol', members: ['tcp-min-rto-m1', 'azure-rtt-eastus-westus-m1'] });
    expect(checkV2Invariants([bad], [], qualified).join()).toMatch(/cite different sources/);
  });
  it('rejects observers derived from the wrong kind or without reference', () => {
    expect(checkV2Invariants([], [o({ measurementId: 'tcp-min-rto-m1' })], qualified).join()).toMatch(/needs a frequency/);
    expect(checkV2Invariants([], [o({ kind: 'reference-operation' })], qualified).join()).toMatch(/needs a duration/);
    expect(checkV2Invariants([], [o({ measurementId: null })], qualified).join()).toMatch(/convention observers/);
  });
});

describe('G2 comparison display: ordered by era, never by value', () => {
  it('cpu clock comparison is in chronological (curated) order, not sorted by frequency', () => {
    const grp = corpus.groups.find((x) => x.id === 'cmp-cpu-clock')!;
    expect(orderMembers(grp).map((m) => m.id)).toEqual([
      'intel-8080-initial-clock-m1', 'intel-8086-initial-clock-m1', 'intel-80286-initial-clock-m1', 'intel-80386-initial-clock-m1',
      'intel-80486-initial-clock-m1', 'intel-pentium-initial-clock-m1', 'intel-pentium-pro-initial-clock-m1', 'amd-athlon-1ghz-2000-m1',
      'intel-pentium4-launch-clock-m1', 'intel-core-i9-14900k-pcore-base-m1', 'intel-core-i9-14900k-max-turbo-m1',
    ]);
  });
  it('DRAM comparison keeps 1995 first even though 2019 values are lower', () => {
    const grp = corpus.groups.find((x) => x.id === 'cmp-dram-latency')!;
    const ms = orderMembers(grp);
    expect(ms[0]!.id).toBe('dram-latency-pentiumpro-lmbench-1995-m1');
    expect(ms[0]!.valueSI).toBeGreaterThan(ms[ms.length - 1]!.valueSI);
  });
  it('every frequency group is heterogeneous and warns that frequency is not performance', () => {
    for (const grp of corpus.groups.filter((x) => x.quantityKind === 'frequency')) {
      expect(grp.comparability).toBe('heterogeneous');
      expect(grp.note.en).toMatch(/not a performance/);
      expect(grp.note.fr).toMatch(/n'est pas une performance/);
    }
  });
});

describe('G2 transformations (hard-coded oracles)', () => {
  const dt = 1.2822203819416964; // Earth–Moon one-way light time (corpus value)
  const rows = observeAll(dt, corpus.observers);
  const row = (id: string) => rows.find((x) => x.observer.id === id)!;
  it('pedagogical 4 GHz: 5.12888e9 cycles = subjective seconds', () => {
    expect(row('obs-pedagogical-4ghz').subjectiveSeconds).toBeCloseTo(5.1288815277667856e9, 0);
  });
  it('quantum QEC-cycle reference (1.1 µs): T = Δt/δref = 1.16565e6', () => {
    expect(row('obs-quantum-qec-cycle').subjectiveSeconds).toBeCloseTo(1_165_654.8926742695, 3);
  });
  it('Intel 8086 at 5 MHz: 6.4111e6 cycles', () => {
    expect(row('obs-intel-8086').referenceUnits).toBeCloseTo(6_411_101.9097, 3);
  });
  it('human reaction reference (213 ms): T = Δt/δref = 6.0198', () => {
    expect(row('obs-human-reaction').subjectiveSeconds).toBeCloseTo(6.019814, 5);
  });
  it('60 Hz frame reference (1/60 s): T = 76.933', () => {
    expect(row('obs-display-60hz').subjectiveSeconds).toBeCloseTo(76.93322, 4);
  });
  it('every observer conversion is invertible: physical time is preserved', () => {
    for (const r of rows) expect(Math.abs(fromSubjective(r.subjectiveSeconds, toObserver(r.observer)) - dt) / dt).toBeLessThan(1e-12);
  });
  it('cycle-count groups are never converted to physical time', () => {
    for (const grp of corpus.groups.filter((x) => x.quantityKind === 'cycle_count')) {
      for (const id of grp.members) expect(measurementById.get(id)!.unit).toBe('cycles');
    }
  });
});
