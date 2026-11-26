<script lang="ts">
  import { app } from '../lib/app.svelte';
  import type { MessageKey } from '../lib/i18n';
  let { version, space }: { version: string; space: string } = $props();
</script>

<section aria-labelledby="unavail-h" data-testid="unavailable">
  <h1 id="unavail-h">{app.t(`nav.${space}` as MessageKey)}</h1>
  <div class="notice" role="note">
    <h2>{app.t('unavailable.heading')}</h2>
    <p>{app.t('unavailable.body', { version })}</p>
  </div>
</section>
