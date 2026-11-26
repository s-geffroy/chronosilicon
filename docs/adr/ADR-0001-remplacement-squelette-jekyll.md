# ADR-0001 : Remplacement du squelette Jekyll par une chaîne Vite/Svelte

- Statut : accepté (décision utilisateur du 2026-11-26)
- Contexte : le dépôt a été créé depuis le template VPS `github-pages-ci` (Jekyll 4, Gemfile, service `bundle`). D11 impose TypeScript/Svelte/Vite/D3 et un site statique sur GitHub Pages. Aucun contenu Jekyll n'avait été publié (Pages renvoyait 404 et le premier run Actions avait échoué).
- Décision :
  - Suppression de `Gemfile`, `Gemfile.lock`, `_config.yml`, `index.md`, `404.html` et `_posts/`.
  - Le workflow `pages.yml` construit désormais l'application Vite.
  - `CLAUDE.md` et `README.md` sont réécrits. Ils gardent les règles VPS : périmètre, secrets, « publier c'est pousser », réglage Settings > Pages, pas de CNAME prématuré.
  - Le kit de reprise est copié tel quel dans `docs/` (sommes SHA-256 vérifiées). `specs/` est conservé.
- Conséquences : une seule chaîne d'outils (Node), et plus de `exclude:` Jekyll à maintenir. Seul `apps/web/dist/` est publié, donc `CLAUDE.md`, `compose.yaml` et `app.yaml` ne peuvent plus fuiter sur le site.
- Réversibilité : l'historique Git conserve le squelette (commit 9296983).
