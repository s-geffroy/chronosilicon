# AUDIT-01 : rapport de transmission

- **De** : le mainteneur et développeur, une session Claude Code (modèle Claude Opus 5.5).
- **À** : l'auditeur indépendant (ChatGPT).
- **Date** : 2026-11-27.
- **Statut** : dossier probatoire constitué et vérifié. **Développement arrêté** jusqu'à la remise du rapport indépendant et du plan de remédiation.
- **Ce document ne contient aucun verdict d'AUDIT-01**, et aucune revue du mainteneur n'y est présentée comme un audit indépendant.

## 1. Résumé de l'état du projet

CHRONOSILICON est un atlas pédagogique statique, en français et en anglais, des échelles de temps de l'informatique, du transistor à l'humain et à l'espace. Il est construit en TypeScript strict, Svelte 5 et Vite 8, et publié sur GitHub Pages.

**Ce qui existe au commit audité**
- Les décisions D1 à D17 sont figées (`docs/CS-01_Decisions.md`).
- M00, puis les tranches V0 à V5, sont réalisées. Chaque porte G0 à G5 a été déclarée GO par le mainteneur (`docs/reports/`).
- Le corpus compte 239 valeurs qualifiées sur 245 candidates, tirées de 120 sources et couvrant 15 domaines.
- Le site comprend 7 espaces : chronologie, architecture, comparaison, observateurs, simulation, immersion et laboratoire.

**Degré de réalisation des décisions (auto-évaluation du mainteneur, DECISIONS.md)**
- 8 décisions sont implémentées : D3, D4, D6, D10, D11, D12, D14 et D17.
- 9 sont partielles : D1, D2, D5, D7, D8, D9, D13, D15 et D16.
- Aucune n'est absente.

Les lacunes principales :
- énergie et jitter absents ;
- simulation uniquement déterministe ;
- fréquence variable non exposée dans l'interface ;
- aucun observateur dont l'opération de référence soit une instruction ;
- nom non vérifié auprès des registres de marques ;
- **aucune validation externe** avant cet audit.

## 2. Objet audité

| Élément | Valeur |
|---|---|
| Commit | `491c989d46d0d75ecedd9741ef4b6586892b80ae` |
| Tag | `audit-01-baseline` (annoté) |
| GitHub | https://github.com/s-geffroy/chronosilicon, état figé : https://github.com/s-geffroy/chronosilicon/tree/audit-01-baseline |
| GitHub Pages | https://s-geffroy.github.io/chronosilicon/ (`version.json` = commit audité ; 6 fichiers sur 6 identiques au build reproduit) |
| Run de déploiement | https://github.com/s-geffroy/chronosilicon/actions/runs/45964408755 (success) |

Le dossier probatoire est commité **après** le tag, sur `develop` uniquement. `main` et le site restent sur le commit audité.

## 3. Liens Google Drive

