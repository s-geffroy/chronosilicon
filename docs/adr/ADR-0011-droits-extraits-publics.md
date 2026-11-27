# ADR-0011 : Extraits de sources dans la publication (vue publique)

- Statut : accepté (choix mineur réversible, 2026-11-27). Réponse à AUDIT-01, AUD-012 et AUD-017 (P0), dans le cadre de REMEDIATION-01. Cette ADR ne rouvre aucune décision D : elle précise la mise en œuvre de D16 (licences) et de CS-05.
- Contexte : jusqu'au commit de référence `491c989`, le corpus publié contenait les extraits littéraux de toutes les valeurs qualifiées. Ce corpus alimente le site, sa carte source et les exports JSON et CSV. Pour 184 valeurs, au moins une source n'avait pas de redistribution `allowed` : elle était `reference-only` ou `unknown`. Le `NOTICE` excluait ces extraits des licences CC, mais ne réglait pas la question du droit de les reproduire. L'audit demande une politique cohérente entre données brutes, données publiques et exports, sans conclusion juridique non fondée.
- Décision :
  1. **Règle de publication.** Un texte tiers littéral n'est publié que si **toutes** les sources citées par la valeur ont une redistribution `allowed` et qu'aucune n'est en revue. Sinon, la vue publique (`packages/ontology/src/publication.ts`, `publicView`) applique trois traitements :
     - `quote` → `null` ;
     - `uncertainty.statement` → `null` ;
     - dans `notes`, `protocol` et `conditions`, tout passage entre guillemets d'au moins **6 mots** est remplacé par `[…]`.
     Chaque valeur publiée porte `excerpt` : `published`, ou `withheld` avec la liste des champs touchés.
  2. **Ce qui reste publié** : les faits (valeur, unité, bornes, incertitude chiffrée, conditions reformulées par la curation), les références (titre, éditeur, URL, DOI, date d'accès, licence déclarée) et les **localisateurs**. Ces derniers comprennent les titres de tableaux ou de sections, nécessaires pour retrouver la valeur.
  3. **Sources en revue** : une source déclarée `allowed` mais douteuse est traitée comme non établie (`ALLOWED_UNDER_REVIEW`). C'est le cas de `src-nasa-voyager-where`, crédité « NASA/JPL-Caltech » : le JPL est géré par Caltech, si bien que le statut d'œuvre du gouvernement américain n'est pas établi.
  4. **Données de travail inchangées.** `data/raw/` (immuable) et `data/curated/` gardent les extraits. Ils servent à la vérification indépendante et restent dans le dépôt public et son historique. Ce point ne relève pas de cette ADR : il appelle une **décision séparée de l'utilisateur** (SOURCE-RIGHTS.md §4). L'historique Git n'est pas réécrit.
  5. **Interface** : la fiche affiche « Extrait non reproduit : le droit de redistribution d'au moins une source n'est pas établi… ». L'export CSV porte la colonne `excerptStatus`.
  6. **Garde** : `tests/remediation-01-rights.test.ts` échoue si une valeur à source non `allowed` publie une citation, une formulation ou un passage cité de 6 mots ou plus. Un test e2e vérifie la fiche et l'export JSON.
- Conséquences :
  - 185 des 238 valeurs publiées passent en `withheld` (186 sur 239 avant le retrait d'AUD-013) : citation retenue, ainsi que 21 notes, 2 conditions × 2 langues et 2 formulations.
  - Le seuil de 6 mots et le choix de garder les titres dans les localisateurs sont des choix de prudence, pas des seuils juridiques.
  - Cette ADR n'est **pas un avis juridique** ; une revue humaine des droits reste à faire.
  - Réversible : une source dont la redistribution est établie plus tard republie ses extraits sans autre changement.
