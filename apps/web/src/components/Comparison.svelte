<script lang="ts">
  import { app } from '../lib/app.svelte';
  import { corpus, phenomenonOf } from '../lib/corpus';
  import { clockedObserver, toSubjective } from '@chronosilicon/observers';
  import { formatCalendar, formatFrequency, formatPhysicalDuration, formatValue } from '../lib/format';
  import { orderMembers } from '../lib/v2';
  const t = app.t;
  const lang = $derived(app.s.lang);
  const comparisons = corpus.groups.filter((g) => g.kind === 'comparison');
  const group = $derived(comparisons.find((g) => g.id === app.s.group) ?? comparisons[0]!);
  const members = $derived(orderMembers(group));
  const obs = $derived(clockedObserver(app.s.frequencyHz));
</script>

<section aria-labelledby="cmp-h" data-testid="comparison">
  <h1 id="cmp-h">{t('cmp.heading')}</h1>
  <p>{t('cmp.intro')}</p>
  <label class="block">{t('cmp.select')}
    <select value={group.id} onchange={(e) => app.set({ group: e.currentTarget.value })} data-testid="cmp-select">
      {#each comparisons as g (g.id)}<option value={g.id}>{g.label[lang]}</option>{/each}
    </select>
  </label>
  <div class="notice" role="note" data-testid="cmp-note">
    <p><strong>{t('cmp.comparability')} :</strong> {t(`cmp.${group.comparability}`)}.</p>
    <p>{group.note[lang]}</p>
    {#if group.quantityKind === 'frequency'}<p><strong>{t('cmp.freqWarning')}</strong></p>{/if}
    {#if group.quantityKind === 'duration'}<p>{t('cmp.commonObserver', { f: formatFrequency(app.s.frequencyHz, lang) })}</p>{/if}
  </div>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div class="table-wrap" tabindex="0" role="region" aria-label={t('view.table')}>
    <table data-testid="cmp-table">
      <caption>{group.label[lang]}</caption>
      <thead>
        <tr>
          <th scope="col">{t('cmp.era')}</th><th scope="col">{t('col.phenomenon')}</th><th scope="col">{t('col.value')}</th>
          <th scope="col">{t('col.range')}</th>
          {#if group.quantityKind === 'duration'}<th scope="col">{t('col.physical')}</th><th scope="col">{t('col.subjectiveCommon', { f: formatFrequency(app.s.frequencyHz, lang) })}</th>{/if}
          <th scope="col">{t('col.provenance')}</th>
        </tr>
      </thead>
      <tbody>
        {#each members as m (m.id)}
          <tr>
            <td>{m.era ?? '—'}</td>
            <th scope="row"><button type="button" class="link" onclick={() => app.set({ selected: m.id }, true)}>{phenomenonOf(m).label[lang]}</button>
              <span class="help block">{m.conditions[lang]}</span></th>
            <td>{formatValue(m.value, m.unit, lang)}</td>
            <td>{m.low !== null || m.high !== null ? `${m.low !== null ? formatValue(m.low, m.unit, lang) : '…'} – ${m.high !== null ? formatValue(m.high, m.unit, lang) : '…'}` : '—'}</td>
            {#if group.quantityKind === 'duration'}
              <td>{formatPhysicalDuration(m.valueSI, lang)}</td>
              <td>{formatCalendar(toSubjective(m.valueSI, obs).subjectiveSeconds, lang)}</td>
            {/if}
            <td>{t(`prov.${m.provenanceType}`)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>
