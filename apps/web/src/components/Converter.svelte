<script lang="ts">
  import { app } from '../lib/app.svelte';
  import { toSI } from '@chronosilicon/metrology';
  import { clockedObserver, toSubjective, fromSubjective } from '@chronosilicon/observers';
  import { formatCalendar, formatNumber, formatPhysicalDuration } from '../lib/format';
  import ObserverControl from './ObserverControl.svelte';

  const t = app.t;
  const PHYS_UNITS = ['ps', 'ns', 'µs', 'ms', 's', 'min', 'h', 'd'] as const;
  const SUBJ_UNITS = ['s', 'min', 'h', 'd', 'a'] as const;
  let direction = $state<'toSubjective' | 'toPhysical'>('toSubjective');
  let raw = $state('100');
  let unit = $state<string>('ns');

  const units = $derived(direction === 'toSubjective' ? PHYS_UNITS : SUBJ_UNITS);
  const result = $derived.by(() => {
    const x = Number(raw.replace(',', '.').replace(/\s/g, ''));
    if (!(raw.trim() !== '' && Number.isFinite(x) && x >= 0)) return null;
    const obs = clockedObserver(app.s.frequencyHz);
    try {
      if (direction === 'toSubjective') {
        const dt = toSI(x, unit, 'duration');
        const r = toSubjective(dt, obs);
        return { physical: dt, subjective: r.subjectiveSeconds, cycles: r.referenceUnits };
      }
      const subjective = toSI(x, unit, 'duration');
      const dt = fromSubjective(subjective, obs);
      return { physical: dt, subjective, cycles: toSubjective(dt, obs).referenceUnits };
    } catch {
      return null;
    }
  });
  function setDirection(d: typeof direction) {
    direction = d;
    if (!(units as readonly string[]).includes(unit)) unit = d === 'toSubjective' ? 'ns' : 'h';
  }
  const unitLabel = (u: string) => (u === 'a' ? (app.s.lang === 'fr' ? 'années (juliennes)' : 'years (Julian)') : u);
</script>

<section aria-labelledby="conv-h" data-testid="converter">
  <h1 id="conv-h">{t('converter.heading')}</h1>
  <p>{t('converter.intro')}</p>
  <ObserverControl />
  <form class="converter" onsubmit={(e) => e.preventDefault()}>
    <fieldset class="seg">
      <legend>{t('converter.direction')}</legend>
      <label><input type="radio" name="dir" checked={direction === 'toSubjective'} onchange={() => setDirection('toSubjective')} /> {t('converter.toSubjective')}</label>
      <label><input type="radio" name="dir" checked={direction === 'toPhysical'} onchange={() => setDirection('toPhysical')} data-testid="dir-physical" /> {t('converter.toPhysical')}</label>
    </fieldset>
    <div class="row-inputs">
      <label>{t('converter.value')}
        <input type="text" inputmode="decimal" bind:value={raw} data-testid="conv-value" aria-invalid={result === null} aria-describedby={result === null ? 'conv-err' : undefined} />
      </label>
      <label>{t('converter.unit')}
        <select bind:value={unit} data-testid="conv-unit">
          {#each units as u (u)}<option value={u}>{unitLabel(u)}</option>{/each}
        </select>
      </label>
    </div>
  </form>
  <div aria-live="polite" class="result" data-testid="conv-result">
    {#if result}
      <dl>
        <dt>{t('converter.physical')}</dt><dd>{formatPhysicalDuration(result.physical, app.s.lang)}</dd>
        <dt>{t('converter.cycles')}</dt><dd>{formatNumber(result.cycles, app.s.lang, 6)}</dd>
        <dt>{t('converter.subjective')}</dt>
        <dd><strong data-testid="conv-subjective">{formatCalendar(result.subjective, app.s.lang)}</strong>
          <span class="help">({formatNumber(result.subjective, app.s.lang, 6)} {t('unit.subjective')})</span></dd>
      </dl>
    {:else}
      <p id="conv-err" class="error">{t('converter.invalid')}</p>
    {/if}
  </div>
  <p class="help">{t('converter.note')}</p>
</section>
