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

export function formatValue(value: number, unit: string, lang: Lang): string {
  return `${formatNumber(value, lang, 6)} ${unit}`;
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
