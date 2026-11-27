# Version candidate REMEDIATION-01 (non publiée)

## Identification

| Élément | Valeur |
|---|---|
| Branche | `remediation-01`, issue de `develop` (`7f519ef`). Sa seule différence avec `audit-01-baseline` était documentaire : `git diff --name-only audit-01-baseline 7f519ef` ne liste que `docs/`, `PROJECT_STATUS.md`, `NEXT_ACTIONS.md` et `CHANGELOG.md`. |
| Tag candidat | **`remediation-01-rc2`**, annoté, sur le commit qui contient ce dossier. `remediation-01-rc1` (`ce7a0f1`) est **remplacé** : sa CI a échoué (`dist:manifest write`, ENOENT ; voir TEST-RESULTS.md). Le tag est conservé, sans déplacement. |
| Code et données testés | `9e28892475d5f06a06cb5315807198288a36f147` : porte `remediation-01` PASS, `dirty=0`. CI GitHub : voir « CI » ci-dessous. |
| Écart entre code testé et tag | Documentation et journaux uniquement. Vérification : `git diff --stat 9e28892 remediation-01-rc2 -- . ':!docs' ':!PROJECT_STATUS.md' ':!NEXT_ACTIONS.md' ':!CHANGELOG.md'` ne doit rien afficher. |
| CI GitHub | `9e28892` : **success**, run 45976862562 (https://github.com/s-geffroy/chronosilicon/actions/runs/45976862562). Ce run comprend `audit:gate`, le SBOM, le build, `dist:manifest write`, les e2e sur l'artefact et `dist:manifest check`. Pour `rc1` (`ce7a0f1`) : run 45975451663 en échec. |
| Publication | **Aucune** : `main` reste à `491c989` et le site sert toujours la référence |
| Version du corpus | `0.3.0+965d1230a867` : 238 valeurs qualifiées (185 `withheld`, 53 `published`) |
| Modèle du simulateur | 1.1.0 (ADR-0010) |

## Reproduire

La procédure est celle de `docs/audits/AUDIT-01/evidence/REPRODUCIBILITY.md`, en remplaçant le tag `audit-01-baseline` par `remediation-01-rc2`, avec trois différences :

```sh
git clone https://github.com/s-geffroy/chronosilicon.git && cd chronosilicon && git checkout remediation-01-rc2
# conteneur : voir REPRODUCIBILITY.md §2 (fonction run)
run "npm ci && sh scripts/run-gate.sh rc-repro"
# attendu : docs/reports/logs/rc-repro/summary.txt -> overall=PASS
#   audit:gate OK production=0 ; 281 tests unitaires ; 100 e2e sur l'artefact ; dist:manifest-check PASS
run "npm run curate && npm run build:data" && git status --porcelain data/    # attendu : vide
python3 -I docs/audits/AUDIT-01/remediation/generate-excerpt-register.py       # attendu : withheldStillPublicInCandidate = 5 faits/libellés
```

1. La porte inclut désormais `audit:gate`, qui a besoin d'accéder au registre npm.
2. Les tests e2e portent sur l'artefact construit juste avant (`E2E_PREBUILT=1`).
3. `audit:gate` dépend de la date : l'exception GHSA-g3hv-75wg-m249 expire le 2027-01-31, après quoi la porte échoue tant que la dépendance n'est pas mise à jour ou l'exception renouvelée avec justification.

## Changements visibles pour un visiteur, si la version est publiée

- **Fiche** : les extraits de sources non `allowed` ne sont plus reproduits. Un message l'explique.
- **Comparaison** : les groupes `cmp-azure-rtt`, `hier-skylake-client` et `hier-icelake-client` sont affichés « même document source » au lieu de « même source et même méthode ».
- **Corpus** : la latence SSD Solidigm P5520 dérivée par la loi de Little n'est plus publiée (238 valeurs au lieu de 239).
- **Simulation** : le recouvrement s'affiche « — » s'il n'est pas défini. Les cinq scénarios publiés donnent les mêmes résultats qu'avant.
- **Export CSV** : trois colonnes ajoutées en fin de ligne (`schemaVersion`, `commit`, `excerptStatus`).
- **Lien partagé** : il conserve les fréquences très basses (1e-7 Hz par exemple).

## Risques et limites

- **Droits** : la règle de prudence n'est pas un avis juridique. Les données brutes et curées, l'historique Git et le site actuel contiennent encore les extraits : SOURCE-RIGHTS.md §4 attend une décision de l'utilisateur.
- **`pages.yml`** : la séquence d'artefact unique (AUD-018) n'a jamais tourné dans `pages.yml`, puisqu'il ne s'exécute que sur `main`. `ci.yml` exécute la même séquence.
- **Délai du test d'accessibilité** : il est porté de 30 s à 90 s à cause de la charge de l'hôte. Ses attentes n'ont pas changé.
- **Revue** : toutes les corrections sont celles du mainteneur, dont deux lots rédigés par des agents de développement et relus par lui. Seule AUDIT-02 vaut validation externe.
- **Reproduction** : aucune n'a été faite sur une autre machine.

## Condition d'arrêt

Le travail s'arrête ici. Il n'y aura ni fusion sur `main` ni publication sans **autorisation explicite de l'utilisateur**, après AUDIT-02.
