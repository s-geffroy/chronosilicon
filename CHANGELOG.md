# Changelog

Format inspiré de Keep a Changelog. Versionnement sémantique : aucun tag tant qu'une version n'est pas validée par sa porte et publiée.

## [Non publié] — 0.1.0 (develop)

### Ajouté
- M00 : audit de l'environnement, du nom, des sources (59 sources, 39 exclusions), décision GM00.
- V0 :
  - JSON Schema 2020-12 et invariants (unités, références, provenance, protocoles, quantiles, calculs) ;
  - paquets `metrology`, `observers` (N = f·Δt, ∫f dt, observateur de référence, propagation, transfert) et `ontology` ;
  - pipeline raw → verdicts → curation → corpus qualifié (129 valeurs) ;
  - oracles CS-03 et propriétés CS-07.
- V1 : application Svelte/Vite/D3, avec chronologie logarithmique, fiches à trois niveaux de lecture, convertisseur, FR/EN, filtres, alternative tabulaire, export JSON/CSV et lien de partage. Les espaces non réalisés sont signalés.
- V3 (préparation) : moteur à événements discrets en femtosecondes BigInt, testé, non exposé.
- CI GitHub Actions (`ci.yml`) et workflow Pages (`pages.yml`). Image Playwright épinglée par digest, actions épinglées par SHA.
- Gouvernance : licences Apache-2.0 / CC BY 4.0 / CC0 1.0, NOTICE, CITATION.cff, CONTRIBUTING, CODE_OF_CONDUCT, ADR-0001 à ADR-0005.

### Modifié
- Remplacement du squelette Jekyll du VPS par la chaîne Node/Vite (ADR-0001).

### Corrigé (revue contradictoire du 2026-11-26)
- Suppression de la synthèse automatique de protocoles et d'entrées de calcul dans la curation.
- Légende de l'axe logarithmique, champ fréquence, permissions du workflow Pages, arrondis et étiquettes d'affichage, injection CSV, valeurs calculées stockées en pleine précision.
