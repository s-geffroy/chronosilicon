# Regles permanentes -- CHRONOSILICON

Lire avant toute modification : `PROJECT_STATUS.md`, `NEXT_ACTIONS.md`,
`docs/kit/PROMPT_MAITRE_CLAUDE_CODE.md`, `docs/CS-01_Decisions.md`,
`docs/CS-14_Contrat.md`, `docs/adr/`.

## Projet
- Atlas pedagogique statique des echelles de temps informatiques, FR/EN.
  TypeScript strict + Svelte + Vite + D3, monorepo npm workspaces.
- **D1 a D17 sont validees et figees.** On ne les rouvre pas sans decision
  explicite de l'utilisateur. Les choix mineurs passent par une ADR dans
  `docs/adr/`.
- Portes CS-11 / CS-13 non compensatoires : M00 -> G0 -> G1 -> G2 ... G5. Une
  porte echouee ou non executee vaut NO-GO, et on ne declare jamais une version
  acceptee sans son rapport `docs/reports/G*.md`.
- **Aucune donnee, mesure, distribution, test ou publication inventes.** Toute
  valeur a une source consultee, un localisateur, des conditions, une unite et
  un statut. Une valeur inconnue reste inconnue (null explicite). Les valeurs
  illustratives vont dans `tests/fixtures/` uniquement.
- `data/raw/` est immuable (MANIFEST.sha256) ; `data/curated/` est derive par
  `scripts/curate.ts` ; `data/validated/corpus.json` est derive par
  `npm run build:data`.

## Outils (VPS)
- N'installer aucun runtime sur l'hote. Node, Playwright et les navigateurs
  tournent dans le service outil `node` (profil `cli`) :
  `sudo appctl run node npm ci`, puis `sudo appctl run node npm run check`
  et `sudo appctl run node npm run test:e2e`.
- Le tag d'image de `compose.yaml`, le `container:` de `.github/workflows/ci.yml`
  et la version de `@playwright/test` doivent rester identiques (ADR-0002).
- N'ajouter aucun service qui tourne dans `compose.yaml`.

## Publier
- **Publier, c'est pousser sur `main`.** Le depot est public. Le travail se
  fait sur `develop`, ou la CI ne fait que valider. On fusionne sur `main`,
  ce qui deploie, seulement si G1 (ou la porte de la version) est franchie
  (ADR-0003).
- Prerequis manuel : Settings > Pages > Source = **GitHub Actions**. Ne jamais
  rebasculer sur « Deploy from a branch ». Pas de fichier `CNAME` avant que le
  DNS resolve.
- En cas d'echec du workflow, lire l'onglet Actions avant de toucher au contenu.
- Jamais de `--force`, de changement de visibilite ou de permissions, ni de
  secret dans le workflow : `GITHUB_TOKEN` suffit.

## Perimetre et secrets
- Travailler uniquement dans /srv/apps/chronosilicon. Ne jamais toucher
  /opt/infra, `~/.claude/` ni les autres applications du VPS.
- Aucun jeton, mot de passe ni URL d'administration dans le depot, les prompts
  ou les logs.
- Drive est une copie documentaire datee (sans ecrasement), jamais un second
  referentiel : GitHub est canonique.

## Fin de session
Mettre a jour `PROJECT_STATUS.md`, `NEXT_ACTIONS.md`, `CHANGELOG.md`,
`docs/requirements-matrix.md` et les ADR, puis committer. Dire clairement ce qui
est pousse et publie, avec les liens verifies et les echecs restants.
