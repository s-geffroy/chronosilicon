# AUDIT-01 — Pièce : modèles scientifiques implémentés

- Objet : décrire **ce que le code à HEAD implémente réellement** (commit `491c989`, branche `develop`), avec `chemin:ligne`. Ce document n'est pas un verdict d'audit.
- Statut des revues : toutes les revues antérieures sont des **auto-revues internes** par des agents du même modèle. Aucune validation externe (humaine, pair, laboratoire) n'a eu lieu.
- Corpus au moment de la rédaction (`data/validated/corpus.json`) : 239 mesures. Provenance : 144 `documented`, 58 `measured`, 29 `calculated`, 8 `estimated`. 3 mesures portent une `uncertainty` et 12 des `statistics`.

## 1. Grandeurs, dimensions, unités, normalisation SI

**Types de grandeurs** (`packages/metrology/src/index.ts:14-24`) : `duration`, `frequency`, `throughput`, `transfer_rate`, `distance`, `speed`, `data_size`, `cycle_count`, `compute_rate`. L'unité de base de chacun est donnée en `:27-37` : s, Hz, B/s, T/s, m, m/s, B, cycles, flop/s.

**Constantes** : c = 299 792 458 m/s, exacte (`:40`) ; ua = 149 597 870 700 m, exacte, IAU 2012 (`:42`) ; année julienne = 365,25 × 86 400 s (`:44`).

**Table des unités** (`:62-126`) : facteur multiplicatif vers l'unité de base.
- Débits : préfixes décimaux (kB/s…TB/s), préfixes binaires explicites (KiB/s…GiB/s), bit/s = 1/8 B/s (`:82-94`).
- `T/s`, `MT/s`, `GT/s` forment un type distinct de `throughput` et ne se convertissent pas en B/s (`:95-98`).
- `cycles` est un comptage sans dimension (`:119`).
- flop/s, Gflop/s…Eflop/s (`:121-125`).
- `a` = année julienne comme unité de durée (`:74`).

**Diviseurs exacts** : pour un facteur < 1 dont l'inverse est entier à 1e-6 près, l'unité garde un `divisor` entier (`:57-60`). `toSI` divise alors au lieu de multiplier (`:166`), pour éviter le bruit flottant (43 ms donne 0,043 s). Le test correspondant est `tests/metrology.test.ts:40`.

**Conversion `toSI(value, unit, expected)`** (`:158-169`) :
- refuse une valeur non finie (`assertFinite`, `:146-150`) et une valeur négative (`:160`), car toutes les grandeurs modélisées sont des magnitudes ≥ 0 ;
- refuse une unité inconnue (`:162`) ;
- refuse une unité d'un autre type que celui attendu, par `DimensionError` (`:163-165`) ;
- vérifie que le résultat est fini (`:167`).

`fromSI` (`:172-180`) fait les mêmes contrôles de type et de finitude, mais **ne refuse pas les négatifs**. Les tests de refus sont dans `tests/metrology.test.ts:6-16` : GB/s contre duration, GT/s contre throughput, cycles contre duration, Pflop/s contre frequency, unité inconnue, NaN/∞/−1.

**`cycle_count` et `compute_rate`** : le commentaire (`:7-9`) dit qu'un nombre de cycles n'a de sens qu'avec le domaine d'horloge d'un composant nommé, et qu'un flop/s exige une précision et un benchmark. **Le code ne l'impose pas** : ces informations vivent dans le texte des `conditions`. Seul le type est contrôlé : pas de mélange de types dans un groupe de comparaison (`apps/web/src/lib/v2.test.ts:21-22`, `:86-87`).

**Contrôle à l'échelle du corpus** :
- `checkInvariants` vérifie que l'unité est connue et compatible avec le `quantityKind` du phénomène (`packages/ontology/src/index.ts:291-294`) ;
- `normalize` produit `valueSI`, `lowSI`, `highSI`, `quantilesSI` et `uncertaintySI` par `toSI`, et lève une erreur sur toute incohérence dimensionnelle (`:351-369`).

**Arrondi** : il n'a lieu qu'à l'affichage (`packages/metrology/src/index.ts:11`, `packages/observers/src/format.ts:1-3`). `calendarParts` décompose en deux parties calendaires, en années juliennes, avec une seule partie au-delà de 10⁶ ans (`format.ts:27-42`). `prefixDuration` choisit le préfixe SI (`format.ts:60-67`).

