# Procédure de reproduction indépendante (AUDIT-01)

Objectif : permettre à un auditeur externe, sur sa propre machine, de reconstruire et de vérifier l'état de référence sans rien demander au mainteneur.

Le commit de référence et le tag sont définis dans BASELINE.md. Les commandes ci-dessous utilisent le tag `audit-01-baseline`.

## 0. Prérequis

| Élément | Exigence | Pourquoi |
|---|---|---|
| Git | toute version ≥ 2.30 | clonage et vérification du tag |
| Docker (ou Podman compatible) | capable de tirer une image de `mcr.microsoft.com` | toute la chaîne tourne dans l'image officielle Playwright, épinglée par digest, sans Node installé sur l'hôte |
| Image | `mcr.microsoft.com/playwright:v1.65.0-noble@sha256:9beb546099e11f52d62e505537914870e01a67e0e6b00ae41da4775324e73dbe` (Node v26.13.1, npm 11.20.0, Chromium, Firefox et WebKit inclus) | image identique à la CI (`.github/workflows/ci.yml`, `pages.yml`) et au conteneur local (`compose.yaml`) |
| Réseau | accès au registre npm public pendant `npm ci` uniquement | les dépendances sont figées par `package-lock.json` (lockfileVersion 3, intégrité SHA-512) |
| Ressources | 2 CPU, 3 Go de RAM, `--shm-size=1g` | les e2e lancent 4 navigateurs en parallèle |
| Python 3 (facultatif) | standard library | seulement pour régénérer les inventaires d'AUDIT-01 |

Sans Docker, on peut utiliser Node 26.13.1 et npm 11.20.0 avec `npx playwright install --with-deps`. Ce chemin **n'a pas été testé** par le mainteneur.

## 1. Cloner au commit audité

```sh
git clone https://github.com/s-geffroy/chronosilicon.git
cd chronosilicon
git checkout audit-01-baseline          # tag annoté
git rev-parse HEAD                      # doit afficher le SHA de BASELINE.md
git status --porcelain                  # doit être vide
```

L'archive ZIP déposée sur Drive (`chronosilicon-audit-01-baseline.zip`, produite par `git archive`) contient la même arborescence, sans `.git`. Sans `.git`, `version.json` porte `commit: "unknown"`, car le SHA vient de `GITHUB_SHA` ou, à défaut, de `git rev-parse` (`apps/web/vite.config.ts`). Pour obtenir un `version.json` identique au site depuis le ZIP, ajouter `-e GITHUB_SHA=491c989d46d0d75ecedd9741ef4b6586892b80ae` à la commande `docker run` de l'étape 2. Le reste est identique.

## 2. Lancer le conteneur outil

```sh
IMG=mcr.microsoft.com/playwright:v1.65.0-noble@sha256:9beb546099e11f52d62e505537914870e01a67e0e6b00ae41da4775324e73dbe
run() { docker run --rm --shm-size=1g -v "$PWD":/work -w /work \
          -u "$(id -u):$(id -g)" -e HOME=/work/.cache/home -e npm_config_cache=/work/.cache/npm \
          -e CI=1 -e TZ=Europe/Paris "$IMG" sh -c "$*"; }
```

`-u` évite des fichiers appartenant à root dans le clone. `HOME` et le cache npm restent dans le clone, qui les ignore via `.gitignore`.

## 3. Installer exactement les dépendances

```sh
run "npm ci"
```

Attendu : installation depuis `package-lock.json` sans modification (`git status --porcelain` reste vide) et `found 0 vulnerabilities` ou un avertissement d'audit. Les versions directes sont épinglées sans plage dans `package.json`. Les `overrides` imposent `vite` 8.3.8 et `playwright`/`playwright-core` 1.65.0 (voir BASELINE.md).

## 4. Valider les schémas, les données et le code

```sh
run "npm run lint"            # ESLint, 0 erreur attendue
run "npm run typecheck"       # tsc strict + svelte-check, 0 erreur attendue
run "npm run validate:data"   # schémas JSON 2020-12 (Ajv), MANIFEST des données brutes,
                              # invariants, corpus dérivé à jour ; attendu : « OK » et code 0
```

`validate:data` échoue si `data/validated/corpus.json` n'est pas exactement ce que la chaîne régénère, ou si un fichier de `data/raw/` ne correspond pas à `data/raw/MANIFEST.sha256`.

## 5. Reconstruire le corpus depuis les données brutes

