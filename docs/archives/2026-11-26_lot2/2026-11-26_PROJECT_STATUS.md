# PROJECT_STATUS — CHRONOSILICON

Dernière mise à jour : 2026-11-26 (session Claude Code, Opus 5.5). Source canonique : GitHub `s-geffroy/chronosilicon`.

## État des portes

| Étape | Porte | Statut | Rapport |
|---|---|---|---|
| M00 | GM00 | **GO** avec réserves : nom provisoire (registres de marques non interrogés), auto-revue outillée | `docs/audits/M00.md` |
| V0 | G0 | **GO** : 129 valeurs qualifiées (M00), puis **239** après le lot 2 (M01) | `docs/reports/G0.md`, `docs/reports/G0-lot2.md` |
| V1 | G1 | **GO : V1 publiée** (commit `7ca44b5`, vérifiée HTTP, version.json et navigateur) | `docs/reports/G1.md` |
| V2 | G2 | **GO : V2 publiée** (`main` = `2881239`, vérifiée en ligne) | `docs/reports/G2.md` |
| V3 | G3 | **GO, publiée** : simulation exposée, 5 scénarios adossés au corpus | `docs/reports/G3.md` |
| V4 | G4 | **GO, publiée** : journal d'immersion dérivé des événements | `docs/reports/G4.md` |
| V5 | G5 | **GO, publiée** : laboratoire, mesure navigateur, contributions ; V00–V08 PASS | `docs/reports/G5.md` |

## Ce qui existe réellement

- Monorepo npm workspaces : `packages/{metrology,observers,ontology,simulator}`, `apps/web` (Svelte 5, Vite 8, D3).
- Données : 3 extractions M00 et 3 verdicts de vérification dans `data/raw/` (immuables), curation déterministe, corpus publié dans `data/validated/corpus.json`.
  - 245 candidates (lots M00 et M01) : **239 qualifiées**, 2 en attente, 4 contestées.
  - 120 sources, dont 108 portent au moins une valeur qualifiée. Les 15 domaines sont couverts.
- Site V1 : chronologie logarithmique, fiches, convertisseur, FR/EN, 3 niveaux de lecture, export JSON/CSV, lien de partage. V2 : Architecture, Comparaison (15 groupes, sans classement), Observateurs (8). V3 : Simulation (5 scénarios, chemin critique, ressources). V4 : Immersion (journal dérivé). V5 : Laboratoire (registre, valeurs écartées, mesure navigateur, contributions). Tous les espaces de navigation sont réalisés.
- Tests : 203 unitaires, 84 e2e (4 navigateurs) ; build déterministe.
- CI : `ci.yml` vert sur `develop` (`a79760c`). `pages.yml` est prêt et ne s'exécute que sur `main`.

## Publication

- **En ligne** : https://s-geffroy.github.io/chronosilicon/. `main` = `178d4ad` (V1 à V5), run pages https://github.com/s-geffroy/chronosilicon/actions/runs/45891059462. Historique : V1 `7ca44b5`, V2 `2881239`.
- Vérifié le 2026-11-26 : HTTP 200, `version.json.commit` = SHA poussé, actifs sous `/chronosilicon/`, aucune erreur console (Chromium).
- Toute publication suivante : fast-forward de `develop` vers `main` après la porte de la version (ADR-0003).

## Copie documentaire Drive

- 2026-11-26 : dossier `ChatGPT/04_TECHNOLOGIES_INGENIERIE/CHRONOSILICON/2026-11-26_G1_V1-publiee` (https://drive.google.com/drive/folders/1j0mK7_bWW6_LvVZ5ehHCFbjzJU9uhd2M). 7 fichiers ; les tailles concordent toutes ; un fichier a été retéléchargé et son SHA-256 est identique à l'original. Archive locale : `docs/archives/2026-11-26_G1/` (SHA256SUMS.txt).
- 2026-11-26 : dossier `…/CHRONOSILICON/2026-11-26_G2-G5_V2-a-V5-publiees` (https://drive.google.com/drive/folders/1F5t8vfQXhDJRo9J3zlZfN-K74FmjbxhI). 11 fichiers ; les tailles concordent toutes ; un fichier (G5) a été retéléchargé et son SHA-256 est identique à l'original. Archive locale : `docs/archives/2026-11-26_G2-G5/`.

## Décisions non validées par l'utilisateur

Aucune décision structurante en suspens. Les choix mineurs sont tracés dans `docs/adr/ADR-0001` à `ADR-0005`.

## Risques ouverts

Voir `docs/audits/M00.md` §5 (R1 à R6). Les principaux :
- marque non vérifiée dans les registres officiels ;
- revue par des agents du même modèle ;
- extraits courts de sources « reference-only » dans un dépôt public.
