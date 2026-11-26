/**
 * contribute:check — validates a raw extraction file before it is proposed
 * (schema + resolvable sources + known units). Usage:
 *   npm run contribute:check -- path/to/extraction.json
 */
import { readFileSync } from 'node:fs';
import { isKnownUnit } from '@chronosilicon/metrology';
import { makeAjv } from './lib/corpus';

export function checkExtraction(data: unknown): string[] {
  const errors: string[] = [];
  const v = makeAjv().getSchema('https://chronosilicon.local/schemas/raw-extraction.schema.json')!;
  if (!v(data)) return (v.errors ?? []).map((e) => `${e.instancePath}: ${e.message ?? 'invalid'}`);
  const d = data as { sources: Array<{ id: string }>; items: Array<{ id: string; sourceId: string; unit: string; provenanceType: string; calculation?: unknown }> };
  const src = new Set(d.sources.map((s) => s.id));
  const ids = new Set<string>();
  for (const it of d.items) {
    if (ids.has(it.id)) errors.push(`duplicate item ${it.id}`);
    ids.add(it.id);
    if (!src.has(it.sourceId)) errors.push(`${it.id}: unknown source ${it.sourceId}`);
    if (!isKnownUnit(it.unit)) errors.push(`${it.id}: unknown unit ${it.unit}`);
    if (it.provenanceType === 'calculated' && !it.calculation) errors.push(`${it.id}: calculated without calculation`);
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
