# Inventaire des tests (AUDIT-01)

Généré depuis `npx vitest list --json` et `npx playwright test --list`, exécutés dans le conteneur outil au commit de référence (voir BASELINE.md). Les comptes ci-dessous sont des **déclarations de tests**. Les résultats d'exécution sont dans `docs/reports/logs/final-review/` : porte jouée sur `715051a`, dont le code est identique à celui de la référence. Ce sont des tests écrits et exécutés par le mainteneur : **validation interne, pas une validation indépendante**.

## Synthèse

- Tests unitaires et d'intégration (Vitest) : **133** entrées listées dans 17 fichiers. Les tests paramétrés (`it.each`, boucles) apparaissent avec leur gabarit de nom ; à l'exécution, Vitest en compte **212** (`docs/reports/logs/final-review/test.log`).
- Tests fonctionnels de bout en bout (Playwright) : **24** scénarios × 4 projets navigateur (desktop-chromium 24, desktop-firefox 24, mobile-webkit 24, mobile-chromium 24) = **96** exécutions (`tests/e2e/site.spec.ts`, configuration `playwright.config.ts`). Le contrôle d'accessibilité automatique (axe-core) en fait partie.
- Contrôles hors tests, bloquants dans la CI : `eslint`, `tsc` + `svelte-check`, `validate:data` (schémas JSON + invariants), build déterministe.

## Tests Vitest par fichier

### `tests/calculated-values.test.ts` (2)

- l.55 — calculated values are reproducible from their inputs > every calculated value has an oracle
- l.59 — calculated values are reproducible from their inputs > ${m.phenomenonId}

### `tests/contribute-check.test.ts` (4)

- l.12 — contribute:check (G5: contribution quality) > strict mode rejects null quote, meaningless locator, host-less URL, unit/kind mismatch, measured without protocol, empty calculation
- l.26 — contribute:check (G5: contribution quality) > accepts a complete extraction
- l.27 — contribute:check (G5: contribution quality) > rejects missing locator, unknown unit, unknown source, illustrative values
- l.37 — contribute:check (G5: contribution quality) > rejects calculated values without calculation, and over-long quotes

### `tests/curation-report.test.ts` (1)

- l.5 — curation report > has no unresolved bound warning (every bound wording is encoded or explicitly checked)

### `tests/curation.test.ts` (3)

- l.16 — verifier fixes reach the curated data > confidenceNotes fixes are applied (unless a decision overrides them)
- l.22 — verifier fixes reach the curated data > protocol fixes are applied (unless a decision overrides them)
- l.28 — verifier fixes reach the curated data > decision notes patches are applied

### `tests/data-pipeline.test.ts` (18)

- l.17 — schemas > minimal fixture is valid
- l.22 — schemas > rejects a measurement without source
- l.26 — schemas > rejects negative values
- l.30 — schemas > rejects unknown fields and unknown provenance
- l.36 — schemas > uncertainty must be an explicit null
- l.44 — invariants > fixture passes
- l.45 — invariants > unit incompatible with quantity kind
- l.49 — invariants > unresolved references and duplicate ids
- l.55 — invariants > illustrative values are refused
- l.59 — invariants > measured values need a protocol; statistics need ordered quantiles
- l.65 — invariants > calculated values need resolvable inputs
- l.71 — invariants > interval consistency
- l.75 — invariants > structured uncertainty: valid forms pass, inconsistent ones are refused (ADR-0009)
- l.96 — invariants > dispersion and statistics require a protocol, even for estimated values (CS-04)
- l.102 — invariants > refuses ± on a one-sided bound, wording without the value, degenerate CI, unexplained unknown n
- l.123 — invariants > schema conditional rules: CI forbids ±, standard error requires n (caught before build)
- l.130 — invariants > uncertainty is normalised to SI with the value
- l.134 — invariants > normalisation to SI

### `tests/metrology.test.ts` (11)

- l.6 — dimensions > refuses incompatible units
- l.14 — dimensions > refuses non-finite and negative values
- l.17 — dimensions > bits vs bytes
- l.21 — dimensions > round trip for every unit
- l.27 — dimensions > absolute factors of every unit (independent table, review M-8)
- l.40 — dimensions > decimal sub-units convert without floating noise (review lot 2, m2)
- l.46 — dimensions > astronomical unit is exact (IAU 2012)
- l.50 — quantiles > accepts ordered quantiles
- l.51 — quantiles > detects disorder, duplicates and bad probabilities
- l.59 — display helpers (rounding only at display) > calendar parts
- l.65 — display helpers (rounding only at display) > SI prefix for durations

