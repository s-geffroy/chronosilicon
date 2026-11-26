# ADR-0007 : V3, scénarios de simulation adossés au corpus

- Statut : accepté (choix mineur réversible, 2026-11-26)
- Contexte : CS-08 demande un moteur abstrait à événements discrets. Les durées y sont fixes, conditionnelles ou tirées d'une distribution sourcée. Les observations mesurées restent séparées des résultats simulés. Les étapes concurrentes ne s'additionnent pas à l'aveugle.
- Décisions :
  1. **Temps entier en femtosecondes (BigInt)**. La résolution de 1 fs couvre exactement les 20 ordres de grandeur du corpus, de la période du césium (~109 ps) au temps-lumière de Voyager (~86 400 s). Sérialisation en chaîne décimale.
  2. **Scénarios curés** (`data/curated/scenarios.json`) :
     - chaque tâche référence une **durée qualifiée** du corpus ;
     - aucune distribution n'est inventée : durées fixes, graine enregistrée pour une extension empirique future ;
     - les capacités de ressources sont des **hypothèses de modèle** déclarées comme telles, réglables et partageables (`cap=`) ;
     - chaque scénario liste explicitement ce qu'il **ne modélise pas**.
  3. **Validation à la construction** : schéma et invariants (`checkScenarios`), puis **exécution réelle** de chaque scénario. Un cycle ou un blocage fait échouer `build:data`.
  4. **Affichage** :
     - chemin critique, somme des durées contre durée totale (gain de recouvrement) ;
     - occupation des ressources ;
     - journal des événements ;
     - chronogramme à l'échelle **linéaire** annoncée ;
     - export JSON du résultat (temps en fs).
  5. Pas de Web Worker : les scénarios publiés se simulent en moins d'une milliseconde. CS-09 n'en demande un qu'après une mesure qui le justifie.
- Limites : il n'y a pas encore de durée conditionnelle ni de distribution empirique, faute de données sourcées. Le support existe dans le moteur (`empirical`) et il est testé sur fixture.
