# Contribuer à CHRONOSILICON

Merci de votre intérêt. Le projet suit des règles strictes de traçabilité (`docs/CS-11_Validation.md`).

## Données
- **Aucune valeur sans source consultée**. Chaque valeur doit avoir une URL ou un DOI, un localisateur précis (page, tableau, section), un extrait littéral court, une date d'accès, la licence ou les conditions de la source, et les conditions de validité : modèle, version, configuration, protocole.
- Le type de provenance (`measured`, `documented`, `calculated`, `estimated`) est indépendant du statut de vérification (`pending`, `qualified`, `contested`, `rejected`). Les valeurs `illustrative` ne sont jamais admises dans le corpus.
- Les statistiques (P50, P99…) ne sont acceptées qu'avec n et la méthode de calcul des quantiles. Un min/max n'est pas un intervalle de confiance.
- Une dispersion publiée (« ± », écart-type, erreur-type, intervalle de confiance) peut être saisie dans le champ facultatif `uncertainty` (ADR-0009), avec la formulation exacte de la source. Si la source ne dit pas ce que représente le « ± », utilisez `unspecified-plus-minus`. Une erreur-type exige n. Une dispersion ou des percentiles exigent une valeur `measured` ou `estimated` et un protocole. Les percentiles publiés vont dans `statistics` (n `null` seulement si la source ne le publie pas, avec `sampleCountNote`). Les formes refusées sont listées dans ADR-0009.
- Ne copiez jamais un document dont la redistribution n'est pas permise : référencez-le.
- Procédure : ajouter un fichier d'extraction dans `data/raw/` (immuable, avec sa somme dans `MANIFEST.sha256`). Une autre personne vérifie et produit un fichier `verify-*.json`. On lance ensuite `npm run curate`, puis `npm run build:data`.
- Les données contradictoires sont conservées (statut `contested`), pas supprimées.

## Code
- TypeScript strict, fonctions pures pour les calculs, aucune dépendance réseau à l'exécution, aucun secret.
- `npm run check` et `npm run test:e2e` doivent passer. La CI est bloquante.
- Les changements structurants demandent une décision du mainteneur ; les choix mineurs se documentent dans une ADR (`docs/adr/`).
- Les textes visibles s'écrivent en FR et en EN dans `apps/web/src/lib/i18n.ts`. Une clé manquante fait échouer le typage.

## Pull requests
Décrivez ce qui change, les tests exécutés et leurs résultats, et l'impact sur les portes. Les PR de données passent par une revue avant fusion.

Ce document est sous CC BY 4.0. Le code des contributions est accepté sous Apache-2.0.
