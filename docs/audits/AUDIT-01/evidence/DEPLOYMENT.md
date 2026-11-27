# Preuves de publication (AUDIT-01)

## Chaîne de publication

1. **Travail sur `develop`.** La CI (`.github/workflows/ci.yml`) s'y exécute sur chaque push : `npm ci`, lint, typecheck, validate:data, tests, build et e2e, dans l'image épinglée.
2. **Fusion vers `main`.** Elle se fait en fast-forward, jamais avec `--force`, et seulement après la porte de la version (ADR-0003).
3. **Déploiement depuis `main`.** `.github/workflows/pages.yml` rejoue les contrôles bloquants, e2e compris, sous le vrai chemin de base fourni par `actions/configure-pages`. Il construit ensuite `apps/web/dist`, le téléverse (`upload-pages-artifact`) et le déploie (`deploy-pages`).
   - **Permissions** : le job `build` n'a que `contents: read`. Seul `deploy`, qui n'exécute aucun code du dépôt, reçoit `pages: write` et `id-token: write`.
   - **Garde-fous** : aucun secret, et `if: github.ref == 'refs/heads/main'` sur les deux jobs.
4. **Réglage manuel du dépôt** : Settings > Pages > Source = « GitHub Actions ». Ce réglage n'est pas versionné. Il n'y a pas de fichier `CNAME`, et le domaine est `s-geffroy.github.io/chronosilicon/`.

## Publication du commit audité `491c989`

| Preuve | Valeur | Source |
|---|---|---|
| Run `ci` sur `develop` | completed / success, run 45963369976 (08:08:20Z → 08:10:13Z) | API GitHub, une requête, `logs/github-runs-491c989.txt` |
| Push fast-forward `develop` → `main` | `origin/main` = `491c989d46d0d75ecedd9741ef4b6586892b80ae` | `git rev-parse origin/main` |
| Run `ci` sur `main` | completed / success, run 45964408584 | idem |
| Run `pages` sur `main` | completed / success, run 45964408755 (08:16:32Z → 08:18:33Z) ; https://github.com/s-geffroy/chronosilicon/actions/runs/45964408755 | idem |
| Site | `HTTP/2 200`, `server: GitHub.com`, `last-modified: Fri, 27 Nov 2026 08:18:27 GMT` | `curl -sI https://s-geffroy.github.io/chronosilicon/` |
| `version.json` | `{"app": "0.1.0", "commit": "491c989d46d0d75ecedd9741ef4b6586892b80ae"}` | `curl -s …/version.json` |
| Identité binaire | 6 fichiers sur 6 identiques entre le build reproduit depuis un clone neuf du tag et les fichiers servis : `404.html`, `index.html`, `version.json`, `assets/index-CGDUCsWo.js`, `.js.map`, `assets/index-Do0BrHmH.css` | `logs/deploy-compare.txt` |

## Historique des publications (antérieures à l'audit)

Les publications sont des fast-forwards de `main`, consignés dans `PROJECT_STATUS.md` (section « Publication ») et dans les rapports de porte :
- `7ca44b5` : V1 ;
- `2881239` : V2 ;
- `178d4ad` : V3 à V5 ;
- `cf84cdd` : lot 2 ;
- `6f213d0` : mineurs du lot 2 ;
- `6bea223` : incertitude structurée ;
- `2fd9034` et `db9c30f` : revue finale ;
- `491c989` : référence de l'audit.

Pour chacune, `version.json` a été comparé au SHA poussé. Une exception : pour `6bea223`, le quota anonyme de l'API GitHub était épuisé, et le statut du run `pages` n'a pas été lu (KNOWN-LIMITATIONS.md §11).

## Accès en lecture pour l'auditeur

- Code : https://github.com/s-geffroy/chronosilicon/tree/audit-01-baseline
- Runs : https://github.com/s-geffroy/chronosilicon/actions
- Site : https://s-geffroy.github.io/chronosilicon/. Pour l'état en ligne, voir les paramètres d'URL documentés dans `apps/web/src/lib/url-state.ts`, par exemple `#/timeline?lang=en&level=scientific`.

## Après le gel

- La branche `develop` reçoit le commit du dossier probatoire, qui ne modifie que de la documentation.
- `main` reste à `491c989` pendant l'audit. Le site ne change donc pas.
- Toute publication ultérieure attend le rapport indépendant et le plan de remédiation.
