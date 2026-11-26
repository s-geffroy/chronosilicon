# CHRONOSILICON — Dossier directeur consolidé v1.0.0

Conception D1–D17 validée ; audit et exécution non vérifiés.

# CS-00 — Vision et charte
CHRONOSILICON — An Open Atlas of Computational Time. « Experience time through the eyes of a processor. » Nom provisoire sous réserve de vérification. Objectif : faire comprendre les disparités temporelles des systèmes informatiques, les raisons architecturales de caches, parallélisme, spéculation et délégation, et permettre l'expérimentation causale. Public : curieux, étudiants/ingénieurs, chercheurs. Gratuit, public, FR/EN, sans compte, sans backend. Code ouvert, données et hypothèses contestables. La métaphore de l'observateur ne suppose aucune conscience ni relativité physique. Succès : compréhension intuitive et résultats reproductibles ; éviter les chiffres spectaculaires non comparables. Hors périmètre initial : émulation cycle-exacte, certification métrologique, service commercial, calcul distant obligatoire. V0–V5 progressives ; GitHub canonique, Drive copie documentaire.


---

# CS-01 — Registre des décisions
Toutes les décisions suivantes ont été validées explicitement par le choix D, dans l'ordre de la conversation. Les paramètres proposés dans leur mise en œuvre restent amendables si compatibles, avec ADR.

| ID | Choix | Décision |
|---|---|---|
| D1 | D | Référentiels cycle, instruction, registre ; cycle principal |
| D2 | D | PC x86-64, Apple Silicon, serveur et supercalculateur ; CPU pédagogique 4 GHz |
| D3 | D | Écosystème entier, transistor à humain/espace |
| D4 | D | Modèle temporel, fonctionnel, architectural et narratif |
| D5 | D | Latence, débit, fréquence, parallélisme, jitter, synchronisation, propagation, contention, logiciel, énergie |
| D6 | D | Atlas interactif, chronologique, architectural, comparatif, immersif |
| D7 | D | Sources, expérimentation, statistiques, incertitude, traçabilité |
| D8 | D | Multi-observateurs, domaines d'horloge et transformations |
| D9 | D | Simulation à événements discrets, causale, multi-référentielle |
| D10 | D | Laboratoire intégré, objectif GitHub Pages |
| D11 | D | TypeScript/Svelte/Vite/D3, WASM si justifié ; statique, GitHub canonique |
| D12 | D | Interface multimodale, chronologie principale, 3 niveaux de lecture |
| D13 | D | Ontologie légère typée, dimensionnelle, causale et probabiliste |
| D14 | D | Corpus extensible, historique et documenté |
| D15 | D | Validation multicouche non compensatoire et contradictoire |
| D16 | D | Identité ouverte autonome, CHRONOSILICON sous réserve, licences et FR/EN |
| D17 | D | Tranches V0–V5 avec portes, M00 puis dossier et réalisation |

D11–D17 ne présupposent aucun dépôt effectivement créé ni aucun résultat scientifique. Détails à confirmer par inspection : propriétaire GitHub, disponibilité du nom, versions des dépendances, sources et mesures, performances, licence des données externes. Ne pas considérer l'arborescence ou l'identité visuelle comme un actif existant.


---

# CS-02 — Cahier des charges fonctionnel
| Exigence | Fonction | Version cible |
|---|---|---|
| F01 | Chronologie logarithmique, filtre par domaine et fiche scientifique | V1 |
| F02 | Convertisseur physique/subjectif et fréquence personnalisable | V1 |
| F03 | FR/EN, responsive, accessible, lecture grand public/technique/scientifique | V1 |
| F04 | Architecture et comparaison des générations, changement d'observateur | V2 |
| F05 | Moteur de simulation discret avec dépendances, ressources et contention | V3 |
| F06 | Journal narratif généré depuis les événements réellement simulés | V4 |
| F07 | Laboratoire, provenance, mesures, distributions, export | V1–V5 |
| F08 | URLs partageables et export des paramètres, résultats et versions | V1–V3 |
| F09 | Publication statique publique sans compte ni backend | V1 |

