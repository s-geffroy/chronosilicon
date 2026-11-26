<script lang="ts">
  import { app } from '../lib/app.svelte';
  import { corpus } from '../lib/corpus';
  import { formatNumber, formatPhysicalDuration } from '../lib/format';
  import { measureNowCallCost, measureTimerGranularity, type BrowserMeasurement } from '../lib/browser-measure';
  import { download } from '../lib/export';

  const t = app.t;
  const lang = $derived(app.s.lang);
  // Static count per source (corpus is immutable at runtime: no reactivity needed).
  const counts: ReadonlyMap<string, number> = corpus.measurements
    .flatMap((m) => m.sourceIds)
    .reduce((acc, s) => acc.set(s, (acc.get(s) ?? 0) + 1), new Map<string, number>());
  let result = $state<BrowserMeasurement | null>(null);
  let failure = $state<string | null>(null);
  let busy = $state(false);
  function run(kind: 'timer' | 'now') {
    busy = true;
    failure = null;
    // Let the UI paint "busy" before the blocking measurement loop.
    setTimeout(() => {
      try {
        result = kind === 'timer' ? measureTimerGranularity() : measureNowCallCost();
      } catch (e) {
        result = null;
        failure = (e as Error).message;
      } finally {
        busy = false;
      }
    }, 30);
  }
</script>

<section aria-labelledby="lab-h" data-testid="laboratory">
  <h1 id="lab-h">{t('lab.heading')}</h1>
  <p>{t('lab.intro')}</p>

  <h2>{t('lab.measure')}</h2>
  <p class="notice" role="note">{t('lab.measureWarn')}</p>
  <div class="buttons">
    <button type="button" disabled={busy} onclick={() => run('timer')} data-testid="lab-run-timer">{t('lab.runTimer')}</button>
    <button type="button" disabled={busy} onclick={() => run('now')} data-testid="lab-run-now">{t('lab.runNow')}</button>
  </div>
  <div aria-live="polite">
    {#if failure}<p class="error" role="alert">{t('lab.failed')} <span lang="en">{failure}</span></p>{/if}
    {#if result}
      <dl class="result" data-testid="lab-result">
        {#if result.kind === 'timer-granularity'}
          <dt>{t('lab.n')}</dt><dd data-testid="lab-n">{result.summary.n}</dd>
          {#each result.summary.quantiles as q (q.p)}
            <dt>P{Math.round(q.p * 100)} {t('lab.ofSteps')}</dt><dd>{formatPhysicalDuration(q.value, lang)}</dd>
          {/each}
          <dt>{t('lab.minmax')}</dt><dd>{formatPhysicalDuration(result.summary.min, lang)} – {formatPhysicalDuration(result.summary.max, lang)}</dd>
          <dt>{t('lab.method')}</dt><dd lang="en">{result.summary.method}</dd>
        {:else}
          <dt>{t('lab.perCall')}</dt>
          <dd data-testid="lab-percall">
            {#if result.unresolved}{t('lab.unresolved', { r: formatPhysicalDuration(result.resolution, lang) })}
            {:else}{formatPhysicalDuration(result.medianPerCall, lang)} ± {formatPhysicalDuration(result.resolution, lang)}{/if}
          </dd>
          <dt>{t('lab.n')}</dt><dd data-testid="lab-n">{result.batchMeans.length} × {formatNumber(result.batchSize, lang)}</dd>
          <dt>{t('lab.batchNote')}</dt><dd>{t('lab.batchNoteBody')}</dd>
        {/if}
        <dt>{t('lab.protocol')}</dt><dd>{#if lang === 'fr'}<span class="help">{t('sheet.notesLang')}</span> {/if}<span lang="en">{result.protocol}</span></dd>
        <dt>{t('lab.env')}</dt><dd class="mono">{result.environment.userAgent} · crossOriginIsolated={String(result.environment.crossOriginIsolated)} · cores={result.environment.hardwareConcurrency ?? '?'} · {result.environment.measuredAt}</dd>
      </dl>
      <button type="button" data-testid="lab-export" onclick={() => download(`chronosilicon-browser-${result!.kind}.json`, JSON.stringify(result, null, 2), 'application/json')}>{t('lab.exportMeasure')}</button>
    {/if}
  </div>

  <h2>{t('lab.withheld')}</h2>
  <p>{t('lab.withheldIntro')}</p>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div class="table-wrap" tabindex="0" role="region" aria-label={t('lab.withheld')}>
    <table data-testid="lab-withheld">
      <thead><tr><th scope="col">{t('col.phenomenon')}</th><th scope="col">{t('lab.status')}</th><th scope="col">{t('lab.reason')}</th></tr></thead>
      <tbody>
        {#each corpus.withheld as w (w.id)}
          <tr><th scope="row">{w.label[lang]}</th><td>{t(`ver.${w.status}`)}</td><td>{#if lang === 'fr'}<span class="help">{t('sheet.notesLang')}</span> {/if}<span lang="en">{w.reason}</span></td></tr>
        {/each}
      </tbody>
    </table>
  </div>

  <h2>{t('lab.sources')}</h2>
  <p>{t('lab.sourcesIntro', { n: corpus.sources.length })}</p>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div class="table-wrap" tabindex="0" role="region" aria-label={t('lab.sources')}>
    <table data-testid="lab-sources">
      <thead><tr><th scope="col">{t('col.source')}</th><th scope="col">{t('lab.publisher')}</th><th scope="col">{t('lab.license')}</th><th scope="col">{t('lab.redistribution')}</th><th scope="col">{t('lab.values')}</th></tr></thead>
      <tbody>
        {#each corpus.sources as s (s.id)}
          <tr>
            <th scope="row"><a href={s.url} rel="noopener noreferrer" target="_blank">{s.title}</a></th>
            <td>{s.publisher}</td><td>{s.license}</td><td>{s.redistribution}</td><td>{formatNumber(counts.get(s.id) ?? 0, lang)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <h2>{t('lab.contribute')}</h2>
  <p>{t('lab.contributeBody')}</p>
  <p><a href="https://github.com/s-geffroy/chronosilicon/blob/main/CONTRIBUTING.md" rel="noopener">{t('lab.repo')}</a></p>
</section>
