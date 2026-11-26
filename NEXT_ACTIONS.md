# NEXT_ACTIONS — CHRONOSILICON

Ordre de priorité. Mis à jour le 2026-11-26.

1. **[Propriétaire, manuel]** Régler Settings > Pages > Source sur **GitHub Actions** dans `s-geffroy/chronosilicon`.
2. **[Agent]** Fusionner `develop` → `main` en fast-forward, sans `--force`. Suivre le run `pages`, puis vérifier HTTP 200, `version.json.commit` et le parcours en navigateur. Compléter ensuite `docs/reports/G1.md` et `PROJECT_STATUS.md`.
3. **[Agent]** Déposer la copie documentaire datée dans Drive `ChatGPT/04_TECHNOLOGIES_INGENIERIE/CHRONOSILICON` (ADR-0004), avec relecture de vérification.
4. **[Agent] V2** : regroupement des phénomènes par nature (`data/curated/groups.json`), espace Comparaison (générations côte à côte, avertissement si protocoles différents, aucun classement par fréquence seule) et espace Observateurs (observateurs cadencés tirés de fréquences qualifiées, observateurs de référence comme le temps de réaction humain). Ouvrir le rapport G2.
5. **[Agent] V3** : exposer le simulateur (scénarios progressifs CS-08 avec durées tirées du corpus qualifié, chemin critique visible, Worker si mesure le justifie). Évaluer G3.
6. **[Données]** Lever les réserves :
   - fiche Intel MCS-4 primaire (4004) ;
   - URL AMD officielles ;
   - communiqués PCI-SIG originaux ;
   - modéliser les flop/s pour intégrer TOP500 ;
   - lacunes `logic` et `emerging` ;
   - mesures avec protocole pour les appels système modernes et le lancement de kernel GPU.
7. **[Propriétaire]** Recherche de marque EUIPO / INPI / USPTO pour « CHRONOSILICON » (risque R1).
8. **[Qualité]** Mineurs reportés de la revue (m-8). Relecture humaine d'un échantillon du corpus (R2).
