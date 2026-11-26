/** Builds data/validated/corpus.json from curated data (qualified values only). */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { ROOT, P, runPipeline, serialize } from './lib/corpus';

const r = runPipeline();
if (r.errors.length || !r.corpus) {
  console.error(`build:data FAILED (${r.errors.length} errors)`);
  for (const e of r.errors) console.error('  - ' + e);
  process.exit(1);
}
mkdirSync(dirname(join(ROOT, P.corpus)), { recursive: true });
writeFileSync(join(ROOT, P.corpus), serialize(r.corpus));
console.log(`build:data OK ${r.corpus.corpusVersion}`, JSON.stringify(r.stats));
