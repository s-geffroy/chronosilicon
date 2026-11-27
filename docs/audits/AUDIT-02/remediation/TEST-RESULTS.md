# Résultats de tests : REMEDIATION-02

**Toutes ces validations sont internes** : elles sont exécutées par le mainteneur, sur sa machine ou dans la CI du dépôt. La seule validation indépendante est l'audit de ChatGPT, qui reste à faire sur rc3.

## Environnement

- Image : `mcr.microsoft.com/playwright:v1.65.0-noble@sha256:9beb546099e11f52d62e505537914870e01a67e0e6b00ae41da4775324e73dbe`, Node v26.13.1, npm 11.20.0, la même que la CI.
- Hôte : Linux 6.8.0-147-generic x86_64.

## 1. Porte officielle sur clone neuf

```sh
git clone https://github.com/s-geffroy/chronosilicon.git fresh && cd fresh && git checkout 9227a8e
npm ci && sh scripts/run-gate.sh rc4-fresh      # dans le conteneur
```

- **Version candidate rc4** : commit `9227a8e0f3d310831ea2e6866a66dc692ed3f1e8`, `dirty=0`, porte du 2026-11-27T13:44:23Z, journaux `docs/reports/logs/rc4-fresh/`. Résultat identique à rc3 : toutes les étapes PASS, 309 unitaires, 100 e2e.
- **Version remplacée rc3** : commit `16093cf17296cf4499e62750284cc01d7a1f8c82`, `dirty=0`, porte du 2026-11-27T13:34:54Z. Le détail ci-dessous vaut pour les deux.
- Étapes : `ci audit:gate lint typecheck validate:data test build publication:check dist:manifest-write test:e2e dist:manifest-check`. **Toutes PASS**, `overall=PASS`.
- `audit:gate OK production=0 dev={"moderate":8} advisories=GHSA-g3hv-75wg-m249 exceptions=1`.
- Unitaires : **309** tests, 22 fichiers. On en comptait 281 en rc2 : 18 tests ont été ajoutés pour la porte de vulnérabilités et 12 pour la politique de publication ; 2 tests unitaires de l'ancienne heuristique ont été retirés, car remplacés.
- `publication:check OK policy=PUB-1 files=6/6 withheldTexts=386 window=6 words`.
- E2E : **100** tests sur l'artefact construit une seule fois (`E2E_PREBUILT=1`), en 2,3 min.
- Manifeste de l'artefact : vérifié après les e2e ; SHA-256 du manifeste : `6ff91fa6…17ca`.
- Journaux : `docs/reports/logs/rc3-fresh/` et `docs/reports/logs/rc4-fresh/`.

## 2. CI GitHub

| Commit | Run | Résultat |
|---|---|---|
| `16093cf` (code testé de rc3) | 46008291593 | **success**. Il contient `publication:check` et la nouvelle porte. |
| `5ebefa4` (commit du tag rc3) | 46009305550 | **failure** au lint : `probes-rc2.cjs` utilise `require()`. Le fichier avait été ajouté après `16093cf`, et le tag a été posé sans attendre la CI de son commit. **rc3 est remplacée.** |
| `9227a8e` (code testé de rc4 : exclusion du lint pour la preuve tierce) | 46009666098 | **success** |

## 3. Sondes de l'auditeur (AUDIT-02)

- **Script** : `probes/probes-rc2.cjs` de ChatGPT, non modifié. SHA-256 `f6769ef6…4255`, conforme à `AUDIT-02-SHA256SUMS.txt`.
- **Exécution** : sur les clones neufs de `16093cf` puis de `9227a8e`, sous **Node 26.13.1** (l'auditeur utilisait Node 22.16.0), avec le TypeScript du clone :
  `TYPESCRIPT_PATH=…/node_modules/typescript node probes-rc2.cjs <clone>`.
- **Résultat** : **18/18**, `failures=0` dans les deux cas (`logs/probes-rc3-fresh-node26.log`, `logs/probes-rc4-fresh-node26.log`). La sonde `012/017-public-quotes` vérifie encore 185 valeurs `withheld`, citation et énoncé nuls.

## 4. AUD02-001 : avant et après sur fixtures

- **Avant** : logique rc2 rejouée (`old-gate-harness.ts`, `logs/aud02-001-before.txt`). 6 cas sur 11 passent à tort.
- **Après** : porte réelle (`run-gate-fixtures.sh`, `logs/aud02-001-after.txt`). Seul le rapport réel passe.

## 5. AUD02-002 : contrôle du site

| Cible | Résultat |
|---|---|
| Site construit à `16093cf` | 0 fuite |
| Site **en ligne**, commit `491c989` (index, JS, CSS et `version.json` téléchargés le 2026-11-27) | **FAILED (943)** : c'est le résultat attendu, qui montre que le contrôle détecte (`logs/aud02-002-live-site-check.txt`) |

Autres vérifications :
- **Reconstruction des données** : `npm run curate && npm run build:data` donne `git status --porcelain data/` vide, une fois `data/publication/` suivi.
- **Corpus** : version `0.3.0+0c9ebc16ce31`, au lieu de `965d1230a867` en rc2. Le changement vient de l'entrée `data/publication/text-decisions.json` et des passages retirés en plus.

## 6. Tous les essais, échecs compris

| Essai | Résultat | Suite |
|---|---|---|
| `unzip` absent de l'hôte pour ouvrir l'archive AUDIT-02 | échec | Archive ouverte avec le module `zipfile` de Python |
| Logique rc2 sur fixtures | 6 faux PASS | Preuve d'AUD02-001 |
| Première construction PUB-1, sans aucune décision | 444 erreurs, normal | Brouillon de décisions |
| Construction avec les décisions | 1 fuite : « more than 1.2 TB/s » | **Défaut de mon code** : une reprise qui chevauchait une citation était ignorée. Corrigé par l'union des deux, et testé. |
| Construction suivante | 2 décisions périmées et 4 fuites | Décisions mises à jour (hbm3e, KPTI) |
| Revue des écarts avec rc2 | Une décision « publier » portait sur un passage retiré en rc2 (KPTI) | Repassé en retrait. Un test empêche désormais toute publication de passage retiré en rc2. |
| Lint | 1 erreur (variable inutilisée) | Corrigée |
| Message du commit `7f69b83` | Décomptes inexacts (30/379 au lieu de 31/378) | Rectifiés dans le commit `e1c04c4`, sans réécriture d'historique |
| `PUBLICATION-POLICY.md` | « 17 reprises » au lieu de 16 | Corrigé (commit `16093cf`) |
| CI du commit du tag rc3 (`5ebefa4`) | **failure** au lint, sur le script de l'auditeur | **Erreur de procédure** : le tag a été posé sans attendre la CI du commit documentaire. Correction `9227a8e` (exclusion du lint pour `docs/audits/**/probes/**`). Porte et sondes rejouées sur un nouveau clone neuf : PASS et 18/18. CI verte. Tag `rc4` posé seulement après la CI verte de son propre commit. |

Aucun journal de porte n'a été écrasé. La porte a été lancée deux fois sur clone neuf, une fois par version candidate (`rc3-fresh`, `rc4-fresh`).

## 7. Non fait

- Pas de reproduction sur une autre machine.
- Pas d'audit navigateur manuel, ni de lecteur d'écran.
- Pas de revue juridique.
- `pages.yml` non exécuté.
