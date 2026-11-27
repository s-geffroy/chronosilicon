/** REMEDIATION-01: regression tests for AUDIT-01 findings in the web layer (AUD-015, AUD-016). */
import { describe, expect, it } from 'vitest';
import { parseHash, serializeHash, DEFAULT_STATE } from './url-state';

describe('AUD-015: frequency round-trips over the whole accepted domain (0, 1e15]', () => {
  const roundTrip = (f: number) => parseHash(serializeHash({ ...DEFAULT_STATE, frequencyHz: f }, '0.1.0')).frequencyHz;
  it('auditor counter-example: 1e-7 Hz (String() writes "1e-7")', () => {
    expect(String(1e-7)).toBe('1e-7');
    expect(roundTrip(1e-7)).toBe(1e-7);
  });
  it('limits and representative values', () => {
    for (const f of [Number.MIN_VALUE, 1e-300, 1e-7, 0.001, 0.5, 1, 60, 4e9, 3.2e9, 123456789.123, 1e15]) expect(roundTrip(f)).toBe(f);
  });
  it('pseudo-random values spanning 22 decades (deterministic LCG)', () => {
    let x = 12345;
    for (let i = 0; i < 2000; i++) {
      x = (x * 1103515245 + 12345) % 2147483648;
      const f = 10 ** (-7 + (22 * x) / 2147483648);
      if (f > 0 && f <= 1e15) expect(roundTrip(f)).toBe(f);
    }
  });
  it('explicit exponent sign is accepted; outside the domain still falls back', () => {
    expect(parseHash('#/timeline?f=4e%2B9').frequencyHz).toBe(4e9);
    expect(parseHash('#/timeline?f=2.5e-3').frequencyHz).toBe(0.0025);
    expect(parseHash('#/timeline?f=1e16').frequencyHz).toBe(4e9);
    expect(parseHash('#/timeline?f=0').frequencyHz).toBe(4e9);
    expect(parseHash('#/timeline?f=-1e-7').frequencyHz).toBe(4e9);
    expect(parseHash('#/timeline?f=1e-').frequencyHz).toBe(4e9);
  });
});

describe('AUD-016: CSV carries the same traceability as JSON (commit, schemaVersion)', () => {
  it('every row has corpusVersion, schemaVersion, appVersion and commit', async () => {
    const { buildCsvExport, buildJsonExport } = await import('./export');
    const { corpus } = await import('./corpus');
    const ctx = { appVersion: '0.1.0', commit: 'abcdef0123456789abcdef0123456789abcdef01', frequencyHz: 4e9, lang: 'en' as const };
    const ms = corpus.measurements.slice(0, 3);
    const lines = buildCsvExport(ms, ctx).trimEnd().split('\r\n');
    const header = lines[0]!.split(',');
    for (const col of ['corpusVersion', 'schemaVersion', 'appVersion', 'commit']) expect(header).toContain(col);
    const json = JSON.parse(buildJsonExport(ms, ctx));
    for (const line of lines.slice(1)) {
      const cells = line.split(',');
      const at = (c: string) => cells[cells.length - header.length + header.indexOf(c)];
      expect(at('commit')).toBe(json.commit);
      expect(at('schemaVersion')).toBe(json.schemaVersion);
      expect(at('corpusVersion')).toBe(json.corpusVersion);
    }
  });
});
