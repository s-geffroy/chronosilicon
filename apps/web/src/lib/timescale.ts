/**
 * Universal chronology (directive R1 v2.1): physical duration t in SI seconds, x = log10(t).
 * Initial window [-18, 18] (36 decades, 37 integer ticks), extended only when a value needs it;
 * nothing outside the window is ever dropped. Thirteen contiguous teaching bands, lower bound
 * included, upper bound excluded. Bands and universes are independent.
 */
export const WINDOW: readonly [number, number] = [-18, 18];
/** Julian year (365.25 d), the conventional year of the bands. */
export const JULIAN_YEAR_S = 31_557_600;

export type BandId =
  | 'attosecond' | 'femtosecond' | 'picosecond' | 'nanosecond' | 'microsecond' | 'millisecond'
  | 'second' | 'minute' | 'hour' | 'day' | 'year' | 'millennium' | 'deep';
export interface Band { id: BandId; lo: number; hi: number }

export const BANDS: readonly Band[] = [
  { id: 'attosecond', lo: 1e-18, hi: 1e-15 },
  { id: 'femtosecond', lo: 1e-15, hi: 1e-12 },
  { id: 'picosecond', lo: 1e-12, hi: 1e-9 },
  { id: 'nanosecond', lo: 1e-9, hi: 1e-6 },
  { id: 'microsecond', lo: 1e-6, hi: 1e-3 },
  { id: 'millisecond', lo: 1e-3, hi: 1 },
  { id: 'second', lo: 1, hi: 60 },
  { id: 'minute', lo: 60, hi: 3600 },
  { id: 'hour', lo: 3600, hi: 86_400 },
  { id: 'day', lo: 86_400, hi: JULIAN_YEAR_S },
  { id: 'year', lo: JULIAN_YEAR_S, hi: 1000 * JULIAN_YEAR_S },
  { id: 'millennium', lo: 1000 * JULIAN_YEAR_S, hi: 1e6 * JULIAN_YEAR_S },
  { id: 'deep', lo: 1e6 * JULIAN_YEAR_S, hi: Infinity },
];

/** Band of a strictly positive duration; null below 1e-18 s, for zero, or for a non-finite value. */
export function bandOf(seconds: number): BandId | null {
  if (!(seconds > 0) || !Number.isFinite(seconds)) return null;
  return BANDS.find((b) => seconds >= b.lo && seconds < b.hi)?.id ?? null;
}

/** Window in decades covering [-18, 18] and every given positive duration (never shrinks). */
export function axisWindow(seconds: readonly number[]): [number, number] {
  let [a, b] = WINDOW;
  for (const s of seconds) {
    if (!(s > 0) || !Number.isFinite(s)) continue;
    const e = Math.log10(s);
    a = Math.min(a, Math.floor(e));
    b = Math.max(b, Math.ceil(e));
  }
  return [a, b];
}

/** Integer decade exponents of a window, both ends included (37 for [-18, 18]). */
export function decades([a, b]: readonly [number, number]): number[] {
  const out: number[] = [];
  for (let e = Math.ceil(a); e <= Math.floor(b); e++) out.push(e);
  return out;
}

/** Label every `step` decades so that at most `max` labels show. */
export function labelStep([a, b]: readonly [number, number], max = 7): number {
  return Math.max(1, Math.ceil((b - a) / max));
}

/** Position (0..100 %) of a duration in a decade window; outside values are clamped (and flagged by the caller). */
export function position(seconds: number, [a, b]: readonly [number, number]): number {
  const x = Math.log10(seconds);
  return Math.min(100, Math.max(0, ((x - a) / (b - a)) * 100));
}

/** Clamp a zoom to the window, at least one decade wide. */
export function clampZoom(z: readonly [number, number], win: readonly [number, number]): [number, number] {
  const a = Math.max(win[0], Math.min(z[0], z[1]));
  const b = Math.min(win[1], Math.max(z[0], z[1]));
  return b - a >= 1 ? [a, b] : [a, Math.min(win[1], a + 1)];
}

/** Decade window of a band (the open "deep" band stops at the window end). */
export function bandWindow(band: Band, win: readonly [number, number]): [number, number] {
  const a = Math.floor(Math.log10(band.lo));
  const b = band.hi === Infinity ? win[1] : Math.ceil(Math.log10(band.hi));
  return clampZoom([a, b], win);
}