Modules ATLAS, OBSERVER, SIMULATOR, IMMERSION, BENCHMARK, COMPARATOR. Espaces : chronologie, architecture, observateurs, simulation, immersion, comparaison, laboratoire. V1 n'affiche pas comme opérationnels les modules non réalisés. Corpus : transistor, logique, CPU, caches/RAM/HBM, GPU/NPU/FPGA/TPU, PCIe/CXL/USB, stockage, OS/logiciels, réseaux, distribué, IA, périphériques, humain, spatial, technologies émergentes. Pas de comparaison de débit à une latence sans taille de travail. Afficher contexte et provenance à un clic ; export JSON/CSV avec unités et version ; local storage seulement si utile, aucune télémétrie obligatoire. Exemples de scénarios ultérieurs : clic, boot, page web, jeu, inférence, cluster, sonde.


---

# CS-03 — Fondements physiques et mathématiques
À fréquence constante f (Hz), nombre théorique de cycles N=f·Δt (secondes SI), durée subjective T=N·τ, τ=1 seconde subjective par cycle par défaut. Fréquence variable : N=∫f(t)dt. Distinguer cycles d'horloge réellement comptés, référence constante et cycles utiles ; en veille, l'horloge effective peut être arrêtée. Les instructions retirées ne valent pas les cycles : IPC mesuré et contexte requis ; accès registre et instruction ont des latences/throughputs distincts. Un observateur non cadencé nécessite une unité de référence explicitement définie ; pas de pseudo-fréquence RAM/SSD arbitraire. Débit B en octets/s, volume Q, durée de transfert idéale Q/B ; latence et recouvrement à traiter séparément. Propagation Δt=d/v, c=299792458 m/s dans le vide ; vitesse du signal en milieu à documenter. Quantiles se transforment linéairement à f fixe et positive ; ne pas additionner des quantiles de variables dépendantes.

Exemples de test exacts ou calculés (pas de mesures) à 4 GHz : 0,25 ns → 1 s ; 1 ns → 4 s ; 100 ns → 400 s ; 1 µs → 4000 s ; 100 µs → 400000 s (4,62963 j) ; 1 ms → 4e6 s (46,2963 j) ; 1 s → 4e9 s (126,752 années juliennes de 365,25 j). 1/60 s → 2,1125 années. 250 ms → 31,688 années. 1 km dans le vide → environ 13342,6 s (3 h 42 min). Distance Terre-Lune illustrative 384400 km → 1,282 s physiques, ~162,5 années subjectives. Conversion interne SI ; afficher unités arrondies uniquement à l'interface ; vérifier la dimension, valeurs finies, absence de négatifs, précision et seuils numériques. Pour axe logarithmique, durée nulle séparée, x=log10(t/t_ref), graduations réelles et recalcul des positions quand le référentiel change. Pas de distribution inventée.


---

# CS-04 — Ontologie et données
Ontologie TypeScript + JSON Schema, IDs stables, versions, migration explicite. Entités : Observer, Architecture, Component, Phenomenon, Event, Measurement, Distribution, Dependency, Scenario, Evidence. Propositions de champs :
- Observer: id, kind, referenceUnit, frequencyHz ou frequencySegments, tauSeconds, clockDomain, assumptions.
- Architecture: id, era, vendor/model, topology, configurationRefs. Component: id, architectureId, kind, parentId, clockDomain.
- Phenomenon: id, componentKind, quantityKind, definitionKey, dimensions, scope. Measurement: id, phenomenonId, architectureId, valueSI/interval, unitOriginal, conditions, protocol, sourceIds, provenanceType, qualityStatus, uncertainty, distributionId, sampleCount, date, version.
- Evidence: id, title, author, publisher, URL/DOI, date, locator précis, accessedAt, license, checksum si autorisé, scope, verificationStatus. Distribution: empirical samples ou quantiles sourcés, modèle paramétrique seulement justifié, n, conditions, méthode.
- Event: id, kind, actorId, start/end SI, resourceIds, dependencies, scenarioId, provenance simulation. Dependency: predecessor/successor, relation (fin-début, etc.), lag, cause. Scenario: id, inputs, seed, modelVersion, initialState, results.

