# Résultats des tests (REMEDIATION-01)

Toutes les exécutions ont eu lieu dans le conteneur outil, celui de la CI :
- image `mcr.microsoft.com/playwright:v1.65.0-noble@sha256:9beb546099e11f52d62e505537914870e01a67e0e6b00ae41da4775324e73dbe` ;
- Node v26.13.1, npm 11.20.0 ;
- hôte Linux 6.8.0-147-generic x86_64, celui du mainteneur.

Journaux : `docs/reports/logs/remediation-01/`. Il s'agit d'exécutions du mainteneur, donc d'une **validation interne**.

## Porte complète `remediation-01`

Elle s'exécute avec `sudo appctl run node sh scripts/run-gate.sh remediation-01`.

| Étape | Résultat | Détail |
|---|---|---|
| Commit | `9e28892475d5f06a06cb5315807198288a36f147`, `dirty=0` (porte rejouée ; un premier passage vert avait eu lieu sur `a2c90ec`) | `summary.txt` |
| `npm ci` | PASS | lockfile inchangé |
| `audit:gate` (AUD-014) | PASS | 0 avis en production ; 8 avis modérés en développement, couverts par une exception datée |
| `lint` | PASS | ESLint 0 erreur |
| `typecheck` | PASS | `tsc` strict et `svelte-check` à 0 erreur |
| `validate:data` | PASS | 120 sources, 245 candidates, **238 qualifiées**, 2 en attente, 5 contestées, 22 groupes, 9 observateurs, 5 scénarios |
| `test` (Vitest) | PASS | **20 fichiers, 281 tests** (212 à la référence) |
| `build` | PASS | `apps/web/dist`, 6 fichiers |
| `dist:manifest-write` (AUD-018) | PASS | `dist-manifest.sha256` |
| `test:e2e` sur l'artefact construit (`E2E_PREBUILT=1`) | PASS | **25 scénarios × 4 projets = 100 tests** (96 à la référence) |
| `dist:manifest-check` | PASS | artefact inchangé après les tests |

**Premier passage, sur `351de5c`.** Il a échoué à cause de 2 tests e2e en délai dépassé : l'audit d'accessibilité dans Firefox et WebKit, 37 s et 39 s pour une limite de 30 s, sans violation relevée. La charge de l'hôte était alors de 14 (`uptime`) pour 2 processeurs alloués. À la référence, ce test prenait déjà 25,4 s dans Firefox. Le délai de ce seul test est passé à 90 s, avec une justification en commentaire et sans changement des attentes (`a2c90ec`). Le second passage est vert. Le journal du premier passage n'a **pas** été conservé : le second passage l'a écrasé dans le même dossier. Les chiffres ci-dessus en ont été relevés avant cet écrasement. Seul le second passage figure dans `docs/reports/logs/remediation-01/`.

## CI GitHub : premier échec, puis correction

- **Run 45975451663** (branche `remediation-01`, commit `ce7a0f1`) : **échec** à l'étape `npm run dist:manifest -- write`. Les étapes précédentes étaient vertes (`npm ci`, `audit:gate`, SBOM, lint, types, données, tests, build), et les e2e ont été sautés.
- **Cause, reproduite localement** : sur un runner neuf, le dossier par défaut du manifeste (`.cache/`) n'existe pas, et `writeFileSync` lève `ENOENT`. Le défaut a été introduit par la correction d'AUD-018 et masqué localement, où `.cache/` existe.
- **Correctif** : création du dossier (`9e28892`). La porte locale a été rejouée sur `9e28892` et elle est PASS.
- **Leçon** : la porte locale ne remplace pas un clone neuf. La CI, elle, en est un.
- Le résultat de la CI sur `9e28892` est consigné dans RELEASE-CANDIDATE.md.

## Contrôles complémentaires (`extra-checks.txt`, exécutés sur `a2c90ec`)

