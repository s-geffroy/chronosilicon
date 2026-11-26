<script lang="ts">
  import { app } from '../lib/app.svelte';
  import { corpus, measurementById, phenomenonOf } from '../lib/corpus';
  import { clockedObserver, toSubjective } from '@chronosilicon/observers';
  import { fsToSeconds, serializeResult, SIMULATOR_MODEL_VERSION } from '@chronosilicon/simulator';
  import { formatCalendar, formatFrequency, formatNumber, formatPhysicalDuration } from '../lib/format';
  import { runScenario, SCENARIO_SEED } from '../lib/scenarios';
  import { download } from '../lib/export';

  const t = app.t;
  const lang = $derived(app.s.lang);
  const scenarios = corpus.scenarios;
  const def = $derived(scenarios.find((s) => s.id === app.s.scenario) ?? scenarios[0]!);
  const firstRes = $derived(def.resources[0] ?? null);
  const capacity = $derived(firstRes ? (app.s.capacity ?? firstRes.capacity) : null);
  const run = $derived(runScenario(def, firstRes && capacity !== null ? { [firstRes.id]: capacity } : {}));
  const obs = $derived(clockedObserver(app.s.frequencyHz));
  const taskLabel = (taskId: string) => {
    const tk = def.tasks.find((x) => x.id === taskId)!;
    return `${taskId} — ${phenomenonOf(measurementById.get(tk.measurementId)!).label[lang]}`;
  };
  const pct = (fs: bigint) => (run.result.makespan > 0n ? (Number(fs) / Number(run.result.makespan)) * 100 : 0);
  const dur = (fs: bigint) => formatPhysicalDuration(fsToSeconds(fs), lang);
  const pickScenario = (id: string) => app.set({ scenario: id, capacity: null });
  // Render the (long) event log only when opened: a closed <details> must not keep a hit-testable box.
  let eventsOpen = $state(false);
</script>

