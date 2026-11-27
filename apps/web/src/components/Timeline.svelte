<script lang="ts">
  import { DOMAINS, UNIVERSES, UNIVERSE_OF, type Domain, type NormalizedMeasurement, type ProvenanceType, type Universe } from '@chronosilicon/ontology';
  import { clockedObserver, toSubjective } from '@chronosilicon/observers';
  import { app } from '../lib/app.svelte';
  import { corpus, phenomenonOf } from '../lib/corpus';
  import { PROVENANCES } from '../lib/url-state';
  import { formatCalendar, formatDecade, formatDecadeSubjective, formatFrequency, pow10, formatLevel, formatPhysicalDuration, formatValue } from '../lib/format';
  import ObserverControl from './ObserverControl.svelte';
  import ExportPanel from './ExportPanel.svelte';
  import CrossComparisons from './CrossComparisons.svelte';
  import { BANDS, WINDOW, axisWindow, bandOf, bandWindow, clampZoom, decades, labelStep, position } from '../lib/timescale';

  const t = app.t;
  const lang = $derived(app.s.lang);
  const observer = $derived(clockedObserver(app.s.frequencyHz));

  const presentDomains: Domain[] = DOMAINS.filter((d) => corpus.measurements.some((m) => phenomenonOf(m).domain === d));
  // ADR-0012 / R1 v2.1: twelve universes; a phenomenon may belong to several (editorial projection), the first is its colour.
  const universesOfM = (m: NormalizedMeasurement): readonly Universe[] => phenomenonOf(m).universes ?? [UNIVERSE_OF[phenomenonOf(m).domain]];
  const universeOf = (m: NormalizedMeasurement) => universesOfM(m)[0]!;
  const presentUniverses: Universe[] = UNIVERSES.filter((u) => corpus.measurements.some((m) => universesOfM(m).includes(u)));
  const presentProv: ProvenanceType[] = PROVENANCES.filter((p) => corpus.measurements.some((m) => m.provenanceType === p));

  const activeDomains = $derived(app.s.domains ?? presentDomains);
  const activeProv = $derived(app.s.provenance ?? presentProv);
  const activeUniverses = $derived(app.s.universes ?? presentUniverses);
  /** Accent- and case-insensitive search on both languages. */
  const fold = (x: string) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const query = $derived(fold(app.s.query));

  const filtered = $derived(
    corpus.measurements.filter((m) =>
      activeDomains.includes(phenomenonOf(m).domain) && activeProv.includes(m.provenanceType)
      && universesOfM(m).some((u) => activeUniverses.includes(u))
      && (!query || fold(`${phenomenonOf(m).label.fr} ${phenomenonOf(m).label.en}`).includes(query))),
  );
  const durations = $derived(filtered.filter((m) => m.quantityKind === 'duration').sort((a, b) => a.valueSI - b.valueSI));
  const positive = $derived(durations.filter((m) => m.valueSI > 0));

  // Universal window [-18, 18] decades, extended by any qualified duration (never drops one).
  const win = axisWindow(corpus.measurements.filter((m) => m.quantityKind === 'duration').flatMap((m) => [m.valueSI, m.lowSI ?? 0, m.highSI ?? 0]));
  // Default view: the readable [-18, 18] window; the extended window (e.g. Planck time) stays one click away.
  const home = clampZoom([Math.max(win[0], WINDOW[0]), Math.min(win[1], WINDOW[1])], win);
  const extended = win[0] < home[0] || win[1] > home[1];
  const zoom = $derived(app.s.zoom ? clampZoom(app.s.zoom, win) : home);
  const inZoom = (sec: number) => sec >= 10 ** zoom[0] && sec <= 10 ** zoom[1];
  const shown = $derived(positive.filter((m) => inZoom(m.valueSI)));
  const pos = (sec: number) => position(sec, zoom);
  const decs = $derived(decades(zoom));
  const step = $derived(labelStep(zoom));
  const lf = $derived(Math.log10(app.s.frequencyHz));
  const bandsShown = $derived(BANDS.map((b) => ({ ...b, a: Math.max(pos(b.lo), 0), z: b.hi === Infinity ? 100 : pos(b.hi) })).filter((b) => b.z > b.a));
  const setZoom = (z: [number, number] | null) => app.set({ zoom: z === null || (z[0] === home[0] && z[1] === home[1]) ? null : clampZoom(z, win) });
  /** From "all", a click shows only that universe; afterwards clicks add or remove. */
  const toggleUniverse = (u: Universe) => {
    if (app.s.universes === null) { app.set({ universes: [u] }); return; }
    const next = activeUniverses.includes(u) ? activeUniverses.filter((x) => x !== u) : [...activeUniverses, u];
    app.set({ universes: next.length === presentUniverses.length ? null : presentUniverses.filter((x) => next.includes(x)) });
  };
  const zeros = $derived(durations.filter((m) => m.valueSI === 0));
  const cycles = $derived(filtered.filter((m) => m.quantityKind === 'cycle_count'));
  const others = $derived(filtered.filter((m) => m.quantityKind !== 'duration' && m.quantityKind !== 'cycle_count'));

  /** Value on the active axis (physical s or subjective s). */
  const axisValue = (seconds: number) =>
    app.s.axis === 'physical' ? seconds : toSubjective(seconds, observer).subjectiveSeconds;
  const subj = (seconds: number) => toSubjective(seconds, observer).subjectiveSeconds;

  const physLabel = (e: number) => formatDecade(e, lang);
  const subjLabel = (e: number) => formatDecadeSubjective(10 ** (e + lf), lang);
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

  <CrossComparisons />

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

  <div class="universes" role="group" aria-label={t('universe.label')} data-testid="universes">
    <button type="button" class="uni-btn" aria-pressed={app.s.universes === null} onclick={() => app.set({ universes: null })}>{t('universe.all')}</button>
    {#each presentUniverses as u (u)}
      <button type="button" class="uni-btn uni-{u}" aria-pressed={app.s.universes !== null && activeUniverses.includes(u)} onclick={() => toggleUniverse(u)} data-testid={`universe-${u}`}>
        <span class="swatch" aria-hidden="true"></span>{t(`universe.${u}`)}
      </button>
    {/each}
  </div>

  <div class="tl-tools">
    <label class="search">
      <span>{t('timeline.search')}</span>
      <input type="search" value={app.s.query} oninput={(e) => app.set({ query: e.currentTarget.value.slice(0, 60) })} placeholder={t('timeline.searchHint')} data-testid="search" />
    </label>
    <fieldset class="zoom">
      <legend>{t('timeline.zoom')}</legend>
      <label>{t('timeline.zoomFrom')}
        <select value={zoom[0]} onchange={(e) => setZoom([Number(e.currentTarget.value), zoom[1]])} data-testid="zoom-from">
          {#each decades(win).slice(0, -1) as e (e)}<option value={e}>{pow10(e)} s{physLabel(e).startsWith(pow10(e)) ? '' : ` · ${physLabel(e)}`}</option>{/each}
        </select>
      </label>
      <label>{t('timeline.zoomTo')}
        <select value={zoom[1]} onchange={(e) => setZoom([zoom[0], Number(e.currentTarget.value)])} data-testid="zoom-to">
          {#each decades(win).slice(1) as e (e)}<option value={e}>{pow10(e)} s{physLabel(e).startsWith(pow10(e)) ? '' : ` · ${physLabel(e)}`}</option>{/each}
        </select>
      </label>
      <button type="button" class="link" onclick={() => setZoom(null)} disabled={app.s.zoom === null} data-testid="zoom-reset">{t('timeline.zoomReset')}</button>
      {#if extended}<button type="button" class="link" onclick={() => setZoom(win)} data-testid="zoom-extended">{t('timeline.zoomExtended', { from: physLabel(win[0]), to: physLabel(win[1]) })}</button>{/if}
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
        <div class="bands" role="group" aria-label={t('timeline.bands')} data-testid="bands">
          {#each bandsShown as b (b.id)}
            <button type="button" class="band band-{b.id}" style:left="{b.a}%" style:width="{b.z - b.a}%" title={t(`band.${b.id}`)}
              onclick={() => setZoom(bandWindow(b, win))} data-testid={`band-${b.id}`}><span>{t(`band.${b.id}`)}</span></button>
          {/each}
        </div>
        <div class="axis" aria-hidden="true">
          {#each decs as e (e)}{#if (e - zoom[0]) % step === 0}<span class="tick" style:left="{pos(10 ** e)}%">{physLabel(e)}</span>{/if}{/each}
        </div>
        <div class="axis axis-subj" aria-hidden="true">
          {#each decs as e (e)}{#if (e - zoom[0]) % step === 0}<span class="tick" style:left="{pos(10 ** e)}%">{subjLabel(e)}</span>{/if}{/each}
        </div>
        <ol class="rows" data-testid="chart-rows">
          {#each shown as m (m.id)}
            <li>
              <button type="button" class="row dom-{phenomenonOf(m).domain} uni-{universeOf(m)}" onclick={() => open(m)} data-id={m.id} data-band={bandOf(m.valueSI)}>
                <span class="row-label">
                  <span class="lbl">{label(m)}</span>
                  <span class="meta">{t(`universe.${universeOf(m)}`)} · <span class:flag={m.provenanceType === 'conventional' || m.provenanceType === 'illustrative'}>{t(`prov.${m.provenanceType}`)}</span></span>
                </span>
                <span class="track">
                  {#each decs as e (e)}<span class="grid" style:left="{pos(10 ** e)}%"></span>{/each}
                  {#if m.lowSI !== null && m.highSI !== null && m.lowSI > 0}
                    <span class="interval" style:left="{pos(m.lowSI)}%" style:width="{Math.max(0.5, pos(m.highSI) - pos(m.lowSI))}%" title={t('timeline.interval', { low: fmtAxis(m.lowSI), high: fmtAxis(m.highSI) })}></span>
                  {/if}
                  <span class="dot prov-{m.provenanceType}" style:left="{pos(m.valueSI)}%"></span>
                  <span class="val" style:left={pos(m.valueSI) <= 50 ? `${pos(m.valueSI)}%` : null} style:right={pos(m.valueSI) > 50 ? `${100 - pos(m.valueSI)}%` : null}>{boundPrefix(m)}{app.s.axis === 'physical' ? `${formatPhysicalDuration(m.valueSI, lang)} · ${formatCalendar(subj(m.valueSI), lang)}` : `${formatCalendar(subj(m.valueSI), lang)} · ${formatPhysicalDuration(m.valueSI, lang)}`}</span>
                </span>
                <span class="sr-only">{rowDetails(m)}</span>
              </button>
            </li>
          {/each}
        </ol>
        <ul class="legend" aria-label={t('legend.label')}>
          <li><span class="dot prov-documented"></span>{t('prov.documented')}</li>
          <li><span class="dot prov-measured"></span>{t('prov.measured')}</li>
          <li><span class="dot prov-calculated"></span>{t('prov.calculated')}</li>
          <li><span class="dot prov-conventional"></span>{t('prov.conventional')}</li>
          <li><span class="dot prov-illustrative"></span>{t('prov.illustrative')}</li>
          <li><span class="interval"></span>{t('legend.interval')}</li>
        </ul>
        <figcaption id="axis-cap">
          {t('timeline.caption', { from: physLabel(zoom[0]), to: physLabel(zoom[1]), f: formatFrequency(app.s.frequencyHz, lang) })}
          {#if shown.length < positive.length}<span data-testid="outside"> {t('timeline.outside', { n: positive.length - shown.length })}</span>{/if}
        </figcaption>
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
            {#each shown as m (m.id)}
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