Hors documentation, `a2c90ec` et `9e28892` ne diffèrent que par `scripts/dist-manifest.ts`, qui ne touche ni aux données ni au build.

| Contrôle | Résultat |
|---|---|
| Reconstruction depuis `data/raw` (`curate` puis `build:data`) | 0 fichier modifié (`curate-dirty=0`) |
| Empreintes brutes (`MANIFEST.sha256`) | 12 sur 12 OK |
| Valeurs calculées | 28 publiées (29 à la référence, moins AUD-013), toutes recalculées par l'oracle à une tolérance relative de 1e-12 (`tests/calculated-values.test.ts`) |
| Build déterministe | deux builds identiques au bit près (`build-1.sha256` = `build-2.sha256`) |
| Poids (hors carte source) | JS 628 599 o (154 903 o en gzip -9), CSS 8 766 o (2 728 o en gzip), `index.html` 962 o |
| Extraits retenus dans le bundle et la carte source | 181 des 185 citations retenues sont absentes. Les 4 présentes sont des faits ou libellés repris dans un localisateur ou une note (SOURCE-RIGHTS.md §2) |
| Les deux langues | Les tests e2e couvrent FR et EN (bascule, fiche, marqueurs de langue, comparaison) ; `i18n.test.ts` refuse toute clé manquante |

## Mesures de performance (`perf.txt`)

- **Protocole** : `vite preview` en boucle locale (127.0.0.1), sans bridage réseau ni CPU. Pour chaque navigateur, 5 chargements à froid de `#/timeline?lang=fr` ; on retient la médiane.
- **Charge de l'hôte** : environ 4 à 9 pendant la mesure.

| Navigateur | DOMContentLoaded | load | chronologie visible ≤ |
|---|---|---|---|
| Chromium | 118 ms | 160 ms | 196 ms |
| Firefox | 196 ms | 254 ms | 315 ms |
| WebKit | 140 ms | 193 ms | 312 ms |

- **Limites** : ces mesures ne valent pas des Web Vitals de terrain. Elles ne mesurent ni le réseau réel, ni un appareil mobile physique, et aucun budget n'est fixé.

## Accessibilité automatisée

axe-core (WCAG 2.1 A et AA) passe sur les 9 vues et sur la fiche, dans 4 projets, sans violation. Les parcours au clavier, le focus et `prefers-reduced-motion` sont testés en e2e.

**Restent à faire par un humain** :
- test avec des lecteurs d'écran réels (NVDA, VoiceOver) ;
- audit WCAG manuel (contrastes en contexte, ordre de lecture, compréhension) ;
- appareils physiques ;
- panel d'utilisateurs pour la pédagogie.

## Essais négatifs (les portes refusent ce qu'elles doivent refuser)

| Essai | Résultat | Journal |
|---|---|---|
| Exception de vulnérabilité expirée | `audit:gate FAILED (9)`, `exit=1` | `negative-audit-gate.txt` |
| Fichier de `dist` modifié après l'empreinte | `dist-manifest: the built artifact changed…`, `exit=1` | `negative-dist-manifest.txt` |
| Contre-exemples de l'auditeur | Chacun a d'abord échoué sur le code de référence : 23 tests du lot métrologie et observateurs, 14 du lot simulateur, 2 pour AUD-009, 2 pour AUD-010, 4 pour AUD-015, 1 pour AUD-016, 3 pour la garde des droits | `notes-*.md`, sorties reproduites dans FINDINGS-RESPONSE.md |

## Non exécuté

- La CI GitHub de la branche `remediation-01` n'est vérifiée qu'après son push : voir RELEASE-CANDIDATE.md.
- `pages.yml`, modifié pour AUD-018, ne s'exécute que sur `main`. Il ne sera donc exercé qu'à une publication autorisée. Sa séquence est la même que celle de `ci.yml`, qui, elle, est exécutée.
- Aucune reproduction n'a été faite sur une autre machine.
