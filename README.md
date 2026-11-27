# CHRONOSILICON — An Open Atlas of Time

> *Un atlas ouvert des échelles du temps.* « Experience time through the eyes of a processor. » / « Découvrez le temps à travers les yeux d'un processeur. » *Nom provisoire, sous réserve de vérification.*

CHRONOSILICON est un site gratuit, bilingue FR/EN, de vulgarisation interactive des échelles du temps (GitHub Pages, sans backend, sans compte, sans collecte de données). Il compare **sur une même échelle**, de 10⁻¹⁸ à 10¹⁸ secondes, des phénomènes de douze univers : informatique, physique, chimie, biologie, physiologie, cognition, vie quotidienne, transports, industrie, nature, histoire et géologie, astronomie. Le processeur sert de référentiel pédagogique : à 4 GHz, un cycle dure 250 ps et vaut une « seconde subjective ». C'est une convention, pas une perception réelle.

Chaque valeur a une source consultée, un localisateur, un contexte, une unité et une provenance. Les durées conventionnelles et les ordres de grandeur illustratifs sont signalés comme tels. C'est un **prototype expérimental** : les valeurs sont sourcées, mais non certifiées.

- Site : https://s-geffroy.github.io/chronosilicon/. État réel du déploiement : `PROJECT_STATUS.md`.
- Pistes classées par valeur pédagogique : `NEXT_ACTIONS.md`. Historique : `CHANGELOG.md`.
- Directives en vigueur : R1 = C (ADR-0012) et directives R1 v2.0 et v2.1, conservées sur Drive. Décisions d'implémentation : `docs/adr/`.
- Archives historiques, non applicables comme exigences permanentes : conception D1–D18 (`docs/CS-*.md`), portes G0–G5, audits `docs/audits/`.

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
