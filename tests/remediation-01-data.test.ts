/**
 * REMEDIATION-01: regression tests for AUDIT-01 findings on data integrity
 * (AUD-009 calculation DAG, AUD-010 protocol comparability). Each test first
 * reproduced the auditor's counter-example against the baseline (audit-01-baseline).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkInvariants, checkV2Invariants, normalize } from '@chronosilicon/ontology';
import { ROOT } from '../scripts/lib/corpus';

const fx = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/minimal.json'), 'utf8'));
type M = Record<string, unknown> & { id: string };
const base = (): M => structuredClone(fx.measurements[0]);
const calc = (id: string, inputs: string[]): M => ({ ...base(), id, provenanceType: 'calculated', calculation: { formula: inputs.join(' + '), inputs } });
const check = (ms: M[]) => checkInvariants({ sources: fx.sources, phenomena: fx.phenomena, measurements: ms as never });

describe('AUD-009: calculation inputs form a DAG', () => {
  it('rejects a calculated value that uses itself (auditor counter-example)', () => {
    expect(check([base(), calc('c1', ['c1'])]).join('\n')).toMatch(/c1.*(itself|cycle)/);
  });
  it('rejects a 2-cycle and a 3-cycle', () => {
    expect(check([base(), calc('a', ['b']), calc('b', ['a'])]).join('\n')).toMatch(/cycle/);
    expect(check([base(), calc('a', ['b']), calc('b', ['c']), calc('c', ['a'])]).join('\n')).toMatch(/cycle/);
  });
  it('accepts a valid chain of calculations', () => {
    expect(check([base(), calc('a', ['fixture-op-1']), calc('b', ['a']), calc('c', ['a', 'b'])])).toEqual([]);
  });
});

describe('AUD-010: "same-protocol" is not "same sources"', () => {
  const ph = { ...fx.phenomena[0] };
  const meas = (id: string, protocol: string | null) => ({ ...base(), id, protocol, provenanceType: protocol ? 'measured' : 'documented' });
  const norm = (ms: M[]) => normalize([ph], ms as never);
  const group = (extra: Record<string, unknown> = {}) => ({
    id: 'g', kind: 'comparison', quantityKind: ph.quantityKind, label: { fr: 'g', en: 'g' },
    members: ['m1', 'm2'], comparability: 'same-protocol', note: { fr: 'n', en: 'n' }, ...extra,
  });
  it('rejects same-protocol when members only share their source (auditor counter-example)', () => {
    const q = norm([meas('m1', null), meas('m2', null)]);
    expect(checkV2Invariants([group()] as never, [], q).join('\n')).toMatch(/same-protocol/);
  });
  it('rejects same-protocol without evidence even if every member has a protocol', () => {
    const q = norm([meas('m1', 'method A'), meas('m2', 'method B')]);
    expect(checkV2Invariants([group()] as never, [], q).join('\n')).toMatch(/protocolEvidence/);
  });
  it('accepts same-protocol with cited evidence and a protocol on every member', () => {
    const q = norm([meas('m1', 'method A'), meas('m2', 'method A')]);
    const ev = { protocolEvidence: { sourceId: 'src-fixture', locator: 'Methods, §2', statement: 'all runs use method A' } };
    expect(checkV2Invariants([group(ev)] as never, [], q)).toEqual([]);
  });
  it('same-source stays accepted for one table of documented values', () => {
    const q = norm([meas('m1', null), meas('m2', null)]);
    expect(checkV2Invariants([group({ comparability: 'same-source' })] as never, [], q)).toEqual([]);
  });
});
