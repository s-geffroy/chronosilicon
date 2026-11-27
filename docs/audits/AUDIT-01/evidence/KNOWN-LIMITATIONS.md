# Limites, anomalies et risques résiduels connus (AUDIT-01)

Ce document recense les faiblesses connues du mainteneur au commit de référence, sans en masquer aucune. Elles viennent des rapports de porte (`docs/reports/`), des revues internes, de M00 et M01 (`docs/audits/`), de `NEXT_ACTIONS.md`, et des écarts relevés en rédigeant ce dossier (ARCHITECTURE.md, SCIENTIFIC-MODELS.md, SIMULATION-MODELS.md). Aucune n'a été corrigée pour l'audit (consigne : ne pas anticiper les corrections).

## 1. Nature des validations : à lire en premier

| Type | Ce qui existe | Ce qui n'existe pas |
|---|---|---|
| Validation interne automatique | lint, typage strict, schémas JSON, invariants, 212 tests unitaires, 96 e2e, axe-core, build déterministe, CI | — |
| Revue interne « contradictoire » | Vérification des valeurs par un agent autre que l'extracteur (`data/raw/verify-*.json`). Revues G0 à G5, lot 2, incertitude et revue finale (`docs/reports/review-*.md`). | Ces revues sont des **auto-revues outillées** : des agents du **même modèle** que le mainteneur, donc avec des biais communs (R2). Rien n'atteste techniquement que le vérificateur est indépendant de l'extracteur. |
| Validation humaine | Aucune | Aucune relecture humaine du corpus, des notes de groupes ni du code. |
| Validation externe indépendante | Aucune | **AUDIT-01 serait la première.** Les portes G0 à G5 ont été déclarées « GO » par le mainteneur lui-même. |

## 2. Nature des valeurs du corpus (239 publiées)

| Nature | Nombre | Signification |
|---|---|---|
| `measured` | 58 | Mesure rapportée par la source avec un élément de protocole. Le projet n'a **refait aucune** de ces mesures. |
| `documented` | 144 | Valeur spécifiée ou annoncée (norme, fiche, constructeur). Ce n'est **pas une mesure** ; elle est souvent un meilleur cas (R4). |
| `calculated` | 29 | Dérivée par le projet à partir d'entrées sourcées. L'arithmétique est recalculée par des oracles, mais l'incertitude **n'est pas propagée**. |
| `estimated` | 8 | Ordre de grandeur annoncé comme approximatif par la source, ou valeur extrapolée sans méthode. |

S'y ajoutent les **mesures du navigateur** du Laboratoire, faites sur la machine du visiteur, étiquetées comme telles et jamais versées au corpus. Le **temps subjectif** (« si 1 cycle durait 1 s ») est une **métaphore pédagogique** annoncée comme telle, pas une grandeur physique.

## 3. Corpus et sources

- **Équilibre** (R6) : 144 valeurs documentées contre 58 mesurées. Il n'y a aucune distribution empirique complète, seulement 3 dispersions et 12 jeux de quantiles publiés. Plusieurs domaines sont minces : `physics` 4 valeurs, `logic` 8, `human` 9.
- **Valeurs non publiées** : 2 en attente et 4 contestées, avec leurs raisons dans `CORPUS-INVENTORY.json` (`withheld`). Par exemple :
  - la fT de l'InP HEMT, où la source secondaire se contredit ;
  - le FP64 du HGX B200, sans savoir s'il vaut par GPU ou pour la carte ;
  - l'Intel 4004, dont la source primaire n'a pas été lue.
- **Accès aux sources** :
  - certaines répondaient 403 ou étaient protégées contre les robots lors de la vérification (intel.com, uops.info, pages Micron, AMD MI300X, Oracle LTO, bluetooth.com) ;
  - 3 communiqués PCI-SIG ont été lus sur des reproductions tierces ;
  - un miroir Bugzilla AMD a été utilisé (R5).
