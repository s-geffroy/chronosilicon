# AUDIT-01 — Pièce : modèles de simulation (V3) et journal narratif (V4)

Description factuelle de ce que le code implémente au commit `491c989` (branche `develop`).
Aucune validation externe n'a eu lieu : les revues de `docs/reports/review-*.md` sont des
auto-revues d'agents internes. Ce document ne porte aucun verdict d'audit.

## 1. Moteur à événements discrets — `packages/simulator/src/index.ts`

- **Temps** : entiers en femtosecondes, type `bigint` (`Fs`, l.19 ; `FS_PER_S = 10^15`, l.17).
  `secondsToFs` sépare partie entière et fraction, arrondi `Math.round` de la fraction (l.22-28) ;
  rejette non fini ou négatif (l.23). `fsToSeconds` repasse en double (l.29). La précision réelle
  est bornée par l'entrée IEEE double (commentaire l.8-9). Sérialisation en chaîne décimale
  (`serializeResult`, l.375-377).
- **File d'événements** : tas binaire (l.190-218). Ordre `less` (l.192-197) :
  temps, puis **type d'événement** (`cancel < end < ready < start`, `KIND_ORDER` l.187), puis
  priorité, puis ordre de déclaration. Les `start` ne sont jamais mis en file (démarrage
  immédiat, l.278, l.285, l.328) ; leur rang dans `KIND_ORDER` est donc inutilisé. Conséquence
  documentée : une annulation au temps exact de fin l'emporte (l.13).
- **Ressources** : `capacity` entier ≥ 1 (validation l.142). Liste d'attente par ressource triée par
  (instant ready, priorité, déclaration) (l.267-272) ; démarrage tant que `inUse < capacity`
  (l.273-279). Comptabilité : `busy` = ∫ unités occupées dt (`accrue`, l.261-264), `maxConcurrent`
  (l.277). Une tâche peut avoir `resourceId: null` (pas de contention, l.328).
- **Dépendances** : `finish-to-start` et `start-to-start` avec `lagSeconds ≥ 0` (l.40-45, l.287,
  l.335) ; `releaseSeconds` (date au plus tôt, l.241). `satisfy` retient le max des contraintes
  (l.289-295).
- **Chemin critique** : un seul chemin, remonté depuis la tâche terminée la plus tard (égalité :
  la dernière déclarée, `>=` l.355) via `startCause` (ressource libérée par `lastFreedBy`, l.278)
  puis `readyCause` (prédécesseur liant, l.290-291) (l.357-366).
- **Graine / déterminisme** : PRNG Mulberry32 (l.120-129), graine de `Scenario.seed` (l.224). Les
  durées sont tirées une fois, en ordre de déclaration (l.228-233). Seul le type `empirical`
  consomme la graine : tirage uniforme d'un **indice** parmi des échantillons fournis (l.38, l.231).
  `SIMULATOR_MODEL_VERSION = '1.0.0'` (l.16) est renvoyé dans le résultat (l.368).
- **Limites** : `maxEvents` (défaut 1 000 000, l.223) compte les événements mis en file (ready,
  end, cancel), pas les starts (l.74, l.318). **Aucun horizon temporel** n'existe (pas de paramètre
  de temps maximal).
- **Cycles** : `validateScenario` fait un DFS itératif à trois couleurs, O(V+E), sans récursion
  (l.157-182), plafonné à ~50 erreurs (l.175). Autres contrôles statiques : doublons, références,
  lags, durées, release, cancel, priorité finie, `maxEvents` (l.132-156).
- **Interblocage** : détecté *a posteriori* : toute tâche encore `open` quand la file est vide lève
  `deadlock or impossible cause` (l.338-339). Avec graphe acyclique et capacité ≥ 1, ce cas est
  surtout défensif.
- **Annulation** : `cancelAtSeconds` met un événement `cancel` (l.259). `cancelCascade` itératif
  (l.297-314) : retire de la file d'attente ou libère la ressource (l.306-311) et propage à tous
  les successeurs, quel que soit le type de dépendance (l.312).
- **Erreurs** : `SimulationError` (l.31-33) pour durée invalide (l.23), scénario invalide (l.222),
  violation de causalité `time < now` (l.254), dépassement de limite (l.318), blocage (l.339).
- Champs `label` et `actor` de `Task` (l.49-50) ne sont pas utilisés par le moteur.

## 2. Scénarios publiés

- Schéma `schemas/scenarios.schema.json` : une tâche n'a que `id`, `measurementId`, `resourceId`,
  `dependsOn` (l.42-50 ; `additionalProperties: false`). **Ni lag, ni `start-to-start`, ni release,
  ni annulation, ni durée empirique ne sont exprimables** dans les données curées. Capacité 1-64
  avec `capacityAssumption` obligatoire (l.26-33) ; champ `excluded` obligatoire (l.15, l.21).