<section aria-labelledby="sim-h" data-testid="simulation">
  <h1 id="sim-h">{t('sim.heading')}</h1>
  <p>{t('sim.intro')}</p>
  <label class="block">{t('sim.select')}
    <select value={def.id} onchange={(e) => pickScenario(e.currentTarget.value)} data-testid="sim-select">
      {#each scenarios as s (s.id)}<option value={s.id}>{s.label[lang]}</option>{/each}
    </select>
  </label>
  <p>{def.description[lang]}</p>
  <div class="notice" role="note" data-testid="sim-excluded"><strong>{t('sim.excluded')} :</strong> {def.excluded[lang]}</div>

  {#if firstRes && capacity !== null}
    <label class="block">{t('sim.capacity', { r: firstRes.id })}
      <input type="number" min="1" max="64" step="1" value={capacity} data-testid="sim-capacity"
        onchange={(e) => {
          const v = Number(e.currentTarget.value);
          if (Number.isInteger(v) && v >= 1 && v <= 64) app.set({ capacity: v });
          else e.currentTarget.value = String(capacity); // never display a value that is not used
        }} />
      <span class="help">{firstRes.capacityAssumption[lang]}</span>
    </label>
  {/if}

  <dl class="result" data-testid="sim-result">
    <dt>{t('sim.makespan')}</dt>
    <dd><strong data-testid="sim-makespan">{formatPhysicalDuration(run.makespanSeconds, lang)}</strong>
      · {formatCalendar(toSubjective(run.makespanSeconds, obs).subjectiveSeconds, lang)} ({formatFrequency(app.s.frequencyHz, lang)})</dd>
    <dt>{t('sim.sum')}</dt><dd data-testid="sim-sum">{formatPhysicalDuration(run.sumSeconds, lang)}</dd>
    <dt>{t('sim.overlap')}</dt><dd><span data-testid="sim-overlap">{formatNumber(run.overlapShare * 100, lang, 3)} %</span>
      {#if firstRes}<span class="help block">{t('sim.overlapAssumption')}</span>{/if}</dd>
    <dt>{t('sim.critical')}</dt><dd data-testid="sim-critical">{run.result.criticalPath.join(' → ')}</dd>
    <dt>{t('sim.seed')}</dt><dd class="mono">{t('sim.seedValue', { seed: SCENARIO_SEED, model: SIMULATOR_MODEL_VERSION })}</dd>
  </dl>

  <h2>{t('sim.gantt')}</h2>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div class="table-wrap" tabindex="0" role="region" aria-label={t('view.table')}>
    <table class="gantt" data-testid="sim-gantt">
      <thead><tr><th scope="col">{t('sim.task')}</th><th scope="col">{t('sim.start')}</th><th scope="col">{t('sim.end')}</th><th scope="col"><span class="sr-only">{t('sim.gantt')}</span></th></tr></thead>
      <tbody>
        {#each def.tasks as tk (tk.id)}
          {@const r = run.result.tasks.get(tk.id)!}
          <tr class:critical={run.result.criticalPath.includes(tk.id)}>
            <th scope="row">{taskLabel(tk.id)}{#if run.result.criticalPath.includes(tk.id)} <span class="badge">{t('sim.critical')}</span>{/if}</th>
            <td>{r.start !== null ? dur(r.start) : '—'}</td>
            <td>{r.end !== null ? dur(r.end) : '—'}</td>
            <td class="gantt-track" aria-hidden="true">
              {#if r.ready !== null && r.start !== null && r.start > r.ready}
                <span class="gantt-wait" style:left="{pct(r.ready)}%" style:width="{pct(r.start - r.ready)}%" title={t('sim.wait')}></span>
              {/if}
              {#if r.start !== null && r.end !== null}
                <span class="gantt-bar" style:left="{pct(r.start)}%" style:width="{Math.min(100 - pct(r.start), Math.max(0.5, pct(r.end - r.start)))}%"></span>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  {#if run.result.resources.length}
    <h2>{t('sim.resources')}</h2>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class="table-wrap" tabindex="0" role="region" aria-label={t('view.table')}>
      <table data-testid="sim-resources">
        <thead><tr><th scope="col">id</th><th scope="col">{t('sim.busy')}</th><th scope="col">{t('sim.utilization')}</th><th scope="col">{t('sim.maxConcurrent')}</th></tr></thead>
        <tbody>
          {#each run.result.resources as u (u.id)}
            <tr><th scope="row">{u.id}</th><td>{dur(u.busy)}</td>
              <td>{formatNumber(run.result.makespan > 0n ? (Number(u.busy) / (u.capacity * Number(run.result.makespan))) * 100 : 0, lang, 3)} %</td>
              <td>{u.maxConcurrent} / {u.capacity}</td></tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  <details ontoggle={(e) => (eventsOpen = e.currentTarget.open)}>
    <summary>{t('sim.events')} ({run.result.events.length})</summary>
    {#if eventsOpen}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class="table-wrap" tabindex="0" role="region" aria-label={t('view.table')}>
      <table data-testid="sim-events">
        <thead><tr><th scope="col">{t('sim.time')}</th><th scope="col">{t('sim.kind')}</th><th scope="col">{t('sim.task')}</th></tr></thead>
        <tbody>
          {#each run.result.events as e (e.seq)}
            <tr><td>{dur(e.time)}</td><td>{t(`sim.event.${e.kind}`)}</td><td>{e.taskId}</td></tr>
          {/each}
        </tbody>
      </table>
    </div>
    {/if}
  </details>
  <p><button type="button" data-testid="sim-export" onclick={() => download(`chronosilicon-${def.id}.json`, JSON.stringify({ corpusVersion: corpus.corpusVersion, scenario: def, capacity, result: JSON.parse(serializeResult(run.result)) }, null, 2), 'application/json')}>{t('sim.export')}</button></p>
</section>