- **Redistribution** : 76 sources `reference-only` et 17 `unknown`. Des extraits courts (au plus 200 caractères) en sont publiés dans un dépôt public (R3), avec un `NOTICE` qui les exclut des licences CC. **Aucune analyse juridique** n'a été faite.
- **Lacunes de M01** :
  - aucune mesure postérieure à 2020 avec protocole pour l'appel système, le changement de contexte ou le défaut de TLB ;
  - aucune latence sourcée de commutateur InfiniBand, ni de transfert PCIe hôte-GPU.
- **Apple Silicon** n'a qu'une valeur, contre plus de 30 pour x86-64 (D2 partiel).
- Les textes de curation (protocoles, conditions EN, notes) sont rédigés en **anglais**. L'interface FR le signale ; ils ne sont pas traduits.

## 4. Métrologie, statistiques et incertitudes

Détails dans SCIENTIFIC-MODELS.md.

- **Aucune propagation** d'incertitude. Les formes suivantes ne sont pas représentables :
  - ± asymétrique ;
  - ± en % ;
  - incertitude élargie (k) ;
  - tolérances de fiche technique (ADR-0009, « formes refusées »).
- Le **protocole** est un texte libre, sans structure : matériel, logiciel, n et méthode ne sont pas des champs.
- Le **domaine d'horloge** d'une valeur en cycles et la **précision** d'un `compute_rate` restent du texte libre, que le code ne contrôle pas.
- La règle « ne pas additionner des quantiles » n'existe que comme commentaire. `quantilesToSubjective` ne vérifie ni p ni l'ordre des valeurs.
- `fromSI` accepte les valeurs négatives, alors que `toSI` les refuse.
- La garde `published-dispersion` (dispersion publiée mais non structurée) repose sur des motifs textuels et peut laisser passer une formulation inhabituelle.
- La mesure du coût d'appel dans le navigateur ne garde que des moyennes de lots (médiane et résolution). Le « ± » affiché dans la cellule n'est pas libellé « résolution ». `browser-measure.ts` n'a qu'un test e2e, sans test unitaire.

## 5. Référentiels et observateurs

- **D1 partiel** : aucun observateur publié n'a une **instruction** ou un **registre** pour opération de référence.
- δref est une durée unique et fixe : il n'existe ni intervalle, ni modèle conditionnel.
- **D8 partiel** : `clocked-segments` (fréquence variable, ∫f dt) est implémenté et testé, mais **n'est pas exposé** dans l'interface. Les temps actif et arrêté ne sont jamais affichés.
- La distinction cycles / instructions / travail utile reste un **avertissement textuel**, sans IPC ni cycles mesurés.
- `propagationDelay(d, v)` existe, mais aucune donnée de vitesse dans un milieu ; seul le vide est utilisé.

## 6. Simulation et causalité

Détails dans SIMULATION-MODELS.md.

- **Déterministe uniquement**. La graine est enregistrée, mais aucun tirage n'a lieu. Il n'existe :
  - ni durée conditionnelle ;
  - ni distribution dans les scénarios (le type `empirical` du moteur n'est testé que sur des fixtures, et le schéma des scénarios ne peut pas l'exprimer).
- Le schéma des scénarios n'expose ni délai, ni dépendance début→début, ni date de libération, ni annulation, alors que le moteur les implémente.
- Les durées des scénarios sont des valeurs ponctuelles : bornes et quantiles sont ignorés. L'USB, par exemple, prend la borne basse de 1 à 255 ms, et Azure seulement la médiane.
- Seuls 5 scénarios existent. Les scénarios page web, LLM et HPC demandés par CS-08 sont **absents**. Un seul type de ressource (`ram`) est utilisé.
- **Ordre de la file** : un critère « type d'événement » est intercalé avant la priorité, ce qui n'est pas exactement l'ordre (temps, priorité, id) de CS-08.
- Il n'existe aucun horizon temporel ; seule une limite d'événements borne la simulation.
- Un seul chemin critique est rendu, et en cas d'égalité c'est la dernière tâche déclarée qui est retenue.
- **Tests manquants** :
  - la branche « deadlock » n'est pas couverte (`packages/simulator/src/index.ts`, vers les l. 338–339) ;
  - le compteur `busy` n'est pas testé directement.
