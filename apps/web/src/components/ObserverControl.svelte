<script lang="ts">
  import { app } from '../lib/app.svelte';
  import { PEDAGOGICAL_FREQUENCY_HZ } from '@chronosilicon/observers';
  const t = app.t;
  let ghz = $state(String(app.s.frequencyHz / 1e9));
  let invalid = $state(false);
  $effect(() => {
    // keep the field in sync when the URL changes elsewhere
    const current = app.s.frequencyHz / 1e9;
    if (Number(ghz.replace(',', '.')) !== current) ghz = String(current);
  });
  function commit(v: string) {
    ghz = v;
    const x = Number(v.replace(',', '.'));
    invalid = !(Number.isFinite(x) && x > 0 && x <= 1e6);
    if (!invalid) app.set({ frequencyHz: x * 1e9 });
  }
</script>

<div class="observer">
  <label for="freq">{t('observer.label')} (GHz)</label>
  <input id="freq" type="text" inputmode="decimal" value={ghz} oninput={(e) => commit(e.currentTarget.value)}
    aria-invalid={invalid} aria-describedby="freq-help{invalid ? ' freq-err' : ''}" data-testid="frequency" size="8" />
  <button type="button" class="link" onclick={() => commit(String(PEDAGOGICAL_FREQUENCY_HZ / 1e9))}>{t('observer.reset')}</button>
  <p id="freq-help" class="help">{t('observer.help')}</p>
  {#if invalid}<p id="freq-err" class="error" role="alert">{t('observer.invalid')}</p>{/if}
</div>