**Quantiles** (`packages/metrology/src/stats.ts`) :
- méthode Hyndman et Fan type 7, interpolation linéaire, défaut de R et NumPy (`stats.ts:9`) ;
- `quantileSorted` calcule h = (n−1)·p, puis x[⌊h⌋] + (h−⌊h⌋)(x[⌈h⌉]−x[⌊h⌋]) ; il refuse un échantillon vide et p ∉ [0,1] (`stats.ts:20-28`) ;
- `summarize` renvoie n, min, max, moyenne et quantiles (0,5 ; 0,95 ; 0,99 par défaut), avec le nom de la méthode (`stats.ts:30-43`), et refuse un échantillon non fini (`stats.ts:32`) ;
- les tests comparent à des valeurs recalculées à la main selon la définition du type 7 (`tests/stats.test.ts:4-28`). R n'a pas été exécuté.

`checkQuantiles` (`index.ts:186-200`) signale p ∉ ]0,1[, une valeur non finie, un p en double, ou une valeur décroissante quand p croît. Il ne lève pas d'exception : il renvoie une liste de problèmes.

## 2. Transformations d'observateur (`packages/observers/src/index.ts`)

**Principe** (`:5-15`) :
- le temps physique SI est le seul axe de référence ;
- un observateur n'apporte qu'une règle de conversion ;
- τ est la durée subjective accordée à une unité de référence, 1 s par défaut (`:20`).

Trois types d'observateur sont définis (`:31-52`).

| Règle | Équation | Code | Hypothèses | Refus |
|---|---|---|---|---|
| Cycles à f constante | N = f·Δt | `cyclesAtConstantFrequency` `:78-82` | f constante pendant Δt ; N est un nombre **théorique** de cycles d'horloge | Δt non fini ou < 0 (`:72-75`) ; f non finie ou ≤ 0 (`:67-70`) |
| Observateur cadencé | T = N·τ | `toSubjective`, cas `clocked`, `:150-154` | mêmes hypothèses ; τ > 0 | τ ≤ 0 ou non fini (`:151`) |
| Segments | N = ∫f dt (constant par morceaux) = Σ fᵢ·(bᵢ−aᵢ) | `integrateSegments` `:110-135` ; `validateSegments` `:96-107` | f constante sur chaque segment [start, end[ ; f = 0 signifie horloge arrêtée | segment non fini, end ≤ start, f < 0, chevauchement (`:100-104`) ; t1 < t0 (`:113`) |
| Opération de référence | T = Δt/δ_ref·τ | `toSubjective`, cas `reference-operation`, `:160-165` | δ_ref est **une durée scalaire unique**, décrite en texte (`:47-50`) | δ_ref ≤ 0 ou non fini (`:162`) |
| Inverse | Δt = T/τ/f, ou Δt = (T/τ)·δ_ref | `fromSubjective` `:173-187` | observateur à taux constant | segmenté : `ValueError` (`:184-185`), car non inversible quand l'horloge s'arrête |
| Changement d'observateur | T_B = toSubjective(fromSubjective(T_A, A), B) | `convertBetween` `:190-192` | passe par le temps physique | refus hérités |
| Propagation | Δt = d/v, v = c par défaut | `propagationDelay` `:195-199` | v constante ; le milieu est un paramètre libre | d < 0 ou non finie ; v ≤ 0 |
| Transfert idéal | Δt = Q/B | `idealTransferTime` `:205-209` | sérialisation seule : latence, protocole et recouvrement exclus (`:201-204`) | Q < 0 ; B ≤ 0 |
| Quantiles | q′ₚ = T(qₚ) | `quantilesToSubjective` `:215-221` | application linéaire monotone à taux constant ; ne jamais additionner des quantiles (commentaire `:212-213`) | observateur segmenté (`:219`) |

Comportement de `integrateSegments` :
- les intervalles non couverts sont rapportés dans `gaps` et **jamais comblés** (`:126`, `:133`) ;
- `activeSeconds` et `stoppedSeconds` sont séparés (`:129-130`) ;
- `toSubjective` met `incomplete: true` s'il y a un trou (`:158`). La valeur renvoyée ne compte alors que les cycles des segments couverts.

**Observateur pédagogique** :
- `PEDAGOGICAL_OBSERVER` : cadencé, f = 4 GHz, τ = 1 s, donc un cycle vaut une seconde subjective (`:19`, `:54-59`) ;
- le commentaire `:14-15` le qualifie de métaphore, sans conscience ni relativité physique ;
- l'interface affiche que les cycles théoriques ne sont ni des instructions ni du travail utile (`apps/web/src/lib/i18n.ts:186-187`, `obs.cyclesNote`).

**Usage dans l'application** :
- l'interface utilise `clockedObserver(app.s.frequencyHz)` : `Converter.svelte:19`, `Sheet.svelte:13`, `Timeline`, `Comparison.svelte:12`, `Simulation.svelte:17`, `export.ts:16` ;
- les observateurs du corpus passent par `toObserver`, en cadencé ou en opération de référence (`apps/web/src/lib/v2.ts:17-21`, `:30-35`) ;
- **le type `clocked-segments` n'est utilisé par aucun composant de l'interface** : il n'apparaît que dans le paquet et dans ses tests.

## 3. Valeurs calculées du corpus

- Un enregistrement `calculated` porte `calculation: {formula, inputs}` (`packages/ontology/src/index.ts:94`).
- `checkInvariants` exige :
  - une `calculation` (`:329`) ;
  - des entrées résolues, soit vers une mesure, soit vers une source citée `src:` (`:330-333`) ;
  - des entrées qualifiées pour une valeur qualifiée (`:334-336`).
- `curate.ts` extrait les entrées d'une formule écrite comme chaîne par motif d'identifiant (`scripts/curate.ts:131-133`).
- **La chaîne `formula` n'est jamais évaluée.** La valeur stockée vient de la donnée curée.

La vérification est faite par `tests/calculated-values.test.ts` :
- le test parcourt toutes les mesures `calculated`, ici 29, toutes qualifiées (`:54`) ;
- il échoue si l'une n'a pas d'oracle (`:55-57`) ;
- chaque `ORACLE` (`:19-51`) **réimplémente la formule à la main** à partir des `valueSI` du corpus ;
- tolérance relative < 1e-12 (`:62`), au nom de la règle de pleine précision de CS-03 : seul le bruit flottant est toléré.

Particularités des oracles :
- Certains n'utilisent pas d'entrée du corpus, mais une constante tirée du texte de la source (`:31` 1/1000 ; `:37`, `:46`, `:47` tr/min/60 ; `:40` 16/233 700). Ils ne vérifient alors que l'arithmétique, pas le lien avec une entrée.
- Hypothèses de modèle incluses :
  - Ethernet : 64 B + 8 B de préambule + 12 B d'espace inter-trame = 672 bit (`:27-30`, `:45`) ;
  - loi de Little à QD16 (`:40`), qui suppose un régime stationnaire ;
  - oscillateur en anneau f = 1/(2·N·t_étage) avec N = 101 (`:42`) ;
  - demi-rotation pour la latence de rotation moyenne d'un disque (`:38`, `:48`) ;
  - altitude orbitale au zénith pour GPS et GEO (`:43-44`).
- Formules et oracles ont été écrits par des agents du même modèle. La reproduction n'est donc pas une vérification indépendante de la formule.

## 4. Incertitude et statistiques (ADR-0009)

**Modèle** (`docs/adr/ADR-0009-incertitude-structuree.md:6-9`) : `uncertainty` vaut `null` ou un objet `{type, value, low, high, level, sampleCount, statement, locator}`. Le type est l'un de `standard-deviation`, `standard-error`, `unspecified-plus-minus` (demi-largeur ±) ou `confidence-interval` (low/high/level). Les statistiques (`statistics`) sont des quantiles publiés, avec n et la méthode.

**Invariants appliqués** (`packages/ontology/src/index.ts`) :
- `:302` : une dispersion ou des statistiques exigent un `protocol` ;
- `:303-305` : n doit concorder entre `uncertainty` et `statistics` ;
- `:306` : pas de ± sur une borne unilatérale (low = value ou high = value) ;
- `:307-310` : la formulation de la source contient la valeur de la dispersion, ou les deux bornes d'un IC. `containsNumber` (`:264-267`) compare par jeton numérique : 2 n'est trouvé ni dans « n=25 » ni dans « 2.5 » ;
- `:312-315` : un IC a low, high et level, sans value ; il n'est pas dégénéré (low < high) et contient la valeur ;
- `:316-318` : un ± a value > 0, sans low, high ni level ;
- `:319` : une erreur-type exige n ;
- `:320-322` : une dispersion est **refusée** sur une valeur `documented` ou `calculated` ;
- `:325` : un n inconnu dans `statistics` exige `sampleCountNote` ;
- `:326` : les quantiles passent par `checkQuantiles` ;
- `:296-298` : low ≤ value ≤ high ;
- `:299` : `illustrative` est interdit dans le corpus ;
- `:300` : une valeur `measured` exige un protocole.

La garde sur les données (`tests/published-dispersion.test.ts:10`) vérifie qu'une valeur mesurée dont l'extrait ou les conditions publient ±, SD, s.e., IC ou percentile les a bien structurés. Elle détecte par motif textuel : sa couverture dépend des motifs.

**Ce qui n'est pas propagé** :
- **aucune propagation d'incertitude** n'est implémentée ;
- une valeur `calculated` affiche « Non propagée : valeur calculée par le projet à partir d'entrées sans incertitude publiée » (`apps/web/src/lib/i18n.ts:96`, `:377` ; `Sheet.svelte:66`) ;
- les conversions d'observateur transforment `valueSI`, pas l'incertitude. `quantilesToSubjective` existe, mais son usage dans l'interface n'a pas été relevé dans les fichiers inspectés.

**Formes refusées ou non représentables** (ADR-0009:33-38) :
- IQR et percentiles dans `uncertainty` : ils vont dans `statistics` ;
- min–max comme incertitude ;
- incertitude élargie sans facteur k ;
- ± asymétrique ou ± en % : restent dans le texte des conditions ;
- tolérances de fiche technique : non modélisées.

## 5. Mesure navigateur du Laboratoire (`apps/web/src/lib/browser-measure.ts`)

**Ce qui est mesuré** : le navigateur, jamais la latence native du processeur (`:1-3`).

Granularité de l'horloge (`measureTimerGranularity`, `:83-89`) :
- boucle active sur `performance.now()` ;
- chaque échantillon est l'écart entre deux lectures distinctes consécutives, converti en secondes (`:66-80`) ;
- n = 200 par défaut, borne de 5×10⁶ appels ;
- une horloge figée lève `MeasurementError` (`:78`) ;
- résumé type 7, avec les **échantillons bruts conservés et exportables**.

Coût d'un appel (`measureNowCallCost`, `:95-117`) :
- le pas g est la médiane de 50 pas (`:96`) ;
- la taille de lot k part de 1000 et double jusqu'à ce qu'un lot dure ≥ 100 g ou que k atteigne 2×10⁷ (`:103-104`) ;
- 5 lots d'échauffement sont écartés et 30 conservés (`:105-109`) ;
- la valeur rapportée est la médiane des moyennes de lot, avec une résolution g/k (`:110-111`) ;
- `unresolved` vaut vrai si la médiane ≤ g/k (`:114`) ;
- les quantiles des moyennes de lot ne sont **pas** présentés comme la distribution des appels individuels (`:5-10`) ;
- le coût mesuré inclut le corps de boucle et l'accumulation `sink += …` (`:100`), qui empêche le travail d'être supprimé par l'optimiseur.

**Contexte enregistré** (`:57-64`) : userAgent, `crossOriginIsolated`, `hardwareConcurrency`, horodatage ISO.

**Résolution** : la réduction de résolution du navigateur n'est pas corrigée. Elle est mesurée (granularité) et sert à dimensionner les lots. Le code ne demande pas d'isolation cross-origin ; il enregistre seulement son état.

**Pourquoi l'étiquette** :
- l'avertissement affiché dit que la mesure porte sur le navigateur (horloge volontairement dégradée, ordonnanceur, compilation à la volée) et non sur la latence native (`i18n.ts:249-250`, `Laboratory.svelte:39`), conformément à CS-06 ;
- l'interface donne P50/P95/P99 « des pas d'horloge », min–max et la méthode (`Laboratory.svelte:48-54`) ;
- pour le coût d'appel, elle donne « médiane ± résolution » ou « non résolu » (`:56-60`).

**Tests** : aucun test unitaire de `browser-measure.ts`. Seul un test e2e existe (`tests/e2e/site.spec.ts:260-279`) : il vérifie l'étiquette, l'export des échantillons bruts et l'absence de P99 pour le coût d'appel.

## 6. Oracles de référence et tests de propriétés

`tests/oracle-cs03.test.ts` (exemples de `docs/CS-03_Fondements.md:4`, à 4 GHz) :
- conversions exactes, à tolérance relative 1e-12 (`:12-26`) : 0,25 ns → 1 s ; 1 ns → 4 s ; 100 ns → 400 s ; 1 µs → 4000 s ; 100 µs → 4×10⁵ s ; 1 ms → 4×10⁶ s ; 1 s → 4×10⁹ s ;
- `toBeCloseTo` :
  - 100 µs → 4,62963 j ; 1 ms → 46,2963 j (`:27-28`) ;
  - 1 s → 126,752 années juliennes ; 1/60 s → 2,1125 a ; 250 ms → 31,688 a (`:29-31`) ;
  - 1 km dans le vide → 13 342,564 s, décomposé en 3 h 42 min (`:32-38`) ;
  - Terre–Lune 384 400 km (illustratif) → 1,282 s et ≈ 162,5 a (`:39-43`) ;
- c exacte (`:44`) ;
- ce sont des oracles de calcul, pas des mesures.

`tests/observers.test.ts` (propriétés de CS-07) :
- générateur pseudo-aléatoire LCG déterministe, graine 42 (`:11-16`). Ce n'est pas une bibliothèque de propriétés : pas de rétrécissement des contre-exemples ;
- identité pour une même référence, 200 tirages log-uniformes (`:23-28`) ;
- composition A→B→A < 1e-12 pour un GPU à 1,98 GHz, un MCU à 16 MHz et une opération de référence de 1 ns, avec 200 tirages chacun (`:29-37`) ;
- durée physique conservée (`:38-42`) ;
- monotonie stricte pour f > 0, sur 300 points entre 1e-15 et 1e6 s (`:46-50`) ;
- Δt = 0 donne 0 (`:51-54`) ;
- refus de Δt négative, NaN ou ±∞ (`:55-57`), de f ≤ 0 ou non finie (`:58-63`), et de τ = 0 (`:64`) ;
- segments : un segment constant égale le cas constant ; intégration par morceaux ; horloge arrêtée distincte ; trous signalés et `incomplete` ; chevauchement, f < 0 et end < start refusés (`:67-99`) ;
- Q/B (`:103`) ; quantiles linéaires et ordonnés ; refus pour un observateur segmenté (`:104-112`) ;
- les « données non comparables » de CS-07 sont testées côté groupes de comparaison (`apps/web/src/lib/v2.test.ts:21-22`), pas dans le paquet observers.

## 7. Hypothèses et limites

**Hypothèses non vérifiées par le code** :
- fréquence constante pendant Δt, et ni arrêts (*stalls*), ni DVFS, ni horloge gelée pour l'observateur cadencé : seul `clocked-segments` les modélise, et l'interface ne l'utilise pas ;
- cycles théoriques ≠ cycles mesurés ≠ instructions retirées ≠ travail utile. C'est affiché (`obs.cyclesNote`), mais aucune grandeur IPC ou « cycles effectivement mesurés » n'est modélisée ;
- δ_ref est un scalaire fixe ; aucun conditionnement par charge, cache ou contention ;
- v = c par défaut pour la propagation : la vitesse dans le milieu (fibre, cuivre) n'est pas modélisée par une table, seulement par un paramètre ;
- Q/B exclut latence, protocole et recouvrement ;
- domaine d'horloge d'un `cycle_count`, précision et benchmark d'un `compute_rate` : texte libre, non contrôlé ;
- hypothèses physiques des valeurs calculées (loi de Little, trame Ethernet, rotation moyenne, oscillateur en anneau, zénith) : écrites en commentaire, non vérifiées contre une mesure.

**Métaphore** : le « temps subjectif » (1 cycle à 4 GHz = 1 s) est une mise à l'échelle linéaire pédagogique, sans conscience, perception ni relativité. Il ne dit rien de la puissance de calcul.

**Calculé, mesuré, estimé** :
- `measured` : 58 valeurs, mesurées par des tiers dans la source citée ; le projet n'a lui-même rien mesuré pour le corpus ;
- `documented` : 144, valeurs de fiche technique ou de norme ;
- `estimated` : 8 ;
- `calculated` : 29, dérivées par le projet et reproduites par oracle, sans incertitude propagée ;
- la mesure navigateur du Laboratoire est faite par le visiteur, sur son navigateur, et n'entre pas dans le corpus ;
- les conversions subjectives sont des calculs déterministes, pas des mesures.

**Écarts avec les spécifications** :

| Exigence | Source | État |
|---|---|---|
| f variable par segments, trous signalés, horloge arrêtée distincte | CS-07 | **partiel** : implémenté et testé dans le paquet ; absent de l'interface |
| Afficher les cycles effectivement mesurés, le travail potentiel sous hypothèses, le temps actif et le temps d'attente | CS-07 | **partiel / absent** : seuls le temps réel, les cycles théoriques et le temps subjectif sont affichés. Le temps actif et arrêté n'existe que dans `integrateSegments`, non affiché. Les cycles mesurés et le travail potentiel sont absents |
| Opération de référence variable par modèle conditionnel ou intervalle | CS-07 | **absent** : δ_ref est un scalaire |
| Distinguer cycles comptés, référence constante et cycles utiles ; IPC mesuré | CS-03 | **partiel** : avertissement textuel seulement |
| Vitesse du signal en milieu documentée | CS-03 | **partiel** : paramètre v sans données de milieu |
| Ne pas additionner des quantiles | CS-03 | **partiel** : règle en commentaire. Pas de garde dans le code. `quantilesToSubjective` ne valide ni p ni l'ordre (pas d'appel à `checkQuantiles`) |
| Axe log, durée nulle séparée | CS-03 | présent (`Timeline.svelte:27`, `:40-42`, `:196-198`). Le recalcul des positions lors d'un changement de référentiel n'a pas été inspecté en détail |
| Propagation d'incertitude des valeurs calculées | CS-04 / CS-06 | **absent**, déclaré « non propagée » |
| Tolérances constructeur, ± asymétrique, ± en %, incertitude élargie | ADR-0009 | **absent**, formes refusées |
| Protocole complet (matériel, firmware, OS, fréquence effective, température, répétitions, overhead) | CS-06 | **partiel** : texte `protocol` libre, non structuré. Côté navigateur, seuls userAgent, COI, nombre de cœurs et date sont enregistrés. Pour le coût d'appel, seules les moyennes de lot sont conservées, pas les lectures individuelles |
| Méthode des quantiles enregistrée | CS-06 | présent pour le Laboratoire (type 7). Pour le corpus, la méthode est celle de la source, parfois « non précisée » |
| Reproductibilité indépendante recherchée, absence signalée | CS-06 | **absent** : aucune reproduction indépendante, aucune revue externe |
| « ne jamais comparer la puissance de calcul à partir de la fréquence seule » | CS-07 | partiel : ordre des comparaisons par époque, jamais par valeur (`v2.ts:7-15`). Aucune garde formelle |

**Autres limites relevées dans le code** :
- `fromSI` accepte des valeurs négatives (`metrology/src/index.ts:172-180`), alors que `toSI` les refuse ;
- l'heuristique du `divisor` (`index.ts:57-60`) ne s'applique qu'aux facteurs < 1 d'inverse quasi entier ;
- `measureNowCallCost` lit la médiane comme `quantiles[0]`, ce qui dépend de l'ordre par défaut `[0.5, …]` (`browser-measure.ts:96`, `:110`) ;
- la « ± résolution » du coût d'appel est affichée sans le libellé « résolution » dans la cellule (`Laboratory.svelte:59`). Elle n'est explicitée que dans le protocole. La règle 5 d'ADR-0009 (« un ± n'est jamais affiché sans son type ») vise le corpus, pas le Laboratoire ;
- la garde de `published-dispersion.test.ts` repose sur des motifs textuels.
