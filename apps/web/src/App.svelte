<script lang="ts">
  import { app, APP_VERSION } from './lib/app.svelte';
  import { corpus } from './lib/corpus';
  import { ROUTES, LEVELS, type Route } from './lib/url-state';
  import { formatFrequency } from './lib/format';
  import Timeline from './components/Timeline.svelte';
  import Converter from './components/Converter.svelte';
  import Unavailable from './components/Unavailable.svelte';
  import About from './components/About.svelte';
  import Architecture from './components/Architecture.svelte';
  import Comparison from './components/Comparison.svelte';
  import Observers from './components/Observers.svelte';
  import Simulation from './components/Simulation.svelte';
  import Immersion from './components/Immersion.svelte';
  import Laboratory from './components/Laboratory.svelte';
  import Sheet from './components/Sheet.svelte';
  import type { MessageKey } from './lib/i18n';

  const PLANNED: Partial<Record<Route, string>> = {};
  const t = app.t;
  let route = $derived(app.s.route);

  $effect(() => {
    document.documentElement.lang = app.s.lang;
    document.title = `${t(`nav.${route}` as MessageKey)} — ${t('app.title')}`;
  });
</script>

<a class="skip" href="#main" onclick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>{t('app.skip')}</a>

<header class="site-header">
  <div class="brand">
    <p class="name">{t('app.title')}</p>
    <p class="tagline">{t('app.tagline')}</p>
  </div>
  <div class="global-controls">
    <label>
      <span>{t('level.label')}</span>
      <select value={app.s.level} onchange={(e) => app.set({ level: e.currentTarget.value as typeof app.s.level })} data-testid="level">
        {#each LEVELS as l (l)}<option value={l}>{t(`level.${l}`)}</option>{/each}
      </select>
    </label>
    <button type="button" class="lang" lang={app.s.lang === 'fr' ? 'en' : 'fr'} onclick={() => app.set({ lang: app.s.lang === 'fr' ? 'en' : 'fr' })} data-testid="lang-switch" aria-label={`${t('lang.label')}: ${t('lang.switch')}`}>
      {t('lang.switch')}
    </button>
  </div>
  <nav aria-label={t('nav.label')}>
    <ul>
      {#each ROUTES as r (r)}
        <li>
          <a href={app.href({ route: r, selected: null })} aria-current={route === r ? 'page' : undefined} class:planned={PLANNED[r] !== undefined}>
            {t(`nav.${r}`)}{#if PLANNED[r]}<span class="badge">{PLANNED[r]}</span>{/if}
          </a>
        </li>
      {/each}
    </ul>
  </nav>
</header>

<p class="status-banner" role="note" data-testid="status-banner">
  {t('app.status')} <a href={app.href({ route: 'about', selected: null })}>{t('about.method')}</a>
</p>

<main id="main" tabindex="-1">
  <p class="metaphor">{t('app.metaphor', { f: formatFrequency(app.s.frequencyHz, app.s.lang) })}</p>
  {#if route === 'timeline'}
    <Timeline />
  {:else if route === 'converter'}
    <Converter />
  {:else if route === 'architecture'}
    <Architecture />
  {:else if route === 'comparison'}
    <Comparison />
  {:else if route === 'observers'}
    <Observers />
  {:else if route === 'simulation'}
    <Simulation />
  {:else if route === 'immersion'}
    <Immersion />
  {:else if route === 'laboratory'}
    <Laboratory />
  {:else if route === 'about'}
    <About />
  {:else}
    <Unavailable version={PLANNED[route] ?? 'V2'} space={route} />
  {/if}
</main>

<Sheet />

<footer class="site-footer">
  <p>{t('footer.version', { app: APP_VERSION, corpus: corpus.corpusVersion })} · {t('app.provisionalName')}</p>
</footer>
