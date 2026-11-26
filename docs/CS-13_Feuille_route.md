# CS-13 — Feuille de route et portes
| Étape | Produit | Porte |
|---|---|---|
| M00 | Audit nom, sources, droits, dépôt existant et environnement | GM00 : preuves et corpus initial faisable, risques et exclusions |
| V0 | Schémas, corpus initial qualifié, conversions et tests | G0 : intégrité, unités, provenance, tests mathématiques, reproducibilité |
| V1 | Atlas/convertisseur FR/EN responsive, fiches, publication | G1 : G0 maintenu, expérience réelle, tests e2e, build statique et déploiement vérifié si autorisé |
| V2 | Comparaison historique et multi-observateurs | G2 : compatibilité des données, transformations, distinction fréquence/performance |
| V3 | Simulation événementielle | G3 : invariants, chemin critique, recouvrement, seed, ressources |
| V4 | Immersion narrative | G4 : journal dérivé, exactitude, limites pédagogiques |
| V5 | Laboratoire complet, mesures et contributions | G5 : contrôles applicables V00–V08, reproductibilité, qualité des contributions |

Pour chaque porte, rapport avec critères applicables et résultats effectifs, commit, logs et risques. Les cibles de volume ne compensent jamais qualité insuffisante ; un corpus plus petit peut être présenté comme prototype explicitement non accepté si porte non franchie. Une absence de droits de déploiement n'empêche pas un build local, mais interdit le statut V1 publiée. Pas de passage automatique après NO-GO ; remédier, documenter puis réévaluer. Le kit ne prouve aucune porte franchie. Priorité à une V1 utile plutôt qu'à une complexité prématurée. En fin de session, next action concrète et état des portes.
