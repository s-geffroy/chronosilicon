# Réponses à la revue du lot 2 : points majeurs et mineurs

Revue : `docs/reports/review-2026-11-26-lot2.md`. Les points majeurs M1 à M9 ont été traités dans le commit `e788256` (voir `G0-lot2.md`). Ce document traite les mineurs (2026-11-26).

| Point | Traitement | Où |
|---|---|---|
| M3 (suite) | **Audit complet des bornes**, lot 1 compris. La curation lève désormais une alerte si un extrait contient un mot de borne (« up to », « at least », ≤…) sans `low`/`high`. 17 cas sont triés à la main : **11 bornes encodées** (RTO TCP, tick ISN, LEO, L2 Zen 4 et Zen 5, PCIe x16, USB4, polling USB HS, image à 144 Hz) et 6 faux positifs marqués `boundChecked`. Un test exige un rapport sans alerte. | `scripts/curate.ts`, `decisions.json`, `tests/curation-report.test.ts` |
| M9 (suite) | Tolérance de l'oracle des valeurs calculées portée de 5e-5 à **1e-12**. Elle a révélé une valeur encore arrondie (Solidigm, 68,464 µs), désormais stockée en pleine précision. | `tests/calculated-values.test.ts` |
| m1 | La fiche affiche « ≥ x » ou « ≤ x » pour une borne unilatérale (test e2e). | `Sheet.svelte` |
| m2 | Sous-unités décimales converties par division exacte : 43 ms → 0,043 s, sans bruit flottant (test). | `packages/metrology` |
| m3 | La note de `cmp-cpu-clock` nomme les cinq natures de valeurs. | `groups.json` |
| m4 | Phrase non sourcée retirée de la remarque du Pentium Pro. Elle est retirée parce qu'aucune source ne la porte, sans prendre parti sur le fond. | `decisions.json` |
| m5 | La note L1 signale que le Cortex-A520 est un petit cœur à haute efficacité, non comparable aux gros cœurs (formulation tirée de la note d'extraction, sans « in-order », non sourcé), avec son cas normal et son meilleur cas. | `groups.json` |
| m6 | Ère de Neoverse N2 : 2020 n'était pas sourcé, mis à inconnu. | `decisions.json` |
| m7 | « Environ 1 Go/s par sens », non sourcé, retiré des conditions de PCIe 3.0. | `decisions.json` |
| m8 | « Crête lorsque c'est indiqué ». L'identifiant du groupe est conservé pour la stabilité des URL. | `groups.json` |
| m9 | Règle unique « haut du cas normal » pour la hiérarchie : L2 du Cortex-A520 = 12 cycles (plage 10 à 12). | `decisions.json`, `groups.json` |
| m10 | « Soumis » devient « publiés ». Le protocole de 1993 précise que les règles citées sont les règles actuelles. | `groups.json`, `decisions.json` |
| m11 | Exception assumée et documentée : le rang TOP500 dans un groupe de même année. La note renvoie aux fiches Rpeak. | ADR-0006, `groups.json` |
| m12 | « (CZ) » retiré du libellé. La note oppose la médiane d'un sous-ensemble choisi (IBM) à une durée de conception (Google). | `groups.json` |
| m13 | La note HBM dit d'où vient « par pile » et que les années ne sont pas publiées. | `groups.json` |
| m14 | Hypothèses de l'observateur quantique : paramètre d'une seule expérience, 2 chiffres significatifs, décodeur non inclus. | `observers.json` |
| m15 | Ère HDMI 2017, non sourcée : mise à inconnu. | `decisions.json` |
| m16 | La remarque LTO-9 ne parle plus de « up to », absent de l'extrait. | `decisions.json` |
| m17 | **Reporté (limite assumée)** : la dispersion du décodeur (±17 µs) reste dans les conditions. Le schéma n'admet aujourd'hui qu'une incertitude `null` ; une incertitude structurée est prévue avec V5+ (NEXT_ACTIONS). | — |
| Sans n° (§3) | Identifiant `infiniband-xdr-port-rate` conservé pour la stabilité des URL ; le libellé est déjà corrigé. | — |
| Sans n° (§4) | Contexte du retpoline (PCID activé, serveur, noyaux) replacé dans les conditions. | `decisions.json` |
| Sans n° (§4) | Les deux valeurs B200 (HBM par GPU retenue, FP64 HGX contesté) : le critère est expliqué dans la décision. | `decisions.json` |
| Sans n° (§4) | Libellé « image à 240 Hz » : aucune action requise selon la revue. | — |

Porte rejouée sur `a9c4eda` (`dirty=0`) : 205 tests unitaires, 88 e2e (22 scénarios × 4 navigateurs), tous PASS. Journaux : `docs/reports/logs/lot2-mineurs/`.