- La construction des scénarios est dupliquée (`apps/web/src/lib/scenarios.ts` et `scripts/lib/corpus.ts`).

## 7. Architecture et code

Détails dans ARCHITECTURE.md.

- **Écarts à CS-09, sans ADR** :
  - pas de `packages/visualization` : la visualisation vit dans les composants de `apps/web` ;
  - pas de `benchmarks/` ;
  - aucun budget de performance chiffré.
- `d3-array` est déclaré dans `apps/web/package.json` mais n'est importé nulle part. Seul `d3-scale` est utilisé.
- Aucun Worker, ce que justifie ADR-0007 §5 pour la simulation. Les mesures du Laboratoire tournent sur le fil principal, sans ADR.
- Code mort ou inatteignable :
  - branche `Unavailable` dans `App.svelte` ;
  - champs `label` et `actor` des tâches, non lus par le moteur ;
  - rang `start` dans `KIND_ORDER`.
- Un transtypage `as MessageKey` dans `App.svelte` contourne localement le contrôle des clés i18n par le typage.
- Les paquets internes exposent leur source TypeScript (`./src/index.ts`) sans build séparé ni dépendances déclarées.

## 8. Interface, accessibilité, i18n

- Accessibilité : axe-core automatique, parcours clavier et `prefers-reduced-motion` sont testés. Il n'y a eu **aucun test avec un lecteur d'écran réel** ni panel d'utilisateurs, et **aucun audit WCAG humain**.
- La compatibilité est testée sur Chromium, Firefox et WebKit de Playwright (bureau et mobile émulé), mais pas sur un appareil physique ni sur Safari iOS réel.
- La qualité pédagogique (compréhension, métaphores) n'a été évaluée auprès d'aucun public.

## 9. Sécurité et performance

- Site statique : sans backend, sans cookie, sans stockage local, sans analytics, sans requête vers une autre origine (test e2e). L'export CSV neutralise l'injection de formules.
- Il n'existe **aucune** mesure de performance automatisée : poids, temps de chargement, Web Vitals. Aucun budget n'est fixé.
- Chaîne d'approvisionnement :
  - le lockfile est validé par l'intégrité SHA-512 ;
  - les actions sont épinglées par SHA et l'image par digest ;
  - `npm audit` n'est pas bloquant dans la CI, et il n'existe ni SBOM ni Dependabot configuré.

## 10. Gouvernance, identité, licences

- **R1** : le nom CHRONOSILICON n'a été vérifié dans **aucun registre de marques** (EUIPO, INPI, USPTO), seulement par des recherches GitHub et web (M00).
- Les ADR-0001 à 0009 sont des choix mineurs du mainteneur, que l'utilisateur n'a pas validés un à un.
- Le projet a un seul mainteneur, et aucune PR externe n'a encore été traitée. La procédure de contribution (`CONTRIBUTING.md`, `contribute:check`) n'a été exercée que sur des fixtures.

## 11. Reproductibilité et déploiement

- V08 n'a été vérifié que sur **une seule machine** (le VPS du mainteneur) et sur les runners GitHub. Aucun tiers n'a reproduit le projet sur une autre machine (REPRODUCIBILITY.md §9).
- Pendant la session, l'API GitHub a été consultée en mode anonyme, avec un quota de 60 requêtes par heure. Le quota a été épuisé une fois. Une publication (`6bea223`) a alors été vérifiée par `version.json` seulement, sans lecture du statut du run de déploiement.
- Le réglage Settings > Pages > Source = GitHub Actions est manuel. Il n'est pas versionné, donc pas vérifiable depuis le dépôt.
