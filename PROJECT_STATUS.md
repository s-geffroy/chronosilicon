# PROJECT_STATUS — CHRONOSILICON

Dernière mise à jour : 2026-11-27 (session Claude Code, Opus 5.5). Source canonique : GitHub `s-geffroy/chronosilicon`.

## REMEDIATION-01 : version candidate non publiée (2026-11-27)

- AUDIT-01 (ChatGPT) a rendu son verdict : **NO-GO** pour l'acceptation intégrale, **GO** pour une remédiation contrôlée. Ses 18 constats AUD-001 à AUD-018 sont traités sur la branche `remediation-01` : 15 corrigés, 1 valeur retirée (AUD-013), 1 contesté avec démonstration (AUD-005), AUD-012 traité pour la publication future. Détail : `docs/audits/AUDIT-01/remediation/`.
- Version candidate : tag `remediation-01-rc1`, code testé `a2c90ec`. Porte `remediation-01` PASS : 281 tests unitaires, 100 e2e sur l'artefact, porte de vulnérabilités.
- **Non publiée.** `main` et le site restent sur `491c989`. On attend AUDIT-02 et la décision de l'utilisateur, en particulier sur les extraits déjà publiés (`remediation/SOURCE-RIGHTS.md` §4).
- Corpus de la version candidate : 238 valeurs qualifiées (5 contestées). Extraits tiers retenus pour 185 valeurs (ADR-0011).

## AUDIT-01 : audit indépendant (ouvert et rendu le 2026-11-27)

