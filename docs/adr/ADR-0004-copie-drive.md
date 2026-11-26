# ADR-0004 : Copie documentaire datée dans Google Drive

- Statut : accepté (décision utilisateur du 2026-11-26)
- Décision :
  - À chaque porte, une copie datée des documents de pilotage (statut, rapports, audit) est déposée dans `ChatGPT / 04_TECHNOLOGIES_INGENIERIE / CHRONOSILICON`.
  - Chaque dépôt crée de nouveaux fichiers nommés `AAAA-MM-JJ_…`. Rien n'est écrasé.
  - Chaque fichier déposé est relu après dépôt.
  - En parallèle, une archive locale va dans `docs/archives/`.
- GitHub reste l'unique référentiel canonique. Drive n'est jamais une source de développement.
