# AUDIT-01 — Remédiation du simulateur (AUD-002 à AUD-005, ordre de la file)

- Branche `remediation-01`, non commité à la rédaction. La décision correspondante est l'ADR-0010 (`docs/adr/ADR-0010-semantique-simulation.md`).
- Exécution : service outil `node`, Node v26.13.1, vitest 5.1.0. Les durées sont en femtosecondes (1 s = 10^15 fs).
- **Sonde avant correctif** : le script de l'auditeur, mot pour mot, dans un test vitest temporaire (`packages/simulator/src/audit-probe.test.ts`, supprimé ensuite) lancé sur le code de base. Le moteur était encore identique à `491c989`.
- **Sonde après correctif** : la même sonde, enrichie des nouveaux champs.
- Les sorties ci-dessous sont copiées telles quelles ; le préfixe de version de Node a été retiré.

## AUD-002 — Fin des tâches achevées, fin effective, horizon de la file

- **Statut : confirmé, corrigé.**
- Avant :
  ```
  AUD-002 {"makespan":"0","sum":"5000000000000000","path":[],"events":["ready:A@0","start:A@0","cancel:A@5"],...}
  AUD-002-mixed {"makespan":"2000000000000000","sum":"7000000000000000","path":["B"],"events":[...,"end:B@2","cancel:A@5"],...}
  ```
  La durée totale valait 0 alors que la tâche A a tourné jusqu'à 5 s. Dans le cas mixte, elle valait 2 s alors que le dernier événement a lieu à 5 s.
- Après :
  ```
  AUD-002 {"makespan":"5000000000000000","sum":"5000000000000000","path":[],"completedEnd":"null","horizon":"5000000000000000","discarded":1,...,"events":["ready:A@0","start:A@0","cancel:A@5"]}
  AUD-002-mixed {"makespan":"5000000000000000","sum":"7000000000000000","path":["B"],"completedEnd":"2000000000000000","horizon":"5000000000000000","discarded":1,...}
  ```
- Correctif, dans `packages/simulator/src/index.ts` :
  - champs `makespan`, `completedEnd`, `horizon` et `discardedEvents` (l.133-145) ;
  - les événements périmés sont écartés sans avancer l'horloge (l.391-395) ;
  - `completedEnd` est calculé l.440, la fin effective l.445, et l'égalité entre horizon et fin effective est vérifiée l.446.
- Tests, dans `tests/simulator.test.ts`, bloc « AUD-002: completed end, effective end and queue horizon are distinct notions » :
  - `cancellation only: nothing completes, the run still lasts until the cancellation` ;
  - `mixed: the cancellation ends after the last completion` ;
  - `mixed: a completion after the cancellation` ;
  - `a task cancelled before its release never starts; its ready event is discarded`.

  Le test aléatoire `atomic cancellation, causality, occupancy, horizon and replayable critical path` vérifie en plus, sur 80 graphes de 16 tâches avec annulations, les égalités `makespan = dernier événement = horizon` et `completedEnd = max des fins achevées`.
- Effets de bord :
  - `makespan` change de sens **uniquement** en présence d'annulations : c'est la fin effective, et non plus la fin des tâches achevées ;
  - l'oracle existant `cancellation stops the task and cascades to dependents` (`makespan = 3 s`) reste vrai sans modification, car les deux fins coïncident ;
  - le Gantt et le taux d'occupation de `Simulation.svelte` divisent par `makespan` : une tâche annulée reste donc dans l'échelle ;
  - le test `narrative.test.ts` (« gaps sum to the total ») suppose déjà que `makespan` est l'instant du dernier événement, et il passe.

## AUD-003 — Atomicité des annulations