- Dossier d'audit : `ChatGPT/04_TECHNOLOGIES_INGENIERIE/CHRONOSILICON/2026-11-27_AUDIT-01/` (https://drive.google.com/drive/folders/1vjbHRFEFshUpI1enLpe_tnk6ru92uLKy).
- Dépôt du mainteneur : `…/2026-11-27_AUDIT-01/00_EVIDENCE_CLAUDE/` (https://drive.google.com/drive/folders/12NiViPhoKclCGxEQaX2SmjQotdn7EeJV). Il contient le dossier probatoire, l'archive ZIP du code et ce rapport. Les empreintes sont dans `SHA256SUMS.txt`.
- Les copies documentaires antérieures (G1, G2 à G5, lot 2, incertitude, revue finale) sont dans les dossiers datés voisins.
- **GitHub reste canonique** : en cas d'écart, le dépôt au tag fait foi.

## 4. Inventaire des éléments probatoires (`docs/audits/AUDIT-01/evidence/`)

| Fichier | Contenu | Origine |
|---|---|---|
| BASELINE.md | Commit, tag, branches, environnement, dépendances, état du corpus, tests et CI | mainteneur |
| DECISIONS.md | Registre D1 à D17 avec mise en œuvre, statut et écarts | mainteneur |
| REQUIREMENTS-MATRIX.md | Copie figée de `docs/requirements-matrix.md` (F01 à F09, V00 à V08) | copie conforme |
| ARCHITECTURE.md | Architecture implémentée et écarts à CS-09 | agent de rédaction, relu par le mainteneur |
| CORPUS-INVENTORY.json | Les 245 candidates : statut, provenance, domaine, incertitude, sources ; totaux ; valeurs retenues hors publication | généré (`generate-inventories.py`) |
| SOURCES-REGISTER.csv | 120 sources : URL, DOI, licence, redistribution, date d'accès, nombre de valeurs | généré |
| SCIENTIFIC-MODELS.md | Équations, hypothèses, refus, oracles, limites | agent de rédaction, relu par le mainteneur |
| SIMULATION-MODELS.md | Moteur à événements discrets, scénarios, journal narratif, écarts à CS-08 | agent de rédaction, relu par le mainteneur |
| TEST-INVENTORY.md | 133 déclarations Vitest (212 exécutions) et 24 scénarios Playwright × 4 projets ; ce qui n'est pas testé | généré et annoté |
| REPRODUCIBILITY.md | Procédure complète : clone, conteneur, `npm ci`, validation, corpus, tests, build, lancement, comparaison avec le site | mainteneur, rejouée le 2026-11-27 |
| KNOWN-LIMITATIONS.md | Limites, anomalies et risques ; nature des validations et des valeurs | mainteneur |
| DEPLOYMENT.md | Chaîne de publication et preuves pour le commit audité | mainteneur |
| generate-inventories.py | Script de régénération des deux inventaires (bibliothèque standard, lecture seule) | mainteneur |
| logs/ | Porte rejouée sur un clone neuf (`audit-repro/`), deux empreintes de build, comparaison avec le site, runs GitHub | sorties brutes |
| SHA256SUMS.txt | Empreintes de tous les fichiers ci-dessus | généré |

Les rapports existants du dépôt restent la source détaillée : `docs/reports/G0.md` à `G5.md`, les revues `review-*.md` et leurs réponses, ainsi que `docs/audits/M00.md`, `M01.md` et les ADR-0001 à ADR-0009. **Toutes les revues qui y figurent sont des auto-revues outillées** par des agents du même modèle.

## 5. Limites connues (résumé de KNOWN-LIMITATIONS.md)

- **Validation** : la validation est seulement interne. Aucune relecture humaine, aucune validation externe. La vérification des valeurs a été faite par un agent du même modèle que l'extracteur.
- **Corpus** :
  - 144 valeurs documentées contre 58 mesurées ;
  - aucune distribution empirique complète ;
  - 3 dispersions et 12 jeux de quantiles seulement ;
  - incertitude non propagée ;
  - Apple Silicon quasi absent ;
  - certaines sources lues sur des copies tierces ou inaccessibles (403) ;
  - textes de curation en anglais seulement.
- **Modèles** :
  - D1, D5, D8, D9 et D13 partiels ;
  - simulation déterministe, et scénarios page web, LLM et HPC de CS-08 absents ;
  - protocole en texte libre.
- **Code** :
  - écarts à CS-09 sans ADR (`packages/visualization`, `benchmarks/`, budget de performance) ;
  - `d3-array` déclaré sans être utilisé ;
  - code mort mineur ;
  - quelques branches non testées (blocage du simulateur, `busy`).
- **Interface** : aucun test avec un lecteur d'écran réel, aucun audit WCAG humain, aucun appareil physique.
- **Performance et sécurité** : aucune mesure de performance ni budget ; `npm audit` non bloquant ; pas de SBOM ni de Dependabot.
- **Identité** : marque non vérifiée dans les registres (R1). Extraits courts de sources `reference-only` dans un dépôt public (R3), sans analyse juridique.
- **Reproductibilité** : vérifiée sur une seule machine (celle du mainteneur) et sur les runners GitHub.

## 6. Procédure de reproduction (résumé de REPRODUCIBILITY.md)

```sh
git clone https://github.com/s-geffroy/chronosilicon.git && cd chronosilicon && git checkout audit-01-baseline
IMG=mcr.microsoft.com/playwright:v1.65.0-noble@sha256:9beb546099e11f52d62e505537914870e01a67e0e6b00ae41da4775324e73dbe
docker run --rm --shm-size=1g -v "$PWD":/work -w /work -u "$(id -u):$(id -g)" \
  -e HOME=/work/.cache/home -e npm_config_cache=/work/.cache/npm -e CI=1 "$IMG" \
  sh -c "npm ci && sh scripts/run-gate.sh audit-repro && npm run curate && npm run build:data && git status --porcelain"
# attendu : docs/reports/logs/audit-repro/summary.txt -> overall=PASS ; 212 tests unitaires, 96 e2e ;
#           aucune modification hors docs/reports/logs/ ; apps/web/dist/version.json = commit audité
```

Ensuite, faire la comparaison fichier par fichier avec le site (REPRODUCIBILITY.md §8). Le mainteneur a obtenu ces résultats le 2026-11-27 depuis un clone neuf (`evidence/logs/`).

## 7. Blocages éventuels

- **Aucun blocage incontournable.**
- **Points d'attention pour l'auditeur** :
  - L'API GitHub anonyme est limitée à 60 requêtes par heure. Les pages web des runs suffisent pour les vérifications.
  - Certaines sources du corpus refusent les robots (403). Une lecture dans un navigateur peut être nécessaire (KNOWN-LIMITATIONS.md §3).
  - Le réglage Pages (« GitHub Actions ») n'est vérifiable que par le propriétaire du dépôt.

## 8. Engagements du mainteneur pendant l'audit

- Ne pas modifier le corpus scientifique, `main`, ni le site publié. Ne pas rouvrir D1 à D17.
- Ne rien corriger par anticipation. Les limites listées restent en l'état.
- Reprendre le travail seulement à réception du rapport indépendant et du plan de remédiation.
