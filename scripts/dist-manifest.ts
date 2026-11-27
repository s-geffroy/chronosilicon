/**
 * Single tested artifact (AUD-018). `write` records the SHA-256 of every file of
 * apps/web/dist; `check` fails if any file changed, appeared or disappeared since.
 * CI and Pages build once, write the manifest, run the e2e suite against that very
 * build (E2E_PREBUILT=1: preview only, no rebuild), check the manifest, then deploy it.
 * Usage: tsx scripts/dist-manifest.ts write|check [manifestPath]
 */
import { createHash } from 'node:crypto';
import { appendFileSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ROOT } from './lib/corpus';

const DIST = join(ROOT, 'apps/web/dist');
const [mode, manifestArg] = process.argv.slice(2);
const manifest = join(ROOT, manifestArg ?? '.cache/dist-manifest.sha256');

function files(dir: string): string[] {
  const out: string[] = [];
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop()!;
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) stack.push(p);
      else out.push(p);
    }
  }
  return out.map((p) => relative(DIST, p).split('\\').join('/')).sort();
}
const current = () => files(DIST).map((f) => `${createHash('sha256').update(readFileSync(join(DIST, f))).digest('hex')}  ${f}`).join('\n') + '\n';

if (mode === 'write') {
  const text = current();
  writeFileSync(manifest, text);
  console.log(`dist-manifest: ${text.trim().split('\n').length} files\n${text}`);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Artefact (SHA-256)\n\n\`\`\`\n${text}\`\`\`\n`);
} else if (mode === 'check') {
  const expected = readFileSync(manifest, 'utf8');
  if (expected !== current()) {
    console.error('dist-manifest: the built artifact changed after it was recorded (AUD-018)');
    process.exit(1);
  }
  console.log('dist-manifest: artifact unchanged since it was built and tested');
} else {
  console.error('usage: tsx scripts/dist-manifest.ts write|check [manifest]');
  process.exit(2);
}
