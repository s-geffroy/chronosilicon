# Politique de publication PUB-1 (REMEDIATION-02, AUD02-002)

- **Date** : 2026-11-27.
- **Statut** : politique de précaution du mainteneur, appliquée par le code et par la porte. Ce n'est **pas un avis juridique**. Les décisions attendent une relecture humaine qualifiée.
- **Remplace** l'heuristique de REMEDIATION-01. Celle-ci retirait les champs `quote` et `uncertainty.statement`, et seulement les passages **entre guillemets** de 6 mots ou plus dans `notes`, `protocol` et `conditions`. AUD02-002 relevait qu'elle laissait passer les reprises sans guillemets, les citations courtes et les autres champs.
- **Code** : `packages/ontology/src/publication.ts` (`applyPublicationPolicy`), `scripts/lib/corpus.ts`, `scripts/check-public-text.ts`. **Décisions** : `data/publication/text-decisions.json`. **Amendement** : ADR-0011.

## 1. Champs publics explicites

Chaque section du corpus public (valeurs, sources, groupes, phénomènes, observateurs, scénarios, valeurs retenues) est **reconstruite** à partir d'une table, `PUBLIC_FIELDS`, au lieu d'être copiée puis expurgée. Un champ absent de la table fait échouer la construction : rien n'est publié par défaut. Chaque champ a une classe.

| Classe | Traitement | Exemples |
|---|---|---|
| `fact` | Copié | identifiants, énumérations, nombres, unités, URL, DOI, dates, `rawRef`, formule de calcul |
| `ref` | Copié | titre, éditeur, auteur, version d'une source |
| `text` | Copié, mais **examiné** (§3) si la portée n'est pas ouverte | conditions, notes, protocole, localisateurs, `configuration`, méthode statistique, notes de groupe, licence et notes d'accès d'une source, libellés, raison d'une valeur retenue |
| `third` | Publié seulement si la portée est ouverte, sinon `null` | `quote`, `uncertainty.statement`, `protocolEvidence.statement` |

## 2. Portée ouverte

- **Valeur** : ouverte si **toutes** ses sources ont une redistribution `allowed` et qu'aucune n'est en revue (`ALLOWED_UNDER_REVIEW`, qui contient `src-nasa-voyager-where`).
- **Source** : ouverte si elle remplit elle-même ces conditions.
- **Groupe** : ouvert si tous ses membres le sont.
- **Phénomènes, observateurs, scénarios et valeurs retenues** : jamais ouverts, donc toujours examinés.

Sur le corpus actuel, 53 valeurs sont ouvertes et 185 ne le sont pas.

## 3. Décision texte par texte

Dans une portée non ouverte, chaque champ `text` est examiné. Deux sortes de constatations y sont relevées :
- **`quoted`** : tout passage entre guillemets (“ ”, " ", « », ' ' en début de mot), **quelle que soit sa longueur** ;
- **`overlap`** : toute suite d'au moins **6 mots consécutifs** (après normalisation : minuscules, ponctuation ignorée) partagée **sans guillemets** avec un texte tiers de la même portée. Les textes tiers sont la citation curée, l'énoncé d'incertitude et la citation brute de `data/raw`.

Quand une reprise chevauche un passage cité, l'union des deux forme **une seule** constatation, de type `overlap`.

Chaque constatation doit avoir une décision dans `data/publication/text-decisions.json`, identifiée par la portée, le champ et le texte exact :
- `redact` : le passage est remplacé par `[…]` ;
- `publish` : le passage reste publié, avec un motif parmi les suivants.

| Motif | Sens |
|---|---|
| `locating-label` | Titre de tableau, de section, de ligne ou de colonne, nécessaire pour retrouver la valeur |
| `term` | Mot ou expression brève citée pour son sens exact (« up to », « typiquement inférieure »), ou nombre |
| `attribution` | Mention de licence ou de copyright, nécessaire pour indiquer les droits |
| `fact` | Données factuelles (nom de système, site, valeur et qualificatif), sans phrase de la source |

La construction échoue dans trois cas :
- une constatation sans décision ;
- une décision qui ne correspond plus à rien (décision périmée) ;
- une décision en double.

