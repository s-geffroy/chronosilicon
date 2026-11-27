/**
 * @chronosilicon/metrology — SI quantities, units and dimensional checks.
 *
 * Every value is stored internally in an SI (or SI-coherent) base unit:
 *   duration → s, frequency → Hz, throughput → B/s (byte per second),
 *   transfer_rate → T/s (transfers per second, NOT bytes), distance → m,
 *   speed → m/s, data_size → B, cycle_count → cycles (dimensionless count
 *   that only makes sense with the clock domain of a named component),
 *   compute_rate → flop/s (precision and benchmark stated in conditions).
 *
 * Rounding happens only at display time (CS-03).
 */

export const QUANTITY_KINDS = [
  'duration',
  'frequency',
  'throughput',
  'transfer_rate',
  'distance',
  'speed',
  'data_size',
  'cycle_count',
  'compute_rate',
] as const;
export type QuantityKind = (typeof QUANTITY_KINDS)[number];

export const BASE_UNIT: Readonly<Record<QuantityKind, string>> = {
  duration: 's',
  frequency: 'Hz',
  throughput: 'B/s',
  transfer_rate: 'T/s',
  distance: 'm',
  speed: 'm/s',
  data_size: 'B',
  cycle_count: 'cycles',
  compute_rate: 'flop/s',
};

/** Exact SI constants (BIPM SI Brochure, 9th ed.). */
export const SPEED_OF_LIGHT_M_PER_S = 299_792_458;
/** IAU 2012 Resolution B2: astronomical unit, exact. */
export const ASTRONOMICAL_UNIT_M = 149_597_870_700;
/** Julian year (365.25 d of 86 400 s), used for subjective-time display. */
export const JULIAN_YEAR_S = 365.25 * 86_400;

interface UnitDef {
  readonly kind: QuantityKind;
  /** Multiply a value in this unit by `factor` to obtain the base unit. */
  readonly factor: number;
  /**
   * For decimal sub-multiples, divide by this exact integer instead of
   * multiplying by an inexact 10^-k (43 ms → 0.043 s, not 0.043000000000000003).
   */
  readonly divisor?: number;
}

const U = (kind: QuantityKind, factor: number): UnitDef =>
  factor < 1 && Number.isInteger(Math.round(1 / factor)) && Math.abs(1 / factor - Math.round(1 / factor)) < 1e-6
    ? { kind, factor, divisor: Math.round(1 / factor) }
    : { kind, factor };

export const UNITS: Readonly<Record<string, UnitDef>> = {
  // duration
  as: U('duration', 1e-18), // attosecond: lower end of the universal chronology (R1 v2.1)
  fs: U('duration', 1e-15),
  ps: U('duration', 1e-12),
  ns: U('duration', 1e-9),
  us: U('duration', 1e-6),
  'µs': U('duration', 1e-6),
  ms: U('duration', 1e-3),
  s: U('duration', 1),
  min: U('duration', 60),
  h: U('duration', 3600),
  d: U('duration', 86_400),
  a: U('duration', JULIAN_YEAR_S),
  // frequency
  Hz: U('frequency', 1),
  kHz: U('frequency', 1e3),
  MHz: U('frequency', 1e6),
  GHz: U('frequency', 1e9),
  THz: U('frequency', 1e12),
  // throughput (decimal prefixes; binary prefixes explicit)
  'B/s': U('throughput', 1),
  'kB/s': U('throughput', 1e3),
  'MB/s': U('throughput', 1e6),
  'GB/s': U('throughput', 1e9),
  'TB/s': U('throughput', 1e12),
  'KiB/s': U('throughput', 1024),
  'MiB/s': U('throughput', 1024 ** 2),
  'GiB/s': U('throughput', 1024 ** 3),
  'bit/s': U('throughput', 1 / 8),
  'kbit/s': U('throughput', 1e3 / 8),
  'Mbit/s': U('throughput', 1e6 / 8),
  'Gbit/s': U('throughput', 1e9 / 8),
  'Tbit/s': U('throughput', 1e12 / 8),
  // transfer rate — transfers per second, deliberately NOT convertible to B/s
  'T/s': U('transfer_rate', 1),
  'MT/s': U('transfer_rate', 1e6),
  'GT/s': U('transfer_rate', 1e9),
  // distance
  mm: U('distance', 1e-3),
  cm: U('distance', 1e-2),
  m: U('distance', 1),
  km: U('distance', 1e3),
  au: U('distance', ASTRONOMICAL_UNIT_M),
  // speed
  'm/s': U('speed', 1),
  'km/s': U('speed', 1e3),
  // data size
  bit: U('data_size', 1 / 8),
  B: U('data_size', 1),
  kB: U('data_size', 1e3),
  MB: U('data_size', 1e6),
  GB: U('data_size', 1e9),
  TB: U('data_size', 1e12),
  KiB: U('data_size', 1024),
  MiB: U('data_size', 1024 ** 2),
  GiB: U('data_size', 1024 ** 3),
  // cycle count
  cycles: U('cycle_count', 1),
  // compute rate (floating-point operations per second; precision stated in conditions)
  'flop/s': U('compute_rate', 1),
  'Gflop/s': U('compute_rate', 1e9),
  'Tflop/s': U('compute_rate', 1e12),
  'Pflop/s': U('compute_rate', 1e15),
  'Eflop/s': U('compute_rate', 1e18),
};

