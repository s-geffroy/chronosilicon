# ADR-0010 : Sémantique de la simulation (simultanéité, annulation, indicateurs)

- Statut : accepté (choix mineur réversible, 2026-11-27). Suite de l'audit indépendant AUDIT-01 (AUD-002 à AUD-005, base `audit-01-baseline` = `491c989`). Ne rouvre aucune des décisions D1 à D17.
- Contexte : CS-08 demande une file de priorité « ordonnée par (temps physique, priorité documentée, identifiant stable) » et une gestion déterministe des événements simultanés. Le code ordonnait par (temps, type d'événement, priorité, ordre de déclaration) sans que cet écart soit écrit. L'audit a montré trois défauts latents, aucun n'étant exercé par les scénarios publiés :
  - une durée totale nulle quand toutes les tâches sont annulées ;
  - le démarrage parasite d'une tâche annulée au même instant ;
  - un « gain dû au recouvrement » négatif en présence de dates de libération.

  Il a aussi demandé de définir le chemin critique.
- Décision :
  1. **Ordre de la file.** Les événements mis en file sont ordonnés par (temps, type, priorité, ordre de déclaration), avec le type `annulation < fin < prêt`.
     - Ce n'est pas un écart avec CS-08 mais un raffinement : le type d'événement est un critère placé avant la priorité, et « identifiant stable » désigne le **rang de déclaration** de la tâche (stable entre exécutions), et non un tri lexicographique de son `id`.
     - Les démarrages ne sont jamais mis en file. Une tâche démarre immédiatement quand elle devient prête et trouve une unité libre, ou quand elle n'a pas de ressource.
  2. **Annulations atomiques.** Toutes les annulations d'un même instant sont appliquées en une seule phase, cascades comprises, avant toute réattribution de ressource. Elles sont classées en tête de cet instant.
     - Les unités libérées ne sont réattribuées qu'à la fin de la phase, ressource par ressource dans l'ordre de déclaration.
     - Une tâche annulée à l'instant t ne démarre donc jamais à t.
     - Une annulation à l'instant exact de fin l'emporte : la tâche est annulée.
  3. **Événements périmés.** Un événement qui vise une tâche déjà close est écarté sans effet et **n'avance pas l'horloge** : fin ou prêt d'une tâche annulée, annulation d'une tâche achevée. Leur nombre est rendu (`discardedEvents`). La limite `maxEvents` compte tous les événements retirés de la file, périmés compris.
  4. **Trois fins distinctes.**
     - `completedEnd` est la fin de la dernière tâche **achevée** ; il vaut `null` si aucune ne l'est.
     - `makespan` est la **fin effective** : l'instant du dernier événement journalisé, annulations comprises (0 pour une exécution vide).
     - `horizon` est l'horloge après le dernier événement non périmé. Il est égal à `makespan` par construction, et le moteur lève une erreur interne sinon.
     - Sans annulation, `makespan = completedEnd`.
  5. **Chemin critique : chemin de contraintes.** Le chemin critique part de la tâche achevée qui finit le plus tard. En cas d'égalité, c'est la dernière déclarée. On remonte ensuite la cause qui a fixé chaque début. `criticalLinks` donne cette cause, dans l'ordre suivant de priorité :
     - `resource` : la tâche a attendu une unité, et son début est la fin (ou l'annulation) de la tâche qui l'a libérée ;
     - `finish-to-start` ou `start-to-start` : son début est la fin ou le début du prédécesseur liant, plus le délai. Si plusieurs contraintes tombent au même instant, la première arrivée l'emporte, et une dépendance l'emporte sur une date de libération égale ;
     - `release` : son début est sa date de libération ;
     - `origin` : début à t = 0.

     La longueur du chemin **n'est pas** la somme des durées : les délais, le début→début et les dates de libération y entrent. Le chemin se rejoue exactement et aboutit à `completedEnd` (test). Il est vide si `completedEnd` vaut `null`.
  6. **Activité, inactivité, recouvrement.**
     - `sumOfDurations` est la somme des intervalles exécutés ; une tâche annulée est comptée jusqu'à son annulation.
     - `activeTime` est la mesure de l'union des intervalles d'exécution : le temps pendant lequel au moins une tâche s'exécute.
     - `idleTime` est `makespan − activeTime` : le temps où rien ne s'exécute, à cause des dates de libération ou des délais.
     - Le **gain dû au recouvrement** vaut `1 − activeTime / sumOfDurations`, dans [0, 1). Il ne mélange plus l'inactivité au recouvrement. Il est **non défini** (`null`, affiché « — ») quand la somme est nulle : on ne le force jamais à 0.
  7. **Service d'une ressource.** Les tâches en attente sont servies par (instant où elles sont devenues prêtes, priorité, ordre de déclaration), ce qui revient à « premier arrivé, premier servi ». La priorité ne départage que des tâches prêtes au même instant.
  8. `SIMULATOR_MODEL_VERSION` passe à `1.1.0`. Les cinq scénarios publiés donnent les mêmes instants, le même chemin et le même gain qu'en 1.0.0 : ils n'ont ni annulation ni date de libération, et donc aucune inactivité. Le test le vérifie, et `build:data` est inchangé.
- Conséquences :
  - le résultat sérialisé gagne les champs `completedEnd`, `horizon`, `discardedEvents`, `criticalLinks`, `activeTime` et `idleTime` ;
  - `ScenarioSummary.overlapShare` devient `number | null` ;
  - le blocage (tâche restée ouverte, file vide) est une garde défensive : inaccessible pour un scénario validé, elle est testée en contournant la validation.
- Limites : pas de préemption, une unité par tâche, une seule ressource par tâche (inchangé). Un seul chemin critique est rendu, même quand plusieurs chemins de contraintes ont la même longueur.
