# NEXT_ACTIONS — CHRONOSILICON

Ordre de priorité. Mis à jour le 2026-11-27.

0. **[Gel — AUDIT-01 en cours]** Aucun développement, aucune modification du corpus, de `main` ni du site jusqu'à réception du rapport indépendant et du plan de remédiation (`docs/audits/AUDIT-01/AUDIT-01_HANDOVER.md`). Les points ci-dessous restent en attente et seront re-priorisés par le plan de remédiation.

1. ~~Régler Pages et publier V1~~ : fait le 2026-11-26 (commit `7ca44b5`).
2. **[Agent]** Correctif relevé à l'inspection en ligne : « ≈ » sur les durées fortement arrondies. (Fait : textes de curation et extraits de source en anglais signalés et balisés `lang="en"` dans la fiche, 2026-11-26/27.)
3. ~~Copie Drive datée~~ : faite et vérifiée le 2026-11-26 ; à refaire à chaque porte.
4. ~~V2 à V5~~ : réalisés, portes G2 à G5 GO le 2026-11-26 (`docs/reports/`).
5. **[Données]** Lot 2 fait le 2026-11-26 : 239 valeurs qualifiées (`docs/audits/M01.md`). Suite possible vers 300 à 500, par la même chaîne :
   - lever les réserves : fiche Intel MCS-4 primaire, URL AMD officielles, communiqués PCI-SIG originaux ;
   - incertitude structurée : faite (ADR-0009 : 3 dispersions et 12 jeux de statistiques renseignés) ; à compléter dès qu'une source publie une dispersion ;
   - latence de commutateur InfiniBand et transfert PCIe hôte-GPU mesurés avec protocole ;
   - ajouter des mesures avec protocole : appels système modernes, distributions empiriques sourcées pour le simulateur.
6. **[Propriétaire]** Recherche de marque EUIPO / INPI / USPTO pour « CHRONOSILICON » (risque R1).
7. **[Qualité]** Relecture humaine d'un échantillon du corpus et des notes de groupes (R2) ; vérification de reproductibilité sur une autre machine (V08) ; sources en 403 à revérifier à la main.
8. **[Évolutions]** Durées conditionnelles et distributions empiriques dans les scénarios ; import documenté de mesures natives (CS-06) ; observateur à fréquence variable dans l'interface (le moteur `clocked-segments` existe et il est testé).
