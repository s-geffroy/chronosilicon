# ADR-0005 : Chaîne de qualification des données (V00)

- Statut : accepté (choix mineur réversible, 2026-11-26)
- Contexte : CS-04, CS-05 et CS-11 exigent un accès réel aux sources, un localisateur, une licence, l'adéquation de la valeur et une revue contradictoire.
- Décision :
  1. **Extraction** : des agents de recherche consultent les sources et rendent, pour chaque valeur, l'URL, le localisateur, un extrait littéral court, la licence et les conditions. Ces fichiers sont figés dans `data/raw/` (SHA-256 dans `MANIFEST.sha256`).
  2. **Vérification indépendante** : un autre agent, qui n'a pas fait l'extraction, rouvre chaque source et rend un verdict par valeur : `confirmed`, `confirmed_with_fix`, `mismatch`, `unreachable` ou `inadequate`. Les verdicts sont figés dans `data/raw/` à leur tour.
  3. **Curation déterministe** (`scripts/curate.ts`) : raw + verdicts + `data/curated/decisions.json` (décisions manuelles motivées) produisent `data/curated/`. La correspondance des statuts est :
     - `confirmed` ou `confirmed_with_fix` donne `qualified`, avec le correctif appliqué ;
     - `unreachable` donne `pending` ;
     - `inadequate` donne `contested` ;
     - `mismatch` donne `rejected`.
     Une valeur calculée n'est `qualified` que si toutes ses entrées le sont.
  4. **Publication** : seul le statut `qualified` entre dans `data/validated/corpus.json` et sur le site.
- Limites assumées :
  - La revue contradictoire est faite par des agents du même modèle. C'est une **auto-revue outillée**, pas une validation externe humaine, et elle est déclarée comme telle dans les rapports G0 et G1.
  - Les extraits littéraux sont des citations courtes, attribuées et localisées. Pour les sources `reference-only` ou `unknown`, le projet n'accorde aucune licence sur ces extraits : `NOTICE` les exclut de CC0 et de CC BY. Aucune conclusion juridique n'est tirée.
  - Chaque mesure crée son propre phénomène en V0 et V1. Le regroupement par phénomène commun (par exemple « latence L1 » sur plusieurs microarchitectures) est reporté à V2, où il conditionne la comparaison.
  - Les valeurs en cycles (`cycle_count`) ne sont jamais converties en secondes sans fréquence effective sourcée. Elles sont affichées à part.
