# Matrice exigences → tests → portes (CS-02, CS-11)

Statut d'une exigence : **réalisée** (preuve de test exécuté), **partielle** ou **future**. Le résultat effectif de chaque exécution est dans `docs/reports/`.

| Exig. | Fonction | Version | Implémentation | Tests | Porte | État |
|---|---|---|---|---|---|---|
| F01 | Chronologie logarithmique, filtre par domaine, fiche scientifique | V1 | `apps/web/src/components/Timeline.svelte`, `Sheet.svelte` | e2e « timeline: sheet… », « domain filter and table alternative » ; unités `url-state.test.ts` | G1 | réalisée (déploiement en attente) |
| F02 | Convertisseur physique/subjectif, fréquence personnalisable | V1 | `Converter.svelte`, `ObserverControl.svelte`, `packages/observers` | `oracle-cs03.test.ts`, `observers.test.ts`, e2e « converter… » (×2) | G0/G1 | réalisée |
| F03 | FR/EN, responsive, accessible, 3 niveaux de lecture | V1 | `i18n.ts` (clés typées, aucun repli silencieux), CSS responsive, `level` dans l'URL | `i18n.test.ts`, e2e « FR/EN switch », axe WCAG 2.1 AA, projets mobiles WebKit/Chromium, navigation clavier (Enter/Escape) | G1 | réalisée (déploiement en attente) |
| F04 | Comparaison des générations, changement d'observateur | V2 | `data/curated/{groups,observers}.json`, `Architecture/Comparison/Observers.svelte`, `lib/v2.ts` | `v2.test.ts` (invariants négatifs, oracles d'observateurs, ordre chronologique), e2e « V2 … » (×4) | G2 | réalisée |
| F05 | Simulation discrète : dépendances, ressources, contention | V3 | — | — | G3 | future |
| F06 | Journal narratif dérivé des événements simulés | V4 | — | — | G4 | future |
| F07 | Laboratoire : provenance, mesures, distributions, export | V1–V5 | V1 : provenance et statut à un clic, export JSON/CSV avec unités et versions | e2e « exports JSON and CSV », `export.test.ts` (échappement, injection de formules) | G1 (partiel) | partielle |
| F08 | URLs partageables, export des paramètres, résultats et versions | V1–V3 | `url-state.ts` (paramètres validés + `v`), `ExportPanel.svelte` | `url-state.test.ts` (aller-retour, rejet des valeurs invalides), e2e « share link », « direct access… reload » | G1 (partiel) | partielle |
| F09 | Publication statique publique sans compte ni backend | V1 | Vite `base` paramétré, `pages.yml`, `version.json`, `404.html` | e2e « loads under the Pages base path… » ; vérification HTTP post-déploiement | G1 | réalisée (déploiement en attente) |

## Contrôles CS-11 transverses

| Contrôle | Preuve automatisée |
|---|---|
| V00 sources | `data/raw/verify-*.json` (vérification indépendante), `scripts/curate.ts`, registre `data/sources/sources.json` |
| V01 dimensions | `schemas/*.schema.json`, `checkInvariants` (unité ↔ grandeur), `metrology.test.ts`, `data-pipeline.test.ts` |
| V02 métrologie | invariant « measured ⇒ protocol » ; statut documenté / mesuré / estimé affiché |
| V03 statistiques | invariant « statistiques ⇒ protocole, n, méthode, quantiles ordonnés » ; aucune distribution dans le corpus V0/V1 |
| V04 architecture | conditions et configuration obligatoires par valeur ; cycles non convertis sans fréquence |
| V05 mathématique | `oracle-cs03.test.ts`, `observers.test.ts` (identité, A→B→A, monotonie, limites, segments) |
| V06 causalité | future (V3) |
| V07 pédagogie | métaphore annoncée, distinction cycles / instructions / travail utile (convertisseur, fiche), espaces non réalisés signalés |
| V08 reproductibilité | lockfile, image épinglée, `validate:data` (dérivé à jour, raw immuable), logs `docs/reports/logs/` |