Invariants : références résolues, IDs uniques, unité compatible avec quantityKind, toutes durées >=0, f>0 pour référence cadencée, segments non chevauchants, quantiles ordonnés, aucune valeur statistique sans protocole, aucune redistribution interdite. Statuts provenance (measured/documented/calculated/estimated/illustrative) orthogonaux à vérification (pending/qualified/contested/rejected), incertitude inconnue = null explicite. Données brutes immuables, données normalisées dérivées ; séparations par version et langue. Les exemples de test restent dans fixtures, hors corpus validé. Relations causales doivent être vérifiées pour chaque scénario.


---

# CS-05 — Catalogue initial de sources candidates (NON AUDITÉ)
Aucun accès, extrait, licence ou résultat de mesure n'est certifié par ce dossier. M00 doit vérifier chaque source, et remplir le registre par document et valeur. Pistes de recherche (URL de départ à confirmer) :

| Domaine | Organisme / ressource candidate | À qualifier |
|---|---|---|
| Constantes, SI | BIPM (bipm.org), NIST (nist.gov) | définition et unités |
| Microarchitecture x86 | Intel Software Developer Manuals, AMD Processor Programming Reference | modèle, génération, table, conditions |
| ARM / Apple | Arm documentation, Apple developer documentation, publications indépendantes | absence de latences officielles possibles |
| Instructions | uops.info, Agner Fog instruction tables | protocole, licence, CPU, latence vs throughput |
| Mémoire / CPU | lmbench, STREAM, Intel MLC, études académiques | tailles, NUMA, accès dépendants, licence |
| GPU | NVIDIA CUDA documentation, AMD ROCm, publications GPU | transfert vs kernel, précision, modèle |
| Stockage | SNIA, NVM Express, fio, fabricants | QD, taille bloc, read/write, cache |
| Réseaux | IETF RFC, IEEE, iperf3, RIPE Atlas | RTT/aller, topologie, débit, protocole |
| OS et logiciel | Linux kernel docs, perf, publications | ordonnanceur, appels, charge, OS |
| HPC | TOP500, publications MPI, OSU Micro-Benchmarks | définition du test, taille cluster |
| IA | MLCommons MLPerf, rapports techniques | modèle, batch, TTFT vs tokens/s |
| Historique | Intel/IBM archives et musées informatiques | version exacte, date et fréquence |
| Espace | NASA/JPL, ESA | distances variables, propagation, aller/retour |
| Humain | articles évalués par les pairs en psychophysique | tâche, population, distribution |
| Interconnexions | PCI-SIG, USB-IF, CXL Consortium | version, unités, overhead |

Procédure M00 : identifier page ou DOI, consulter, noter date et localisation, accès, licence de redistribution, unité, configuration, méthode, pertinence et restrictions ; extraire uniquement les valeurs admissibles ; conserver trace et statut ; rejeter sources incompatibles, doubles ou non traçables. Cibles indicatives V0 50–100, V1 200–500 (première publication possible corpus initial suffisant), V2 500–1000 ; ne pas gonfler les chiffres. Une valeur inconnue reste inconnue. Nom : vérifier GitHub, recherche web et registres de marques pertinents, sans conclure à la disponibilité juridique absolue.


---

