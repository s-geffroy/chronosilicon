# CS-11 — Validation non compensatoire
| Contrôle | Preuve attendue |
|---|---|
| V00 sources | accès réel, localisateur, licence, adéquation |
| V01 dimensions | schema + tests unités incompatibles |
| V02 métrologie | protocole et conditions ou statut non mesuré |
| V03 statistiques | n, quantiles cohérents, incertitudes, absence de fabrication |
| V04 architecture | configuration et comparabilité explicites |
| V05 mathématique | oracle de conversions, tests limites, indépendance affichage |
| V06 causalité | scénarios analytiques et invariants ressources |
| V07 pédagogie | contrôle analogies, distinction cycles/instructions et temps/activité |
| V08 reproductibilité | versions, scripts, données, logs, vérification indépendante ou limite explicite |

Applicable par artefact : PASS/FAIL/NOT_APPLICABLE (motivé)/NOT_RUN ; pas de score compensatoire. Contrôles obligatoires échoués ou non exécutés => NO-GO. Une donnée illustrative n'entre pas au corpus qualifié. Tests unitaires, propriétés et schémas ; tests d'intégration corpus→moteur→UI, e2e desktop/mobile, clavier, FR/EN, base URL Pages, exports, liens ; revue contradictoire indépendante si possible, distinguer auto-revue et validation externe. Rapports versionnés avec commit, environnement, commandes, sorties, résultats, limites. Pas de test fictif, pas de preuve par capture seule. CI bloquante sur erreurs. Vérifier URL publique réelle et version de l'artefact publié. Matrice exigences F01–F09 vers tests, résultats et portes. Conserver les corrections et les données contradictoires.
