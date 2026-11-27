# Droits sur les extraits de sources (REMEDIATION-01, AUD-012 et AUD-017)

> **Avertissement.** Ce document décrit une politique de **précaution**. Il ne constitue ni un avis juridique ni une conclusion sur l'existence d'une contrefaçon. Les statuts de redistribution ont été déclarés par des agents lors de l'extraction (M00, M01), sans revue humaine ni juridique.

## 1. Politique (ADR-0011)

| Élément | Règle dans la version candidate |
|---|---|
| Citation littérale (`quote`) | Publiée seulement si toutes les sources de la valeur sont `allowed` et qu'aucune n'est en revue. Sinon `null`. |
| Formulation de l'incertitude (`uncertainty.statement`) | Même règle. Sinon `null` ; le type, la valeur, n et le localisateur restent publiés. |
| Passages cités dans `notes`, `protocol` et `conditions` | Pour une valeur à source non `allowed`, tout passage entre guillemets d'au moins 6 mots est remplacé par `[…]`. |
| Faits (valeur, unité, bornes, conditions reformulées) | Publiés. |
| Références (titre, éditeur, URL, DOI, licence déclarée, date d'accès) | Publiées. |
| Localisateurs, y compris titres de tableaux et de sections | Publiés : ils servent à retrouver la valeur. |
| Données de travail (`data/raw/`, `data/curated/`) | **Inchangées.** Voir §4. |

La règle s'applique au corpus publié (`data/validated/corpus.json`), donc à tout ce qui en dérive : le site, le bundle JavaScript et sa carte source, l'export JSON et l'export CSV (colonne `excerptStatus`). La garde `tests/remediation-01-rights.test.ts` la rend bloquante.

## 2. Registre extrait par extrait

`EXCERPT-REGISTER.csv`, produit par `generate-excerpt-register.py` (lecture seule, à lancer à la racine du dépôt), compte **281 lignes**. Chaque ligne décrit un texte tiers et donne :
- la valeur concernée, le champ et la longueur ;
- les sources, la redistribution et la licence déclarées ;
- la décision de la politique ;
- la présence du texte dans le corpus public **à la référence** `audit-01-baseline` et **dans la version candidate** ;
- les autres emplacements qui le contiennent.

| Comptage | Nombre |
|---|---|
| Textes tiers recensés (citations, formulations, passages cités de 6 mots ou plus) | 281 |
| … à publier (toutes sources `allowed`) | 62 |
| … à retenir | 219 |
| … retenus mais **publics à la référence** (site actuel) | 213 |
| … retenus mais encore présents dans la version candidate | 5. Ce sont des faits ou des libellés qui figurent aussi, sans guillemets, dans un localisateur ou une note : « 76 ± 2 », deux fois « 60μs / 7μs », « Average Latency (ms) » et le titre de tableau « Peak-performance capabilities of the MI300X for different data types ». Ils sont conformes à la règle (faits et localisateurs publiés) et restent visibles dans le registre. |

Après filtrage, le bundle et la carte source de la version candidate ont été inspectés : sur 185 citations retenues, 181 sont absentes. Les 4 restantes sont les faits ou libellés ci-dessus (`docs/reports/logs/remediation-01/`).

## 3. Revue des 27 sources déclarées `allowed`

| Groupe | Sources | Fondement déclaré | Observation |
|---|---|---|---|
| Licences Creative Commons explicites | BIPM SI Brochure, Woods 2015, Davis 2015, Google Cloud TPU v5p, Willow QEC 2024, arXiv 2409.14317 | CC BY 4.0, sauf Woods 2015 déclaré « CC BY » sans version | Attribution requise : elle est assurée par la fiche (titre, auteur, URL). |
| Licences libres de code ou de documentation | Linux (fair.c ×2, Kconfig, init_task), man-pages ×2, MLPerf rules | GPL-2.0, Linux-man-pages-copyleft, Apache-2.0 | La reproduction est permise sous la licence d'origine. Les extraits restent exclus des licences CC du projet (`NOTICE`). |
| Œuvres du gouvernement américain | NIST CODATA ×2, NASA (Lune, Mars, Goddard, ISS, New Horizons, Pluton), GPS.gov | Œuvre fédérale, sans licence sur la page | Usage courant. Le statut n'a pas été vérifié page par page. |
| RFC | RFC 2544 ×2, 6298, 9293 | IETF Trust / ISOC | Les dispositions de l'IETF Trust permettent de reproduire le texte des RFC avec la mention de copyright. |
| **En revue** | `src-nasa-voyager-where` | « NASA/JPL-Caltech », aucune licence sur la page | Le JPL est géré par Caltech, donc le statut d'œuvre fédérale n'est **pas établi**. La source est traitée comme non établie (`ALLOWED_UNDER_REVIEW`). |

Les 76 sources `reference-only` et les 17 `unknown` ne voient publier ni citation ni formulation.

## 4. Contenus déjà publiés : traitement séparé proposé à l'utilisateur

Aucune de ces options n'a été exécutée. Chacune demande une décision explicite.

| Emplacement | État | Options |
|---|---|---|
| **Site GitHub Pages** (`main` = `491c989`) | Il publie les 213 textes retenus (fiche, bundle, carte source, export JSON) depuis V1. | (a) Attendre AUDIT-02, puis publier la version candidate. (b) **Correctif d'urgence distinct** : publier seulement la vue publique sur `main`, avant AUDIT-02. |
| `data/raw/*.json` (immuable, 12 fichiers) | Il contient les extraits : 248 champs de citation dans les 6 fichiers d'extraction, 1 dans les verdicts. Le dépôt est public. | (a) Les conserver, avec la justification de la traçabilité de la vérification (citations courtes, attribuées, localisées). (b) Les déplacer vers un dépôt privé et ne publier que leurs empreintes ; cela change l'ADR-0005 et rend la vérification externe plus difficile. |
| `data/curated/measurements.json` | Il contient les extraits. | Mêmes options que pour `data/raw/`. |
| Historique Git public | Il contient tous les états publiés. | **Aucune réécriture sans accord.** Une réécriture casserait le tag `audit-01-baseline` et toutes les références d'audit. |
| Copies Drive (dossiers datés, ZIP d'AUDIT-01) | Elles contiennent le dépôt, extraits compris. | Elles sont privées : à conserver, ou à restreindre selon la décision prise pour le dépôt. |

**Recommandation du mainteneur** : faire relire la règle par une personne qualifiée avant toute publication.

## 5. Limites

- Le seuil de 6 mots et la règle « toutes les sources `allowed` » sont des choix de prudence, pas des seuils juridiques.
- La détection des passages cités repose sur les guillemets. Un passage recopié **sans** guillemets dans une note n'est pas détecté.
- Les statuts `allowed` reposent sur la lecture des pages par des agents en novembre 2026. Une licence peut changer.
