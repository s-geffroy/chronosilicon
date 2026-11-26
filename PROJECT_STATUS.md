# PROJECT_STATUS — CHRONOSILICON

Dernière mise à jour : 2026-11-26 (session Claude Code, Opus 5.5). Source canonique : GitHub `s-geffroy/chronosilicon`.

## État des portes

| Étape | Porte | Statut | Rapport |
|---|---|---|---|
| M00 | GM00 | **GO** avec réserves : nom provisoire (registres de marques non interrogés), auto-revue outillée | `docs/audits/M00.md` |
| V0 | G0 | **GO** : 129 valeurs qualifiées, 102 tests | `docs/reports/G0.md` |
| V1 | G1 | **GO pour publication** ; déploiement **NOT_RUN** (réglage Pages manuel attendu) | `docs/reports/G1.md` |
| V2 | G2 | non commencé (comparaison et multi-observateurs) | — |
| V3 | G3 | moteur à événements discrets écrit et testé (15 tests), **non exposé**, porte non évaluée | — |
| V4 | G4 | non commencé | — |
| V5 | G5 | non commencé | — |

## Ce qui existe réellement

- Monorepo npm workspaces : `packages/{metrology,observers,ontology,simulator}`, `apps/web` (Svelte 5, Vite 8, D3).
- Données : 3 extractions M00 et 3 verdicts de vérification dans `data/raw/` (immuables), curation déterministe, corpus publié dans `data/validated/corpus.json`.
  - 133 candidates : 129 qualifiées, 2 en attente, 2 contestées.
  - 59 sources, dont 49 portent au moins une valeur qualifiée.
- Site V1 : chronologie logarithmique, fiches, convertisseur, FR/EN, 3 niveaux de lecture, export JSON/CSV, lien de partage. Les espaces V2 à V5 sont marqués « non disponible ».
- CI : `ci.yml` vert sur `develop` (`a79760c`). `pages.yml` est prêt et ne s'exécute que sur `main`.

## Publication

- URL cible : https://s-geffroy.github.io/chronosilicon/ → **404 à ce jour : non déployé**.
- Bloquant : réglage manuel **Settings > Pages > Source : GitHub Actions** sur le dépôt.
- Ensuite : fusion fast-forward de `develop` vers `main`, run `pages`, puis vérification HTTP, de `version.json` et du navigateur (ADR-0003).

## Décisions non validées par l'utilisateur

Aucune décision structurante en suspens. Les choix mineurs sont tracés dans `docs/adr/ADR-0001` à `ADR-0005`.

## Risques ouverts

Voir `docs/audits/M00.md` §5 (R1 à R6). Les principaux :
- marque non vérifiée dans les registres officiels ;
- revue par des agents du même modèle ;
- extraits courts de sources « reference-only » dans un dépôt public.