- **Statut : confirmé, corrigé.**
- Avant :
  - sonde de l'auditeur :
    ```
    AUD-003 {"makespan":"0",...,"events":["ready:A@0","start:A@0","ready:B@0","cancel:A@5","start:B@5","cancel:B@5"],...,"tasks":[...,"B:cancelled s=5000000000000000 e=5000000000000000"]}
    ```
  - second cas, ajouté et rouge avant correctif : deux annulations distinctes au même instant et une troisième tâche C en attente. vitest a reçu `"cancel:A@5", "start:B@5", "cancel:B@5", "start:C@5"`, soit le même démarrage parasite de B.
- Après :
  ```
  AUD-003 {"makespan":"5000000000000000",...,"completedEnd":"null","horizon":"5000000000000000","discarded":1,...,"events":["ready:A@0","start:A@0","ready:B@0","cancel:A@5","cancel:B@5"],"resources":[{"id":"r","busy":"5000000000000000","max":1}],"tasks":[...,"B:cancelled s=null e=null"]}
  ```
- Correctif, dans `packages/simulator/src/index.ts` :
  - `cancelCascade` libère les unités sans les réattribuer et note les ressources libérées (l.356-379, en particulier l.375) ;
  - la boucle principale applique toutes les annulations de l’instant, puis appelle `tryStart` par ressource dans l’ordre de déclaration (l.396-407) ;
  - la file gagne `peek()` (l.245).
- Tests, bloc « AUD-003: cancellations at one instant are atomic » :
  - `auditor probe: no parasitic start of a dependent that is cancelled in the same cascade` : journal exact, B jamais démarrée, `busy = 5 s`, `maxConcurrent = 1` ;
  - `separate cancel events at the same instant are all applied before the resource is reallocated` : C démarre à 5 s et attend 5 s, `busy = 6 s`, chemin A → C par la ressource ;
  - `a cancellation at the exact end time wins (cancel < end)`.

  Le test aléatoire vérifie aussi l'absence de démarrage parasite (une tâche annulée qui a démarré l'a fait strictement avant son annulation). Il vérifie la causalité, l'occupation reconstruite (≤ capacité) et l'égalité `busy = Σ` des intervalles exécutés, annulés compris.
- Effets de bord : aucun sur les scénarios publiés, qui n'ont pas d'annulation.

## AUD-004 — Recouvrement et inactivité (dates de libération)

- **Statut : confirmé, corrigé.** L'indicateur est redéfini, et non borné.
- Avant :
  ```
  AUD-004 {"makespan":"15000000000000000","sum":"10000000000000000","path":["A"],...}
  AUD-004 overlapShare -0.5
  ```
  La seconde ligne applique l'ancienne formule de `apps/web/src/lib/scenarios.ts`, `1 − makespan/Σ`. La sonde « après » garde cette ligne à l'identique : elle n'indique pas le nouvel indicateur.
- Après :
  ```
  AUD-004 {"makespan":"15000000000000000","sum":"10000000000000000","path":["A"],"completedEnd":"15000000000000000","horizon":"15000000000000000","discarded":0,"active":"10000000000000000","idle":"5000000000000000","links":["release:null->A"],...}
  ```
  Le nouvel indicateur donne `overlapIndicators(...)` = `{ makespanSeconds: 15, sumSeconds: 10, activeSeconds: 10, idleSeconds: 5, overlapShare: 0 }`. C'est l'assertion `toEqual`, qui passe.
- Définitions (ADR-0010 §6) :
  - `activeTime` est l'union des intervalles d'exécution ;
  - `idleTime = makespan − activeTime` ;
  - `overlapShare = 1 − activeTime/Σ`, dans [0, 1), et `null` si Σ = 0.
- Correctif :
  - dans `packages/simulator/src/index.ts`, le compteur d'activité est défini l.300-310 et appelé au début (l.342), à la fin (l.415), à l'annulation (l.375-376) et à la clôture (l.425). Les champs du résultat sont définis l.155-160 et renseignés l.468 (`idleTime`) et l.465 (`horizon`) ;
  - dans `apps/web/src/lib/scenarios.ts`, `overlapIndicators` (l.50-58) est utilisé par `runScenario` ;
  - dans `apps/web/src/components/Simulation.svelte`, l.57 affiche « — » si l'indicateur vaut `null`.
