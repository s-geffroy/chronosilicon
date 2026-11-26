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

/** Subjective seconds → "3 heures 42 minutes" / "126 years 274 days". */
export function formatCalendar(seconds: number, lang: Lang): string {
  const parts = calendarParts(seconds);
  return parts
    .map((part) => {
      const unitFmt = (n: number, opts: Intl.NumberFormatOptions = {}) =>
        new Intl.NumberFormat(LOCALE[lang], { style: 'unit', unit: INTL_UNIT[part.unit], unitDisplay: 'long', ...opts }).format(n);
      if (part.unit === 'year' && part.value >= 1e6) {
        return `${formatNumber(part.value, lang, 3)} ${unitFmt(2).replace(/^[\d\s.,\u202f]+/, '')}`;
      }
      if (parts.length === 1) return unitFmt(part.value, { maximumSignificantDigits: 3 });
      return unitFmt(Math.floor(part.value));
    })
    .join(' ');
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
    return `${new Intl.NumberFormat(LOCALE[lang], { notation: 'compact', maximumSignificantDigits: 2 }).format(v)} ${lang === 'fr' ? 'a' : 'y'}`;
  }
  return new Intl.NumberFormat(LOCALE[lang], { style: 'unit', unit: INTL_UNIT[first.unit], unitDisplay: 'narrow', maximumSignificantDigits: 2 }).format(v);
}
