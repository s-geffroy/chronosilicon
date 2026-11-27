# Revue finale contradictoire (2026-11-27)

- Périmètre : `403840e..6bea223` (incertitude structurée, marqueur des textes en anglais) et cohérence documentaire (ADR-0005, 0006, 0009, M01, PROJECT_STATUS, NEXT_ACTIONS, CHANGELOG, matrice, CONTRIBUTING).
- Nature : **auto-revue outillée** par un agent du même modèle, en lecture seule, **pas une validation humaine externe** (R2). Les comptes ont été vérifiés sur `data/validated/corpus.json`.
- Bilan : 0 bloquant, 4 majeurs, 6 mineurs. Tous traités (tableau ci-dessous).

| # | Gravité | Constat | Traitement | Où |
|---|---|---|---|---|
| 1 | Majeur | Le marqueur ajouté en `6bea223` n'avait ni test ni journal de porte (logs sur `a0ec133`). | Tests e2e FR (marqueurs présents) et EN (absents, `lang="en"` vérifié) ; porte rejouée sur le commit final. | `tests/e2e/site.spec.ts`, `docs/reports/logs/final-review/` |
| 2 | Majeur | CONTRIBUTING:8 et la matrice V03 exigeaient n et la méthode, contre ADR-0009 §7 et le corpus (10 jeux à n inconnu). | Rédaction alignée sur ADR-0009 §7 : n ou `sampleCountNote`, méthode « non publiée » déclarée. | `CONTRIBUTING.md`, `docs/requirements-matrix.md` |
| 3 | Majeur | Le protocole (anglais) était affiché sans `lang` ni marqueur. | Même motif que les notes : marqueur FR, `lang="en"`. | `Sheet.svelte` |
| 4 | Majeur | PROJECT_STATUS : comptes périmés (fichiers bruts, groupes, observateurs) et CI datée d'un ancien commit. | Recomptés depuis le corpus (6+6 fichiers, 22 groupes dont 17 comparaisons et 5 hiérarchies, 9 observateurs) ; CI rattachée au commit publié. | `PROJECT_STATUS.md` |
| 5 | Mineur | `P${Math.round(p*100)}` donnerait P100 pour p = 0,999. | `formatLevel` (P99,9). | `Sheet.svelte` |
| 6 | Mineur | `level ?? 0` afficherait « 0 % ». | Remplacé par l'assertion `level!` : le schéma et l'invariant exigent `level` pour un intervalle, le repli était du code mort trompeur. | `Sheet.svelte`, `Timeline.svelte` |
| 7 | Mineur | `statement` (extrait de source) portait l'étiquette « texte de curation » ; citation et localisateurs sans `lang` ; formulation du clignement composée par le curateur. | Libellé « (extrait de la source, en anglais) » ; `lang="en"` sur citation et localisateurs ; formulation réduite au fragment littéral « 76 ± 2 », légende citée dans le localisateur (décision motivée). | `Sheet.svelte`, `i18n.ts`, `decisions.json` |
| 8 | Mineur | `statement.includes(String(value))` acceptait 2 dans « n=25 ». | Comparaison par jeton numérique ; les deux bornes d'un intervalle exigées ; tests négatifs. | `packages/ontology/src/index.ts`, `tests/data-pipeline.test.ts` |
| 9 | Mineur | CSV : n inconnu codé `null` d'un côté, `'unknown'` de l'autre ; formulation et méthode absentes. | Cellule vide partout ; colonnes `statisticsNNote`, `statisticsMethod`, `uncertaintyStatement` ; test. | `export.ts`, `tests/e2e/site.spec.ts` |
| 10 | Mineur | NEXT_ACTIONS en retard (point fait encore ouvert, « 3 valeurs », lancement de noyau GPU déjà présent). | Mis à jour. | `NEXT_ACTIONS.md` |

Points vérifiés sans défaut par la revue : marqueur absent en EN ; `method`, `sampleCountNote` et `statement` en anglais dans tout le corpus ; comptes d'ADR-0009 et de M01 justes ; ADR-0005, 0006 et M01 cohérents avec ADR-0009.
