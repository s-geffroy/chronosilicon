/**
 * Display helpers — pure, locale-agnostic structures. Rounding only happens
 * here, never in stored data (CS-03). Localised labels live in the UI.
 */
import { JULIAN_YEAR_S, assertFinite } from '@chronosilicon/metrology';

export type CalendarUnit = 'year' | 'day' | 'hour' | 'minute' | 'second';

export interface CalendarPart {
  readonly unit: CalendarUnit;
  readonly value: number;
}

const STEPS: ReadonlyArray<readonly [CalendarUnit, number]> = [
  ['year', JULIAN_YEAR_S],
  ['day', 86_400],
  ['hour', 3600],
  ['minute', 60],
  ['second', 1],
];

/**
 * Decomposes a number of (subjective) seconds into the two most significant
 * calendar parts, e.g. 13342.6 s → [3 h, 42.4 min] (second part fractional). Years are Julian years
 * (365.25 d). Values >= 1e6 years are returned as a single 'year' part.
 */
export function calendarParts(seconds: number): CalendarPart[] {
  assertFinite(seconds);
  if (seconds < 0) throw new RangeError('seconds must be >= 0');
  if (seconds < 60) return [{ unit: 'second', value: seconds }];
  if (seconds >= 1e6 * JULIAN_YEAR_S) return [{ unit: 'year', value: seconds / JULIAN_YEAR_S }];
  const i = STEPS.findIndex(([, size]) => seconds >= size);
  const [unit, size] = STEPS[i]!;
  const whole = Math.floor(seconds / size);
  const parts: CalendarPart[] = [{ unit, value: whole }];
  const next = STEPS[i + 1];
  if (next) {
    const rest = (seconds - whole * size) / next[1];
    if (rest > 0) parts.push({ unit: next[0], value: rest });
  }
  return parts;
}

export interface SIPrefixed {
  readonly value: number;
  /** Prefixed unit symbol, e.g. 'ns'. */
  readonly unit: string;
}

const DURATION_PREFIXES: ReadonlyArray<readonly [string, number]> = [
  ['s', 1],
  ['ms', 1e-3],
  ['µs', 1e-6],
  ['ns', 1e-9],
  ['ps', 1e-12],
  ['fs', 1e-15],
];

/** Picks the largest SI sub-multiple of the second such that value >= 1. */
export function prefixDuration(seconds: number): SIPrefixed {
  assertFinite(seconds);
  if (seconds === 0) return { value: 0, unit: 's' };
  for (const [unit, f] of DURATION_PREFIXES) {
    if (seconds >= f) return { value: seconds / f, unit };
  }
  return { value: seconds / 1e-15, unit: 'fs' };
}