### `tests/observers.test.ts` (16)

- l.23 — identity and composition > same reference → identity
- l.29 — identity and composition > A→B→A within relative tolerance 1e-12
- l.38 — identity and composition > conversion never changes physical duration
- l.46 — monotonicity and limits > strictly increasing in Δt for f > 0
- l.51 — monotonicity and limits > zero duration → zero subjective time
- l.55 — monotonicity and limits > rejects negative, NaN and infinite durations
- l.58 — monotonicity and limits > rejects f <= 0 or non-finite
- l.64 — monotonicity and limits > rejects tau <= 0
- l.68 — frequency segments (∫ f dt) > constant segments equal constant-frequency result
- l.73 — frequency segments (∫ f dt) > variable frequency integrates piecewise
- l.81 — frequency segments (∫ f dt) > stopped clock is distinct from active time
- l.89 — frequency segments (∫ f dt) > unknown gaps are reported, never filled
- l.95 — frequency segments (∫ f dt) > overlapping or negative segments are invalid
- l.103 — throughput, quantiles > ideal transfer time Q/B
- l.104 — throughput, quantiles > quantiles transform linearly and stay ordered
- l.109 — throughput, quantiles > segmented observers refuse quantile transform

### `tests/oracle-cs03.test.ts` (9)

- l.23 — CS-03 oracle at 4 GHz > ${label} → ${expected} s
- l.27 — CS-03 oracle at 4 GHz > 100 µs → 4.62963 d
- l.28 — CS-03 oracle at 4 GHz > 1 ms → 46.2963 d
- l.29 — CS-03 oracle at 4 GHz > 1 s → 126.752 Julian years
- l.30 — CS-03 oracle at 4 GHz > 1/60 s → 2.1125 years
- l.31 — CS-03 oracle at 4 GHz > 250 ms → 31.688 years
- l.32 — CS-03 oracle at 4 GHz > 1 km in vacuum → ≈13342.6 s (3 h 42 min)
- l.39 — CS-03 oracle at 4 GHz > Earth–Moon 384 400 km (illustrative) → 1.282 s, ~162.5 years
- l.44 — CS-03 oracle at 4 GHz > c is exact

### `tests/published-dispersion.test.ts` (1)

- l.10 — published dispersions are structured > every measured value whose excerpt or conditions publish ±, SD, s.e., CI or percentiles has uncertainty or statistics

### `tests/simulator.test.ts` (21)

- l.18 — time representation > femtosecond BigInt is exact over 20+ orders of magnitude
- l.24 — time representation > rejects negative and non-finite durations
- l.30 — analytic scenarios > serial chain: makespan = sum of durations
- l.35 — analytic scenarios > independent parallel tasks: makespan = max, not sum
- l.41 — analytic scenarios > lag is added after the predecessor
- l.45 — analytic scenarios > start-to-start dependency overlaps
- l.49 — analytic scenarios > capacity 1 serialises, capacity 2 overlaps
- l.58 — analytic scenarios > dependent memory reads (chain) vs independent concurrent reads
- l.69 — invariants > causality (with lag and release), reconstructed occupancy and work conservation on random DAGs
- l.100 — invariants > critical path follows the binding constraint (resource wait vs dependency)
- l.112 — invariants > release time delays the start
- l.117 — invariants > simultaneous events are ordered deterministically (priority, then declaration order)
- l.124 — invariants > seed: same seed → identical draws; different seeds → different draws (discriminant)
- l.134 — invariants > cancellation stops the task and cascades to dependents
- l.144 — rejections > cycles are detected as impossible causes
- l.149 — rejections > unknown references, bad capacity, negative lag
- l.153 — rejections > rejects duplicate resources, NaN priority, negative cancellation, invalid maxEvents
- l.158 — rejections > cycle detection is iterative (20 000 tasks declared in reverse order)
- l.164 — rejections > event limit boundary: exactly maxEvents events pass, one fewer fails
- l.170 — rejections > long cancellation cascades do not overflow the stack
- l.175 — rejections > event limit

