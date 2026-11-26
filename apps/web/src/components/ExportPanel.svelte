<script lang="ts">
  import type { NormalizedMeasurement } from '@chronosilicon/ontology';
  import { app, APP_VERSION, COMMIT } from '../lib/app.svelte';
  import { buildCsvExport, buildJsonExport, download } from '../lib/export';
  import { corpus } from '../lib/corpus';
  let { measurements }: { measurements: readonly NormalizedMeasurement[] } = $props();
  const t = app.t;
  let msg = $state('');
  const ctx = $derived({ appVersion: APP_VERSION, commit: COMMIT, frequencyHz: app.s.frequencyHz, lang: app.s.lang });
  const shareUrl = $derived(`${location.origin}${location.pathname}${app.href({})}`);
  const base = $derived(`chronosilicon-${corpus.corpusVersion.replace(/[^\w.-]/g, '_')}`);
  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      msg = t('export.copied');
    } catch {
      msg = t('export.copyFailed');
    }
  }
</script>

<section class="export" aria-labelledby="export-h">
  <h2 id="export-h">{t('export.heading')}</h2>
  <div class="buttons">
    <button type="button" data-testid="export-json" onclick={() => download(`${base}.json`, buildJsonExport(measurements, ctx), 'application/json')}>{t('export.json')}</button>
    <button type="button" data-testid="export-csv" onclick={() => download(`${base}.csv`, buildCsvExport(measurements, ctx), 'text/csv;charset=utf-8')}>{t('export.csv')}</button>
  </div>
  <label for="share">{t('export.share')}</label>
  <div class="share">
    <input id="share" type="text" readonly value={shareUrl} data-testid="share-url" onfocus={(e) => e.currentTarget.select()} />
    <button type="button" onclick={copy}>{t('export.copy')}</button>
  </div>
  <p class="help">{t('export.shareHelp')}</p>
  <p aria-live="polite">{msg}</p>
</section>
