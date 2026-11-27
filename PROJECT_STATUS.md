# PROJECT_STATUS — CHRONOSILICON

Mise à jour : 2026-11-27. Référence canonique : GitHub `s-geffroy/chronosilicon`. Directive en vigueur : R1 = C (ADR-0012), directives R1 v2.0 et v2.1. Les états antérieurs (portes, audits, remédiations) sont dans `docs/archives/PROJECT_STATUS_2026-11-27_avant-R1.md`.

## En ligne

- **Site** : https://s-geffroy.github.io/chronosilicon/ sert encore **`491c989`** (V5, référence d'AUDIT-01).
- **PUBLICATION-01 (D18 = B)** : la version candidate `publication-01-rc5` (tag sur `c2f191e`, porte sur clone neuf PASS, CI verte) est **prête, mais pas publiée**. La session de l'agent n'a pas la permission de pousser sur `main` ; la publication attend l'utilisateur.

## En cours : branche `editorial-r1c` (R1 v2.1)

- **Atlas transversal**. Douze univers, avec une projection éditoriale qui permet plusieurs univers par phénomène, sans dupliquer de mesure. Nouveaux domaines : biologie, astronomie, industrie, vie quotidienne, chimie, cognition, transports, nature, géologie. Provenances `conventional` et `illustrative`, signalées dans l'interface.
- **Chronologie universelle** de 10⁻¹⁸ à 10¹⁸ s :
  - treize bandes cliquables ;
  - zoom par décennie, et fenêtre étendue quand une valeur l'exige (temps de Planck) ;
  - recherche FR/EN ;
  - filtre multi-univers, avec un état partageable dans l'URL ;
  - double échelle : physique en haut, subjective en bas ;
  - légende, et vue tableau conservée.
- **Comparaisons entre univers**, calculées à partir du corpus : cycle et battement de cœur, RAM et réflexe, réseau et marathon, lumière de Mars et match de football, sommeil et âge de la Terre.
- **Sous-titre** « An Open Atlas of Time », signature, bandeau « prototype expérimental ».
- **Corpus** : 279 valeurs qualifiées, dont 41 nouvelles hors informatique : physique, astronomie, biologie, physiologie, industrie, vie quotidienne. Chacune a été vérifiée contre sa source par le mainteneur. Deux doublons ont été écartés ; une valeur reste en attente (saccade, source primaire non lue).
- **Contrôles** : 324 tests unitaires, 116 e2e sur l'artefact, `publication:check` OK, `audit:gate` OK.

## Contrôle de livraison

- **Contrôle unique et automatisé** : la CI (`ci.yml`), et `scripts/run-gate.sh` en local.
- **Exception de sécurité** : GHSA-g3hv-75wg-m249, outils de lint, en développement seulement ; elle expire le **2027-01-31**.
- **PUB-1** reste en vigueur pour les extraits tiers (ADR-0011).
