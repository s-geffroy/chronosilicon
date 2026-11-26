# Rapport : extension du corpus, lot 2 (portes G0 à G5 maintenues)

- Date : 2026-11-26. Commit évalué : `e7882567ef30a4594a6eb6a6f8419f1df41a264b` (`dirty=0`). Journaux : `docs/reports/logs/lot2/`.
- Commande : `sudo appctl run node sh scripts/run-gate.sh lot2`.
- Résultat : ci, lint, typecheck, validate:data, test (**203 tests**), build et test:e2e (**84 tests, 4 navigateurs**) : **tous PASS**.
- Audit du lot : `docs/audits/M01.md`. Revue contradictoire : `docs/reports/review-2026-11-26-lot2.md` (0 bloquant, 9 majeurs, 17 mineurs).

## Corpus

| | Avant (G0) | Après le lot 2 |
|---|---|---|
| Valeurs qualifiées publiées | 129 | **239** |
| Candidates (toutes vérifiées) | 133 | 245 |
| Sources portant une valeur qualifiée | 49 | 108 |
| Domaines CS-02 couverts | 13 / 15 | **15 / 15** |
| Groupes de comparaison et hiérarchies | 15 | 22 |
| Observateurs | 8 | 9 |

Provenance : 144 documentées, 58 mesurées (toutes avec protocole), 29 calculées (toutes recalculées par oracle), 8 estimées. Valeurs écartées et publiées avec motif : 2 en attente, 4 contestées.

## Contrôles CS-11 rejoués

| Contrôle | Statut | Preuve |
|---|---|---|
| V00 sources | PASS | 112 nouvelles valeurs revérifiées une à une par des agents distincts des extracteurs. 0 discordance numérique, 1 valeur inadéquate (contestée). |
| V01 dimensions | PASS | Nouvelle grandeur `compute_rate` (flop/s), avec facteurs testés. Contrôle strict unité ↔ grandeur à l'extraction. |
| V02 métrologie | PASS | Protocoles des mesures écrits par l'extracteur, puis corrigés par le vérificateur quand ils disaient plus que la source (12 corrections pour le lot B). |
| V03 statistiques | PASS | Moyennes, médianes et bornes nommées dans les conditions. Bornes encodées en `low`/`high` (revue M3). |
| V04 architecture | PASS | Les notes des 22 groupes sont relues ; corrections M4 à M6 (8080 non x86, biais de sélection IBM, bornes TTFT MLPerf). |
| V05 mathématique | PASS | Oracles des 29 valeurs calculées ; pleine précision, ou intervalle hérité d'une entrée arrondie (revue M9). |
| V06 à V08 | PASS | Inchangés : simulateur, journal et reproductibilité rejoués. |

Correctifs de la revue :
- M1 : bogue de curation. Les remarques corrigées par le vérificateur n'étaient pas appliquées ; c'est corrigé et couvert par `tests/curation.test.ts`.
- M2 : les affirmations d'audit non sourcées sont retirées.
- M7 : l'observateur quantique est borné à l'expérience source.
- M8 : les types de provenance sont désormais définis dans ADR-0005.

**Décision : le corpus étendu est qualifié ; les portes G0 à G5 restent franchies.**
