/** Schema + invariant tests with negative fixtures (fixtures stay out of the corpus). */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkInvariants, normalize } from '@chronosilicon/ontology';
import { makeAjv, ROOT } from '../scripts/lib/corpus';

const fx = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/minimal.json'), 'utf8'));
const clone = <T>(x: T): T => structuredClone(x);
const ajv = makeAjv();
const validate = (id: string, data: unknown) => {
  const v = ajv.getSchema(`https://chronosilicon.local/schemas/${id}`)!;
  return v(data);
};

describe('schemas', () => {
  it('minimal fixture is valid', () => {
    expect(validate('sources.schema.json', { schemaVersion: '1.0.0', sources: fx.sources })).toBe(true);
    expect(validate('phenomena.schema.json', { schemaVersion: '1.0.0', phenomena: fx.phenomena })).toBe(true);
    expect(validate('measurements.schema.json', { schemaVersion: '1.0.0', measurements: fx.measurements })).toBe(true);
  });
  it('rejects a measurement without source', () => {
    const m = clone(fx.measurements); m[0].sourceIds = [];
    expect(validate('measurements.schema.json', { schemaVersion: '1.0.0', measurements: m })).toBe(false);
  });
  it('rejects negative values', () => {
    const m = clone(fx.measurements); m[0].value = -1;
    expect(validate('measurements.schema.json', { schemaVersion: '1.0.0', measurements: m })).toBe(false);
  });
  it('rejects unknown fields and unknown provenance', () => {
    const m = clone(fx.measurements); m[0].foo = 1;
    expect(validate('measurements.schema.json', { schemaVersion: '1.0.0', measurements: m })).toBe(false);
    const m2 = clone(fx.measurements); m2[0].provenanceType = 'guessed';
    expect(validate('measurements.schema.json', { schemaVersion: '1.0.0', measurements: m2 })).toBe(false);
  });
  it('uncertainty must be an explicit null', () => {
    const m = clone(fx.measurements); delete m[0].uncertainty;
    expect(validate('measurements.schema.json', { schemaVersion: '1.0.0', measurements: m })).toBe(false);
  });
});

describe('invariants', () => {
  const base = () => ({ sources: clone(fx.sources), phenomena: clone(fx.phenomena), measurements: clone(fx.measurements) });
  it('fixture passes', () => expect(checkInvariants(base())).toEqual([]));
  it('unit incompatible with quantity kind', () => {
    const d = base(); d.measurements[0].unit = 'GB/s';
    expect(checkInvariants(d).join()).toMatch(/incompatible/);
  });
  it('unresolved references and duplicate ids', () => {
    const d = base(); d.measurements[0].sourceIds = ['src-nope']; d.measurements[0].phenomenonId = 'nope';
    d.measurements.push(clone(d.measurements[0]));
    const e = checkInvariants(d).join();
    expect(e).toMatch(/unknown source/); expect(e).toMatch(/unknown phenomenon/); expect(e).toMatch(/duplicate measurement/);
  });
  it('illustrative values are refused', () => {
    const d = base(); d.measurements[0].provenanceType = 'illustrative';
    expect(checkInvariants(d).join()).toMatch(/illustrative/);
  });
  it('measured values need a protocol; statistics need ordered quantiles', () => {
    const d = base(); d.measurements[0].provenanceType = 'measured'; d.measurements[0].protocol = null;
    d.measurements[0].statistics = { sampleCount: 10, method: 'R-7', quantiles: [{ p: 0.5, value: 2 }, { p: 0.9, value: 1 }] };
    const e = checkInvariants(d).join();
    expect(e).toMatch(/without protocol/); expect(e).toMatch(/quantile/);
  });
  it('calculated values need resolvable inputs', () => {
    const d = base(); d.measurements[0].provenanceType = 'calculated';
    expect(checkInvariants(d).join()).toMatch(/without calculation/);
    d.measurements[0].calculation = { formula: 'x', inputs: ['missing'] };
    expect(checkInvariants(d).join()).toMatch(/unresolved/);
  });
  it('interval consistency', () => {
    const d = base(); d.measurements[0].low = 5; d.measurements[0].high = 1;
    expect(checkInvariants(d).join()).toMatch(/low > high/);
  });
  it('normalisation to SI', () => {
    const n = normalize(fx.phenomena, fx.measurements);
    expect(n[0]!.valueSI).toBeCloseTo(1e-9, 20);
    expect(n[0]!.quantityKind).toBe('duration');
  });
});
