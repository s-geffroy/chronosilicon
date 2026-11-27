<script lang="ts">
  import { app } from '../lib/app.svelte';
  import { corpus, phenomenonOf } from '../lib/corpus';
  import { crossComparisons } from '../lib/crosscomp';
  import { formatCalendar, formatCount, formatFrequency, formatPhysicalDuration } from '../lib/format';
  import { clockedObserver, toSubjective } from '@chronosilicon/observers';
  import type { NormalizedMeasurement } from '@chronosilicon/ontology';

  const t = app.t;
  const lang = $derived(app.s.lang);
  const pairs = $derived(crossComparisons(corpus.measurements, app.s.frequencyHz));
  const subj = (s: number) => formatCalendar(toSubjective(s, clockedObserver(app.s.frequencyHz)).subjectiveSeconds, lang);
  const name = (m: NormalizedMeasurement | null) => (m ? phenomenonOf(m).label[lang] : t('cross.cycle', { f: formatFrequency(app.s.frequencyHz, lang) }));
  const open = (m: NormalizedMeasurement | null) => { if (m) app.set({ selected: m.id }, true); };
</script>

{#if pairs.length}
  <section class="cross" aria-labelledby="cross-h" data-testid="cross">
    <h2 id="cross-h">{t('cross.heading')}</h2>
    <ul class="cross-cards">
      {#each pairs as p (p.id)}
        <li class="cross-card" data-testid={`cross-${p.id}`}>
          <p class="cross-line"><button type="button" class="link" onclick={() => open(p.b)}>{name(p.b)}</button> <span class="dur">{formatPhysicalDuration(p.bSeconds, lang)}</span></p>
          <p class="cross-ratio">{t('cross.times', { n: formatCount(p.ratio, lang) })}</p>
          <p class="cross-line">{#if p.a}<button type="button" class="link" onclick={() => open(p.a)}>{name(p.a)}</button>{:else}{name(p.a)}{/if} <span class="dur">{formatPhysicalDuration(p.aSeconds, lang)}</span></p>
          <p class="cross-subj">{t('cross.subjective', { f: formatFrequency(app.s.frequencyHz, lang), a: subj(p.aSeconds), b: subj(p.bSeconds) })}</p>
        </li>
      {/each}
    </ul>
  </section>
{/if}
