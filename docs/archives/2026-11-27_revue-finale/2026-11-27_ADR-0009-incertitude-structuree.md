# ADR-0009 : Incertitude structurée des mesures

- Statut : accepté (choix mineur réversible, 2026-11-26). Suite de la revue du lot 2 (m17).
- Contexte : CS-04 prévoit une incertitude dont l'absence est un `null` explicite. CS-06 et CS-11 (V03) interdisent toute statistique fabriquée. Jusqu'ici le schéma n'admettait que `null` : les dispersions publiées (par exemple « 63 ± 17 µs ») restaient dans le texte des conditions, invisibles pour les exports et les tests.
- Décision :
  1. `uncertainty` vaut `null` ou un objet `{type, value, low, high, level, sampleCount, statement, locator}` :
     - `standard-deviation`, `standard-error` ou `unspecified-plus-minus` : `value` est la demi-largeur « ± » dans l'unité de la mesure ; `low`, `high` et `level` sont nuls ;
     - `confidence-interval` : `low`, `high` et `level` (par exemple 0,95) sont renseignés, et `value` est nul. L'intervalle doit contenir la valeur ;
     - `statement` contient la **formulation littérale de la source** et `locator` dit où elle se trouve.
  2. **Uniquement ce que la source publie.** Le type n'est jamais deviné : un « ± » dont la nature n'est pas dite est `unspecified-plus-minus`, et une erreur-type exige n.
  3. **Une dispersion ou des statistiques exigent une valeur `measured` ou `estimated` et un protocole** (CS-04 : « aucune valeur statistique sans protocole »).
     - Les tolérances des fiches techniques (`documented`) ne sont pas modélisées pour l'instant : c'est une forme refusée, pas une absence de principe.
     - Une valeur `calculated` sans propagation affiche « non propagée », et non « non publiée ».
  4. La normalisation SI produit `uncertaintySI` et `quantilesSI`. Les exports CSV et JSON portent le type, les bornes, n, les quantiles et leurs équivalents SI.
  5. **Un « ± » n'est jamais affiché sans son type**, ni dans la fiche ni dans le tableau, ni pour les lecteurs d'écran (par exemple « ± 25 ms (± non précisé) »). La fiche ajoute n et la formulation de la source.
  6. Le format strict des contributions accepte un champ `uncertainty` facultatif, validé par le même schéma.
  7. **n** (`sampleCount`) : le nombre d'unités indépendantes derrière la statistique, tel que la source le donne (sujets, exécutions, requêtes). Il doit concorder entre `uncertainty` et `statistics`. Dans `statistics`, n peut être `null` **seulement** si la source ne le publie pas, et `sampleCountNote` l'explique alors (par exemple MLPerf : nombre de requêtes non publié, au moins 100). n n'est jamais inventé.
  8. **Invariants supplémentaires** :
     - pas de « ± » sur une valeur qui est une borne unilatérale ;
     - pas d'intervalle de confiance dégénéré ;
     - la formulation de la source doit contenir la valeur de la dispersion ;
     - règles conditionnelles dans le schéma (un intervalle n'a pas de ± ; une erreur-type a un n), de sorte que `contribute:check` les attrape avant le build ;
     - **garde sur les données** : toute valeur mesurée dont l'extrait ou les conditions publient un ±, un écart-type, une erreur-type, un intervalle de confiance ou un percentile doit les avoir structurés (test).
- Données renseignées (2026-11-26), depuis les verdicts des vérificateurs. Incertitudes :
  - phase de fermeture d'un clignement volontaire : ± 2 ms, **erreur-type**, n = 25 (légende du tableau 1 : « mean ± s.e. ») ;
  - clignement volontaire complet : ± 25 ms, **non précisé** (la légende « s.e. » s'applique au tableau 1, où 572 ms ne figure pas) ;
  - latence moyenne du décodeur quantique : ± 17 µs, **non précisé**, n non publié.

  Statistiques (après la revue du modèle, M3) :
  - lancement d'un noyau CUDA vide sur H100 et H200 : P5, P50 et P95 du tableau III, n = 150 exécutions, méthode non précisée ;
  - six mesures MLPerf v5.0 : P50 et P99 de LoadGen, n non publié et expliqué ;
  - quatre RTT Azure : médianes (P50), nombre de sondes non publié.
- **Formes refusées** dans `uncertainty`, chacune avec la conduite à tenir :
  - écart interquartile, P5–P95 et autres percentiles : ils vont dans `statistics` ;
  - min–max : une plage publiée (`low`/`high`), jamais une incertitude ;
  - incertitude élargie : à ajouter par ADR en exigeant le facteur k ; une incertitude-type au sens du GUM ne doit jamais être rangée en écart-type ;
  - ± asymétrique, ou ± exprimé en % : non représentables aujourd'hui, ils restent dans les conditions jusqu'à une ADR ;
  - tolérances des fiches techniques : non modélisées.

## Amendement (2026-11-27, revue finale `docs/reports/review-2026-11-27-final.md`)

- `statement` est un **fragment littéral unique** de la source (par exemple la cellule « 76 ± 2 »). Le texte qui type la dispersion (légende « mean ± s.e. ») est cité dans `locator`, et non accolé à la formulation.
- L'invariant « la formulation contient la valeur » compare des **nombres entiers en tant que jetons** : 2 ne se trouve ni dans « n=25 » ni dans « 2.5 ». Pour un intervalle de confiance, les deux bornes doivent figurer dans la formulation.
- Affichage FR : un extrait de source en anglais porte « (extrait de la source, en anglais) », un texte de curation (protocole, méthode) porte « (texte de curation en anglais) ». Les deux sont balisés `lang="en"`, de même que la citation et les localisateurs. Les percentiles s'étiquettent avec `formatLevel` (P99,9 et non P100).
- CSV : un n inconnu est une cellule vide dans `uncertaintyN` comme dans `statisticsN`. `statisticsNNote` en donne la raison ; `uncertaintyStatement` et `statisticsMethod` reprennent ce qu'affiche la fiche.