Chaque décision porte un fondement (`basis`) :
- `rule:<nom>` : proposée par `draft-text-decisions.py` selon une règle écrite, puis relue par catégorie par le mainteneur ;
- `review` : décidée au cas par cas, avec une note.

## 4. Contrôle global

Après la projection, aucune suite de 6 mots d'un texte tiers retenu ne doit apparaître **nulle part** dans le corpus public, hors d'un passage décidé `publish`. Les textes tiers retenus sont les citations, énoncés et citations brutes des valeurs non ouvertes, ainsi que les citations des valeurs non qualifiées. Ce contrôle couvre la recopie d'une valeur dans une autre, ou dans une note de groupe, une source ou un libellé.

Le même contrôle s'applique au **site construit** (`npm run publication:check`) : tous les fichiers texte de `apps/web/dist`, c'est-à-dire le HTML, le bundle JS qui produit les exports JSON et CSV, et le CSS. Il tourne dans la porte, dans `ci.yml` et dans `pages.yml`, entre le build et l'empreinte de l'artefact.

## 5. Résultat sur le corpus actuel

| Élément | Nombre |
|---|---|
| Constatations | 411. Deux reviennent deux fois (même texte, même champ), d'où 409 décisions. |
| Décisions `redact` (`third-party-excerpt`) | 31 |
| Décisions `publish` | 378 : 229 `term`, 126 `locating-label`, 15 `fact`, 8 `attribution` |
| Décisions relues une à une (`review`) | 23, dont les **5 résidus** signalés par AUD02-002 |
| Reprises sans guillemets trouvées | 16. L'heuristique de REMEDIATION-01 n'en voyait aucune. |
| Fuites résiduelles (corpus public et `apps/web/dist`) | **0** |
| Même contrôle sur le site en ligne (`491c989`) | **943** suites de 6 mots détectées (`logs/aud02-002-live-site-check.txt`) |

Écarts avec rc2, sur 7 valeurs et 1 source :
- 5 passages supplémentaires sont retirés (notes de pcie3, pcie4, cxl3 et exos-x20 ; condition FR de hbm3e-pin-speed). Ils étaient entre guillemets et comptaient 6 mots au sens de PUB-1, qui compte aussi les nombres et les unités, mais moins de 6 au sens de rc2, qui découpait sur les espaces. Une note d'accès de source est aussi retirée.
- Une condition (KPTI) voit son passage retiré élargi au mot qui précède.
- **Aucune décision ne publie un passage que rc2 retirait.** Un test le vérifie avec `tests/fixtures/publication/rc2-redacted-spans.json`.

**Les 5 résidus d'AUD02-002** sont décidés `publish` avec une note chacun. Il s'agit de quatre libellés de tableau ou de ligne : la légende MI300X, la ligne de spécification Solidigm PS1010 lecture et écriture, la ligne Exos 15E900. Le cinquième est une cellule numérique, « 76 ± 2 » pour le clignement. Pour ces valeurs, la citation retenue se réduit à ce libellé ou à cette cellule : aucune phrase n'est reproduite.

## 6. Limites

- **Détection** : elle ne connaît que les textes tiers enregistrés (citation, énoncé, citation brute). Une phrase recopiée d'une **autre partie** de la source, absente de ces champs, sans guillemets, n'est pas détectable automatiquement. Seule une relecture humaine contre la source la trouverait.
- **Seuil de 6 mots** pour les reprises, et publication des termes courts et des libellés : ce sont des choix de prudence et de lisibilité, pas des seuils juridiques.
- **Décisions par règle** : 386 décisions viennent d'une règle et ont été relues **par catégorie**, non une à une. Le registre `PUBLIC-TEXT-REGISTER.csv` permet à une personne qualifiée de les relire une à une.
- **Portée** : la politique porte sur ce qui est **publié** (corpus public, site, exports). `data/raw/`, `data/curated/`, l'historique Git et le site actuellement en ligne ne changent pas. Les options pour ces contenus sont dans `PUBLIC-CONTENT-OPTIONS.md`.