- `checkScenarios` (`packages/ontology/src/index.ts:163-182`) : `measurementId` doit exister parmi
  les mesures passées (l.175) et avoir `quantityKind === 'duration'` (l.176) ; ressources et
  prédécesseurs résolus (l.177-178). Appelé par `scripts/lib/corpus.ts:72` sur `normalized`, issu des
  seules mesures `verificationStatus === 'qualified'` (l.69-70) ; puis chaque scénario est réellement
  simulé à la construction, un échec bloque `build:data` (l.73-90).
- `apps/web/src/lib/scenarios.ts` : `buildScenario` (l.11-31) transforme chaque tâche en durée
  `fixed` = `valueSI` de la mesure (l.25), dépendances `finish-to-start` lag 0 (l.27), priorité =
  rang (l.26), graine `SCENARIO_SEED = 1` (l.9), capacités surchargées par l'UI (l.16).
  `overlapShare = 1 − makespan/Σdurées` (l.33-46). Note : la même construction est dupliquée dans
  `scripts/lib/corpus.ts:78-85` (deux chemins de code).

| Scénario (`data/curated/scenarios.json`) | Tâches | Mesure(s) du corpus | Ressource |
|---|---|---|---|
| `sc-dram-dependent-reads` (l.6) | r1→…→r8 en chaîne | `dram-latency-xeon-6248-measured-m1` (80 ns, measured) | `mem` ram, cap. 4 |
| `sc-dram-independent-reads` (l.96) | r1…r8 indépendantes | idem | `mem` ram, cap. 4 |
| `sc-tcp-first-response` (l.172) | handshake → request-response | `azure-rtt-eastus-westeurope-m1` (83 ms, médiane P50, measured) | aucune |
| `sc-click-to-reaction` (l.204) | usb-poll → next-frame → human-reaction | `usb-fs-interrupt-min-period-m1` (1 ms, documented ; plage 1-255 ms), `frame-time-60hz-m1` (1/60 s, calculated), `human-simple-visual-reaction-time-m1` (213 ms, measured) | aucune |
| `sc-mars-command` (l.244) | uplink → downlink | `earth-mars-light-time-min-m1` (182,126 s, calculated) | aucune |

- **Déterministe** : tout. Durées fixes à la valeur ponctuelle `valueSI` ; la graine est enregistrée
  mais aucun tirage n'a lieu. **Aucune distribution, aucune durée conditionnelle** dans les données
  (ADR-0007 l.9 et « Limites » l.20). Les bornes/quantiles portés par certaines mesures (`lowSI`/
  `highSI` de l'USB, `quantilesSI` d'Azure) **ne sont pas utilisés** : l'USB prend la borne basse
  1 ms, Azure la seule médiane.

## 3. Journal narratif V4 — `apps/web/src/lib/narrative.ts`

- `narrate` (l.35-82) parcourt `result.events` dans l'ordre : une ligne `event` par événement
  (l.67-78, `seq` conservé pour traçabilité), et entre deux instants distincts une ligne `gap`
  (l.40-66) avec durée exacte, tâches en cours (`start ≤ p0 ∧ end ≥ t`, l.46) et en attente de
  ressource (`ready ≤ p0 ∧ start ≥ t`, l.48).
- Le texte provient uniquement de gabarits i18n fixes (`apps/web/src/lib/i18n.ts:227-234` FR,
  `508-515` EN) remplis par identifiants, ressource, durées converties par l'observateur
  (`toSubjective`, l.37). Le gabarit de pause déclare « Le modèle ne dit pas ce que je fais pendant
  ce temps » (l.232 / l.513) : aucune activité n'est inventée pendant une attente.
- Garantie = construction (pas de texte libre) + test qui vérifie que chaque ligne correspond à un
  gabarit (§5). Le libellé des tâches est injecté par l'appelant (`label`, l.35).

## 4. Causalité modélisée / non modélisée

