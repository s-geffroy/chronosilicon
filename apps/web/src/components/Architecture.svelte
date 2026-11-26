<script lang="ts">
  import { app } from '../lib/app.svelte';
  import { corpus, phenomenonOf } from '../lib/corpus';
  import { formatCalendar, formatValue } from '../lib/format';
  import { orderMembers } from '../lib/v2';
  const t = app.t;
  const lang = $derived(app.s.lang);
  const hierarchies = corpus.groups.filter((g) => g.kind === 'hierarchy');
</script>

<section aria-labelledby="arch-h" data-testid="architecture">
  <h1 id="arch-h">{t('arch.heading')}</h1>
  <p>{t('arch.intro')}</p>
  {#each hierarchies as g (g.id)}
    <article class="group" aria-labelledby={`h-${g.id}`} data-testid={`hier-${g.id}`}>
      <h2 id={`h-${g.id}`}>{g.label[lang]}</h2>
      <p class="help"><strong>{t(`cmp.${g.comparability}`)}.</strong> {g.note[lang]}</p>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div class="table-wrap" tabindex="0" role="region" aria-label={t('view.table')}>
        <table>
          <thead><tr><th scope="col">{t('arch.level')}</th><th scope="col">{t('arch.cycles')}</th><th scope="col">{t('col.range')}</th><th scope="col">{t('arch.ownFrame')}</th><th scope="col">{t('sheet.conditions')}</th></tr></thead>
          <tbody>
            {#each orderMembers(g) as m (m.id)}
              <tr>
                <th scope="row"><button type="button" class="link" onclick={() => app.set({ selected: m.id }, true)}>{phenomenonOf(m).label[lang]}</button></th>
                <td>{formatValue(m.value, m.unit, lang)}</td>
                <td>{m.low !== null || m.high !== null ? `${m.low ?? '…'} – ${m.high ?? '…'}` : '—'}</td>
                <td>{formatCalendar(m.valueSI, lang)}</td>
                <td class="help">{m.conditions[lang]}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </article>
  {/each}
</section>
