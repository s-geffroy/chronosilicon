# CHRONOSILICON — An Open Atlas of Computational Time

> « Experience time through the eyes of a processor. » *Nom provisoire, sous réserve de vérification ; voir `docs/audits/M00.md`.*

CHRONOSILICON est un atlas pédagogique et scientifique, open source et statique (GitHub Pages, sans backend ni compte). Il fait percevoir les échelles de temps des systèmes informatiques : un cœur cadencé à 4 GHz vit chaque cycle comme une seconde. C'est une métaphore pédagogique, sans conscience ni relativité physique.

Chaque valeur du corpus a une source réellement consultée, un localisateur précis, des conditions, une unité SI et des statuts de provenance et de vérification. Aucune valeur n'est inventée.

- Site : https://s-geffroy.github.io/chronosilicon/. Voir `PROJECT_STATUS.md` pour l'état réel du déploiement.
- État, portes, prochain pas : `PROJECT_STATUS.md`, `NEXT_ACTIONS.md`
- Conception validée (D1–D17) : `docs/CS-00_Charte.md` … `docs/CS-14_Contrat.md`
- Décisions d'implémentation : `docs/adr/`

## Structure

```
apps/web/             application Svelte + Vite + D3 (FR/EN)
packages/metrology/   unités SI, dimensions, contrôles numériques
packages/observers/   conversions physique ↔ subjectif (N = f·Δt, ∫f dt, référence)
packages/ontology/    types + invariants (miroir de schemas/)
schemas/              JSON Schema 2020-12
data/raw/             extractions M00 et verdicts de vérification (immuables, SHA-256)
data/curated/         dérivé par scripts/curate.ts (+ decisions.json manuel motivé)
data/validated/       corpus qualifié publié (dérivé par npm run build:data)
tests/                Vitest (oracles, propriétés, schémas) et Playwright (e2e)
docs/                 dossier directeur, ADR, audits, rapports de portes
```

## Procédure reproductible

Les outils tournent dans le conteneur `node` (image `mcr.microsoft.com/playwright:v1.65.0-noble`, Node 26 LTS), identique à la CI (ADR-0002). Sur le VPS :

```sh
sudo appctl run node npm ci
sudo appctl run node npm run check      # lint, types, données, tests unitaires, build
sudo appctl run node npm run test:e2e   # build + preview sous /chronosilicon/, 4 navigateurs
sudo appctl run node npm run curate     # raw + verdicts + décisions -> data/curated
```

Ailleurs, avec Docker :

```sh
docker run --rm -it -v "$PWD":/work -w /work --shm-size=1g mcr.microsoft.com/playwright:v1.65.0-noble sh -c "npm ci && npm run check && npm run test:e2e"
```

Pour un aperçu local sous le chemin de base de Pages : `BASE_PATH=/chronosilicon/ npm run build && npm run preview`.

## Publication

Publier, c'est pousser sur `main` : le workflow `.github/workflows/pages.yml` rejoue les contrôles bloquants, construit et déploie. Le travail courant va sur `develop`, où `ci.yml` valide sans déployer. Prérequis manuel : **Settings > Pages > Source : GitHub Actions** (ADR-0003). Pas de fichier `CNAME` tant que le DNS ne résout pas.

## Licences

- Code original : Apache-2.0 (`LICENSE`).
- Documentation et contenus pédagogiques originaux : CC BY 4.0 (`LICENSES/CC-BY-4.0.txt`).
- Données originales du projet (structure, normalisation, valeurs calculées par le projet) : CC0 1.0 (`LICENSES/CC0-1.0.txt`).
- Contenus tiers (extraits cités, documents sources) : licences et conditions propres, voir `NOTICE` et le registre `data/sources/sources.json`.

Citer le projet : `CITATION.cff`. Contribuer : `CONTRIBUTING.md`.
