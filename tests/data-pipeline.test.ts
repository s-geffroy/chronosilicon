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
  it('structured uncertainty: valid forms pass, inconsistent ones are refused (ADR-0009)', () => {
    const base = () => { const d = { sources: clone(fx.sources), phenomena: clone(fx.phenomena), measurements: clone(fx.measurements) }; d.measurements[0].provenanceType = 'measured'; d.measurements[0].protocol = 'n=10, method X'; return d; };
    const u = (o: Record<string, unknown>) => ({ type: 'standard-deviation', value: 0.1, low: null, high: null, level: null, sampleCount: 10, statement: 'mean ± sd', locator: 'Table 1', ...o });
    const ok = base(); ok.measurements[0].uncertainty = u({});
    expect(checkInvariants(ok)).toEqual([]);
    expect(validate('measurements.schema.json', { schemaVersion: '1.0.0', measurements: ok.measurements })).toBe(true);
    const ci = base(); ci.measurements[0].uncertainty = u({ type: 'confidence-interval', value: null, low: 0.9, high: 1.2, level: 0.95 });
    expect(checkInvariants(ci)).toEqual([]);
    const ciOut = base(); ciOut.measurements[0].uncertainty = u({ type: 'confidence-interval', value: null, low: 1.1, high: 1.2, level: 0.95 });
    expect(checkInvariants(ciOut).join()).toMatch(/does not contain the value/);
    const seNoN = base(); seNoN.measurements[0].uncertainty = u({ type: 'standard-error', sampleCount: null });
    expect(checkInvariants(seNoN).join()).toMatch(/sample count/);
    const mixed = base(); mixed.measurements[0].uncertainty = u({ low: 0.5 });
    expect(checkInvariants(mixed).join()).toMatch(/positive ± value and no low/);
    const doc = base(); doc.measurements[0].provenanceType = 'documented'; doc.measurements[0].uncertainty = u({});
    expect(checkInvariants(doc).join()).toMatch(/requires a measured or estimated value/);
    const badType = base(); badType.measurements[0].uncertainty = u({ type: 'guess' });
    expect(validate('measurements.schema.json', { schemaVersion: '1.0.0', measurements: badType.measurements })).toBe(false);
    const neg = base(); neg.measurements[0].uncertainty = u({ value: -1 });
    expect(validate('measurements.schema.json', { schemaVersion: '1.0.0', measurements: neg.measurements })).toBe(false);
  });
  it('uncertainty is normalised to SI with the value', () => {
    const m = clone(fx.measurements); m[0].uncertainty = { type: 'standard-error', value: 2, low: null, high: null, level: null, sampleCount: 25, statement: 's', locator: 'l' };
    expect(normalize(fx.phenomena, m)[0]!.uncertaintySI).toEqual({ value: 2e-9, low: null, high: null });
  });
  it('normalisation to SI', () => {
    const n = normalize(fx.phenomena, fx.measurements);
    expect(n[0]!.valueSI).toBeCloseTo(1e-9, 20);
    expect(n[0]!.quantityKind).toBe('duration');
  });
});