### `tests/stats.test.ts` (4)

- l.6 — type-7 quantiles (oracle values recomputed by hand from the type-7 definition; they equal R quantile(x, type = 7)) > matches R for 1..10
- l.13 — type-7 quantiles (oracle values recomputed by hand from the type-7 definition; they equal R quantile(x, type = 7)) > irregular sample with a large gap (hand-computed type-7 values, same as R quantile(type = 7))
- l.21 — type-7 quantiles (oracle values recomputed by hand from the type-7 definition; they equal R quantile(x, type = 7)) > limits and single sample
- l.28 — type-7 quantiles (oracle values recomputed by hand from the type-7 definition; they equal R quantile(x, type = 7)) > summary is ordered, documented, and rejects non-finite samples

### `apps/web/src/lib/export.test.ts` (6)

- l.6 — CSV escaping > quotes separators and doubles quotes
- l.11 — CSV escaping > neutralises formula injection but keeps negative numbers
- l.22 — display formatting > stored ASCII unit us is displayed as µs
- l.25 — display formatting > physical durations use SI prefixes
- l.29 — display formatting > subjective durations use calendar units in each language
- l.36 — display formatting > axis ticks use one compact unit

### `apps/web/src/lib/i18n.test.ts` (3)

- l.5 — i18n (no silent fallback) > FR and EN have exactly the same keys
- l.8 — i18n (no silent fallback) > no empty message and same placeholders in both languages
- l.16 — i18n (no silent fallback) > throws on unknown key or missing parameter

### `apps/web/src/lib/narrative.test.ts` (7)

- l.20 — journal for %s > ${lang}: exactly one line per simulated event, in order
- l.23 — journal for %s > ${lang}: each gap equals the time between consecutive distinct events; gaps sum to the total
- l.35 — journal for %s > ${lang}: running/waiting sets match the task intervals (independent recomputation)
- l.47 — journal for %s > ${lang}: subjective time = 4e9 × physical time at every line
- l.50 — journal for %s > ${lang}: every sentence is a fixed template (no invented activity)
- l.58 — journal content oracles > Mars command: the long wait is narrated as elapsed time, never as work
- l.70 — contention is narrated (DRAM independent reads, capacity 4) > reads r5–r8 are reported as waiting for a resource during the first 80 ns

### `apps/web/src/lib/scenarios.test.ts` (8)

- l.11 — published scenarios > pass the scenario invariants
- l.12 — published scenarios > reject a non-duration or unqualified reference
- l.21 — analytic oracles > 8 dependent DRAM reads = 8 × 80 ns = 640 ns, whatever the capacity
- l.29 — analytic oracles > 8 independent reads: ceil(8 / capacity) × 80 ns
- l.37 — analytic oracles > TCP first response = 2 × 83 ms RTT
- l.40 — analytic oracles > click to reaction (declared assumptions, order of magnitude) = 1 ms + 1/60 s + 213 ms
- l.43 — analytic oracles > Mars command and acknowledgement = 2 × 54.6e9 m / c
- l.46 — analytic oracles > the same scenario always gives the same result (determinism; durations are fixed, no draw)

### `apps/web/src/lib/url-state.test.ts` (4)

- l.5 — shareable URL state > round-trips validated parameters
- l.10 — shareable URL state > rejects invalid values and falls back to defaults
- l.22 — shareable URL state > rejects infinite or absurd frequencies
- l.31 — shareable URL state > empty hash → defaults with browser language

### `apps/web/src/lib/v2.test.ts` (15)

