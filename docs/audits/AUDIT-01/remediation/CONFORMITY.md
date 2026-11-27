# Conformité D1–D17 après REMEDIATION-01

Ce document met en regard, pour chaque décision :
- l'appréciation d'AUDIT-01, qui fait référence ;
- ce que REMEDIATION-01 a changé ;
- l'écart qui reste.

C'est une **auto-évaluation du mainteneur**, qui ne remplace pas AUDIT-02. REMEDIATION-01 n'a ajouté **aucune fonctionnalité** : elle porte sur P0 à P2. Les écarts fonctionnels relèvent de P3 (ROADMAP-P3.md).

| Décision | AUDIT-01 | Changé par REMEDIATION-01 | Écart restant |
|---|---|---|---|
| D1 | partiel | — | Aucun observateur publié n'a une instruction ou un registre comme opération de référence (P3-1) |
| D2 | partiel | — | Apple Silicon n'a qu'une seule valeur (P3-2) |
| D3 | couverture constatée | AUD-013 : une valeur de stockage dérivée est retirée | Couverture inégale selon les domaines |
| D4 | partiel fonctionnel (AUD-002, 003, 008) | AUD-002, 003 et 008 corrigés | Robustesse à réévaluer par AUDIT-02 |
| D5 | partiel | — | Énergie et jitter absents, synchronisation limitée (P3-3) |
| D6 | présent, UX non certifiée | Fiche : extraits retenus et signalés | Aucun contrôle humain de l'interface |
| D7 | partiel | AUD-011 (statistiques robustes), AUD-013 (hypothèse de Little non démontrée : valeur retirée) | Incertitude non propagée ; 3 dispersions et 12 jeux de statistiques ; aucune distribution empirique (P3-5) |
| D8 | partiel (AUD-007) | AUD-006 et 007 corrigés : couverture et complétude conservées, inverses refusés | Fréquence variable toujours absente de l'interface ; domaines d'horloge multiples non modélisés (P3-4) |
| D9 | partiel (AUD-002, 003, 005) | AUD-002, 003 et 004 corrigés, AUD-005 contesté avec démonstration, ordre de la file formalisé (ADR-0010) | Durées déterministes uniquement ; scénarios web, LLM et HPC absents (P3-6) |
| D10 | présent, partiel | — | Import natif absent (P3-7) |
| D11 | architecture conforme | AUD-014 (porte de vulnérabilités, SBOM), AUD-018 (artefact unique) | Performance et Workers non justifiés par un budget chiffré (P3-8) |
| D12 | présent, validation partielle | AUD-015 : aller-retour de l'URL exact | Aucun test d'accès réel ni lecteur d'écran |
| D13 | partiel | AUD-009 (calculs en graphe acyclique), AUD-010 (protocole commun prouvé, pas déduit) | Volet probabiliste incomplet ; protocole toujours en texte libre (P3-5) |
| D14 | structure conforme | AUD-013 | Sources primaires et droits pas tous vérifiés |
| D15 | non satisfait intégralement | Reproduction de chaque constat, tests de régression, essais négatifs | La remédiation reste une **validation interne**. D15 attend AUDIT-02 et une reproduction indépendante. |
| D16 | partiel | **AUD-012 et 017 (P0)** : vue publique sans extrait tiers non autorisé, registre des extraits, `SOURCE-RIGHTS.md` | Le site actuel et les données brutes demandent une **décision de l'utilisateur**. La marque n'est pas vérifiée et les notes restent en anglais (P3-9) |
| D17 | processus présent | Branche de remédiation, portes rejouées, version candidate **non publiée** | Acceptation suspendue à AUDIT-02 |

## Portes

Les portes G0 à G5 déclarées GO par le mainteneur gardent leur périmètre interne. REMEDIATION-01 ne déclare **aucune** nouvelle porte acceptée. Les verdicts G2, G3 et G5 d'AUDIT-01 (NO-GO intégral) restent en vigueur jusqu'à AUDIT-02.