```sh
(cd data/raw && sha256sum -c MANIFEST.sha256)  # sur l'hôte ; attendu : 12 fichiers « OK »
run "npm run curate && npm run build:data"
git status --porcelain                           # attendu : vide
```

`curate` régénère `data/curated/{phenomena,measurements}.json`, `data/sources/sources.json` et `data/curated/CURATION_REPORT.tsv` à partir de `data/raw/` et de `data/curated/decisions.json`. `build:data` régénère `data/validated/corpus.json`.

L'absence de différence Git prouve que les fichiers dérivés publiés sont reproductibles depuis les données brutes et les décisions.

Comptes attendus, d'après `CORPUS-INVENTORY.json` :
- 245 candidates, dont 239 qualifiées, 2 en attente et 4 contestées ;
- 120 sources ;
- 22 groupes, 9 observateurs et 5 scénarios ;
- `corpusVersion` = `0.3.0+b82951f47093`.

## 6. Tests unitaires, tests fonctionnels et build

```sh
run "npm test"        # Vitest ; attendu : 17 fichiers, 212 tests, tous « passed »
run "npm run test:e2e" # Playwright ; construit le site sous /chronosilicon/, le sert par
                      # `vite preview`, puis exécute 24 scénarios × 4 projets = 96 tests ; attendu : « 96 passed »
run "npm run build"   # build de production dans apps/web/dist/
cat apps/web/dist/version.json   # {"app": "0.1.0", "commit": "<SHA de BASELINE.md>"}
```

Pour tout enchaîner avec les journaux, utiliser la porte du projet : `run "sh scripts/run-gate.sh audit-repro"`. Elle écrit `docs/reports/logs/audit-repro/summary.txt`, avec `overall=PASS` attendu.

**Déterminisme.** Deux builds successifs donnent des fichiers identiques au bit près. Pour le vérifier : lancer `find apps/web/dist -type f -exec sha256sum {} + | sort -k2` après chaque build et comparer les deux sorties.

## 7. Lancer l'application localement

```sh
docker run --rm -p 4173:4173 -v "$PWD":/work -w /work -u "$(id -u):$(id -g)" \
  -e HOME=/work/.cache/home "$IMG" \
  sh -c "npm run -w @chronosilicon/web preview -- --host 0.0.0.0 --port 4173 --base /chronosilicon/"
# puis ouvrir http://127.0.0.1:4173/chronosilicon/
```

Le site est entièrement statique : aucun backend, aucun appel réseau à l'exécution. Un test e2e exige qu'aucune requête ne parte vers une autre origine.

## 8. Vérifier la correspondance avec la version publique

```sh
curl -s https://s-geffroy.github.io/chronosilicon/version.json
# attendu : "commit" = SHA de BASELINE.md
cd apps/web/dist && find . -type f | sort | while read -r f; do
  l=$(sha256sum "$f" | cut -c1-64)
  r=$(curl -s "https://s-geffroy.github.io/chronosilicon/${f#./}" | sha256sum | cut -c1-64)
  [ "$l" = "$r" ] && echo "OK  $f" || echo "DIFF $f"
done
```

Attendu : `OK` pour chaque fichier. Le build doit avoir été fait **depuis un clone Git**, pour que `version.json` porte le SHA (voir §1). Le résultat obtenu par le mainteneur est consigné dans DEPLOYMENT.md.

Le build publié est fait par `pages.yml` avec `BASE_PATH` lu dans `configure-pages`, soit `/chronosilicon/`, la même valeur que le défaut local ; GitHub Pages sert les fichiers sans les transformer. Une différence indiquerait donc soit une source différente, soit une dérive de l'environnement de build (dépendances, image) : à investiguer avant toute conclusion. Résultat du mainteneur le 2026-11-27 : 6 fichiers sur 6 identiques (`logs/deploy-compare.txt`).

## 9. Ce qui reste à faire par l'auditeur

- **V08 sur une autre machine.** Jusqu'ici, tout a été exécuté sur **une seule machine** (le VPS du mainteneur) et sur les runners GitHub. La reproduction indépendante décrite ici n'a jamais été faite par un tiers.
- **Dépendance au registre npm.** `npm ci` n'est pas hors ligne, et l'intégrité SHA-512 du lockfile protège contre une substitution. La disponibilité future des paquets n'est pas garantie.
- **Contrôle du mainteneur au commit de référence.** Le mainteneur a refait l'opération depuis un clone neuf, sur la même machine : voir BASELINE.md, section « Contrôle de reproductibilité ».
