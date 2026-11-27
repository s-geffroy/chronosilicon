# AUDIT-01 — Remédiation métrologie / observateurs / journal (AUD-001, 006, 007, 008, 011)

Branche `remediation-01`, sans commit (le mainteneur committe). Base : `audit-01-baseline` = 491c989.
Périmètre modifié : `packages/metrology/src/{index,stats}.ts`, `packages/observers/src/index.ts`,
`apps/web/src/lib/narrative.ts`, `apps/web/src/lib/narrative.test.ts`, `tests/{metrology,observers,stats}.test.ts`.

Méthode : chaque sonde de l'auditeur a d'abord été écrite en test de régression et exécutée avant
correctif (échec constaté), puis rejouée par un script de sonde (`tsx`, conteneur `node`) avant et
après correctif. Les sorties ci-dessous sont copiées de ces exécutions, sans retouche.

Commandes (conteneur outil uniquement) :

- `sudo appctl run node npx vitest run tests/metrology.test.ts tests/observers.test.ts tests/stats.test.ts tests/oracle-cs03.test.ts apps/web/src/lib/narrative.test.ts`
  - avant correctif : 23 tests nouveaux en échec (5 AUD-001, 5 AUD-006, 6 AUD-007, 3 AUD-011, 4 AUD-008), tous les tests existants verts ;
  - après correctif : `Test Files 5 passed (5)`, `Tests 125 passed (125)`. `tests/oracle-cs03.test.ts` n'est pas modifié et passe (15 tests).
- `sudo appctl run node npx tsc -p tsconfig.json --noEmit` : aucune erreur dans les fichiers de ce lot. Les
  34 erreurs restantes sont toutes dans `tests/simulator.test.ts` (propriétés `horizon`, `completedEnd`,
  `criticalLinks`, `activeTime`, `idleTime`, `discardedEvents` absentes de `SimulationResult`), fichier
  en cours d'édition par un autre agent, hors de mon périmètre.
- `sudo appctl run node npm run build:data` : `build:data OK 0.3.0+6d8a68dd47cf {"sources":120,"phenomena":245,"measurements":245,"qualified":239,"pending":2,"contested":4,"rejected":0,"qualifiedPhenomena":239,"groups":22,"observers":9,"scenarios":5}` ;
  `git diff --stat data/` est **vide** : le corpus publié est inchangé.

Aucune valeur attendue d'un test existant n'a été modifiée.

---

## AUD-001 (mineur) — symétrie toSI / fromSI

**Statut : confirmé, corrigé.**

Avant :
```
fromSI(-1,'ns','duration') -> -1000000000
fromSI(MAX_VALUE,'ns','duration') -> "Infinity"
toSI(MIN_VALUE,'fs','duration') -> 0
fromSI(MIN_VALUE,'a','duration') -> 0
Object.is(toSI(-0,'s','duration'),-0) -> true
```
Après :
```
fromSI(-1,'ns','duration') -> throws ValueError: negative magnitude -1 ns
fromSI(MAX_VALUE,'ns','duration') -> throws ValueError: converted value must be a finite number, got Infinity
toSI(MIN_VALUE,'fs','duration') -> throws ValueError: converted value underflows to 0 (5e-324 fs)
fromSI(MIN_VALUE,'a','duration') -> throws ValueError: converted value underflows to 0 (5e-324 s)
Object.is(toSI(-0,'s','duration'),-0) -> false
```

Correctif : `packages/metrology/src/index.ts:161` — fonction commune `convertChecked` utilisée par
`toSI` (l. 185) et `fromSI` (l. 190) : mêmes contrôles d'entrée (fini, non négatif, unité connue, bonne
dimension), `-0` normalisé en `+0` (l. 169), sortie finie et refus d'un sous-dépassement total
(entrée non nulle donnant 0, l. 175). Les formules de conversion (diviseur exact / facteur) sont
inchangées.

