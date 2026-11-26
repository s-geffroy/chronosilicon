import { describe, expect, it } from 'vitest';
import { csvEscape } from './export';
import { formatCalendar, formatCalendarShort, formatPhysicalDuration } from './format';

describe('CSV escaping', () => {
  it('quotes separators and doubles quotes', () => {
    expect(csvEscape('a,b')).toBe('"a,b"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscape(null)).toBe('');
  });
  it('neutralises formula injection but keeps negative numbers', () => {
    expect(csvEscape('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvEscape('@cmd')).toBe("'@cmd");
    expect(csvEscape(-3)).toBe('-3');
    expect(csvEscape('-2+3')).toBe("'-2+3");
  });
});

const n = (s: string) => s.replace(/[\u00a0\u202f]/g, ' ');

describe('display formatting', () => {
  it('physical durations use SI prefixes', () => {
    expect(formatPhysicalDuration(1e-7, 'en')).toBe('100 ns');
    expect(formatPhysicalDuration(0.25, 'fr')).toBe('250 ms');
  });
  it('subjective durations use calendar units in each language', () => {
    expect(formatCalendar(13342.56, 'en')).toBe('3 hours 42 minutes');
    expect(n(formatCalendar(13342.56, 'fr'))).toBe('3 heures 42 minutes');
    expect(formatCalendar(4e9, 'en')).toBe('126 years 275 days');
    expect(formatCalendar(7199.99, 'en')).toBe('2 hours');
    expect(formatCalendar(1234 * 31557600, 'en')).toBe('1,234 years');
  });
  it('axis ticks use one compact unit', () => {
    expect(formatCalendarShort(1e4, 'en')).toBe('2.8h');
    expect(formatCalendarShort(1e10, 'fr')).toBe('320a');
    expect(formatCalendarShort(1e16, 'en')).toBe('320 M y');
    expect(formatCalendarShort(1e5 * 31557600, 'fr')).toBe('100 k a');
    expect(formatCalendarShort(30, 'en')).toBe('30s');
  });
});