export class DimensionError extends Error {
  override name = 'DimensionError';
}
export class ValueError extends Error {
  override name = 'ValueError';
}

export function isKnownUnit(unit: string): boolean {
  return Object.hasOwn(UNITS, unit);
}

export function unitKind(unit: string): QuantityKind {
  const def = UNITS[unit];
  if (!def) throw new DimensionError(`Unknown unit "${unit}"`);
  return def.kind;
}

/** Ensures `x` is a finite number (no NaN, no ±Infinity). */
export function assertFinite(x: number, what = 'value'): void {
  if (typeof x !== 'number' || !Number.isFinite(x)) {
    throw new ValueError(`${what} must be a finite number, got ${String(x)}`);
  }
}

/**
 * Shared domain checks of toSI / fromSI (AUD-001): the two directions accept
 * and refuse exactly the same inputs.
 *  - input: finite number, not negative (all modelled quantities are
 *    non-negative magnitudes); -0 is normalised to +0;
 *  - unit: known, and of the expected kind (DimensionError otherwise);
 *  - output: finite (overflow refused) and non-zero when the input is
 *    non-zero (total underflow refused: a magnitude never silently becomes 0).
 */
function convertChecked(value: number, unit: string, expected: QuantityKind, direction: 'toSI' | 'fromSI'): number {
  assertFinite(value);
  if (value < 0) throw new ValueError(`negative magnitude ${value} ${unit}`);
  const def = UNITS[unit];
  if (!def) throw new DimensionError(`Unknown unit "${unit}"`);
  if (def.kind !== expected) {
    throw new DimensionError(`Unit "${unit}" is a ${def.kind}, expected ${expected}`);
  }
  if (value === 0) return 0;
  const out =
    direction === 'toSI'
      ? def.divisor !== undefined ? value / def.divisor : value * def.factor
      : def.divisor !== undefined ? value * def.divisor : value / def.factor;
  assertFinite(out, 'converted value');
  if (out === 0) throw new ValueError(`converted value underflows to 0 (${value} ${direction === 'toSI' ? unit : BASE_UNIT[expected]})`);
  return out;
}

/**
 * Converts `value` expressed in `unit` into the SI base unit of `expected`.
 * Throws DimensionError if the unit does not belong to the expected kind,
 * ValueError if the value is not finite, is negative, or if the result
 * overflows or underflows to 0 (see convertChecked).
 */
export function toSI(value: number, unit: string, expected: QuantityKind): number {
  return convertChecked(value, unit, expected, 'toSI');
}

/** Converts an SI base value back into `unit` (display helper; exactly the same checks as toSI). */
export function fromSI(valueSI: number, unit: string, expected: QuantityKind): number {
  return convertChecked(valueSI, unit, expected, 'fromSI');
}

/**
 * Checks that quantiles are ordered by probability and by value
 * (e.g. p50 <= p95 <= p99). Returns a list of human-readable problems.
 */
export function checkQuantiles(q: ReadonlyArray<{ p: number; value: number }>): string[] {
  const problems: string[] = [];
  for (const { p, value } of q) {
    if (!(p > 0 && p < 1)) problems.push(`quantile probability ${p} outside (0,1)`);
    if (!Number.isFinite(value)) problems.push(`quantile value ${value} not finite`);
  }
  const sorted = [...q].sort((a, b) => a.p - b.p);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const cur = sorted[i]!;
    if (cur.p === prev.p) problems.push(`duplicate quantile p=${cur.p}`);
    if (cur.value < prev.value) problems.push(`quantile p=${cur.p} (${cur.value}) < p=${prev.p} (${prev.value})`);
  }
  return problems;
}
export * from './stats';
