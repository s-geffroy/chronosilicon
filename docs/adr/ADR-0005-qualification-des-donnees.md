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

## Définitions des types de provenance (ajout du 2026-11-26, revue du lot 2, M8)

Ces règles servent à vérifier chaque classement ; en cas de doute, on retient le type le plus faible.

| Type | Règle | Exemples |
|---|---|---|
| `measured` | La source rapporte une **mesure** qu'elle a effectuée ou publiée, et donne au moins un élément de protocole : matériel, logiciel, méthode, n ou statistique. Le protocole est obligatoire dans le corpus (invariant). | lmbench, BenchIT, résultats MLPerf, Rmax HPL |
| `documented` | Valeur **spécifiée** ou **annoncée** par une norme, une fiche technique, un manuel ou une page constructeur, sans protocole de mesure. Une borne (« jusqu'à », « au moins », « ≤ ») reste `documented` et se code en `low`/`high`. | RFC, PCI-SIG, fiches SSD, Kconfig |
| `calculated` | Valeur **dérivée par le projet** à partir d'entrées sourcées, avec une formule. Chaque entrée est une valeur du corpus ou une source citée (`src:`). Chaque valeur calculée est recalculée par un oracle de test. | temps-lumière, période d'image |
| `estimated` | Ordre de grandeur annoncé comme approximatif par la source (« ~ », « around », « approximately », « typically less than »), ou valeur extrapolée **sans méthode** donnée. | retpoline « around 30 cycles », NTP « typically < 1 ms », fmax extrapolé |
| `illustrative` | Exemple pédagogique sans source. **Interdit dans le corpus** : réservé aux fixtures de test. | — |

Le statut de vérification (`pending`, `qualified`, `contested`, `rejected`) est indépendant du type de provenance : une valeur `estimated` peut être `qualified` si elle est fidèle à sa source.
