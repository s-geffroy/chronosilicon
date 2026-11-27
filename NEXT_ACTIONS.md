# NEXT_ACTIONS — CHRONOSILICON

Backlog court, classé par valeur pédagogique (directive R1 v2.0 §6, v2.1). Mis à jour le 2026-11-27. L'ancienne liste est archivée dans `docs/archives/NEXT_ACTIONS_2026-11-27_avant-R1.md`.

## Bloquant

1. **[Utilisateur] Publier.** La session de l'agent ne peut pas pousser sur `main` (permission refusée). Il faut soit l'autoriser, soit lancer soi-même l'avance rapide (`git push origin <commit>:refs/heads/main`) : d'abord rc5 (PUBLICATION-01), puis `editorial-r1c` une fois sa CI verte.

## Contenu

2. Enrichir les univers peu remplis, par lots équilibrés et sourcés :
   - priorité 1 : vie quotidienne (gestes, repas, sommeil), physiologie, biologie ;
   - priorité 2 : cognition, nature (météo, saisons, croissance), chimie (réactions, diffusion), physique (attoseconde, femtoseconde) ;
   - priorité 3 : transports (trajets, aviation), industrie, histoire et géologie (civilisations, ères, tectonique).
3. Retrouver une source primaire pour la durée d'une saccade (valeur en attente). Ajouter les sources qui n'ont pas pu être ouvertes : porte-conteneurs, TGV, vol Paris–New York.
4. Ajouter des comparaisons entre univers à mesure que le corpus s'étoffe, par exemple un trajet et un paquet réseau, ou une saison et l'entraînement d'un modèle d'IA.

## Interface

5. Sur mobile, les libellés de bandes se tronquent : envisager une bande active développée.
6. Mettre en avant l'entrée « 4 GHz = 1 cycle par seconde subjective » par un exemple guidé sur la page d'accueil.
7. Permettre de choisir les comparaisons dans l'espace Comparaison.

## Maintenance

8. **À partir du 2026-12-07** (et avant le 2027-01-31) : passer typescript-eslint à la version 8.74.0 ou plus, puis retirer l'exception GHSA-g3hv-75wg-m249. ESLint 10.15.0 est déjà appliqué depuis le 2026-11-27.
9. Vérifier le premier run de `pages.yml` à la prochaine publication (artefact unique, `publication:check`).
10. **Droits (questions ouvertes, décision de l'utilisateur)** : une revue humaine de PUB-1, et le sort des extraits historiques du dépôt (`docs/audits/AUDIT-02/remediation/PUBLIC-CONTENT-OPTIONS.md`).
