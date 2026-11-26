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

### Ajouté (V2)
- Espaces Architecture, Comparaison et Observateurs. Groupes curés et observateurs dérivés du corpus, invariants de compatibilité (ADR-0006). Revue contradictoire G2 intégrée.

### Ajouté (V3–V5)
- V3 : espace Simulation, 5 scénarios dont toutes les durées viennent du corpus, chemin critique, ressources, journal d'événements, export (ADR-0007).
- V4 : Immersion, journal à la première personne dérivé des événements simulés (ADR-0008).
- V5 : Laboratoire (registre des sources, valeurs écartées et motifs, mesure navigateur avec statistiques documentées), `npm run contribute:check`, modèle d'issue (ADR-0008).
- Revues contradictoires G3 et G4/G5 intégrées ; correctifs responsive mobile.

### Ajouté (lot 2 du corpus, M01)
- 112 nouvelles valeurs extraites et vérifiées indépendamment ; corpus publié de 129 à **239** valeurs qualifiées, 15 domaines sur 15 (logique et émergent inclus).
- Grandeur `compute_rate` (flop/s) : TOP500 de 1993 à 2026 ; 7 nouveaux groupes de comparaison ; observateur « cycle de correction d'erreurs quantique ».
- Définitions des types de provenance (ADR-0005) ; test de précédence de curation.

### Corrigé (mineurs de la revue du lot 2)
- Audit des bornes sur tout le corpus (11 encodées), alerte de curation et test associé ; fiche affichant ≥/≤ ; conversions décimales exactes ; oracle des calculs à 1e-12 ; notes de groupes et observateur précisés ; ères et affirmations non sourcées retirées.

### Ajouté (incertitude structurée)
- Champ `uncertainty` des mesures (ADR-0009) : écart-type, erreur-type, « ± » non précisé, intervalle de confiance ; formulation de la source, n, normalisation SI, invariants, affichage dans la fiche et le tableau, export CSV. Trois dispersions publiées renseignées.

### Modifié
- Remplacement du squelette Jekyll du VPS par la chaîne Node/Vite (ADR-0001).

### Corrigé (revue contradictoire du 2026-11-26)
- Suppression de la synthèse automatique de protocoles et d'entrées de calcul dans la curation.
- Légende de l'axe logarithmique, champ fréquence, permissions du workflow Pages, arrondis et étiquettes d'affichage, injection CSV, valeurs calculées stockées en pleine précision.
