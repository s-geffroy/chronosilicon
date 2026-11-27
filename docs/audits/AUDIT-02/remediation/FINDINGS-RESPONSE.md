# Réponse aux constats d'AUDIT-02

- **Date** : 2026-11-27.
- **Entrée** : `AUDIT-02_RAPPORT_v1.0.md` et `PROMPT_CLAUDE_REMEDIATION-02_v1.0.md`, Drive `2026-11-27_AUDIT-02`, archive SHA-256 `4ba9acbc…22f2`. Les quatre empreintes internes concordent.
- Les corrections des moteurs acceptées par AUDIT-02 ne sont **pas modifiées** : `packages/simulator`, `packages/metrology`, `packages/observers` et `apps/web` sont identiques entre rc2 et le code testé (`RC2-RC3-DIFF.txt`). Les décisions D1–D17 ne sont pas rouvertes et P3 n'est pas engagée.

## AUD02-001 (majeur) : exceptions par paquet et non par avis

- **Statut** : **confirmé, corrigé** (commit `1371911`).
- **Constat vérifié dans le code** : à la ligne 42 de `scripts/audit-gate.ts` en rc2, la condition `active.some((x) => x.packages.includes(name))` couvrait tout avis modéré ou bas sur un paquet listé, quels que soient l'identifiant de l'avis, sa gravité, sa plage ou le chemin qui y mène.
- **Reproduction** : 11 fixtures `npm audit` contrôlées (`tests/fixtures/npm-audit/`). Elles comprennent la sortie **réelle** du 2026-11-27 et 10 variantes, chacune issue d'une seule mutation, avec des avis fictifs `GHSA-fixt-ure0-*`. Deux cas s'y ajoutent : un avis en production et une date postérieure à l'expiration. La logique de décision de rc2, recopiée telle quelle (`old-gate-harness.ts`), laisse passer à tort **6 cas sur 11** (`logs/aud02-001-before.txt`) :

  | Cas | rc2 | Correction |
  |---|---|---|
  | Autre avis sur un paquet déjà couvert | PASS (faux) | FAIL |
  | Deux avis sur le paquet, dont un inconnu | PASS (faux) | FAIL |
  | Même avis, plage affectée modifiée | PASS (faux) | FAIL |
  | Rapport au format inconnu (`auditReportVersion` 1) | PASS (faux) | FAIL |
  | Avis sans URL GHSA | PASS (faux) | FAIL |
  | Référence `via` sans cible | PASS (faux) | FAIL |
  | Paquet transitif inconnu | FAIL | FAIL, avec motif explicite |
  | Gravité *high* sur l'avis couvert | FAIL | FAIL |
  | Avis en production | FAIL | FAIL |
  | Exception expirée | FAIL | FAIL |
  | Rapport réel | PASS | PASS |

- **Correction** :
  - `scripts/lib/audit-policy.ts`, fonction pure, avec le format d'exception en schéma 2 ;
  - une exception couvre un avis exact, défini par cinq éléments : l'identifiant GHSA, le paquet, la gravité, la plage et la portée `dev`, le tout avant expiration ;
  - `paths` liste les paquets atteints transitivement ;
  - échecs sur format inattendu, avis en production, avis *high* ou *critical*, exception de plus de 92 jours ;
  - une exception devenue inutile est signalée.
- **Preuve** :
  - `tests/audit-gate.test.ts` : 18 tests, 1 positif et 17 négatifs ou de contrôle ;
  - `logs/aud02-001-after.txt` : la porte réelle rejouée sur chaque fixture, seul le rapport réel passe ;
  - porte réelle : `audit:gate OK production=0 dev={"moderate":8} advisories=GHSA-g3hv-75wg-m249 exceptions=1`.
