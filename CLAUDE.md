# Regles permanentes -- CHRONOSILICON

Lire avant toute modification : `PROJECT_STATUS.md`, `NEXT_ACTIONS.md`,
`docs/kit/PROMPT_MAITRE_CLAUDE_CODE.md`, `docs/CS-01_Decisions.md`,
`docs/CS-14_Contrat.md`, `docs/adr/`.

## Projet
- Atlas interactif et pedagogique des echelles de temps, FR/EN : comparer sur
  une meme echelle des phenomenes informatiques, physiques, biologiques,
  physiologiques, industriels, astronomiques et de la vie courante (ADR-0012,
  R1 = C). Ne pas privilegier l'informatique ; enrichir le corpus par lots
  equilibres. TypeScript strict + Svelte + Vite + D3, monorepo npm workspaces.
- **Directive R1 (v2.0, v2.1) en vigueur** : elle prevaut sur D1-D18 en cas de
  contradiction de gouvernance. D1-D18, les portes G0-G5, G-FINAL et les audits
  sont des references historiques (archives a conserver), pas des exigences de
  publication. P3 est un backlog facultatif. Pas de nouvel audit generaliste,
  QCM ni dossier probatoire par lot. Choix mineurs : ADR dans `docs/adr/`.
- **Controle de livraison unique et automatise** : la CI (`ci.yml`), soit
  npm ci, audit:gate, lint, typecheck, validate:data, test, build,
  publication:check, manifeste, e2e sur l'artefact, verification du manifeste.
  Ne jamais contourner un controle pour publier.
- Decision utilisateur requise seulement pour : changement majeur de
  perimetre, cout, action destructive, visibilite ou licence, question
  juridique substantielle.
- **Aucune donnee, mesure, distribution, test ou publication inventes.** Toute
  valeur a une source consultee, un localisateur, des conditions, une unite et
  un statut. Une valeur inconnue reste inconnue (null explicite). Intervalle
  quand la variabilite est significative. Durees conventionnelles
  (`conventional`) et ordres de grandeur illustratifs (`illustrative`, avec
  plage) admis s'ils sont sources et signales (ADR-0012).
- Gouvernance proportionnee (ADR-0012) : pas de certification ni d'audit
  systematique ; la porte automatique et l'accord de l'utilisateur pour publier
  suffisent.
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
- **Publier, c'est pousser sur `main`** (le depot est public). Cycle courant
  (directive v2.0 §7) : un lot petit et coherent sur une branche, la CI verte,
  puis une avance rapide de `main`, sans force ; on verifie ensuite le commit
  servi (`version.json`) et les fonctionnalites touchees. Une regression se
  corrige par un commit normal.
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