- l.18 — G2 data compatibility: invariants reject non-comparable data > the published groups and observers pass
- l.21 — G2 data compatibility: invariants reject non-comparable data > rejects a member of another quantity kind (duration vs cycles)
- l.24 — G2 data compatibility: invariants reject non-comparable data > rejects a non-qualified member
- l.27 — G2 data compatibility: invariants reject non-comparable data > rejects a heterogeneous hierarchy and a false same-protocol claim
- l.32 — G2 data compatibility: invariants reject non-comparable data > rejects observers derived from the wrong kind or without reference
- l.40 — G2 comparison display: ordered by era, never by value > cpu clock comparison is in chronological (curated) order, not sorted by frequency
- l.48 — G2 comparison display: ordered by era, never by value > DRAM comparison keeps 1995 first even though 2019 values are lower
- l.54 — G2 comparison display: ordered by era, never by value > every frequency group is heterogeneous and warns that frequency is not performance
- l.67 — G2 transformations (hard-coded oracles) > pedagogical 4 GHz: 5.12888e9 cycles = subjective seconds
- l.70 — G2 transformations (hard-coded oracles) > quantum QEC-cycle reference (1.1 µs): T = Δt/δref = 1.16565e6
- l.73 — G2 transformations (hard-coded oracles) > Intel 8086 at 5 MHz: 6.4111e6 cycles
- l.76 — G2 transformations (hard-coded oracles) > human reaction reference (213 ms): T = Δt/δref = 6.0198
- l.79 — G2 transformations (hard-coded oracles) > 60 Hz frame reference (1/60 s): T = 76.933
- l.82 — G2 transformations (hard-coded oracles) > every observer conversion is invertible: physical time is preserved
- l.85 — G2 transformations (hard-coded oracles) > cycle-count groups are never converted to physical time

## Scénarios Playwright (`tests/e2e/site.spec.ts`)

Chaque scénario s'exécute sur les projets : desktop-chromium, desktop-firefox, mobile-webkit, mobile-chromium.

- `site.spec.ts:18:1` — loads under the Pages base path with all assets, no server dependency
- `site.spec.ts:36:1` — direct access to a deep link and reload keep the state
- `site.spec.ts:45:1` — converter: 1 km of light in vacuum ≈ 3 h 42 min at 4 GHz (CS-03 oracle through the UI)
- `site.spec.ts:57:1` — converter reverse direction and frequency change
- `site.spec.ts:69:1` — frequency field keeps what the user types (no silent overwrite)
- `site.spec.ts:81:1` — FR/EN switch changes texts, not values
- `site.spec.ts:93:1` — every navigation space is built (no placeholder left)
- `site.spec.ts:103:1` — timeline: sheet with source opens, keyboard operable, closes with Escape
- `site.spec.ts:119:1` — domain filter and table alternative
- `site.spec.ts:131:1` — exports JSON and CSV with versions, units and sources
- `site.spec.ts:150:1` — share link reproduces the state
- `site.spec.ts:159:1` — accessibility: no axe violations (WCAG 2.1 AA) on main views
- `site.spec.ts:174:1` — internal navigation links all resolve
- `site.spec.ts:184:1` — V2 architecture: cycle latencies read in the core own frame (no frequency assumed)
- `site.spec.ts:192:1` — V2 comparison: ordered by year, comparability and frequency warning shown
- `site.spec.ts:204:1` — V2 observers: same physical duration, several frames (CS-07)
- `site.spec.ts:217:1` — V2 comparison: cycle groups are not converted; common observer is named for durations
- `site.spec.ts:225:1` — V3 simulation: dependent vs independent reads, capacity, critical path, export
- `site.spec.ts:250:1` — V4 immersion: journal derived from the simulated events, labelled as a metaphor
- `site.spec.ts:261:1` — V5 laboratory: browser measurement labelled as such, raw samples exported; withheld data listed
- `site.spec.ts:280:1` — no horizontal page overflow on any view (responsive)
- `site.spec.ts:289:1` — sheet shows one-sided bounds as ≥ / ≤ (review lot 2, m1)
- `site.spec.ts:296:1` — sheet shows structured uncertainty with its type and the source wording (ADR-0009)
- `site.spec.ts:319:1` — table view shows every dispersion with its type (review of uncertainty, M1)

## Ce que les tests ne couvrent pas (connu)

- Pas de test de charge ni de mesure de performance automatisée (temps de chargement, poids) dans la CI.
- Accessibilité : axe-core automatique et parcours clavier testés ; **aucun test avec un lecteur d'écran réel** ni panel d'utilisateurs.
- Pas de test multi-navigateur réel sur Safari iOS ou appareil physique ; WebKit de Playwright seulement.
- Exactitude des valeurs du corpus face aux sources : vérifiée par des agents (verdicts `data/raw/verify-*.json`), **pas par un test automatique** ni par une relecture humaine.
- Reproductibilité sur une autre machine (V08) : non exécutée à ce jour, voir REPRODUCIBILITY.md.