- Tests :
  - `tests/simulator.test.ts`, bloc « AUD-004: activity, idle time and overlap are separate quantities » : `release date: idle time is not counted as negative overlap` et `active time is the measure of the union of execution intervals` ;
  - `apps/web/src/lib/scenarios.test.ts`, bloc « AUD-004: overlap is separated from idle time (ADR-0010 §6) » : `auditor probe: a release date is idle time, not negative overlap (was −0.5)`, `mixed overlap and idle time: overlap = 1 − active/Σ, independent of the idle gap`, `Σ durations = 0: the indicator is undefined (null), not clamped to 0` et `published scenarios have no idle time, so the new definition gives the former values exactly`.

  Ce dernier compare, pour les 5 scénarios publiés et les capacités 1, 2, 3, 4 et 8, la nouvelle valeur à l'ancienne formule par égalité stricte.
- Effets de bord :
  - `ScenarioSummary.overlapShare` devient `number | null`. Avant, une somme nulle donnait 0 en dur ;
  - aucun libellé n'a changé : « Gain dû au recouvrement » décrit exactement la nouvelle définition, donc aucune clé i18n n'a été ajoutée ;
  - l'oracle e2e `sim-overlap = 0 %` reste valable, car les scénarios publiés n'ont aucune inactivité.

## AUD-005 — Définition du chemin critique

- **Statut : contesté** pour la sonde, qui ne montre pas de défaut. Définition formalisée et rendue vérifiable.
- Avant :
  ```
  AUD-005 {"makespan":"10000000000000000","sum":"11000000000000000","path":["A","B"],"events":["ready:A@0","start:A@0","ready:B@9","start:B@9","end:A@10","end:B@10"],...}
  ```
- Après : mêmes instants et même chemin, avec `"links":["origin:null->A","start-to-start:A->B"]`.
- Preuve :
  - le chemin critique est un **chemin de contraintes**, et non une somme de durées ;
  - B est prête à `A.start + 9 s = 9 s` par la contrainte début→début, puis finit à `9 + 1 = 10 s = completedEnd` ;
  - A → B est donc la chaîne qui fixe la fin. Que sa somme de durées (11 s) dépasse la fin (10 s) est normal en présence d'un début→début ;
  - A finit aussi à 10 s : il y a égalité. L'ancre est la dernière déclarée (B). Déclarée en premier, B laisse le chemin `['A']`, lui aussi de longueur 10 s (test `tie at the end`). Les deux chemins sont valides et un seul est rendu, ce qui est documenté (ADR-0010 §5, Limites).
- Correctif, une explicitation et non une correction de valeur. Dans `packages/simulator/src/index.ts` :
  - type `CriticalLink` (l.115-128) ;
  - `readyCause` conserve la dépendance liante (l.290-291 et l.348-352) ;
  - remontée du chemin avec cause (l.447-461) ;
  - `criticalLinks` exposé l.467.
- Tests, bloc « AUD-005: the critical path is a chain of binding constraints » :
  - `auditor probe: start-to-start lag — the path is A → B and explains completedEnd = 10 s (not Σ durations = 11 s)` ;
  - `tie at the end: the anchor is the last-declared task among those finishing at completedEnd` ;
  - `a release date that dominates the dependency cuts the path` ;
  - `a dependency that ties with the release date is retained as the cause` ;
  - `capacity 2: the waiting task is linked to the task that freed its unit`.

  L'aide `replayCriticalPath` rejoue chaque lien : début = 0, libération, fin ou début du prédécesseur plus délai, ou fin de la tâche libératrice. Elle vérifie que la dernière fin vaut `completedEnd`. Le test aléatoire l'applique à 80 graphes avec capacités 1 et 2, égalités (durées et délais entiers), libérations, délais, début→début et annulations.
