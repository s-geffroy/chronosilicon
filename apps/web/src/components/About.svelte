<script lang="ts">
  import { app, APP_VERSION, COMMIT } from '../lib/app.svelte';
  import { corpus } from '../lib/corpus';
  const t = app.t;
</script>

<section aria-labelledby="about-h">
  <h1 id="about-h">{t('about.heading')}</h1>
  <p>{t('about.body')}</p>
  <h2>{t('about.prototype')}</h2>
  <p data-testid="prototype-status">{t('about.prototypeBody')}</p>
  <h2>{t('about.status')}</h2>
  <p data-testid="status">{t('about.statusBody', { app: APP_VERSION, corpus: corpus.corpusVersion, n: corpus.measurements.length })}</p>
  <p class="mono">commit {COMMIT}</p>
  <h2>{t('about.method')}</h2>
  <p>{t('about.methodBody')}</p>
  <p>{t('about.licenses')}</p>
  <p><a href="https://github.com/s-geffroy/chronosilicon" rel="noopener">{t('about.repo')}</a></p>
</section>
