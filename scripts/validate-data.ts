/**
 * validate:data — blocking data gate (CS-11 V00–V04):
 * schemas, invariants, raw immutability, and no drift between curated data
 * and the committed derived corpus.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, P, runPipeline, serialize } from './lib/corpus';

const r = runPipeline();
const errors = [...r.errors];
if (r.corpus) {
  const path = join(ROOT, P.corpus);
  if (!existsSync(path)) errors.push(`${P.corpus} missing — run npm run build:data`);
  else if (readFileSync(path, 'utf8') !== serialize(r.corpus)) errors.push(`${P.corpus} is stale — run npm run build:data`);
}
if (errors.length) {
  console.error(`validate:data FAILED (${errors.length} errors)`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log('validate:data OK', JSON.stringify(r.stats));
