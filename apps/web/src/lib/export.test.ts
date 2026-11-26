import { describe, expect, it } from 'vitest';
import { csvEscape } from './export';
import { formatCalendar, formatPhysicalDuration } from './format';

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
    expect(formatCalendar(4e9, 'en')).toBe('126 years 274 days');
  });
});