- **Exception existante** : GHSA-g3hv-75wg-m249 (minimatch, via ESLint et typescript-eslint).
  - Réécrite au schéma 2, **sans changement** de portée ni d'échéance : décidée le 2026-11-27, elle **expire le 2027-01-31**.
  - Elle ne sera pas renouvelée automatiquement. Il faudra d'ici là mettre à jour ESLint et typescript-eslint, avec des versions d'au moins deux semaines, ou bien décider d'une nouvelle exception motivée.
  - Documentation : `SECURITY.md`.

## AUD02-002 (réserve documentaire majeure) : heuristique d'extraits

- **Statut** : **confirmé, traité** (commits `7f69b83`, `e1c04c4`). La politique **PUB-1** est décrite dans `PUBLICATION-POLICY.md`, avec un amendement de l'ADR-0011.
- **Constat vérifié** : appliquée aux textes publics de rc2, la nouvelle détection trouve **16 reprises sans guillemets** d'un texte tiers retenu, dans des conditions ou un protocole. L'heuristique n'en voyait aucune. Elle trouve aussi **395 passages entre guillemets** à décider, dont tous les courts et ceux des localisateurs, des notes de groupe, des notes de source et des raisons de retenue.
- **Traitement** :
  1. **Liste explicite des champs publics** (`PUBLIC_FIELDS`) : un champ non listé fait échouer la construction.
  2. **Décision texte par texte** : 409 décisions motivées dans `data/publication/text-decisions.json` (registre : `PUBLIC-TEXT-REGISTER.csv`).
     - 31 retraits ;
     - 378 publications : 229 termes, 126 libellés de localisation, 15 faits, 8 mentions de licence ;
     - **23 relues une à une**, dont les **5 résidus**, qui sont tous des libellés de tableau ou une cellule numérique ;
     - les autres suivent une règle écrite et ont été relues par catégorie.
  3. **Contrôle global** sur le corpus public et sur le site construit (`npm run publication:check`, dans la porte, `ci.yml` et `pages.yml`) : **0** fuite. Sur le site en ligne (`491c989`), le même contrôle détecte **943** suites de 6 mots.
  4. Les faits et les références restent publiés. Aucune décision ne publie un passage retiré en rc2 (test). Les données curées et brutes ne changent pas.
- **Défaut de ma première implémentation**, trouvé par le contrôle global avant le commit : une reprise qui chevauchait un passage cité était ignorée sans décision. Elle forme désormais une seule constatation sur l'union des deux (test dédié).
- **Contenus déjà publics** : état vérifié et options pour le site, les données du dépôt et l'historique Git dans `PUBLIC-CONTENT-OPTIONS.md`. **Rien n'a été supprimé, réécrit ni publié.**
- **Pas un avis juridique.** Limites détaillées au §6 de `PUBLICATION-POLICY.md`.

## Réserves d'AUDIT-02 sur la clôture de REMEDIATION-01

| Réserve | Réponse |
|---|---|
| Reproduction complète non réalisée | Porte officielle rejouée sur un **clone neuf** depuis GitHub, aux commits `16093cf` (rc3) et `9227a8e` (rc4), dans l'image CI (Node 26.13.1) : PASS, 309 unitaires, 100 e2e sur l'artefact. Les 18 sondes de l'auditeur passent sur ces clones sous Node 26 : 18/18 (`TEST-RESULTS.md`). **Cette validation reste interne** ; elle ne remplace pas une reproduction indépendante. |
| AUD-009 : DFS multi-cycle inspecté mais non testé | Déjà testé dans `tests/remediation-01-data.test.ts`, qui rejette un cycle de 2 et un cycle de 3 valeurs. Inchangé. |
| AUD-016 et AUD-017 : export réel et interface non exécutés | Les e2e exécutent l'export JSON et CSV et la fiche sur l'artefact construit. Le contrôle `publication:check` porte sur le bundle qui produit ces exports. |
| AUD-018 : `pages.yml` jamais exécuté | Il ne l'est toujours pas, puisqu'il ne tourne que sur `main`. La même séquence, complétée de `publication:check`, tourne dans `ci.yml`. |
