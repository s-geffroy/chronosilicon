# PROJECT_STATUS — CHRONOSILICON

Dernière mise à jour : 2026-11-26 (session Claude Code, Opus 5.5). Source canonique : GitHub `s-geffroy/chronosilicon`.

## État des portes

| Étape | Porte | Statut | Rapport |
|---|---|---|---|
| M00 | GM00 | **GO** avec réserves : nom provisoire (registres de marques non interrogés), auto-revue outillée | `docs/audits/M00.md` |
| V0 | G0 | **GO** : 129 valeurs qualifiées, 102 tests | `docs/reports/G0.md` |
| V1 | G1 | **GO : V1 publiée** (commit `7ca44b5`, vérifiée HTTP, version.json et navigateur) | `docs/reports/G1.md` |
| V2 | G2 | **GO** : architecture, comparaison, observateurs (commit `557bbcb`) | `docs/reports/G2.md` |
| V3 | G3 | moteur à événements discrets écrit et testé (15 tests), **non exposé**, porte non évaluée | — |
| V4 | G4 | non commencé | — |
| V5 | G5 | non commencé | — |

## Ce qui existe réellement

- Monorepo npm workspaces : `packages/{metrology,observers,ontology,simulator}`, `apps/web` (Svelte 5, Vite 8, D3).
- Données : 3 extractions M00 et 3 verdicts de vérification dans `data/raw/` (immuables), curation déterministe, corpus publié dans `data/validated/corpus.json`.
  - 133 candidates : 129 qualifiées, 2 en attente, 2 contestées.
  - 59 sources, dont 49 portent au moins une valeur qualifiée.
- Site V1 : chronologie logarithmique, fiches, convertisseur, FR/EN, 3 niveaux de lecture, export JSON/CSV, lien de partage. V2 : espaces Architecture (hiérarchies en cycles), Comparaison (15 groupes, sans classement) et Observateurs (8 observateurs dérivés du corpus). Les espaces V3 à V5 sont marqués « non disponible ».
- CI : `ci.yml` vert sur `develop` (`a79760c`). `pages.yml` est prêt et ne s'exécute que sur `main`.

## Publication

- **En ligne** : https://s-geffroy.github.io/chronosilicon/. `main` = `7ca44b5`, run pages https://github.com/s-geffroy/chronosilicon/actions/runs/45882067731.
- Vérifié le 2026-11-26 : HTTP 200, `version.json.commit` = SHA poussé, actifs sous `/chronosilicon/`, aucune erreur console (Chromium).
- Toute publication suivante : fast-forward de `develop` vers `main` après la porte de la version (ADR-0003).

## Copie documentaire Drive

- 2026-11-26 : dossier `ChatGPT/04_TECHNOLOGIES_INGENIERIE/CHRONOSILICON/2026-11-26_G1_V1-publiee` (https://drive.google.com/drive/folders/1j0mK7_bWW6_LvVZ5ehHCFbjzJU9uhd2M). 7 fichiers ; les tailles concordent toutes ; un fichier a été retéléchargé et son SHA-256 est identique à l'original. Archive locale : `docs/archives/2026-11-26_G1/` (SHA256SUMS.txt).

## Décisions non validées par l'utilisateur

Aucune décision structurante en suspens. Les choix mineurs sont tracés dans `docs/adr/ADR-0001` à `ADR-0005`.

## Risques ouverts

Voir `docs/audits/M00.md` §5 (R1 à R6). Les principaux :
- marque non vérifiée dans les registres officiels ;
- revue par des agents du même modèle ;
- extraits courts de sources « reference-only » dans un dépôt public.
