<script lang="ts">
  import { app } from '../lib/app.svelte';
  import { corpus, phenomenonOf } from '../lib/corpus';
  import { formatCalendar, formatFrequency, formatNumber, formatPhysicalDuration } from '../lib/format';
  import { observeAll } from '../lib/v2';
  const t = app.t;
  const lang = $derived(app.s.lang);
  const durations = corpus.measurements
    .filter((m) => m.quantityKind === 'duration' && m.valueSI > 0)
    .sort((a, b) => a.valueSI - b.valueSI);
  const DEFAULT = 'earth-moon-light-time-one-way-m1';
  // Only durations can be observed: any other id falls back to the default (review M7).
  const observed = $derived(durations.find((m) => m.id === app.s.observed) ?? durations.find((m) => m.id === DEFAULT) ?? durations[0]!);
  const rows = $derived(observeAll(observed.valueSI, corpus.observers));
</script>

<section aria-labelledby="obs-h" data-testid="observers">
  <h1 id="obs-h">{t('obs.heading')}</h1>
  <p>{t('obs.intro')}</p>
  <label class="block">{t('obs.select')}
    <select value={observed.id} onchange={(e) => app.set({ observed: e.currentTarget.value })} data-testid="obs-select">
      {#each durations as m (m.id)}<option value={m.id}>{phenomenonOf(m).label[lang]} — {formatPhysicalDuration(m.valueSI, lang)}</option>{/each}
    </select>
  </label>
  <p><strong>{phenomenonOf(observed).label[lang]}</strong> : {formatPhysicalDuration(observed.valueSI, lang)}
    · <button type="button" class="link" onclick={() => app.set({ selected: observed.id }, true)}>{t('cmp.open')}</button></p>
  <p class="help">{t('obs.cyclesNote')}</p>
  <div class="table-wrap">
    <table data-testid="obs-table">
      <thead>
        <tr><th scope="col">{t('obs.observer')}</th><th scope="col">{t('obs.reference')}</th><th scope="col">{t('obs.units')}</th><th scope="col">{t('obs.subjective')}</th></tr>
      </thead>
      <tbody>
        {#each rows as r (r.observer.id)}
          <tr>
            <th scope="row">{r.observer.label[lang]}
              <span class="help block">{t(r.observer.kind === 'clocked' ? 'obs.clocked' : 'obs.refop')} · {t('obs.assumptions')} : {r.observer.assumptions[lang]}</span></th>
            <td>
              {r.observer.kind === 'clocked' ? formatFrequency(r.observer.referenceSI, lang) : formatPhysicalDuration(r.observer.referenceSI, lang)}
              {#if r.observer.measurementId}<br /><button type="button" class="link" onclick={() => app.set({ selected: r.observer.measurementId }, true)}>{t('cmp.open')}</button>{/if}
            </td>
            <td>{formatNumber(r.referenceUnits, lang, r.observer.kind === 'clocked' ? 6 : 2)}</td>
            <td data-testid={`obs-${r.observer.id}`}>{r.observer.kind === 'clocked' ? formatCalendar(r.subjectiveSeconds, lang) : `≈ ${formatNumber(r.subjectiveSeconds, lang, 2)} ${t('unit.subjective')}`}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>
