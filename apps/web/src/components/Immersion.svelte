<script lang="ts">
  import { app } from '../lib/app.svelte';
  import { corpus, measurementById, phenomenonOf } from '../lib/corpus';
  import { clockedObserver } from '@chronosilicon/observers';
  import { formatCalendar, formatFrequency, formatPhysicalDuration } from '../lib/format';
  import { runScenario } from '../lib/scenarios';
  import { narrate } from '../lib/narrative';

  const t = app.t;
  const lang = $derived(app.s.lang);
  const scenarios = corpus.scenarios;
  const def = $derived(scenarios.find((s) => s.id === app.s.scenario) ?? scenarios[0]!);
  const firstRes = $derived(def.resources[0] ?? null);
  const capacity = $derived(firstRes ? (app.s.capacity ?? firstRes.capacity) : null);
  const run = $derived(runScenario(def, firstRes && capacity !== null ? { [firstRes.id]: capacity } : {}));
  const label = (taskId: string) => {
    const tk = def.tasks.find((x) => x.id === taskId)!;
    return `${taskId} (${phenomenonOf(measurementById.get(tk.measurementId)!).label[lang]})`;
  };
  const lines = $derived(narrate(run.result, clockedObserver(app.s.frequencyHz), lang, label));
</script>

<section aria-labelledby="imm-h" data-testid="immersion">
  <h1 id="imm-h">{t('imm.heading')}</h1>
  <p class="notice" role="note">{t('imm.intro', { f: formatFrequency(app.s.frequencyHz, lang) })}</p>
  <label class="block">{t('sim.select')}
    <select value={def.id} onchange={(e) => app.set({ scenario: e.currentTarget.value, capacity: null })} data-testid="imm-select">
      {#each scenarios as s (s.id)}<option value={s.id}>{s.label[lang]}</option>{/each}
    </select>
  </label>
  <p class="help"><strong>{t('sim.excluded')} :</strong> {def.excluded[lang]}</p>
  <h2>{t('imm.entry')}</h2>
  <ol class="journal" data-testid="journal">
    {#each lines as l, i (i)}
      <li class="j-{l.kind}">
        <span class="j-when">{formatCalendar(l.subjective, lang)}<span class="help"> · {t('imm.real')} {formatPhysicalDuration(l.physical, lang)}</span></span>
        <span class="j-text">{l.text}</span>
      </li>
    {/each}
  </ol>
  <p><a href={app.href({ route: 'simulation' })}>{t('imm.toSim')}</a></p>
</section>
