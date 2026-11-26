import { describe, expect, it } from 'vitest';
import { MESSAGES, translate, MissingMessageError } from './i18n';

describe('i18n (no silent fallback)', () => {
  it('FR and EN have exactly the same keys', () => {
    expect(Object.keys(MESSAGES.en).sort()).toEqual(Object.keys(MESSAGES.fr).sort());
  });
  it('no empty message and same placeholders in both languages', () => {
    const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const k of Object.keys(MESSAGES.fr) as Array<keyof typeof MESSAGES.fr>) {
      expect(MESSAGES.fr[k].trim(), k).not.toBe('');
      expect(MESSAGES.en[k].trim(), k).not.toBe('');
      expect(ph(MESSAGES.en[k]), k).toEqual(ph(MESSAGES.fr[k]));
    }
  });
  it('throws on unknown key or missing parameter', () => {
    expect(() => translate('fr', 'nope')).toThrow(MissingMessageError);
    expect(() => translate('en', 'filter.count', { n: 1 })).toThrow(MissingMessageError);
    expect(translate('en', 'filter.count', { n: 1, total: 2 })).toBe('1 values shown out of 2');
  });
});
