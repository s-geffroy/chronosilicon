/** Localised number/duration formatting (display only — never stored). */
import { calendarParts, prefixDuration, type CalendarUnit } from '@chronosilicon/observers';
import type { Lang } from './i18n';

const LOCALE: Record<Lang, string> = { fr: 'fr-FR', en: 'en-GB' };

export function formatNumber(x: number, lang: Lang, maxSig = 4): string {
  if (x !== 0 && (Math.abs(x) >= 1e15 || Math.abs(x) < 1e-3)) {
    return new Intl.NumberFormat(LOCALE[lang], { notation: 'scientific', maximumSignificantDigits: maxSig }).format(x);
  }
  return new Intl.NumberFormat(LOCALE[lang], { maximumSignificantDigits: maxSig }).format(x);
}

/** e.g. 2.5e-10 → "250 ps" ; SI symbols are language-independent. */
export function formatPhysicalDuration(seconds: number, lang: Lang): string {
  const p = prefixDuration(seconds);
  return `${formatNumber(p.value, lang)} ${p.unit}`;
}

const INTL_UNIT: Record<CalendarUnit, string> = { year: 'year', day: 'day', hour: 'hour', minute: 'minute', second: 'second' };

/**
 * Subjective seconds → "3 heures 42 minutes" / "126 years 275 days".
 * The second part is rounded to the nearest unit with carry (review m-4);
 * a single part keeps 3 significant digits.
 */
export function formatCalendar(seconds: number, lang: Lang): string {
  const parts = calendarParts(seconds);
  const fmt = (unit: CalendarUnit, n: number, opts: Intl.NumberFormatOptions = {}) =>
    new Intl.NumberFormat(LOCALE[lang], { style: 'unit', unit: INTL_UNIT[unit], unitDisplay: 'long', ...opts }).format(n);
  const [a, b] = parts;
  if (!a) return fmt('second', 0);
  if (a.unit === 'year' && a.value >= 1e6) {
    // 3 significant digits: announce the rounding explicitly.
    return `≈ ${formatNumber(a.value, lang, 3)} ${fmt('year', 2).replace(/^[\d\s.,\u202f\u00a0]+/, '')}`;
  }
  if (!b) return fmt(a.unit, a.value, { maximumSignificantDigits: a.value >= 1000 ? 21 : 3, maximumFractionDigits: a.value >= 1000 ? 0 : undefined } as Intl.NumberFormatOptions);
  let whole = a.value;
  let rest = Math.round(b.value);
  const perUnit: Record<CalendarUnit, number> = { year: 365.25, day: 24, hour: 60, minute: 60, second: 1 };
  if (rest >= Math.round(perUnit[a.unit])) { whole += 1; rest = 0; }
  return rest > 0 ? `${fmt(a.unit, whole)} ${fmt(b.unit, rest)}` : fmt(a.unit, whole);
}

export function formatFrequency(hz: number, lang: Lang): string {
  const steps: Array<[string, number]> = [['THz', 1e12], ['GHz', 1e9], ['MHz', 1e6], ['kHz', 1e3], ['Hz', 1]];
  const [u, f] = steps.find(([, f]) => hz >= f) ?? ['Hz', 1];
  return `${formatNumber(hz / f, lang)} ${u}`;
}

/** Display symbol of a stored unit ('us' is the ASCII spelling of µs). */
export const displayUnit = (unit: string): string => (unit === 'us' ? 'µs' : unit);

export function formatValue(value: number, unit: string, lang: Lang): string {
  return `${formatNumber(value, lang, 6)} ${displayUnit(unit)}`;
}

/** Compact single-unit label for axis ticks, e.g. "2,8 h", "317 a" (narrow units). */
export function formatCalendarShort(seconds: number, lang: Lang): string {
  const [first] = calendarParts(seconds);
  if (!first) return '0 s';
  const size: Record<CalendarUnit, number> = { year: 365.25 * 86_400, day: 86_400, hour: 3600, minute: 60, second: 1 };
  const v = seconds / size[first.unit];
  if (first.unit === 'year' && v >= 1e4) {
    // Explicit multiplier words: 'm' could be read as minutes (review).
    const y = lang === 'fr' ? 'a' : 'y';
    if (v >= 1e9) return `${formatNumber(v / 1e9, lang, 2)} ${lang === 'fr' ? 'Md' : 'bn'} ${y}`;
    if (v >= 1e6) return `${formatNumber(v / 1e6, lang, 2)} ${lang === 'fr' ? 'M' : 'M'} ${y}`;
    return `${formatNumber(v / 1e3, lang, 2)} k ${y}`;
  }
  return new Intl.NumberFormat(LOCALE[lang], { style: 'unit', unit: INTL_UNIT[first.unit], unitDisplay: 'narrow', maximumSignificantDigits: 2 }).format(v);
}

/** Confidence level as a percentage without misleading rounding (0.995 → "99.5"). */
export function formatLevel(level: number, lang: Lang): string {
  return new Intl.NumberFormat(LOCALE[lang], { maximumFractionDigits: 2 }).format(level * 100);
}

const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
/** 10 to an integer power in superscript: pow10(-18) = "10⁻¹⁸". */
export const pow10 = (e: number): string => `10${String(e).replace(/./g, (c) => SUP[c] ?? c)}`;

/**
 * Readable label of a decade 10^e seconds for the universal chronology (R1 v2.1):
 * SI prefixes below one second ("100 ps"), then minutes, hours, days, years, and powers of ten
 * of years beyond 10 000 ("10⁶ a"). Never "1E18" or long digit strings.
 */
export function formatDecade(e: number, lang: Lang): string {
  const s = 10 ** e;
  const y = lang === 'fr' ? 'a' : 'y';
  if (e < 0) {
    const prefixes: Array<[string, number]> = [['as', -18], ['fs', -15], ['ps', -12], ['ns', -9], ['µs', -6], ['ms', -3]];
    const [u, p] = prefixes.find(([, p]) => e >= p && e < p + 3) ?? ['as', -18];
    return e < -18 ? `${pow10(e)} s` : `${10 ** (e - p)} ${u}`;
  }
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${formatNumber(s / 60, lang, 2)} min`;
  if (s < 86_400) return `${formatNumber(s / 3600, lang, 2)} h`;
  if (s < 31_557_600) return `${formatNumber(s / 86_400, lang, 2)} ${lang === 'fr' ? 'j' : 'd'}`;
  const years = s / 31_557_600;
  if (years < 1e4) return `${formatNumber(years, lang, 2)} ${y}`;
  return `${sci(years, lang)} ${y}`;
}

/** "3,2 × 10¹⁰" (two significant digits), or "10⁶" when the mantissa is 1. */
function sci(v: number, lang: Lang): string {
  let k = Math.floor(Math.log10(v));
  let m = Number((v / 10 ** k).toPrecision(2));
  if (m >= 10) { m /= 10; k += 1; }
  return m === 1 ? pow10(k) : `${formatNumber(m, lang, 2)} × ${pow10(k)}`;
}

/** Same, for a subjective duration in seconds (any real exponent). */
export function formatDecadeSubjective(seconds: number, lang: Lang): string {
  const years = seconds / 31_557_600;
  const y = lang === 'fr' ? 'a' : 'y';
  if (years >= 1e4) return `${sci(years, lang)} ${y}`;
  if (seconds < 1e-3) return `${sci(seconds, lang)} s`;
  return formatCalendarShort(seconds, lang);
}