- **Développement arrêté.** ChatGPT réalise un audit indépendant (A01 à A17). Le mainteneur ne modifie ni le corpus, ni `main`, ni le site, et ne corrige rien par anticipation.
- État de référence : tag `audit-01-baseline` = `491c989d46d0d75ecedd9741ef4b6586892b80ae`, publié et vérifié (`version.json` ; 6 fichiers sur 6 identiques au build reproduit depuis un clone neuf).
- Dossier probatoire : `docs/audits/AUDIT-01/evidence/` ; transmission : `docs/audits/AUDIT-01/AUDIT-01_HANDOVER.md` ; copie Drive : `…/CHRONOSILICON/2026-11-27_AUDIT-01/00_EVIDENCE_CLAUDE/` (https://drive.google.com/drive/folders/12NiViPhoKclCGxEQaX2SmjQotdn7EeJV).
- Dépôt Drive vérifié le 2026-11-27 : 29 fichiers, à savoir le dossier `evidence/` complet avec ses journaux, `AUDIT-01_HANDOVER.md`, `chronosilicon-audit-01-baseline.zip` (`git archive` du tag, SHA-256 28b997b8…) et `DEPOSIT-SHA256SUMS.txt`. Toutes les tailles concordent ; le ZIP et `evidence/SHA256SUMS.txt`, retéléchargés, ont la même empreinte SHA-256.
- Le dossier est commité sur `develop` seulement, après le tag. Reprise : à réception du rapport indépendant et du plan de remédiation.

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
- Données : 6 fichiers d'extraction (3 pour M00, 3 pour le lot 2 M01) et 6 fichiers de verdicts dans `data/raw/` (immuables), curation déterministe, corpus publié dans `data/validated/corpus.json`.
  - 245 candidates (lots M00 et M01) : **239 qualifiées**, 2 en attente, 4 contestées.
  - 120 sources, dont 108 portent au moins une valeur qualifiée. Les 15 domaines sont couverts.
- Site V1 : chronologie logarithmique, fiches, convertisseur, FR/EN, 3 niveaux de lecture, export JSON/CSV, lien de partage. V2 : Architecture, Comparaison (22 groupes : 17 comparaisons et 5 hiérarchies, sans classement), Observateurs (9). V3 : Simulation (5 scénarios, chemin critique, ressources). V4 : Immersion (journal dérivé). V5 : Laboratoire (registre, valeurs écartées, mesure navigateur, contributions). Tous les espaces de navigation sont réalisés.
- Tests : 212 unitaires, 96 e2e (4 navigateurs) ; build déterministe. Dernière revue contradictoire : `docs/reports/review-2026-11-27-final.md` (0 bloquant, 4 majeurs, 6 mineurs, tous traités).
- Incertitude structurée (ADR-0009) : 3 dispersions et 12 jeux de statistiques publiées, jamais inventées ; « ± » toujours affiché avec son type.
- CI : `ci.yml` s'exécute sur toutes les branches ; son statut se lit dans l'onglet Actions pour le commit publié (voir « Publication »). `pages.yml` ne s'exécute que sur `main`.

## Publication

- **En ligne** : https://s-geffroy.github.io/chronosilicon/. `main` = `develop` = le commit qui porte cette ligne (2026-11-27). Il ne diffère de `2fd9034` (code de la revue finale) que par de la documentation : copie Drive et ce statut. `version.json.commit` vérifié en ligne pour `2fd9034` puis `db9c30f`. Porte `final-review` jouée sur `715051a`, `dirty=0` : 212 unitaires, 96 e2e, tous PASS (`docs/reports/logs/final-review/`). Précédents : `6bea223` (incertitude structurée), `6f213d0` (mineurs du lot 2), `cf84cdd` (lot 2), `178d4ad` (V1 à V5).
- Vérifié le 2026-11-26 : HTTP 200, `version.json.commit` = SHA poussé, actifs sous `/chronosilicon/`, aucune erreur console (Chromium).
- Toute publication suivante : fast-forward de `develop` vers `main` après la porte de la version (ADR-0003).

## Copie documentaire Drive

- 2026-11-26 : dossier `ChatGPT/04_TECHNOLOGIES_INGENIERIE/CHRONOSILICON/2026-11-26_G1_V1-publiee` (https://drive.google.com/drive/folders/1j0mK7_bWW6_LvVZ5ehHCFbjzJU9uhd2M). 7 fichiers ; les tailles concordent toutes ; un fichier a été retéléchargé et son SHA-256 est identique à l'original. Archive locale : `docs/archives/2026-11-26_G1/` (SHA256SUMS.txt).
- 2026-11-26 : dossier `…/CHRONOSILICON/2026-11-26_G2-G5_V2-a-V5-publiees` (https://drive.google.com/drive/folders/1F5t8vfQXhDJRo9J3zlZfN-K74FmjbxhI). 11 fichiers ; les tailles concordent toutes ; un fichier (G5) a été retéléchargé et son SHA-256 est identique à l'original. Archive locale : `docs/archives/2026-11-26_G2-G5/`.
- 2026-11-26 : dossier `…/CHRONOSILICON/2026-11-26_lot2_corpus-239-valeurs` (https://drive.google.com/drive/folders/1WmZ9aqK6QkJ4jLb4CR9Epo0VYThf96tR). 6 fichiers ; les tailles concordent ; le SHA-256 du rapport G0-lot2 retéléchargé est identique (665adc21…). Archive locale : `docs/archives/2026-11-26_lot2/`.
- 2026-11-26 : réponses aux mineurs du lot 2 et état associé, ajoutés au dossier Drive du lot 2 (tailles concordantes, 4102 et 4109 octets). Archive locale : `docs/archives/2026-11-26_lot2-mineurs/`.
- 2026-11-26 : dossier `…/CHRONOSILICON/2026-11-26_incertitude-structuree` (https://drive.google.com/drive/folders/1J70nzEXWGyZICk6_pZmz77eBGSilz4wE), 5 fichiers aux tailles concordantes. Archive locale : `docs/archives/2026-11-26_incertitude/`.
- 2026-11-27 : dossier `…/CHRONOSILICON/2026-11-27_revue-finale` (https://drive.google.com/drive/folders/1_l8MvuKl9Ze_DLbLxLtjREVuDLboFzSd), 7 fichiers aux tailles concordantes ; le résumé de porte retéléchargé a le même SHA-256 (1a75d98b…). Archive locale : `docs/archives/2026-11-27_revue-finale/`.

## Décisions non validées par l'utilisateur

Aucune décision structurante en suspens. Les choix mineurs sont tracés dans `docs/adr/ADR-0001` à `ADR-0009`.

## Risques ouverts

Voir `docs/audits/M00.md` §5 (R1 à R6). Les principaux :
- marque non vérifiée dans les registres officiels ;
- revue par des agents du même modèle ;
- extraits courts de sources « reference-only » dans un dépôt public.
