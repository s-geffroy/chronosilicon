# Réponses à la revue du modèle d'incertitude (2026-11-26)

Revue : `docs/reports/review-2026-11-26-uncertainty.md` (0 bloquant, 3 majeurs, 10 mineurs).

| Point | Traitement |
|---|---|
| M1 : « ± » sans type dans le tableau | Le type est toujours affiché à côté du ± (« ± 2 ms (erreur-type) », « ± 25 ms (± non précisé) »), y compris pour les lecteurs d'écran ; un intervalle de confiance est affiché avec son niveau. Test e2e. |
| M2 : incertitude sans protocole | Invariant « dispersion ou statistiques ⇒ protocole », valable aussi pour `estimated`. Test. |
| M3 : distributions publiées perdues ; « faute de cas » faux | `statistics` est maintenant saisissable (`curate`), et n peut être inconnu à condition d'être expliqué. 12 valeurs renseignées : CUDA ×2 (P5, P50, P95, n = 150), MLPerf ×6 (P50, P99), Azure ×4 (P50). Garde sur les données. L'ADR est corrigée. |
| Règles conditionnelles absentes du schéma | Ajoutées (`allOf`/`if`/`then`) : intervalle sans ±, erreur-type avec n. Test de schéma. |
| Incertitude sur une borne ; intervalle dégénéré | Invariants. Tests. |
| Sens de n ; concordance avec `statistics` | Défini dans l'ADR (point 7) ; invariant de concordance. Test. |
| Formulation montrée comme une citation | Plus de guillemets ; invariant « la formulation contient la valeur ». |
| Formes manquantes ou refusées | Listées dans l'ADR avec la conduite à tenir. |
| Justification documented/calculated | Corrigée ; une valeur calculée affiche « non propagée ». Test e2e. |
| Niveau de confiance arrondi à l'entier | `formatLevel` (jusqu'à 2 décimales). |
| CSV sans colonnes SI, non testé | Colonnes SI d'incertitude et de quantiles ajoutées ; en-têtes testés en e2e. |
| Tests manquants | Ajoutés : cas `estimated`, schéma, garde sur les données, tableau, fiche, CSV. Les contributions passent par le même schéma. |
| CONTRIBUTING incomplet | Complété (erreur-type ⇒ n, provenance, statistiques, formes refusées). |

Défaut découvert en passant : l'unité stockée `us` s'affichait « us » au lieu de « µs » ; c'est corrigé et testé.
