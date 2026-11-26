# ADR-0006 : V2, groupes de comparaison et observateurs dérivés du corpus

- Statut : accepté (choix mineur réversible, 2026-11-26)
- Contexte : CS-02 F04 et CS-13 V2/G2 portent sur trois points : compatibilité des données, transformations entre observateurs, distinction fréquence/performance. Le corpus V1 associe une mesure à un phénomène (ADR-0005), sans regroupement.
- Décision :
  1. **Groupes curés** (`data/curated/groups.json`, schéma `schemas/groups.schema.json`) :
     - `comparison` (générations côte à côte) et `hierarchy` (niveaux d'une même architecture) ;
     - chaque groupe déclare une comparabilité (`same-protocol`, `same-definition` ou `heterogeneous`) et une note FR/EN obligatoire ;
     - invariants bloquants : membres qualifiés, même grandeur, et protocole unique pour une hiérarchie.
  2. **Affichage sans classement** : les membres sont rangés par année, jamais par valeur. L'avertissement de comparabilité est toujours affiché, en texte. Pour les fréquences, un avertissement explicite rappelle qu'une fréquence n'est pas une performance.
  3. **Hiérarchies en cycles** : une latence en cycles se lit en secondes subjectives *dans le référentiel cycle du cœur lui-même* (τ = 1 s par cycle). Ce n'est pas une conversion physique : aucune fréquence n'est supposée. C'est la lecture directe de D1 (référentiel cycle principal).
  4. **Observateurs** (`data/curated/observers.json`, schéma dédié) :
     - observateurs **cadencés**, dérivés d'une fréquence qualifiée du corpus ;
     - observateurs **à opération de référence** (CS-07 : T = Δt/δ_ref·τ), dérivés d'une durée qualifiée ;
     - le cœur à 4 GHz est la seule convention du projet sans source ;
     - les hypothèses sont affichées : fréquence supposée constante, moyenne de population, etc.
  5. Le corpus publié inclut `groups` et `observers` résolus. Sa version passe à `0.2.0+<hash>`.
- Conséquences : l'ajout d'un groupe ou d'un observateur est une modification de données relue comme telle. Le regroupement par « phénomène commun » au niveau de l'ontologie reste possible plus tard, sans casser ce format.
