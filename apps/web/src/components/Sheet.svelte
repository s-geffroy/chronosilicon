<script lang="ts">
  import { app } from '../lib/app.svelte';
  import { measurementById, phenomenonOf, sourceById } from '../lib/corpus';
  import { clockedObserver, toSubjective } from '@chronosilicon/observers';
  import { BASE_UNIT } from '@chronosilicon/metrology';
  import { formatCalendar, formatFrequency, formatLevel, formatNumber, formatPhysicalDuration, formatValue } from '../lib/format';

  const t = app.t;
  let dialog: HTMLDialogElement | undefined = $state();
  const m = $derived(app.s.selected ? measurementById.get(app.s.selected) ?? null : null);
  const lang = $derived(app.s.lang);
  const level = $derived(app.s.level);
  const sub = $derived(m && m.quantityKind === 'duration' ? toSubjective(m.valueSI, clockedObserver(app.s.frequencyHz)) : null);

  $effect(() => {
    if (!dialog) return;
    if (m && !dialog.open) dialog.showModal();
    if (!m && dialog.open) dialog.close();
  });
  const close = () => app.set({ selected: null }, true);
</script>

<dialog bind:this={dialog} onclose={() => { if (app.s.selected) close(); }} aria-labelledby="sheet-h" data-testid="sheet">
  {#if m}
    {@const p = phenomenonOf(m)}
    <header>
      <p class="kicker">{t('sheet.heading')} · {t(`domain.${p.domain}`)}</p>
      <h2 id="sheet-h">{p.label[lang]}</h2>
      <button type="button" class="close" onclick={close} aria-label={t('sheet.close')}>×</button>
    </header>
    {#if p.description}<p>{p.description[lang]}</p>{/if}
    <dl>
      <dt>{t('sheet.value')}</dt>
      <dd data-testid="sheet-value">{formatValue(m.value, m.unit, lang)}</dd>
      {#if m.low !== null || m.high !== null}
        <dt>{t('sheet.interval')}</dt>
        <dd data-testid="sheet-interval">{#if m.low !== null && m.high !== null}{formatValue(m.low, m.unit, lang)} – {formatValue(m.high, m.unit, lang)}{:else if m.low !== null}≥ {formatValue(m.low, m.unit, lang)}{:else if m.high !== null}≤ {formatValue(m.high, m.unit, lang)}{/if}</dd>
      {/if}
      {#if sub}
        <dt>{t('sheet.subjective', { f: formatFrequency(app.s.frequencyHz, lang) })}</dt>
        <dd>
          <strong>{formatCalendar(sub.subjectiveSeconds, lang)}</strong>
          <span class="help">{t('sheet.cycles', { n: formatNumber(sub.referenceUnits, lang, 6) })}</span>
        </dd>
        {#if level === 'explore'}
          <dd class="analogy">{t('sheet.analogy', { t: formatCalendar(sub.subjectiveSeconds, lang) })}</dd>
        {/if}
      {/if}
      <dt>{t('sheet.conditions')}</dt><dd>{m.conditions[lang]}</dd>
      {#if m.configuration}<dt>{t('sheet.configuration')}</dt><dd>{m.configuration}</dd>{/if}
      <dt>{t('sheet.provenance')}</dt><dd>{t(`prov.${m.provenanceType}`)} · {t('sheet.verification')} : {t(`ver.${m.verificationStatus}`)}</dd>
      {#if m.provenanceType === 'conventional' || m.provenanceType === 'illustrative'}
        <dd class="flag" data-testid="sheet-flag">{t(m.provenanceType === 'conventional' ? 'sheet.conventionalNote' : 'sheet.illustrativeNote')}</dd>
      {/if}
      {#if m.era !== null}<dt>{t('sheet.era')}</dt><dd>{m.era}</dd>{/if}
      {#if level !== 'explore'}
        <dt>{t('sheet.si')}</dt>
        <dd class="mono">{m.quantityKind === 'duration' ? formatPhysicalDuration(m.valueSI, lang) + ' · ' : ''}{m.valueSI.toExponential(6)} {BASE_UNIT[m.quantityKind]}</dd>
        {#if m.calculation}<dt>{t('sheet.calculation')}</dt><dd class="mono">{m.calculation.formula}</dd>{/if}
      {/if}
      {#if level === 'scientific'}
        <dt>{t('sheet.protocol')}</dt><dd data-testid="sheet-protocol">{#if m.protocol}{#if lang === 'fr'}<span class="help">{t('sheet.notesLang')}</span> {/if}<span lang="en">{m.protocol}</span>{:else}{t('sheet.protocolNone')}{/if}</dd>
        <dt>{t('sheet.uncertainty')}</dt>
        <dd data-testid="sheet-uncertainty">
          {#if m.uncertainty}
            {@const u = m.uncertainty}
            {#if u.type === 'confidence-interval'}{formatValue(u.low!, m.unit, lang)} – {formatValue(u.high!, m.unit, lang)} ({t('unc.confidence-interval', { level: formatLevel(u.level!, lang) })}){:else}± {formatValue(u.value!, m.unit, lang)} ({t(`unc.${u.type}`)}){/if}{#if u.sampleCount !== null}<span class="unc">· {t('unc.n', { n: u.sampleCount })}</span>{/if}
            <span class="help block">{#if u.statement !== null}{t('unc.statement')}{#if lang === 'fr'} {t('sheet.sourceLang')}{/if} <span lang="en">{u.statement}</span>{:else}{t('sheet.excerptWithheldShort')}{/if} — <span lang="en">{u.locator}</span></span>
          {:else if m.provenanceType === 'calculated'}{t('unc.notPropagated')}{:else}{t('sheet.uncertaintyUnknown')}{/if}
        </dd>
        {#if m.statistics}
          <dt>{t('stats.label')}</dt>
          <dd data-testid="sheet-statistics">
            {m.statistics.quantiles.map((q) => `P${formatLevel(q.p, lang)} ${formatValue(q.value, m.unit, lang)}`).join(' · ')}
            · {m.statistics.sampleCount !== null ? t('unc.n', { n: m.statistics.sampleCount }) : t('stats.nUnknown')}
            <span class="help block">{t('stats.method')} :{#if lang === 'fr'} {t('sheet.notesLang')}{/if} <span lang="en">{m.statistics.method}</span>{#if m.statistics.sampleCountNote} — <span lang="en">{m.statistics.sampleCountNote}</span>{/if}</span>
          </dd>
        {/if}
        {#if m.quote}<dt>{t('sheet.quote')}</dt><dd><blockquote lang="en">{m.quote}</blockquote></dd>
        {:else if m.excerpt?.status === 'withheld'}<dt>{t('sheet.quote')}</dt><dd data-testid="sheet-excerpt-withheld">{t('sheet.excerptWithheld')}</dd>{/if}
        <dt>{t('sheet.raw')}</dt><dd class="mono">{m.rawRef}</dd>
        {#if m.notes}<dt>{t('sheet.notes')}</dt><dd>{#if lang === 'fr'}<span class="help">{t('sheet.notesLang')}</span> {/if}<span lang="en">{m.notes}</span></dd>{/if}
      {/if}
    </dl>
    <h3>{t('sheet.source')}</h3>
    {#each m.sourceIds as sid (sid)}
      {@const s = sourceById.get(sid)}
      {#if s}
        <div class="source" data-testid="sheet-source">
          <p><cite>{s.title}</cite>{s.author ? ` — ${s.author}` : ''} · {s.publisher}{s.publishedDate ? ` · ${s.publishedDate}` : ''}{s.version ? ` · ${s.version}` : ''}</p>
          <p>{t('sheet.locator')} : <span lang="en">{m.locator}</span></p>
          <p>{t('sheet.accessed')} {s.accessedAt} · {t('sheet.license')} : {s.license}</p>
          <p><a href={s.url} rel="noopener noreferrer" target="_blank">{t('sheet.link')}</a>{s.doi ? ` · DOI ${s.doi}` : ''}</p>
        </div>
      {/if}
    {/each}
  {/if}
</dialog>
