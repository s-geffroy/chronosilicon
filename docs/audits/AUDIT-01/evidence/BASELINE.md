# État de référence d'AUDIT-01

Figé le 2026-11-27 par le mainteneur (session Claude Code). L'objet audité est le **commit ci-dessous**, celui qui est publié sur GitHub Pages. Le dossier probatoire est versionné **après** ce commit, sur `develop` seulement : il ne fait pas partie de l'objet audité, et la version publiée n'est pas modifiée.

## Identification

| Élément | Valeur |
|---|---|
| Dépôt canonique | https://github.com/s-geffroy/chronosilicon (public) |
| **Commit audité** | **`491c989d46d0d75ecedd9741ef4b6586892b80ae`** (2026-11-27T08:08:16Z, « Etat du projet : ligne Publication exacte ») |
| Tag | `audit-01-baseline`, annoté (objet `af1ee9cbc6f4032f335f144754005963e73d0e78`) et pointant sur le commit audité. C'est le seul tag du dépôt : aucun tag préexistant n'a été déplacé. |
| Branches au moment du gel | `main` = `develop` = `491c989`, local et `origin` |
| Version publiée | https://s-geffroy.github.io/chronosilicon/. `version.json` renvoie `{"app": "0.1.0", "commit": "491c989d46d0d75ecedd9741ef4b6586892b80ae"}` (lu le 2026-11-27, HTTP 200). |
| Correspondance source ↔ déploiement | Build reproduit depuis un **clone neuf** du tag : les **6 fichiers** servis par Pages sont **identiques au bit près** (SHA-256 dans `logs/deploy-compare.txt`). Détails dans DEPLOYMENT.md. |
| Version applicative | `0.1.0` (`package.json`). Aucune version n'est taggée comme release (CHANGELOG : « [Non publié] »). |
| Version du corpus | `corpusVersion` = `0.3.0+b82951f47093`, `schemaVersion` = `1.0.0` (`data/validated/corpus.json`) |

## Environnement d'exécution

| Élément | Valeur |
|---|---|
| Image outil (local et CI) | `mcr.microsoft.com/playwright:v1.65.0-noble@sha256:9beb546099e11f52d62e505537914870e01a67e0e6b00ae41da4775324e73dbe`, la même dans `compose.yaml`, `.github/workflows/ci.yml`, `pages.yml` et `scripts/run-gate.sh` (ADR-0002) |
| Node / npm | v26.13.1 / 11.20.0 (dans l'image) ; `engines.node` ≥ 24 |
| Navigateurs e2e | Chromium, Firefox et WebKit de Playwright 1.65.0 ; projets desktop-chromium, desktop-firefox, mobile-webkit (iPhone 13), mobile-chromium (Pixel 7) |
| Machine du mainteneur | VPS Linux 6.8.0-147-generic x86_64 ; aucun runtime JS installé sur l'hôte (tout passe par l'image) |
| CI | runners `ubuntu-latest` GitHub, dans le même `container:` |

## Dépendances (versions résolues dans `package-lock.json`, lockfileVersion 3, 259 paquets)

| Rôle | Paquet | Version |
|---|---|---|
| Exécution (site) | svelte | 5.57.3 |
| | d3-scale | 4.0.3 |
| | d3-array | 3.2.5 (déclaré, non importé directement ; dépendance de d3-scale) |
| Build | vite (forcé par `overrides`) | 8.3.8 |
| | @sveltejs/vite-plugin-svelte | 7.3.1 |
| Langage et contrôle | typescript | 6.0.3 |
| | svelte-check | 4.7.8 |
| | eslint | 10.14.0 |
| | typescript-eslint | 8.72.2 |
| | eslint-plugin-svelte | 3.24.1 |
| Données | ajv | 8.20.0 (JSON Schema 2020-12) |
| | tsx | 4.23.15 |
| Tests | vitest | 5.1.0 |
| | @playwright/test, playwright, playwright-core (forcés par `overrides`) | 1.65.0 |
| | @axe-core/playwright | 4.14.0 |

Toutes les versions directes sont **exactes**, sans plage de versions. Les actions GitHub sont épinglées par SHA de commit (ARCHITECTURE.md §4).

## État du corpus (détail dans CORPUS-INVENTORY.json)

- **245 candidates**, réparties ainsi :
  - 239 qualifiées, toutes publiées ;
  - 2 en attente ;
  - 4 contestées.
- **Provenance des valeurs qualifiées** :
  - 144 documentées ;
  - 58 mesurées ;
  - 29 calculées ;
  - 8 estimées.
- **Sources** : 120, dont 108 portent une valeur qualifiée. Redistribution :
  - 27 `allowed` ;
  - 76 `reference-only` ;
  - 17 `unknown`.
- **Couverture** : 15 domaines. On compte aussi 22 groupes, 9 observateurs et 5 scénarios.
- **Incertitudes et statistiques** : 3 dispersions structurées et 12 jeux de statistiques publiés.
- **Données brutes** : 12 fichiers dans `data/raw/` (6 extractions et 6 verdicts), immuables. Leurs SHA-256 correspondent à `data/raw/MANIFEST.sha256`, contrôle refait sur le clone neuf.
- **Gel** : le corpus n'a pas été modifié depuis le commit audité, et ne le sera pas pendant l'audit.

## État des tests et de la CI au commit audité

| Contrôle | Résultat | Preuve |
|---|---|---|
| CI `ci` sur `develop` | success (run 45963369976) | `logs/github-runs-491c989.txt` |
| CI `ci` sur `main` | success (run 45964408584) | idem |
| Déploiement `pages` sur `main` | success (run 45964408755, 08:16:32Z → 08:18:33Z) | idem |
| Porte complète rejouée par le mainteneur sur un clone neuf du tag | `overall=PASS`, `dirty=0` : `npm ci`, lint, typecheck, validate:data, 212 tests unitaires et 96 e2e passés | `logs/audit-repro/` |
| Corpus régénéré depuis `data/raw` (`curate` + `build:data`) | 0 fichier modifié | `logs/audit-repro/summary.txt` et commande de REPRODUCIBILITY.md §5 |
| Build déterministe | deux builds identiques au bit près | `logs/build-1-sha256.txt` = `logs/build-2-sha256.txt` |

## Contrôle de reproductibilité du mainteneur (2026-11-27)

- **Opérations** :
  - `git clone https://github.com/s-geffroy/chronosilicon.git`, puis `git checkout audit-01-baseline` ;
  - procédure de REPRODUCIBILITY.md §2 à §6, dans l'image ci-dessus ;
  - comparaison avec le site public (§8).
- **Résultats** : tout est conforme à ce qui est attendu.
- **Limite** : la machine est la même que celle du développement. Ce n'est **pas** une reproduction indépendante (KNOWN-LIMITATIONS.md §11).

## Archive du code source

- `chronosilicon-audit-01-baseline.zip`, produite par `git archive --format=zip --prefix=chronosilicon-491c989/ audit-01-baseline` : 457 entrées, sans `node_modules` ni `.git`. L'empreinte SHA-256 figure dans le SHA256SUMS.txt du dépôt Drive.
- **Recherche de secrets** sur l'arborescence (jetons GitHub, clés AWS, clés privées, mots de passe) : seuls ressortent des exemples fictifs de documentation, à savoir la clé d'exemple AWS `AKIAIOSFODNN7EXAMPLE` et des motifs de test dans `.claude/skills/session-handoff/`. Aucun secret réel.
- **Contenu de `.claude/`** : agents et skills de l'outillage du mainteneur, versionnés dans le dépôt public, sans lien avec le site.
