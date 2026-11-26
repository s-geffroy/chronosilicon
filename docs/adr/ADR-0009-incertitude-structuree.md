# ADR-0009 : Incertitude structurée des mesures

- Statut : accepté (choix mineur réversible, 2026-11-26). Suite de la revue du lot 2 (m17).
- Contexte : CS-04 prévoit une incertitude dont l'absence est un `null` explicite. CS-06 et CS-11 (V03) interdisent toute statistique fabriquée. Jusqu'ici le schéma n'admettait que `null` : les dispersions publiées (par exemple « 63 ± 17 µs ») restaient dans le texte des conditions, invisibles pour les exports et les tests.
- Décision :
  1. `uncertainty` vaut `null` ou un objet `{type, value, low, high, level, sampleCount, statement, locator}` :
     - `standard-deviation`, `standard-error` ou `unspecified-plus-minus` : `value` est la demi-largeur « ± » dans l'unité de la mesure ; `low`, `high` et `level` sont nuls ;
     - `confidence-interval` : `low`, `high` et `level` (par exemple 0,95) sont renseignés, et `value` est nul. L'intervalle doit contenir la valeur ;
     - `statement` contient la **formulation littérale de la source** et `locator` dit où elle se trouve.
  2. **Uniquement ce que la source publie.** Le type n'est jamais deviné : un « ± » dont la nature n'est pas dite est `unspecified-plus-minus`, et une erreur-type exige n.
  3. **Une dispersion exige une valeur `measured` ou `estimated`** : une spécification ou un calcul du projet n'ont pas de dispersion publiée.
  4. La normalisation SI produit `uncertaintySI`. Les exports CSV et JSON portent le type, les bornes et n.
  5. La fiche affiche la dispersion avec son type en toutes lettres, n et la formulation de la source. Une valeur sans dispersion publiée affiche « Inconnue ».
  6. Le format strict des contributions accepte un champ `uncertainty` facultatif, validé par le même schéma.
- Données renseignées (2026-11-26), depuis les verdicts des vérificateurs :
  - phase de fermeture d'un clignement volontaire : ± 2 ms, **erreur-type**, n = 25 (légende du tableau 1 : « mean ± s.e. ») ;
  - clignement volontaire complet : ± 25 ms, **non précisé** (la légende « s.e. » s'applique au tableau 1, où 572 ms ne figure pas) ;
  - latence moyenne du décodeur quantique : ± 17 µs, **non précisé**, n non publié.
- Non retenu : les intervalles interquartiles, les min–max et les incertitudes élargies (k), faute de cas dans le corpus. Ils s'ajouteront par une nouvelle ADR le jour où une source les publie. Un min–max reste une plage publiée (`low`/`high`), jamais une incertitude.
