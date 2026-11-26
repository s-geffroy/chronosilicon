import { describe, expect, it } from 'vitest';
import { parseHash, serializeHash, DEFAULT_STATE } from './url-state';

describe('shareable URL state', () => {
  it('round-trips validated parameters', () => {
    const s = { ...DEFAULT_STATE, route: 'converter' as const, lang: 'en' as const, frequencyHz: 3.2e9, level: 'scientific' as const, domains: ['cpu' as const, 'space' as const], selected: 'abc-1', group: 'cmp-l1d-cycles', observed: 'tcp-min-rto-m1' };
    const back = parseHash(serializeHash(s, '0.1.0'));
    expect(back).toEqual(s);
  });
  it('rejects invalid values and falls back to defaults', () => {
    const s = parseHash('#/evil?f=-5&lang=xx&level=<script>&d=cpu,bogus&sel=../../etc&axis=foo', 'fr');
    expect(s.route).toBe('timeline');
    expect(s.frequencyHz).toBe(4e9);
    expect(s.lang).toBe('fr');
    expect(s.level).toBe('explore');
    expect(s.domains).toEqual(['cpu']);
    expect(s.selected).toBeNull();
    expect(s.axis).toBe('subjective');
    expect(parseHash('#/timeline?d=bogus').domains).toBeNull();
    expect(parseHash('#/timeline?d=').domains).toEqual([]);
  });
  it('rejects infinite or absurd frequencies', () => {
    expect(parseHash('#/timeline?f=Infinity').frequencyHz).toBe(4e9);
    expect(parseHash('#/timeline?f=1e99').frequencyHz).toBe(4e9);
    expect(parseHash('#/timeline?f=1e6').frequencyHz).toBe(1e6);
    expect(parseHash('#/timeline?f=0x10').frequencyHz).toBe(4e9);
  });
  it('empty hash → defaults with browser language', () => {
    expect(parseHash('', 'en')).toEqual({ ...DEFAULT_STATE, lang: 'en' });
  });
});