# CS-06 — Méthodologie métrologique
N0 physique, N1 technologie, N2 constructeur, N3 recherche, N4 expérience, N5 statistiques, N6 transformation. Ce sont des classes, pas une hiérarchie automatique de vérité. Protocole : identifier matériel/firmware/OS/compiler, fréquence effective, température, alimentation, topologie, taille travail, cache chaud/froid, contention, affinité, nombre de répétitions, échauffement, méthode de chronométrage et overhead. Documenter résultats bruts, transformations, unités, scripts, version et limite de précision. Éviter optimisations supprimant le travail, confusions cycles TSC/cycles effectifs, effets de DVFS et biais de sélection. P50/P95/P99 seulement à partir d'échantillons ou sources explicites ; n et méthode quantile enregistrés. Ne pas présenter min/max comme intervalle de confiance. Comparaisons groupées par protocole et configuration ; si non comparable, afficher côte à côte avec avertissement, pas de classement trompeur. Les mesures navigateur sont des mesures de navigateur : résolution temporisateur, isolation et ordonnanceur empêchent d'en déduire automatiquement la latence CPU native. Benchmarks natifs externes optionnels, import documenté. Reproductibilité indépendante recherchée ; absence signalée. Détecter licences, provenance et résultats contradictoires.


---

# CS-07 — Modèle multi-observateurs
Le temps physique global est l'axe de référence de la simulation. Un observateur dispose d'une règle de conversion et d'un contexte ; CPU à 4 GHz par défaut, GPU, microcontrôleur, humain, etc. Pour une référence instruction/registre, la durée physique de l'opération de référence doit être spécifiée ; T=Δt/δ_ref·τ. Si opération variable, modèle conditionnel ou intervalle et hypothèses. Pour f variable, intégration par segments ; gaps inconnus signalés, horloge arrêtée distincte du temps de référence virtuel. Afficher temps réel, cycles théoriques, cycles effectivement mesurés (si disponibles), travail potentiel sous hypothèses, temps actif/attente. Observer indépendant du composant qui réalise l'événement. Une conversion d'observateur ne change pas la causalité ni la durée physique. Tests : identité si même référence, composition A→B→A à tolérance, monotonie pour f>0, segments constants, limites à zéro, invalidité f négative/non finie, données non comparables. Historiques par configuration et génération ; ne jamais comparer puissance de calcul à partir de fréquence seule.


---

# CS-08 — Simulateur événementiel (V3)
Moteur abstrait à événements discrets, pas émulation matérielle. File de priorité ordonnée par (temps physique, priorité documentée, identifiant stable), état des composants, capacité de ressources, dépendances, files d'attente et événements de début/fin. Pas de pas de temps uniforme sur vingt ordres de grandeur. Choisir représentation temporelle selon tests de précision ; si ticks entiers/BigInt, documenter résolution et sérialisation. Gérer événements simultanés déterministement, aucune durée négative, pas de retour dans le passé, limite d'événements et détection d'interblocages/causes impossibles. Les durées peuvent être fixes, conditionnelles ou tirées d'une distribution sourcée ; seed et modèle versionnés. Pas d'addition aveugle des étapes concurrentes ; calcul du chemin critique, occupation des ressources, temps d'attente, contention, recouvrement. Ressources abstraites CPU, RAM, GPU, stockage, réseau, écran. Scénarios progressifs : lecture mémoire dépendante, lectures indépendantes concurrentes, clic souris/écran, page web, LLM, HPC, communication spatiale. Séparer observations mesurées et résultats simulés. Tests : scénario analytique série/parallèle, capacité 1 vs 2, causalité, égalité de timestamps, reproductibilité seed, annulation, limites de taille, conservation des ressources. Journal d'immersion V4 dérivé des événements ; ne pas inventer une activité CPU durant une attente bloquante.


---

