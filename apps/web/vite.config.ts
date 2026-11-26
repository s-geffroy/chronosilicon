import { defineConfig, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/**
 * BASE_PATH: path under which GitHub Pages serves the site. The Pages workflow
 * passes the real value from actions/configure-pages; locally the default
 * simulates a project site (/chronosilicon/).
 */
const rawBase = process.env.BASE_PATH ?? '/chronosilicon/';
const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;
const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as { version: string };
const commit = process.env.GITHUB_SHA ?? (() => {
  try { return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return 'unknown'; }
})();

/** Emits version.json (checked after deployment) and a 404 page that returns to the app. */
function staticExtras(): Plugin {
  return {
    name: 'chronosilicon-static-extras',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ app: pkg.version, commit }, null, 2) + '\n' });
      this.emitFile({
        type: 'asset',
        fileName: '404.html',
        source: `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>404 — CHRONOSILICON</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><h1>Page introuvable / Page not found</h1><p><a href="${base}">CHRONOSILICON</a></p></body></html>\n`,
      });
    },
  };
}

export default defineConfig({
  base,
  plugins: [svelte(), staticExtras()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __COMMIT__: JSON.stringify(commit),
  },
  build: { outDir: 'dist', emptyOutDir: true, sourcemap: true, target: 'es2022' },
  server: { fs: { allow: ['../..'] } },
});