Modélisé : précédence fin→début et début→début avec délai, date de libération, contention sur
ressources à capacité entière, files d'attente déterministes, annulation en cascade, ordre total des
événements simultanés. Seuls fin→début sans délai et la contention sont exercés par les scénarios
publiés. Vérifié **absent** du code : durées stochastiques dans les scénarios publiés (le type
`empirical` n'est testé que sur fixture), branches conditionnelles ou durées conditionnelles,
distributions paramétriques, préemption, ressources multiples par tâche, demande > 1 unité,
dépendance de la durée à la charge, horizon de simulation, rétroaction. Les exclusions de chaque
scénario sont textuelles (`excluded`, p. ex. caches/TLB, DNS/TLS, traitement à bord).

## 5. Tests

`tests/simulator.test.ts` (fixtures synthétiques, durées inventées admises car hors corpus) :
- représentation : 1 fs exact, 86 400 s, somme 1e5 s + 1 fs exacte, rejets NaN/∞/négatif (l.17-27) ;
- série : makespan = somme, chemin a→b→c (l.30-34) ; parallèle : makespan = max, Σ = 9 µs (l.35-40) ;
- lag (2,5 s, l.41-44) ; start-to-start (3 s, l.45-48) ;
- capacité 1 → 4×, capacité 2 → 2×, attente de w = 3×, chemin via ressource (l.49-57) ;
- lectures dépendantes vs indépendantes (l.58-64) ;
- 60 DAG aléatoires × 20 tâches : start ≥ ready, release, causalité avec lag, durée exacte,
  occupation reconstruite ≤ capacité, temps monotones (l.69-99) ;
- chemin critique par contrainte liante b→a→c (l.100-111) ; release (l.112-116) ;
- égalités de temps : ordre a, b, d et sérialisation identique (l.117-123) ;
- graine : même graine = mêmes tirages, graine différente = tirages différents, tirages ∈ échantillons
  (l.124-133) ; annulation + cascade + libération ressource (l.134-140) ;
- rejets : cycle, références, capacité, lag négatif, doublons, NaN, `maxEvents` ; DFS itératif sur
  20 000 tâches ; borne exacte `maxEvents` 4 passe / 3 échoue ; cascade de 20 000 (l.143-178).

`apps/web/src/lib/scenarios.test.ts` (données réelles du corpus) : invariants et rejets
non-durée / non qualifiée (l.10-17) ; 8 lectures dépendantes = 640 ns exacts en fs pour cap. 1, 4, 8
(l.21-28) ; indépendantes = ⌈8/cap⌉ × 80 ns pour cap. 1,2,3,4,8,64, `maxConcurrent`, Σ conservée
(l.29-36) ; TCP = 0,166 s ; clic = 1 ms + 1/60 s + 213 ms ; Mars = 2 × 54,6e9 m / c (l.37-45) ;
déterminisme (l.46-50).

`apps/web/src/lib/narrative.test.ts` : pour chaque scénario et langue, une ligne par événement dans
l'ordre (l.20-22), pauses = écarts entre instants distincts et somme = makespan (l.23-34), ensembles
en cours/en attente recalculés indépendamment et disjoints (l.35-46), temps subjectif = 4e9 × physique
(l.47-49), toute phrase conforme à un gabarit (l.50-53) ; Mars : 2 pauses « ne dit pas ce que je
fais », 23 084 ans 328 jours (l.58-66) ; contention r5-r8 en attente pendant 80 ns (l.69-77).
E2E : `tests/e2e/site.spec.ts:225-237` (640 ns, 160 ns, chemin critique, capacité rejetée/1).

Non testé directement : la valeur du compteur `busy` (affichée en UI,
`apps/web/src/components/Simulation.svelte:97-98`) ; le chemin `deadlock` (l.338-339) ;
`fsToSeconds` sur grandes valeurs.

## 6. Conformité à `docs/CS-08_Simulateur.md` (l.2) et `docs/CS-13_Feuille_route.md` (l.10-11)

| Exigence | Statut | Remarque |
|---|---|---|
| Moteur abstrait à événements discrets, pas de pas uniforme | implémenté | tas d'événements |
| File ordonnée (temps, priorité, identifiant stable) | partiel | ajout d'un critère « type d'événement » avant la priorité ; identifiant = ordre de déclaration |
| État, capacité, dépendances, files, début/fin | implémenté | |
| Représentation temporelle documentée (BigInt, résolution, sérialisation) | implémenté | l.5-9, ADR-0007 |
| Simultanés déterministes, pas de durée négative, pas de retour arrière | implémenté | l.254, l.23 |
| Limite d'événements | implémenté | pas d'horizon temporel |
| Détection interblocages / causes impossibles | implémenté | cycles statiques ; blocage a posteriori non testé |
| Durées fixes | implémenté | |
| Durées conditionnelles | absent | |
| Durées tirées d'une distribution sourcée | partiel | moteur `empirical` testé sur fixture ; aucun scénario ni schéma ne l'utilise |
| Seed et modèle versionnés | implémenté | graine 1 sans effet sur scénarios publiés |
| Chemin critique, occupation, attente, contention, recouvrement | implémenté | un seul chemin critique ; `busy` non testé |
| Ressources CPU, RAM, GPU, stockage, réseau, écran | partiel | types déclarés ; seuls `ram` utilisé dans les données |
| Scénarios : lecture dépendante, indépendantes | implémenté | |
| Scénario clic/écran | implémenté | ordre de grandeur, traitement système exclu |
| Scénario communication spatiale | implémenté | Mars |
| Scénarios page web, LLM, HPC | absent | TCP seul ≈ réseau, pas de page web |
| Séparer observé / simulé | partiel | mesure référencée par id, export séparé ; non audité ici en UI |
| Tests série/parallèle, capacité 1 vs 2, causalité, égalités, seed, annulation, limites, conservation | implémenté | §5 |
| Journal V4 dérivé des événements, pas d'activité inventée en attente | implémenté | gabarits fixes + test |
| G3 / G4 (CS-13) : rapport de porte | présent | `docs/reports/G3.md`, `G4.md` : auto-évaluations internes, non vérifiées ici |
