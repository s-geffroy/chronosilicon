# REMEDIATION-01 : rapport du mainteneur

- **Date** : 2026-11-27.
- **Auteur** : le mainteneur (session Claude Code, Claude Opus 5.5). Deux lots ont été délégués à des agents de développement de la même session, puis relus, intégrés et rejoués par le mainteneur : simulateur d'une part ; métrologie, observateurs et journal d'autre part.
- **Entrée** : `AUDIT-01_RAPPORT_v1.0.md` et `PROMPT_REMEDIATION-01_v1.0.md` (Drive `01_AUDIT_CHATGPT`). Les sondes de l'auditeur (`probes-core.cjs`, `probes.mjs`) ont été reprises comme tests de régression.
- **Nature** : correction et documentation par le mainteneur. Ce rapport n'est **pas** un audit et ne déclare aucune acceptation. La suite revient à AUDIT-02 et à l'utilisateur.

## 1. Résultat

- **18 constats traités** (FINDINGS-RESPONSE.md) :
  - 15 confirmés et corrigés ;
  - 1 confirmé, avec la valeur retirée de la publication (AUD-013) ;
  - 1 contesté avec démonstration (AUD-005) ;
  - AUD-012 corrigé pour toute publication future ; le contenu déjà publié attend une décision de l'utilisateur.
- **Version candidate** : tag `remediation-01-rc2`, **non publiée**. Code et données testés au commit `9e28892`. La candidate précédente, `rc1`, a échoué en CI à cause d'un défaut introduit par la correction d'AUD-018, corrigé depuis (TEST-RESULTS.md).
- **Porte complète PASS** :
  - 281 tests unitaires (212 à la référence) ;
  - 100 tests e2e, exécutés sur l'artefact déployable ;
  - porte de vulnérabilités ;
  - reconstruction des données depuis `data/raw` sans écart ;
  - build déterministe.
- **Aucune modification de `main` ni du site.**

## 2. Démarche

1. **Branche** `remediation-01` issue de `develop`, après vérification que `develop` ne diffère de la référence que par de la documentation. Le tag `audit-01-baseline` n'a pas bougé, et les archives Drive de Claude et de ChatGPT n'ont pas été touchées.
2. **Reproduction de chaque constat** sous Node 26, la version réelle de la CI. Les auditeurs utilisaient Node 22 avec une transpilation en mémoire. Chaque contre-exemple est devenu un test qui **échouait** sur la référence. Aucun oracle existant n'a été modifié. Deux attentes ont changé, chacune justifiée dans son test :
   - l'attente e2e sur `cmp-azure-rtt`, qui affirmait une comparabilité non fondée (AUD-010) ;
   - le délai, et non les attentes, du test d'accessibilité.
3. **Un commit par correction ou groupe cohérent**, avec la preuve avant et après dans le message et dans les notes.
4. **Porte complète** rejouée sur un commit propre, plus les contrôles complémentaires et les essais négatifs (TEST-RESULTS.md).

## 3. P0 : droits sur les extraits (AUD-012 et AUD-017)

- **Règle de précaution** (ADR-0011, SOURCE-RIGHTS.md) : aucun texte tiers littéral n'est publié pour une valeur dont une source n'a pas de redistribution `allowed`.
- **Registre extrait par extrait** : `EXCERPT-REGISTER.csv`, 281 lignes, dont 219 à retenir, parmi lesquelles 213 étaient publiques à la référence.
- **Revue des 27 sources `allowed`** : une source douteuse, la page Voyager créditée NASA/JPL-Caltech, est mise en revue.
- **Données de travail inchangées** : brutes et curées.
- **Décision demandée à l'utilisateur**, détaillée dans SOURCE-RIGHTS.md §4, sur trois points :
  - le site actuel, qui publie toujours ces extraits ;
  - le maintien des données brutes dans le dépôt public ;
  - l'historique Git, qu'aucune opération ne réécrira sans accord.

## 4. P1 : noyau

- **AUD-002 et AUD-003, simulateur** : annulations atomiques. Trois notions sont désormais distinctes : fin des tâches achevées, fin effective et horizon.
- **AUD-005** : chemin critique défini comme une chaîne de contraintes liantes et rendu vérifiable.
- **Ordre de la file** : formalisé dans l'ADR-0010.
- **AUD-007 et AUD-008** : référentiels segmentés complets, journal intégré sur l'intervalle absolu.
- **AUD-009** : les calculs forment un graphe acyclique.
- **AUD-010** : « même protocole » doit être prouvé ; trois groupes sont reclassés.
- **AUD-013** : la source primaire, relue, ne démontre pas les hypothèses de la loi de Little ; la valeur est retirée.
- La RAM des scénarios reste présentée comme une capacité abstraite.

## 5. P2 : robustesse

- **AUD-001, 006 et 011** : domaines numériques et finitude.
- **AUD-004** : activité, inactivité et recouvrement séparés.
- **AUD-015** : aller-retour de l'URL exact.
- **AUD-016** : traçabilité du CSV.
- **AUD-014** : politique de sécurité, porte avec exceptions datées et SBOM.
- **AUD-018** : un seul artefact, empreinté, testé, revérifié et déployé.
- **Performance et accessibilité** : mesures automatisées dans TEST-RESULTS.md. Les éléments qui demandent un humain y sont listés.

## 6. P3

La feuille de route est **distincte et non engagée** (ROADMAP-P3.md). Trois de ses items demandent une décision structurante :
- la grandeur énergie ;
- un schéma de distributions et de protocole structuré ;
- la marque et les droits.

## 7. Ce qui reste ouvert

- Décision de l'utilisateur sur les contenus déjà publiés (SOURCE-RIGHTS.md §4).
- AUDIT-02 : vérification indépendante des corrections et reproduction sur une autre machine.
- `pages.yml` modifié n'a jamais tourné, puisqu'il ne s'exécute que sur `main`.
- Exception de vulnérabilité à renouveler ou à résorber avant le 2027-01-31.
- Écarts P3 et éléments qui demandent un humain : lecteur d'écran, audit WCAG manuel, revue juridique, marque.

## 8. Livrables

| Fichier | Contenu |
|---|---|
| REMEDIATION-01_REPORT.md | Ce rapport |
| FINDINGS-RESPONSE.md | Les 18 constats : statut, avant et après, tests, commit |
| TEST-RESULTS.md | Environnement, porte, contrôles complémentaires, performance, accessibilité, essais négatifs |
| SOURCE-RIGHTS.md, EXCERPT-REGISTER.csv, generate-excerpt-register.py | Politique, registre et générateur |
| CONFORMITY.md | D1–D17 et écarts restants |
| ROADMAP-P3.md | Feuille de route P3 |
| RELEASE-CANDIDATE.md | Version candidate, procédure, risques |
| notes-simulator.md, notes-observers.md | Détail des lots délégués : sorties réelles, `fichier:ligne` |
| sbom.cdx.json | SBOM CycloneDX 1.5 au commit candidat |
| SHA256SUMS.txt | Empreintes des fichiers ci-dessus |

Les journaux sont dans `docs/reports/logs/remediation-01/`. Les ADR nouvelles ou amendées sont l'ADR-0010 (nouvelle), l'ADR-0011 (nouvelle), ainsi que les amendements de l'ADR-0006 et de l'ADR-0009.
