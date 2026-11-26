/** Curation precedence on published data: decision > verifier fix > raw (lot-2 review M1). */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

const raw = 'data/raw';
const curated = JSON.parse(readFileSync('data/curated/measurements.json', 'utf8')).measurements as Array<{ phenomenonId: string; notes: string | null; protocol: string | null }>;
const decisions = JSON.parse(readFileSync('data/curated/decisions.json', 'utf8')).decisions as Record<string, { patch?: Record<string, unknown> }>;
const byId = new Map(curated.map((m) => [m.phenomenonId, m]));
const fixes: Array<[string, Record<string, unknown>]> = readdirSync(raw)
  .filter((f) => f.startsWith('verify-'))
  .flatMap((f) => JSON.parse(readFileSync(`${raw}/${f}`, 'utf8')).verdicts as Array<{ id: string; fix: Record<string, unknown> | null }>)
  .filter((v) => v.fix)
  .map((v) => [v.id, v.fix!]);

describe('verifier fixes reach the curated data', () => {
  it('confidenceNotes fixes are applied (unless a decision overrides them)', () => {
    for (const [id, fix] of fixes) {
      if (typeof fix['confidenceNotes'] !== 'string' || decisions[id]?.patch?.['confidenceNotes'] !== undefined) continue;
      expect(byId.get(id)!.notes?.startsWith(fix['confidenceNotes'] as string), id).toBe(true);
    }
  });
  it('protocol fixes are applied (unless a decision overrides them)', () => {
    for (const [id, fix] of fixes) {
      if (!('protocol' in fix) || (decisions[id]?.patch && 'protocol' in decisions[id]!.patch!)) continue;
      expect(byId.get(id)!.protocol, id).toBe(fix['protocol']);
    }
  });
  it('decision notes patches are applied', () => {
    for (const [id, d] of Object.entries(decisions)) {
      const n = d.patch?.['confidenceNotes'];
      if (typeof n === 'string') expect(byId.get(id)!.notes?.startsWith(n), id).toBe(true);
    }
  });
});