- Effets de bord : aucun changement de chemin sur les scénarios publiés. Les oracles `['r1', …, 'r8']`, `['b', 'a', 'c']`, `['x', 'y', 'z', 'w']`, `['a', 'b', 'c']` et `['b']` sont inchangés et passent.

## Ordre de la file (CS-08 face au code)

- **Statut : confirmé** (écart non documenté), **corrigé par l'ADR-0010 §1-3 et §7**, sans changer le comportement de l'ordre.
- L'ordre retenu est (temps, type `annulation < fin < prêt`, priorité, rang de déclaration). « Identifiant stable » de CS-08 se lit comme le rang de déclaration. Le service des ressources suit (instant prêt, priorité, déclaration).
- Le type de la file exclut désormais `start`, qui n'est jamais mis en file (`QueuedKind`, l.231-233). Le commentaire d'en-tête est réécrit (l.11-22).
- Tests, bloc « ADR-0010: simultaneity semantics » :
  - `at one instant: ends are logged before ready events` ;
  - `the resource queue is served by ready time first, then priority, then declaration order` ;
  - `simultaneous cancel events are applied by priority, then declaration order`.

  Ils s'ajoutent à l'existant `simultaneous events are ordered deterministically (priority, then declaration order)`. Ces trois tests **passaient déjà avant correctif** : ils documentent un comportement existant, ce ne sont pas des régressions.
- `docs/CS-08_Simulateur.md` n'a pas été modifié : il était hors du périmètre de cette tâche. L'ADR en donne la lecture.

## Branches non testées (signalées par l'audit)

- **Interblocage** (l.420-421) : test `a task left open when the queue empties is reported as a deadlock (defensive guard)`.
  - C'est un test en boîte blanche. Le scénario ne devient cyclique qu'après la validation statique : `simulate` lit `seed` après `validateScenario`.
  - La branche est inaccessible pour un scénario validé : graphe acyclique, capacité ≥ 1 et annulation en cascade.
  - Le test passait avant correctif.
- **Compteur `busy`** : tests `busy = ∫ occupied units dt, capacity 2, tasks without resource excluded` (6 s) et `busy counts truncated work of cancelled tasks only up to the cancellation` (4 s). L'égalité `busy = Σ intervalles` est aussi vérifiée dans le test aléatoire. Les deux tests passaient avant correctif.

## Vérifications

- Avant correctif, le premier lancement de `npx vitest run tests/simulator.test.ts` sur les tests ajoutés a donné : 42 tests, 14 en échec, 28 réussis.
  - Les 14 échecs sont les blocs AUD-002, AUD-003, AUD-004, AUD-005 (sauf `tie at the end`) et le test aléatoire. Certains échouent simplement parce que les nouveaux champs étaient absents.
  - Tous les tests existants réussissaient.
- Après correctif, `npx vitest run tests/simulator.test.ts apps/web/src/lib/scenarios.test.ts apps/web/src/lib/narrative.test.ts` donne 3 fichiers et 110 tests, tous réussis.
- `npx tsc -p tsconfig.json --noEmit` ne produit aucune sortie (aucune erreur).
- `npm run -w @chronosilicon/web check` : `svelte-check found 0 errors and 0 warnings`.
- `npm run build:data` :
  - un premier essai a échoué sur `Cannot find module '/work/packages/ontology/src/publication'`, à cause d'une modification concurrente d'un autre agent dans `packages/ontology`. Ce n'est pas lié à ce lot ;
  - un second essai, une fois ce fichier présent, a donné `build:data OK 0.3.0+6d8a68dd47cf {... "scenarios":5}`, et `git diff --stat data/` est vide.
- Aucun oracle existant n'a été modifié. Les attentes ajoutées sont nouvelles.
- `SIMULATOR_MODEL_VERSION` passe de `1.0.0` à `1.1.0` (l.24-25). La valeur affichée « modèle » et le champ `modelVersion` de l'export changent en conséquence. Aucun test ne fixait `1.0.0`.
