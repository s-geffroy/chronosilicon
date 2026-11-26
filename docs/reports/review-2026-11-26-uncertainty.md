# Revue contradictoire : incertitude structurée (ADR-0009)

- Date : 2026-11-26. Revue en lecture seule : aucun fichier du dépôt n'a été modifié.
- Objet : pendant la revue, l'arbre de travail a été commité en `8cbb02a` (« Incertitude structuree des mesures (ADR-0009) »), qui n'est pas poussé (`develop` a 1 commit d'avance). J'ai vérifié que le contenu revu est bien celui du commit. Le commit ajoute aussi CHANGELOG, CONTRIBUTING et requirements-matrix.
- Preuves exécutées :
  - `sudo appctl run node npx vitest run` : 16 fichiers, **207 tests passent**.
  - Sonde `tsx -e` (rien d'écrit dans le dépôt) sur `checkInvariants` et `checkExtraction`, résultats repris ci-dessous (A à I).
  - Playwright n'a pas été lancé, donc le test e2e n'est **pas vérifié**.
  - L'empreinte de `corpus.json` correspond à `measurements.json` (sha256 5d030a4b…).

Bilan : **0 BLOQUANT, 3 MAJEUR, 10 MINEUR**. Les trois données saisies sont fidèles aux sources.

---

## 1. Modèle, schéma, invariants

### Ce qui est juste
- Les quatre types sont correctement distingués. Le choix le plus important est bon : un « ± » dont la source ne dit pas la nature reste `unspecified-plus-minus`, et le projet ne devine pas le type. C'est la seule manière honnête de traiter la notation la plus ambiguë de la littérature.
- Il est logique d'exiger n pour une erreur-type : sans n, on ne peut pas remonter à la dispersion (SD = SE·√n).
- Pour un IC, la règle « low ≤ valeur ≤ high » et un niveau dans ]0, 1[ sont corrects.
- La conversion SI de `uncertaintySI` est juste. Toutes les unités de `packages/metrology` sont linéaires (facteur ou diviseur), donc une demi-largeur se convertit comme la valeur.
- La règle « min–max = plage publiée (`low`/`high`), jamais une incertitude » est conforme à CS-06 (« ne pas présenter min/max comme intervalle de confiance »).

### MAJ-2 MAJEUR : CS-04 « aucune valeur statistique sans protocole » n'est pas appliqué à `uncertainty`
- Sonde A : une valeur `estimated` avec `protocol: null` et une erreur-type passe `checkInvariants` sans erreur (`[]`).
- Les statistiques exigent un protocole (`statistics without protocol`), mais pas l'incertitude. Or une erreur-type, un écart-type ou un IC sont des valeurs statistiques au sens de CS-04.
- Il y a aussi une incohérence avec ADR-0005. Ce texte définit `estimated` comme une valeur « approximative » ou extrapolée « sans méthode ». Une source qui publie un s.e. ou un IC a forcément une méthode.
- Aucune donnée actuelle n'est concernée : les trois mesures sont `measured` et ont un protocole.
- **Correctif** : dans `checkInvariants`, ajouter `if (u && !m.protocol) errors.push(\`${at}: uncertainty without protocol\`)`. Option plus stricte : n'admettre `estimated` qu'avec un protocole. Ajouter le test correspondant.

### MIN-1 : le schéma ne porte pas les règles conditionnelles, et `contribute:check` laisse passer des objets incohérents
- Sonde G : un item `documented` avec `{type: 'confidence-interval', value: 3, low: null, high: null}` donne `checkExtraction` = `[]`.
- Sonde H : une erreur-type sans n donne aussi `[]`.
- Seul `checkInvariants` (au moment du build) attrape ces cas. Le contributeur reçoit donc « OK » puis un échec plus tard. L'ADR, point 6, dit « validé par le même schéma », mais le schéma ne contient que les types, pas la cohérence.
- **Correctif** : mettre dans `$defs/uncertainty` des `if/then` qui reprennent les invariants :
  - `confidence-interval` ⇒ `value` est null et `low`, `high`, `level` sont des nombres ;
  - sinon ⇒ `value` est un nombre et `low`, `high`, `level` sont null ;
  - `standard-error` ⇒ `sampleCount` est un entier.
- Ajouter aussi à `contribute-check.ts` la règle de provenance, et des tests dans `tests/contribute-check.test.ts`.

### MIN-2 : rien ne relie l'incertitude aux bornes de la mesure
- Sonde B : une borne unilatérale (`high = value`, `low = null`, affichée « ≤ ») assortie d'un écart-type est acceptée. Un « ± » sur une borne n'a pas de sens.
- Sonde E : un IC dégénéré `low = high = value` est accepté.
- **Correctif** :
  - refuser `uncertainty` quand exactement une des deux bornes `low`/`high` est renseignée (valeur-borne) ;
  - exiger `u.low < u.high` pour un IC.

### MIN-3 : la signification de `sampleCount` n'est pas définie, et sa cohérence avec `statistics` n'est pas vérifiée
- Pour Kwon 2013, n = 25 désigne des **sujets**. L'unité sur laquelle le s.e. est calculé (sujets ou clignements) n'est pas dite. Pour Willow, le texte donne « 10 shots per duration » sans le nombre de durées.
- Le schéma ne dit pas si `sampleCount` est le n de la statistique ou celui de l'étude.
- Sonde D : `statistics.sampleCount = 10` et `uncertainty.sampleCount = 999` sont acceptés ensemble.
- **Correctif** :
  - écrire dans le schéma et l'ADR que `sampleCount` est « le n publié pour cette statistique ; à défaut, null » ;
  - ajouter un invariant d'égalité quand `statistics` et `uncertainty` sont tous deux présents ;
  - noter l'unité d'analyse dans `statement` ou dans le protocole.

### MIN-4 : `statement` n'est pas toujours littéral, alors que la fiche l'affiche entre guillemets (`<q>`)
- Pour `human-voluntary-blink-closing-phase`, le texte est « 76 ± 2 ms; Table 1 caption: 'our values are mean ± s.e.' ». Il assemble deux endroits de la source, et la cellule « 76 ± 2 » est elle-même une reconstruction WebFetch (notes du vérificateur).
- Sonde F : le texte de `statement` n'est jamais confronté au nombre (« abc » passe).
- **Correctif** :
  - séparer `statement` (citation littérale d'un seul endroit) et un champ `typeBasis` (le passage qui fixe le type, par exemple la légende) ; ou bien autoriser explicitement la jonction « ; » dans la description et ne pas l'afficher comme une citation unique ;
  - invariant léger : `statement` doit contenir le nombre `u.value` (ou `u.low` et `u.high`).

### MIN-5 : types manquants. Lesquels refuser, lesquels ajouter
Mon avis, type par type :
- **IQR et P5–P95** : à **refuser** dans `uncertainty`. Ce sont des quantiles, qui ont leur place dans `statistics` (CS-06 : « P50/P95/P99 seulement à partir d'échantillons ou sources explicites ; n et méthode »). Les ranger en « ± » serait faux, car ils sont asymétriques et ne mesurent pas la même chose. Voir MAJ-3 : cette autre voie est aujourd'hui inutilisable.
- **min–max** : à **refuser**, comme le fait l'ADR. Cela va dans `low`/`high`.
- **Incertitude élargie U = k·u** : à **ne pas forcer dans l'énumération actuelle**. Le jour où elle sera ajoutée, `coverageFactor` (k) doit être obligatoire et le niveau facultatif. Classer un U (k = 2) en `unspecified-plus-minus` sous-déclarerait l'information. Le classer en `standard-deviation` serait faux d'un facteur 2.
- **Incertitude-type GUM (u, type A/B, par exemple CODATA)** : ce n'est **pas** un écart-type d'échantillon. Il ne faut pas la classer en `standard-deviation`. Elle serait de toute façon refusée aujourd'hui, car les constantes sont `documented`.
- **« ± » asymétrique (+a/−b)** et **« ± x % » relatif** : non représentables. Convertir un pourcentage en demi-largeur absolue serait un calcul du projet. Le risque est qu'un curateur fasse la conversion « pour faire entrer » la donnée.
- **Correctif** : ajouter dans l'ADR une liste des formes refusées : asymétrique, relative, élargie k, GUM, IQR, quantiles. Leur traitement : `uncertainty: null`, et le texte reste dans les conditions. Ajouter des types seulement quand un cas réel se présente, comme le prévoit l'ADR, avec les champs obligatoires ci-dessus.

### MIN-6 : la règle « pas de dispersion sur `documented` ou `calculated` » est juste, mais sa justification est inexacte
- **`calculated` : la règle est juste.** Propager l'incertitude des entrées serait une statistique produite par le projet. Mais la fiche affiche alors « Inconnue (non publiée par la source) », ce qui est trompeur : la « source » d'une valeur calculée, c'est le projet. Il faudrait afficher « non propagée (valeur calculée) ».
- **`documented` : la règle est défendable** au sens d'ADR-0005. En revanche, la phrase de l'ADR « une spécification n'a pas de dispersion publiée » est fausse. Les fiches techniques publient des **tolérances** (±20 ppm, « typ. 10 ± 1 µs »). Ce ne sont pas des dispersions statistiques, et l'ADR ne dit pas où elles vont. Les convertir en `low`/`high` (v − t, v + t) serait un calcul.
- **Correctif** :
  - reformuler la justification de l'ADR ;
  - dire qu'une tolérance de spécification reste dans le texte, ou va en `low`/`high` seulement si la source donne les bornes en toutes lettres ;
  - prévoir un libellé propre pour `calculated`.

---

## 2. Les trois données saisies

Comparaison faite avec `data/raw/m00-2026-11-26-A_*.json`, `verify-2026-11-26-A.json`, `m00-2026-11-26b-A_*.json` et `verify-2026-11-26b-A.json`.

| Mesure | Type saisi | Preuve du vérificateur | Verdict |
|---|---|---|---|
| `human-voluntary-blink-closing-phase` (76 ± 2 ms) | `standard-error`, n = 25 | « Table 1, row 'This study (2013), 600 fps, n=25' … '76 ± 2'; caption: 'our values are mean ± s.e.' » | **Fidèle.** Le type vient de la légende et n vient de la ligne. Seule réserve : l'unité d'analyse (MIN-3). Ordre de grandeur cohérent : SD ≈ 2·√25 = 10 ms, soit un CV de 13 % pour une phase rapide. |
| `human-voluntary-blink-duration` (572 ± 25 ms) | `unspecified-plus-minus`, n = 25 | « 'one voluntary blink took 572 ± 25 ms' … 572 itself is not a Table 1 cell » ; note : « only the s.e. attribution of ±25 is an inference » | **Fidèle, et c'est le bon choix.** L'extraction brute (« s.e. per Table 1 caption ») faisait une inférence que le vérificateur a corrigée. L'enjeu est important : si c'était un s.e., SD ≈ 125 ms (CV 22 %) ; si c'était un SD, SD = 25 ms (CV 4 %). L'écart est d'un facteur 5. Garder n = 25 comme n de l'étude est acceptable, à condition que MIN-3 soit précisé. |
| `willow-realtime-decoder-latency-d5` (63 ± 17 µs) | `unspecified-plus-minus`, n null | « Sec. V: 'net average of 63 ± 17 µs …' » ; correctif du protocole : « 10 shots per duration » | **Fidèle.** La nature du ± n'est pas dite. n est inconnu, car le nombre de durées n'est pas donné, donc null est correct et ne fabrique rien. Clôt bien m17 sur la partie « incertitude ». La partie `statistics` de m17 reste sans objet : aucun quantile n'est publié. |

Remarque sans action : la source publie aussi « closed phase 58 ± 4 ms » (s.e.). Il n'y a pas de mesure pour cette phase, donc ce n'est pas un oubli d'incertitude.

---

## 3. Dispersions publiées ailleurs dans le corpus

Recherche faite sur les 240 mesures de `corpus.json` (`conditions`, `quote`, `notes`, `protocol`) : « ± », SD, s.e., IQR, quartile, Pnn, percentile, CI, sigma, jitter, spread, median, mean, accuracy, tolerance.
- **« ± »** : 4 mesures seulement. Les 3 traitées, plus `fdsoi28-ro101-frequency-296k-1v`, qui est `calculated`. Son « ±3 % » est un arrondi, déjà porté en `low`/`high` : c'est correct de ne pas le saisir.
- **SD, s.e., IC, IQR** : aucune autre occurrence.

### MAJ-3 MAJEUR : huit distributions publiées sont oubliées, et l'argument « faute de cas » de l'ADR est faux
- **Quantiles publiés et perdus.** `statistics` vaut null sur les 240 mesures, car `curate.ts` code en dur `statistics: null`.
  - `cuda-null-kernel-launch-h100` et `-h200` : la citation est la ligne du tableau III « avg, p50, p5, p95 ». Pour H100 : 4,707 / 4,578 / **4,260 / 5,396 µs**. Le protocole donne R = 150 exécutions mesurées (selon le vérificateur, c'est une attribution : la phase 2 « includes the null-kernel run »). Les conditions ne mentionnent ni p5 ni p95 : seul le `quote` les porte.
  - Six mesures `mlperf-v50-*-mean` : P50 et P99 publiés dans les conditions (exemple : 358,6 / 937,6 ms). Le protocole dit que n exact n'est pas dans le résumé (« min query count 100 », environ 113 échantillons/s sur au moins 2 400 s).
- **Le modèle ne peut pas recevoir les cas MLPerf sans inventer** : `statistics.sampleCount` est obligatoire et doit être ≥ 1. On ne connaît qu'une borne basse de n.
- Pourquoi MAJEUR : l'ADR refuse IQR et quantiles « faute de cas dans le corpus ». Le corpus contient pourtant des P5–P95 et des P50/P99. Ces données ne vont pas dans `uncertainty` (voir MIN-5), mais leur vraie place, `statistics`, est inutilisable en pratique.
- **Correctif** :
  1. faire lire à `curate.ts` un `statistics` venant du correctif ou du patch, au lieu de null en dur ;
  2. remplir `statistics` pour les deux mesures CUDA (n = 150, `method: "not stated by the source"`), par une décision tracée qui cite l'attribution de n du vérificateur ;
  3. pour MLPerf, autoriser `sampleCount: null` accompagné d'un `sampleCountMin` publié, ou consigner explicitement que ces valeurs restent dans le texte ;
  4. corriger le paragraphe « Non retenu » de l'ADR.
- Ce qui est **bien traité** et doit rester ainsi : les plages min–max entre participants ou appareils restent en `low`/`high` (stylet 2–16 ms, Slingshot 300–400 ns). Les plages de réglages Intel C6 ne sont pas une incertitude (le vérificateur le dit). Les « mean » sans dispersion (Willow T1/T2, Zen L3, réaction visuelle) n'ont rien à saisir.

---

## 4. Affichage et export : un « non précisé » peut-il être lu comme un écart-type ?

### MAJ-1 MAJEUR : le tableau de la frise affiche un « ± » nu, sans type, à tous les niveaux
- `Timeline.svelte`, ligne 176 : `{formatValue(m.value…)} ± {formatValue(m.uncertainty.value…)}`. On lit donc « 76 ms ± 2 ms » et « 572 ms ± 25 ms » côte à côte, présentés de la même façon, alors que le premier est une erreur-type et le second non précisé.
- Le tableau s'affiche à tous les niveaux, y compris « explore » (grand public). Le type n'apparaît que dans la fiche, au niveau `scientific`.
- Un lecteur lit d'habitude « ± » comme un écart-type. Sur la phase de fermeture, il sous-estimerait la variabilité d'un facteur √25 = 5. Sur Willow, il prendrait 17 µs pour un SD alors que la source ne le dit pas.
- La cellule colle aussi le « ± » et la plage « (low – high) » : deux notions différentes dans la même cellule.
- Le lecteur d'écran en vue graphique (`rowDetails`) n'annonce pas l'incertitude du tout.
- Le CHANGELOG annonce un « affichage dans la fiche et le tableau », mais l'ADR (point 5) n'exige le type en toutes lettres que dans la fiche.
- **Correctif** :
  - afficher un suffixe court et typé : « ± 2 ms (e.-t.) », « ± 25 ms (± non précisé) », « IC 95 % [a – b] » ; ou un renvoi (astérisque et `title`/note de tableau) vers la fiche ;
  - ne rien afficher pour un IC plutôt que de l'omettre en silence : la ligne actuelle ignore les IC, car `value` est null ;
  - ajouter le type à `rowDetails` ;
  - étendre le point 5 de l'ADR au tableau ;
  - ajouter un test e2e sur la cellule.

### MIN-7 : niveau d'IC arrondi à l'entier
- `Math.round((u.level ?? 0) * 100)` : un IC à 99,5 % s'affiche « 100 % ». 0,683 donne « 68 % », ce qui est acceptable.
- **Correctif** : `formatNumber(level*100, lang, 3)`, ou n'arrondir que si le résultat est entier.

### MIN-8 : la sémantique de l'export CSV n'est pas documentée
- Le type est exporté, ce qui suffit à lever l'ambiguïté pour un lecteur attentif. Mais un consommateur qui ne garde que `uncertaintyValue` mélangera erreurs-types et « ± » non précisés.
- Il n'y a pas d'équivalent SI (`uncertaintyValueSI`, `…LowSI`, `…HighSI`), alors que `valueSI` est exporté. Pas de `statement` ni de `locator` non plus. Le JSON, lui, porte tout (`...m`, y compris `uncertaintySI`).
- Aucun test ne vérifie les nouvelles colonnes (`export.test.ts` ne teste que `csvEscape`).
- **Correctif** :
  - ajouter les colonnes SI ;
  - documenter dans un dictionnaire de données que `unspecified-plus-minus` ne doit pas être traité comme un SD ;
  - envisager de renommer en `uncertaintyHalfWidth` ;
  - ajouter un test d'en-tête et d'une ligne.

### Fiche (`Sheet.svelte`) : correcte
Le type est écrit en toutes lettres, en FR et en EN : « dispersion « ± » de nature non précisée par la source ». La fiche affiche aussi n et la formulation de la source. Les `!` sur `u.low`, `u.high` et `u.value` sont couverts par les invariants. Le seul défaut est le `<q>` sur un `statement` composite (MIN-4).

---

## 5. Tests

### MIN-9 : les tests ne couvrent pas les cas à risque
Les cas unitaires présents sont justes et passent (207 sur 207). Il manque :
- la branche admise `estimated` (positive), et la règle protocole (MAJ-2) ;
- SD avec `value: null`, et IC avec `value` renseigné (seul `low` est testé dans le cas « mixed ») ;
- `contribute:check` avec `uncertainty` : sondes G et H ;
- les colonnes CSV ;
- **une garde au niveau des données**, la plus utile pour V03 :
  - toute mesure `measured` dont `quote`, `conditions` ou `protocol` contient « ± » doit avoir `uncertainty` non null, ou une décision explicite ;
  - toute `standard-error` doit avoir un `statement` qui contient « s.e. », « standard error » ou « SEM » ;
  - les trois mesures actuelles doivent garder leur type (régression contre une ré-inférence « s.e. » sur 572 ms) ;
- côté e2e : le tableau (MAJ-1), le FR de l'erreur-type, et le niveau non entier.
- Le test e2e « structured uncertainty » n'a pas été exécuté (Playwright exclu). Sa logique est cohérente avec le rendu (`toContainText` normalise les espaces, y compris les insécables), mais il n'est **pas vérifié**.

### MIN-10 : CONTRIBUTING est incomplet
La nouvelle ligne de CONTRIBUTING ne dit pas que l'erreur-type exige n, ni que `documented` et `calculated` sont refusés. Le contributeur ne le découvrira qu'à l'échec du build (voir MIN-1).

---

## Récapitulatif

| ID | Gravité | Constat | Correctif court |
|---|---|---|---|
| MAJ-1 | MAJEUR | Tableau : « ± » nu sans type, à tous les niveaux ; IC omis ; lecteur d'écran muet | suffixe typé ou renvoi, `rowDetails`, ADR point 5, e2e |
| MAJ-2 | MAJEUR | Incertitude sans protocole admise (`estimated`), contraire à CS-04 | invariant `uncertainty ⇒ protocol` et test |
| MAJ-3 | MAJEUR | P5/P95 (CUDA) et P50/P99 (MLPerf) publiés mais `statistics` toujours null ; « faute de cas » faux ; n obligatoire bloque MLPerf | `statistics` dans curate, 2 décisions CUDA, `sampleCountMin` ou décision MLPerf, corriger l'ADR |
| MIN-1 | MINEUR | Schéma sans `if/then` ; `contribute:check` accepte IC avec ± et SE sans n | `if/then` dans le schéma, règle de provenance, tests |
| MIN-2 | MINEUR | ± sur une valeur-borne ; IC dégénéré | deux invariants |
| MIN-3 | MINEUR | `sampleCount` sans sémantique ; pas de cohérence avec `statistics` | définition et invariant d'égalité |
| MIN-4 | MINEUR | `statement` composite affiché comme une citation ; nombre non vérifié | séparer `typeBasis` ; invariant « contient le nombre » |
| MIN-5 | MINEUR | Formes non représentables (k, GUM, asymétrique, %) sans consigne | liste des formes refusées dans l'ADR ; k obligatoire le jour venu |
| MIN-6 | MINEUR | Règle de provenance juste, justification fausse (tolérances) ; libellé « non publiée » pour `calculated` | reformuler l'ADR ; libellé dédié |
| MIN-7 | MINEUR | Niveau d'IC arrondi à l'entier (99,5 % donne 100 %) | formatage décimal |
| MIN-8 | MINEUR | CSV : pas de colonnes SI, sémantique non documentée, non testé | colonnes SI, dictionnaire, test |
| MIN-9 | MINEUR | Trous de tests (branche `estimated`, contributions, CSV, garde données, e2e tableau) ; e2e non exécuté | tests listés au §5 |
| MIN-10 | MINEUR | CONTRIBUTING muet sur SE ⇒ n et sur la provenance | une phrase |
