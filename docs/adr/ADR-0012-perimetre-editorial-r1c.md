# ADR-0012 : Périmètre éditorial R1 = C (atlas transversal des échelles de temps)

- **Statut** : accepté, décision explicite de l'utilisateur du 2026-11-27 (« Correction du périmètre éditorial de CHRONOSILICON, dans le cadre de R1 = C »).
- **Effet** : amende le périmètre de D1–D17 sur les points ci-dessous. Toutes les fonctionnalités existantes sont conservées.

## Décision

1. **Objet.** CHRONOSILICON est un atlas interactif et pédagogique des échelles temporelles, observées notamment depuis le référentiel d'un microprocesseur. L'objectif central est de **comparer sur une même échelle** des phénomènes de mondes différents.
2. **Corpus.** Il couvre les phénomènes informatiques, physiques, biologiques, physiologiques, industriels, astronomiques et de la vie courante. Il s'enrichit **progressivement**. L'informatique n'est pas privilégiée systématiquement : chaque lot vise l'équilibre entre univers.
3. **Univers.** Sept univers regroupent les domaines (`UNIVERSE_OF`, `packages/ontology`) : informatique, physique, astronomie et espace, biologie, corps humain, industrie, vie quotidienne. Ils servent au filtrage rapide et à la couleur des points sur la chronologie.
4. **Valeurs.**
   - Elles sont **sourcées lorsque c'est pertinent**, contextualisées, et accompagnées d'un **intervalle** quand la variabilité est significative.
   - Deux provenances sont **explicitement signalées** dans l'interface, par un libellé, une forme de point et une note dans la fiche :
     - `conventional` : une durée fixée par une règle, une norme ou une recommandation ;
     - `illustrative` : un ordre de grandeur de la vie courante, pour l'intuition. Elle **exige** une plage (`low` et `high`).
   - La règle « aucune valeur illustrative dans le corpus » est **levée** pour ces cas signalés. Aucune valeur n'est inventée : chacune garde une source consultée et un localisateur.
5. **Priorités.** Compréhension intuitive, analogies, comparaisons transversales, qualité visuelle, simplicité d'utilisation.
6. **Gouvernance proportionnée.** Pas de processus de certification scientifique ni d'audit systématique. Restent en place :
   - la porte automatique (tests, CI, contrôle de publication PUB-1, porte de sécurité) ;
   - une vérification simple de chaque valeur par le mainteneur contre sa source ;
   - l'accord de l'utilisateur pour publier.

## Conséquences

- Nouveaux domaines : `biology`, `astronomy`, `industry`, `everyday`. Nouvelle provenance : `conventional`.
- Les tests qui refusaient `illustrative` sont adaptés et commentés.
- `CLAUDE.md` est mis à jour en conséquence.
- Le bandeau « prototype expérimental, valeurs non certifiées » (PUBLICATION-01) reste cohérent avec ce périmètre.
