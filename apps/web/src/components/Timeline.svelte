<script lang="ts">
  import { scaleLog } from 'd3-scale';
  import { DOMAINS, type Domain, type NormalizedMeasurement, type ProvenanceType } from '@chronosilicon/ontology';
  import { clockedObserver, toSubjective } from '@chronosilicon/observers';
  import { app } from '../lib/app.svelte';
  import { corpus, phenomenonOf } from '../lib/corpus';
  import { PROVENANCES } from '../lib/url-state';
  import { formatCalendar, formatCalendarShort, formatLevel, formatPhysicalDuration, formatValue } from '../lib/format';
  import ObserverControl from './ObserverControl.svelte';
  import ExportPanel from './ExportPanel.svelte';

  const t = app.t;
  const lang = $derived(app.s.lang);
  const observer = $derived(clockedObserver(app.s.frequencyHz));

  const presentDomains: Domain[] = DOMAINS.filter((d) => corpus.measurements.some((m) => phenomenonOf(m).domain === d));
  const presentProv: ProvenanceType[] = PROVENANCES.filter((p) => corpus.measurements.some((m) => m.provenanceType === p));

  const activeDomains = $derived(app.s.domains ?? presentDomains);
  const activeProv = $derived(app.s.provenance ?? presentProv);

  const filtered = $derived(
    corpus.measurements.filter((m) => activeDomains.includes(phenomenonOf(m).domain) && activeProv.includes(m.provenanceType)),
  );
  const durations = $derived(filtered.filter((m) => m.quantityKind === 'duration').sort((a, b) => a.valueSI - b.valueSI));
  const positive = $derived(durations.filter((m) => m.valueSI > 0));
  const zeros = $derived(durations.filter((m) => m.valueSI === 0));
  const cycles = $derived(filtered.filter((m) => m.quantityKind === 'cycle_count'));
  const others = $derived(filtered.filter((m) => m.quantityKind !== 'duration' && m.quantityKind !== 'cycle_count'));

  /** Value on the active axis (physical s or subjective s). */
  const axisValue = (seconds: number) =>
    app.s.axis === 'physical' ? seconds : toSubjective(seconds, observer).subjectiveSeconds;
  const subj = (seconds: number) => toSubjective(seconds, observer).subjectiveSeconds;

  const scale = $derived.by(() => {
    const vals = positive.flatMap((m) => [m.lowSI && m.lowSI > 0 ? m.lowSI : m.valueSI, m.highSI ?? m.valueSI]).map(axisValue);
    const lo = vals.length ? Math.min(...vals) : 1e-9;
    const hi = vals.length ? Math.max(...vals) : 1;
    const d0 = 10 ** Math.floor(Math.log10(lo));
    const d1 = 10 ** Math.ceil(Math.log10(hi === lo ? hi * 10 : hi));
    return scaleLog().domain([d0, d1]).range([0, 100]);
  });
  /** Real decade ticks, recomputed when the reference frame changes. */
  const tickStep = $derived.by(() => {
    const [d0, d1] = scale.domain() as [number, number];
    return Math.max(1, Math.ceil((Math.log10(d1) - Math.log10(d0)) / 10));
  });
  const ticks = $derived.by(() => {
    const [d0, d1] = scale.domain() as [number, number];
    const out: number[] = [];
    for (let e = Math.round(Math.log10(d0)); e <= Math.round(Math.log10(d1)); e += tickStep) out.push(10 ** e);
    return out;
  });
  const tickFactor = $derived(new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-GB').format(10 ** tickStep));
  const tickLabel = (v: number) => (app.s.axis === 'physical' ? formatPhysicalDuration(v, lang) : formatCalendarShort(v, lang));
  /** '≤' / '≥' when the source gives only one bound (review m-3). */
  const boundPrefix = (m: NormalizedMeasurement) => (m.high !== null && m.low === null && m.high === m.value ? '≤ ' : m.low !== null && m.high === null && m.low === m.value ? '≥ ' : '');
  const fmtAxis = (seconds: number) => {
    const v = axisValue(seconds);
    return app.s.axis === 'physical' ? formatPhysicalDuration(v, lang) : formatCalendar(v, lang);
  };

  function toggle<T extends string>(list: readonly T[], all: readonly T[], item: T): T[] | null {
    const next = list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
    return next.length === all.length ? null : all.filter((x) => next.includes(x));
  }
  const open = (m: NormalizedMeasurement) => app.set({ selected: m.id }, true);
  const label = (m: NormalizedMeasurement) => phenomenonOf(m).label[lang];
  const domainName = (m: NormalizedMeasurement) => t(`domain.${phenomenonOf(m).domain}`);
  /** Dispersion always shown WITH its type (review of uncertainty, M1). */
  const uncText = (m: NormalizedMeasurement) => {
    const u = m.uncertainty!;
    return u.type === 'confidence-interval'
      ? `[${formatValue(u.low!, m.unit, lang)} – ${formatValue(u.high!, m.unit, lang)}] (${t('unc.short.confidence-interval', { level: formatLevel(u.level!, lang) })})`
      : `± ${formatValue(u.value!, m.unit, lang)} (${t(`unc.short.${u.type}`)})`;
  };
  /** Extra details for assistive tech, appended after the visible text (WCAG 2.5.3). */
  const rowDetails = (m: NormalizedMeasurement) =>
    `; ${t('axis.physical')} ${formatPhysicalDuration(m.valueSI, lang)}${m.uncertainty ? ` ${uncText(m)}` : ''} ; ${t('axis.subjective')} ${formatCalendar(subj(m.valueSI), lang)}`;
</script>

<section aria-labelledby="tl-h" data-testid="timeline">
  <h1 id="tl-h">{t('timeline.heading')}</h1>
  <p>{t('timeline.intro')}</p>

  <div class="toolbar">
    <ObserverControl />
    <fieldset class="seg">
      <legend>{t('axis.label')}</legend>
      {#each ['subjective', 'physical'] as const as a (a)}
        <label><input type="radio" name="axis" value={a} checked={app.s.axis === a} onchange={() => app.set({ axis: a })} /> {t(`axis.${a}`)}</label>
      {/each}
    </fieldset>
    <fieldset class="seg">
      <legend>{t('view.label')}</legend>
      {#each ['chart', 'table'] as const as v (v)}
        <label><input type="radio" name="view" value={v} checked={app.s.view === v} onchange={() => app.set({ view: v })} data-testid={`view-${v}`} /> {t(`view.${v}`)}</label>
      {/each}
    </fieldset>
  </div>

  <details class="filters">
    <summary>{t('filter.domains')} · {t('filter.provenance')}</summary>
    <fieldset>
      <legend>{t('filter.domains')}</legend>
      <button type="button" class="link" onclick={() => app.set({ domains: null })}>{t('filter.all')}</button>
      <button type="button" class="link" onclick={() => app.set({ domains: [] })}>{t('filter.none')}</button>
      <div class="chips">
        {#each presentDomains as d (d)}
          <label class="chip dom-{d}">
            <input type="checkbox" checked={activeDomains.includes(d)} onchange={() => app.set({ domains: toggle(activeDomains, presentDomains, d) })} data-testid={`domain-${d}`} />
            {t(`domain.${d}`)}
          </label>
        {/each}
      </div>
    </fieldset>
    <fieldset>
      <legend>{t('filter.provenance')}</legend>
      <div class="chips">
        {#each presentProv as p (p)}
          <label class="chip">
            <input type="checkbox" checked={activeProv.includes(p)} onchange={() => app.set({ provenance: toggle(activeProv, presentProv, p) })} />
            {t(`prov.${p}`)}
          </label>
        {/each}
      </div>
    </fieldset>
  </details>

  <p class="count" aria-live="polite" data-testid="count">{t('filter.count', { n: filtered.length, total: corpus.measurements.length })}</p>

  {#if filtered.length === 0}
    <p class="notice">{t('filter.empty')}</p>
  {/if}

  {#if positive.length > 0}
    {#if app.s.view === 'chart'}
      <figure class="chart" aria-describedby="axis-cap">
        <div class="axis" aria-hidden="true">
          {#each ticks as tk (tk)}
            <span class="tick" style:left="{scale(tk)}%">{tickLabel(tk)}</span>
          {/each}
        </div>
        <ol class="rows" data-testid="chart-rows">
          {#each positive as m (m.id)}
            <li>
              <button type="button" class="row dom-{phenomenonOf(m).domain}" onclick={() => open(m)} data-id={m.id}>
                <span class="row-label">
                  <span class="lbl">{label(m)}</span>
                  <span class="meta">{domainName(m)} · {t(`prov.${m.provenanceType}`)}</span>
                </span>
                <span class="track">
                  {#each ticks as tk (tk)}<span class="grid" style:left="{scale(tk)}%"></span>{/each}
                  {#if m.lowSI !== null && m.highSI !== null && m.lowSI > 0}
                    <span class="interval" style:left="{scale(axisValue(m.lowSI))}%" style:width="{Math.max(0.5, scale(axisValue(m.highSI)) - scale(axisValue(m.lowSI)))}%" title={t('timeline.interval', { low: fmtAxis(m.lowSI), high: fmtAxis(m.highSI) })}></span>
                  {/if}
                  <span class="dot prov-{m.provenanceType}" style:left="{scale(axisValue(m.valueSI))}%"></span>
                  <span class="val" style:left="{Math.min(scale(axisValue(m.valueSI)), 70)}%">{boundPrefix(m)}{fmtAxis(m.valueSI)}</span>
                </span>
                <span class="sr-only">{rowDetails(m)}</span>
              </button>
            </li>
          {/each}
        </ol>
        <figcaption id="axis-cap">{t('axis.caption', { factor: tickFactor })} {t(`axis.${app.s.axis}`)}.</figcaption>
      </figure>
    {:else}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div class="table-wrap" tabindex="0" role="region" aria-label={t('view.table')}>
        <table data-testid="duration-table">
          <caption>{t('timeline.heading')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('col.phenomenon')}</th><th scope="col">{t('col.value')}</th><th scope="col">{t('col.physical')}</th>
              <th scope="col">{t('col.subjective')}</th><th scope="col">{t('col.domain')}</th><th scope="col">{t('col.provenance')}</th>
            </tr>
          </thead>
          <tbody>
            {#each positive as m (m.id)}
              <tr>
                <th scope="row"><button type="button" class="link" onclick={() => open(m)}>{label(m)}</button></th>
                <td>{formatValue(m.value, m.unit, lang)}{#if m.uncertainty}<span class="unc" data-testid="table-uncertainty">{uncText(m)}</span>{/if}{#if m.low !== null && m.high !== null} ({formatValue(m.low, m.unit, lang)} – {formatValue(m.high, m.unit, lang)}){/if}</td>
                <td>{formatPhysicalDuration(m.valueSI, lang)}</td>
                <td>{formatCalendar(subj(m.valueSI), lang)}</td>
                <td>{domainName(m)}</td>
                <td>{t(`prov.${m.provenanceType}`)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}

  {#if zeros.length > 0}
    <h2>{t('timeline.zero')}</h2>
    <ul>{#each zeros as m (m.id)}<li><button type="button" class="link" onclick={() => open(m)}>{label(m)}</button></li>{/each}</ul>
  {/if}

  {#if cycles.length > 0}
    <h2>{t('cycles.heading')}</h2>
    <p>{t('cycles.intro')}</p>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class="table-wrap" tabindex="0" role="region" aria-label={t('view.table')}>
      <table data-testid="cycles-table">
        <thead><tr><th scope="col">{t('col.phenomenon')}</th><th scope="col">{t('col.value')}</th><th scope="col">{t('col.configuration')}</th><th scope="col">{t('col.provenance')}</th></tr></thead>
        <tbody>
          {#each cycles as m (m.id)}
            <tr>
              <th scope="row"><button type="button" class="link" onclick={() => open(m)}>{label(m)}</button></th>
              <td>{formatValue(m.value, m.unit, lang)}</td><td>{m.configuration ?? '—'}</td><td>{t(`prov.${m.provenanceType}`)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  {#if others.length > 0}
    <h2>{t('other.heading')}</h2>
    <p>{t('other.intro')}</p>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class="table-wrap" tabindex="0" role="region" aria-label={t('view.table')}>
      <table data-testid="other-table">
        <thead><tr><th scope="col">{t('col.phenomenon')}</th><th scope="col">{t('col.value')}</th><th scope="col">{t('col.domain')}</th><th scope="col">{t('col.provenance')}</th></tr></thead>
        <tbody>
          {#each others as m (m.id)}
            <tr>
              <th scope="row"><button type="button" class="link" onclick={() => open(m)}>{label(m)}</button></th>
              <td>{formatValue(m.value, m.unit, lang)}</td><td>{domainName(m)}</td><td>{t(`prov.${m.provenanceType}`)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  <ExportPanel measurements={filtered} />
</section>
