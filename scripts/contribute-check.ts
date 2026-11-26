/**
 * contribute:check — validates a raw extraction file before it is proposed
 * (schema + resolvable sources + known units). Usage:
 *   npm run contribute:check -- path/to/extraction.json
 */
import { readFileSync } from 'node:fs';
import { isKnownUnit, unitKind } from '@chronosilicon/metrology';
import { makeAjv } from './lib/corpus';

export interface CheckOptions {
  /**
   * strict (default, new contributions): non-empty quote, meaningful locator,
   * protocol for measured values, unit compatible with quantityKind, complete
   * calculation. Legacy M00 records (2026-11-26) are checked non-strictly:
   * their protocols and corrections live in data/curated/decisions.json.
   */
  readonly strict?: boolean;
}

const KIND_ALIASES: Record<string, string> = { cycles: 'cycle_count', 'GT/s': 'transfer_rate', 'MT/s': 'transfer_rate' };

export function checkExtraction(data: unknown, { strict = true }: CheckOptions = {}): string[] {
  const errors: string[] = [];
  const v = makeAjv().getSchema('https://chronosilicon.local/schemas/raw-extraction.schema.json')!;
  if (!v(data)) return (v.errors ?? []).map((e) => `${e.instancePath}: ${e.message ?? 'invalid'}`);
  const d = data as {
    sources: Array<{ id: string; url: string }>;
    items: Array<{ id: string; sourceId: string; unit: string; quantityKind: string; provenanceType: string; quote: string | null; locator: string; protocol?: string; calculation?: unknown }>;
  };
  const src = new Set(d.sources.map((s) => s.id));
  for (const s of d.sources) if (!/^https?:\/\/[^/\s]+\.[^/\s]+/.test(s.url)) errors.push(`${s.id}: URL without a host`);
  const ids = new Set<string>();
  for (const it of d.items) {
    if (ids.has(it.id)) errors.push(`duplicate item ${it.id}`);
    ids.add(it.id);
    if (!src.has(it.sourceId)) errors.push(`${it.id}: unknown source ${it.sourceId}`);
    if (!isKnownUnit(it.unit)) errors.push(`${it.id}: unknown unit ${it.unit}`);
    const calc = it.calculation as { formula?: unknown; inputs?: unknown } | null | undefined;
    if (it.provenanceType === 'calculated' && !calc) errors.push(`${it.id}: calculated without calculation`);
    if (!strict) continue;
    if (!it.quote || it.quote.trim().length < 5) errors.push(`${it.id}: a literal excerpt (quote) is required`);
    if (!/[A-Za-z0-9]{2}/.test(it.locator)) errors.push(`${it.id}: locator must name a page, table or section`);
    if (it.provenanceType === 'measured' && !(typeof it.protocol === 'string' && it.protocol.trim().length >= 10)) errors.push(`${it.id}: measured value without protocol`);
    if (isKnownUnit(it.unit) && (KIND_ALIASES[it.unit] ?? unitKind(it.unit)) !== it.quantityKind) errors.push(`${it.id}: unit ${it.unit} incompatible with ${it.quantityKind}`);
    if (it.provenanceType === 'calculated' && calc && (typeof calc !== 'object' || typeof calc.formula !== 'string' || !Array.isArray(calc.inputs) || calc.inputs.length === 0)) {
      errors.push(`${it.id}: calculation needs a formula and at least one input`);
    }
  }
  return errors;
}

if (process.argv[1]?.endsWith('contribute-check.ts')) {
  const files = process.argv.slice(2);
  if (!files.length) { console.error('usage: npm run contribute:check -- <file.json> [...]'); process.exit(2); }
  let bad = 0;
  for (const f of files) {
    const errs = checkExtraction(JSON.parse(readFileSync(f, 'utf8')));
    console.log(`${errs.length ? 'FAIL' : 'OK  '} ${f}`);
    for (const e of errs) console.log('  - ' + e);
    bad += errs.length ? 1 : 0;
  }
  process.exit(bad ? 1 : 0);
}