Tests (`tests/metrology.test.ts`, bloc `AUD-001: toSI/fromSI symmetry, input/output checks, extremes`) :
`fromSI refuses negative magnitudes like toSI (auditor probe)`, `fromSI refuses an overflowing result
(auditor probe: MAX_VALUE s → ns)`, `both directions refuse a non-zero value that underflows to zero`,
`both directions reject the same invalid inputs for every unit`, `zero maps to +0 in both directions
(no -0)`, `round trip holds at representable extremes (1e-290 … 1e290)` (ce dernier passait déjà avant :
test d'extrêmes, pas de régression).

Effets de bord :
- `toSI` refuse désormais un sous-dépassement total et rend `+0` pour `-0`. Aucun effet sur le corpus
  (`git diff --stat data/` vide).
- `fromSI` n'a aucun appelant dans `apps/web/src` ni `scripts` (vérifié par grep) ; seulement les tests.
- `Converter.svelte` appelle `toSI` dans un `try/catch` qui rend `null` : une saisie qui
  sous-déborde (ex. `1e-320 fs`) n'affiche plus `0` mais aucun résultat. Pas de modification UI requise ;
  un message « valeur hors domaine numérique » serait un plus (clé i18n à créer, hors périmètre).

## AUD-006 (mineur, latent) — domaines et finitude des conversions directe, inverse, intégrale

**Statut : confirmé, corrigé.**

Avant :
```
cyclesAtConstantFrequency(1e308,4e9) -> "Infinity"
cyclesAtConstantFrequency(MIN_VALUE,0.5) -> 0
toSubjective(1e10, clockedObserver(1,1e300)) -> {"subjectiveSeconds":"Infinity","referenceUnits":10000000000,"incomplete":false}
fromSubjective(1e300, clockedObserver(4e9,1e-300)) -> "Infinity"
fromSubjective(MIN_VALUE, PEDAGOGICAL) -> 0
integrateSegments(0,10,[f=1e308]) -> {"cycles":"Infinity","activeSeconds":10,"stoppedSeconds":0,"gaps":[]}
```
Après :
```
cyclesAtConstantFrequency(1e308,4e9) -> throws ValueError: cycle count overflows (Infinity)
cyclesAtConstantFrequency(MIN_VALUE,0.5) -> throws ValueError: cycle count underflows to 0 for a non-zero input
toSubjective(1e10, clockedObserver(1,1e300)) -> throws ValueError: subjective duration overflows (Infinity)
fromSubjective(1e300, clockedObserver(4e9,1e-300)) -> throws ValueError: physical duration overflows (Infinity)
fromSubjective(MIN_VALUE, PEDAGOGICAL) -> throws ValueError: physical duration underflows to 0 for a non-zero input
integrateSegments(0,10,[f=1e308]) -> throws ValueError: segment cycle count overflows (Infinity)
```

Contrat retenu (CS-03 : « vérifier … valeurs finies, absence de négatifs, précision et seuils
numériques ») : tout résultat doit être fini ; une entrée non nulle ne doit jamais donner 0 (refus
explicite par `ValueError`, pas d'arrondi silencieux) ; zéro reste exactement zéro ; une horloge arrêtée
(f = 0) intègre exactement 0 cycle, ce n'est pas un sous-dépassement.

Correctif (`packages/observers/src/index.ts`) : `checkedResult` l. 83 ; direct : `cyclesAtConstantFrequency`
l. 93, `toSubjective` l. 188 (N·τ), l. 209-210 (Δt/δ et ·τ) ; intégrale : chaque contribution l. 140 et la
somme l. 146, bornes `startTime`/`endTime` finies et refus d'une durée absorbée par l'instant de départ
(`startTime + Δt === startTime`, l. 196) ; inverse : `fromSubjective` l. 225 et 229.

Tests (`tests/observers.test.ts`, bloc `AUD-006: domains and finiteness of direct, inverse and integral conversions`) :
`cycles at constant frequency refuse overflow (auditor probe)`, `cycles at constant frequency refuse a
non-zero result that underflows to 0`, `direct conversion refuses overflow and underflow of N·τ and Δt/δ·τ`,
`inverse conversion refuses overflow and underflow`, `integral conversion refuses overflow, underflow and a
non-finite end time`, `a stopped clock (f = 0) still integrates to exactly 0 cycles (not an underflow)`.

Effets de bord : appelants UI (`Converter`, `Sheet`, `Timeline`, `Comparison`, `Simulation`, `export.ts`,
`v2.ts`) n'utilisent que des valeurs du corpus ou une saisie déjà encadrée par `try/catch` (Converter).
Une saisie extrême dans le convertisseur ne produit plus `Infinity` affiché mais `null` (pas de résultat).
Les autres composants ne reçoivent que des valeurs du corpus, très loin des bornes ; `build:data` inchangé.

## AUD-007 (majeur, latent) — complétude perdue par convertBetween

**Statut : confirmé, corrigé.**

Avant :
```
toSubjective(10,target) -> {"subjectiveSeconds":20000000000,"referenceUnits":20000000000,"incomplete":true}
convertBetween(10, clockedObserver(1), target) -> 20000000000
```
Après :
```
toSubjective(10,target) -> {"subjectiveSeconds":20000000000,"referenceUnits":20000000000,"incomplete":true,"coverage":{"startTime":0,"endTime":10,"activeSeconds":6,"stoppedSeconds":0,"gaps":[[4,8]]}}
convertBetween(10, clockedObserver(1), target) -> throws ValueError: conversion to seg is incomplete (unknown clock state on part of the interval); use convertBetweenDetailed
```

Correctif (`packages/observers/src/index.ts`) :
- `SegmentCoverage` (l. 151) et champ optionnel `coverage` de `SubjectiveResult`, rempli seulement pour
  les observateurs segmentés (l. 203) : origine physique (`startTime`), fin, temps actif, temps arrêté,
  lacunes. Absent pour les observateurs à taux constant (résultats strictement inchangés).
- `ConversionResult` (l. 174) et nouvelle fonction `convertBetweenDetailed(x, a, b, startTime = 0)`
  (l. 241) : conserve complétude, couverture, durée physique intermédiaire et identifiants source/cible.
- `convertBetween` (l. 252) : signature compatible (paramètre `startTime` optionnel ajouté) ; elle
  **refuse** un résultat incomplet au lieu de rendre une borne inférieure présentée comme exacte. L'inverse
  non défini d'un observateur segmenté reste refusé (`fromSubjective`, `ValueError`).

Tests (`tests/observers.test.ts`, bloc `AUD-007: conversion between observers keeps completeness, coverage and origin`) :
`toSubjective reports incompleteness and coverage for the auditor target`, `convertBetween refuses to
return a bare number for an incomplete result (auditor probe)`, `convertBetweenDetailed preserves
completeness, coverage and origin`, `the physical origin of a segmented target is explicit`, `a complete
segmented target still converts to a number`, `the undefined inverse of a segmented source is refused`,
`constant-rate results are unchanged (no coverage field)`.

Effets de bord : `convertBetween` n'a aucun appelant dans `apps/web/src` ni `scripts` (grep) ; les tests
d'identité et de composition A→B→A existants passent sans changement.

## AUD-008 (majeur, latent) — journal : lacunes intégrées sans l'instant absolu

**Statut : confirmé, corrigé.**

Avant (tests de régression, observateur 4 GHz sur [0,1] puis 2 GHz sur [1,2], deux tâches de 1 s en
séquence simulées par `simulate`) : `expected [ undefined, undefined ] to deeply equal [ 4000000000, 2000000000 ]`
(le journal n'exposait pas la durée subjective des lacunes ; le texte de la 2e lacune était calculé par
`subj(gapS)` = intégrale sur [0,1] = 4e9 au lieu de 2e9, d'où une somme de 8e9).
Après : `gapSubjective` = `[4e9, 2e9]`, somme `6e9`, texte de la 2e lacune = `formatCalendar(2e9)`.

Correctif (`apps/web/src/lib/narrative.ts`) : l. 51 `at(s)` = intégrale sur [0, s] ; l. 54 `over(start, dt)`
= intégrale sur l'intervalle absolu [start, start + dt] ; l. 68 la lacune est convertie avec son instant de
début ; nouveaux champs de `JournalLine` : `gapSubjective` (l. 77) et `incomplete` (lacunes l. 78,
événements l. 99). Pour un observateur à taux constant, `toSubjective(dt, obs, start)` ignore `start` :
valeurs et textes identiques à l'existant (vérifié par test sur tous les scénarios du corpus et trois
fréquences, et par l'oracle Mars inchangé).

Tests (`apps/web/src/lib/narrative.test.ts`, bloc `AUD-008: gaps are integrated over their absolute physical interval`) :
`gap subjective durations sum to 6e9, not 8e9 (auditor probe)`, `event/gap consistency: each gap equals
the difference of the subjective times of its bounds`, `incompleteness of a partially covered clock is kept
on gap and event lines`, `constant observers: gap values identical to the former toSubjective(gap)
computation`. Les scénarios de test sont illustratifs (durées de 1 s, `measurementId: null`), pas des mesures.

Effets de bord et action UI demandée au mainteneur (je n'ai pas modifié de composant) :
- `JournalLine` gagne deux champs ; `Immersion.svelte` (seul appelant de `narrate`, l. 20) n'utilise que
  `subjective`, `physical`, `physicalEnd`, `text` : aucune casse, aucun changement visible aujourd'hui
  (l'UI ne crée que des observateurs `clockedObserver`).
- Si un observateur segmenté est un jour exposé dans l'immersion, `Immersion.svelte` devra signaler les
  lignes `incomplete === true` (valeur = borne inférieure, état d'horloge inconnu sur une partie de
  l'intervalle), avec une nouvelle clé i18n FR/EN (ex. `journal.incomplete`) dans `apps/web/src/lib/i18n.ts`
  ; et le test « every sentence is a fixed template » devra inclure ce gabarit.

## AUD-011 (mineur, latent) — moyenne non robuste, tri présumé par quantileSorted

**Statut : confirmé, corrigé.**

Avant :
```
summarize([MAX,MAX]).mean -> "Infinity"
summarize([1e308 x4]).mean -> "Infinity"
quantileSorted([-MAX,MAX],0.5) -> "Infinity"
quantileSorted([3,1,2],0.5) -> 1
quantileSorted([1,NaN,3],0.5) -> "NaN"
```
Après :
```
summarize([MAX,MAX]).mean -> 1.7976931348623157e+308
summarize([1e308 x4]).mean -> 1e+308
quantileSorted([-MAX,MAX],0.5) -> 0
quantileSorted([3,1,2],0.5) -> throws RangeError: sample is not sorted in ascending order at index 1
quantileSorted([1,NaN,3],0.5) -> throws RangeError: sample[1] is not a finite number: NaN
```

Correctif (`packages/metrology/src/stats.ts`) :
- `quantileSorted` (l. 27) : contrat documenté et **vérifié** (échantillon non vide, fini, trié croissant ;
  `RangeError` sinon, l. 33) ; interpolation type 7 inchangée tant que `b − a` est fini, forme convexe
  `(1−w)·a + w·b` seulement si `b − a` déborde (l. 44).
- `finiteMean` (l. 56), utilisée par `summarize` (l. 75) : somme naïve conservée bit à bit quand elle est
  finie ; sinon mise à l'échelle par une puissance de deux (division exacte, échelle ≤ 2^1023), donc
  moyenne toujours finie pour un échantillon fini. Limite documentée : dans ce repli, des échantillons de
  très petite magnitude devant max|x| peuvent perdre de la précision (sous-normaux), poids inférieur à la
  précision du résultat.
- `summarize` : contrat documenté (ordre quelconque en entrée, trié en interne ; échantillons finis
  obligatoires, `ValueError` sinon — comportement existant).

Tests (`tests/stats.test.ts`, bloc `AUD-011: finiteness and sort contract of summary statistics`) :
`mean of large finite samples stays finite (auditor probe)`, `type-7 interpolation does not overflow
between extreme order statistics`, `quantileSorted refuses an unsorted or non-finite sample instead of
presuming the sort`, `ordinary samples keep the naive mean exactly (no behaviour change)`. Les oracles R
type 7 existants passent sans modification.

Effets de bord : `quantileSorted` coûte un parcours O(n) de vérification ; seul appelant hors package :
aucun direct (`browser-measure.ts` passe par `summarize`, qui trie avant). Un appel externe avec un
échantillon non trié lève désormais `RangeError` au lieu de rendre une valeur fausse.

---

## Points laissés au mainteneur
- Mettre à jour `CHANGELOG.md`, `docs/requirements-matrix.md` et, si souhaité, une ADR pour le contrat
  numérique (refus explicite du dépassement et du sous-dépassement total ; `convertBetween` qui refuse
  l'incomplet) — fichiers hors de mon périmètre.
- `tests/simulator.test.ts` ne compile pas (`tsc`) au moment de ce lot : travail d'un autre agent.
- Suite complète, e2e et `npm run check` non exécutés ici (consigne : autres agents en cours d'édition).
