# ADR-0003 : Branche `develop` et publication conditionnée aux portes

- Statut : accepté (décision utilisateur du 2026-11-26)
- Contexte : le dépôt `s-geffroy/chronosilicon` est public, et un push sur `main` publie immédiatement (CS-13 : pas de statut « V1 publiée » sans G1).
- Décision :
  - Le travail est poussé sur `develop`. Le workflow `ci.yml` valide toutes les branches, sans déployer.
  - `pages.yml` ne se déclenche que sur `main`. Il rejoue les contrôles bloquants avant de construire et de déployer.
  - La fusion `develop` → `main` se fait en fast-forward, sans `--force`, et seulement après un rapport de porte PASS.
- Prérequis manuel du propriétaire : Settings > Pages > Source = GitHub Actions.
- Vérification de publication :
  - run `pages` terminé en succès (API publique GitHub) ;
  - HTTP 200 sur l'URL ;
  - `version.json.commit` égal au SHA poussé ;
  - parcours inspecté dans un navigateur.