# CS-09 — Architecture logicielle
Monorepo proposé : apps/web (Svelte/Vite) ; packages/{ontology,metrology,observers,simulator,visualization} ; data/{raw,validated,sources} ; schemas/ ; benchmarks/ ; scenarios/ ; tests/ ; docs/ ; .github/workflows/ ; README, LICENSE, CITATION.cff, CONTRIBUTING, CHANGELOG, CLAUDE, PROJECT_STATUS, NEXT_ACTIONS. TypeScript strict, fonctions pures pour calculs, modèles séparés de l'UI ; D3 pour échelles et graphiques ; Worker pour simulations bloquantes mesurées ; WASM Rust uniquement sur preuve de goulot. Données statiques JSON/CSV, validation à la compilation ; actifs servis par Pages, pas de secrets ni API runtime obligatoire. Vite base configurée selon URL réelle du dépôt ; hash routing ou liens statiques compatibles rechargement. Gestion de dépendances simple (npm workspaces proposé), lockfile, version Node LTS compatible vérifiée, build reproductible. Scripts proposés: npm ci, npm run lint, npm run typecheck, npm run validate:data, npm test, npm run test:e2e, npm run build, npm run preview. CI distincte validation et déploiement ; permissions minimales, actions vérifiées et épinglées, déploiement seulement sur branche autorisée après succès. IndexedDB facultatif pour expériences ; export lisible ; éviter dépendance à services tiers. Documenter budgets de performance et mesurer avant d'optimiser. GitHub est canonique, copies Drive sans écrasement.


---

# CS-10 — UX/UI et visualisations
Entrée : chronologie logarithmique réelle, unités physiques/subjectives, sélection d'observateur et fréquence, filtres architecture/époque/domaine/provenance. Détail : valeur, unité, contexte, plage ou incertitude, source précise, provenance, comparabilité, version. Trois niveaux dans la même interface : exploration (analogie), technique (configuration et latence/débit), scientifique (protocole, données, incertitudes et calcul). Navigation : chronologie, architecture, observateurs, simulation, immersion, comparaison, laboratoire. FR/EN : clés i18n, formats numériques locaux, textes scientifiques traduits sans modifier valeurs SI ; pas de fallback silencieux. Responsive, clavier, focus visible, contrastes, labels accessibles, alternative tabulaire aux graphes, pas de couleur comme unique signal, motion réduite. Axe log dynamique avec vrais ticks, zéros traités séparément, incertitudes en intervalles, pas de faux histogramme. Journal à la première personne identifié comme métaphore, durée subjective et état d'activité dérivés du simulateur. URL de partage sérialise paramètres validés et version, sans données privées ; export JSON/CSV avec sources. Nom/logo provisoires jusqu'à M00 ; interface sobre technique, pas de charte figée arbitrairement.


---

# CS-11 — Validation non compensatoire
| Contrôle | Preuve attendue |
|---|---|
| V00 sources | accès réel, localisateur, licence, adéquation |
| V01 dimensions | schema + tests unités incompatibles |
| V02 métrologie | protocole et conditions ou statut non mesuré |
| V03 statistiques | n, quantiles cohérents, incertitudes, absence de fabrication |
| V04 architecture | configuration et comparabilité explicites |
| V05 mathématique | oracle de conversions, tests limites, indépendance affichage |
| V06 causalité | scénarios analytiques et invariants ressources |
| V07 pédagogie | contrôle analogies, distinction cycles/instructions et temps/activité |
| V08 reproductibilité | versions, scripts, données, logs, vérification indépendante ou limite explicite |

Applicable par artefact : PASS/FAIL/NOT_APPLICABLE (motivé)/NOT_RUN ; pas de score compensatoire. Contrôles obligatoires échoués ou non exécutés => NO-GO. Une donnée illustrative n'entre pas au corpus qualifié. Tests unitaires, propriétés et schémas ; tests d'intégration corpus→moteur→UI, e2e desktop/mobile, clavier, FR/EN, base URL Pages, exports, liens ; revue contradictoire indépendante si possible, distinguer auto-revue et validation externe. Rapports versionnés avec commit, environnement, commandes, sorties, résultats, limites. Pas de test fictif, pas de preuve par capture seule. CI bloquante sur erreurs. Vérifier URL publique réelle et version de l'artefact publié. Matrice exigences F01–F09 vers tests, résultats et portes. Conserver les corrections et les données contradictoires.


---

# CS-12 — Licences et gouvernance
Apache-2.0 pour code original ; CC BY 4.0 documentation et contenus pédagogiques originaux ; CC0 1.0 données originales pour lesquelles le projet détient les droits ; tiers selon licences propres. Aucun relicenciement implicite des données tierces ; vérifier droits et attribution. Référencer sans copier si redistribution interdite. Fichiers LICENSE, LICENSES/, NOTICE si applicable, CITATION.cff, CONTRIBUTING, CODE_OF_CONDUCT (proposé), registre source/licences. Mainteneur initial unique puis contributions ouvertes ; PR documentées, CI et revue des données avant fusion. Pas d'identité GitHub présumée ; vérifier l'autorisation de création/publication. GitHub canonique pour décisions, code, données, rapports ; Drive archive secondaire. Versionnement sémantique proposé, tags seulement pour versions réellement validées ; release candidate distincte. ADR pour choix mineurs, décision utilisateur pour changement structurant. Pas d'écrasement d'archives, pas de modification des permissions Drive/GitHub non autorisée. Vérification du nom en M00, pas de garantie juridique. Bilingue FR/EN, code/schémas anglais, documentation traduisible.


---

# CS-13 — Feuille de route et portes
| Étape | Produit | Porte |
|---|---|---|
| M00 | Audit nom, sources, droits, dépôt existant et environnement | GM00 : preuves et corpus initial faisable, risques et exclusions |
| V0 | Schémas, corpus initial qualifié, conversions et tests | G0 : intégrité, unités, provenance, tests mathématiques, reproducibilité |
| V1 | Atlas/convertisseur FR/EN responsive, fiches, publication | G1 : G0 maintenu, expérience réelle, tests e2e, build statique et déploiement vérifié si autorisé |
| V2 | Comparaison historique et multi-observateurs | G2 : compatibilité des données, transformations, distinction fréquence/performance |
| V3 | Simulation événementielle | G3 : invariants, chemin critique, recouvrement, seed, ressources |
| V4 | Immersion narrative | G4 : journal dérivé, exactitude, limites pédagogiques |
| V5 | Laboratoire complet, mesures et contributions | G5 : contrôles applicables V00–V08, reproductibilité, qualité des contributions |

Pour chaque porte, rapport avec critères applicables et résultats effectifs, commit, logs et risques. Les cibles de volume ne compensent jamais qualité insuffisante ; un corpus plus petit peut être présenté comme prototype explicitement non accepté si porte non franchie. Une absence de droits de déploiement n'empêche pas un build local, mais interdit le statut V1 publiée. Pas de passage automatique après NO-GO ; remédier, documenter puis réévaluer. Le kit ne prouve aucune porte franchie. Priorité à une V1 utile plutôt qu'à une complexité prématurée. En fin de session, next action concrète et état des portes.


---

# CS-14 — Contrat d'implémentation
Agent Claude Code : lire D1–D17 et le prompt maître, inspecter le dépôt et les droits, reprendre sans écraser. M00 obligatoire avant développement nouveau. Figer contrats TypeScript/JSON Schema, conventions SI, corpus versionné, sources et provenance, tests d'oracle. Implémenter par tranches ; pas de backend, secrets, compte utilisateur ou dépendance payante. FR/EN dès V1, moteur TypeScript, D3/Svelte/Vite, WASM justifié uniquement. Respecter limites de GitHub Pages et vérifier base path, rechargement, actifs, build et CI. Utiliser les commandes réelles et journaliser sorties ; vérifier droits GitHub avant création/push/publication. Ne pas modifier visibilité d'un dépôt existant sans autorisation. Préserver branches et commits ; ADR et changelog. Livrables : code, lockfile, docs, schémas, sources, tests, rapports, procédure de build, workflow Pages, état réel, liens vérifiés. Maintenance mémoire : CLAUDE.md, PROJECT_STATUS.md, NEXT_ACTIONS.md, registre décisions et ADR versionnés. Ne pas inventer de données, de résultats ni de disponibilité. Questions uniquement pour blocage structurant ; sinon choix réversible motivé. Drive : copie versionnée dans dossier projet si accès disponible ; à défaut archive locale et blocage explicite. Premier objectif : M00, puis G0, puis G1 si admissible. Le dossier directeur est consolidé, non une preuve que M00 a été exécuté.


---

