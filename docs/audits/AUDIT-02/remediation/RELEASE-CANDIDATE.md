# Version candidate REMEDIATION-02 (non publiée)

## Identification

| Élément | Valeur |
|---|---|
| Branche | `remediation-02`, issue de `remediation-01` (`459e91b`, c'est-à-dire rc2 et le seul dépôt documentaire). `remediation-01-rc2` reste figée. |
| Tag candidat | **`remediation-02-rc4`**, annoté et immuable, posé sur le commit qui contient ce dossier, **après** que la CI de ce commit a réussi |
| Tag remplacé | **`remediation-02-rc3`** (`5ebefa4`) : la CI de son commit a **échoué au lint** (run 46009305550). En cause, le script de sondes de l'auditeur (`probes-rc2.cjs`, avec `require()`), ajouté après le code testé `16093cf`. Le tag est conservé sans déplacement. Correctif : `9227a8e`, qui exclut du lint la preuve tierce, laquelle reste non modifiée. |
| Code et données testés | `9227a8e0f3d310831ea2e6866a66dc692ed3f1e8` : porte PASS sur clone neuf, `dirty=0`, sondes 18/18 |
| CI GitHub | `9227a8e` : **success**, run 46009666098. Le run du commit du tag est indiqué dans `TEST-RESULTS.md` §2. |
| Écart entre le code testé et le tag | Documentation et journaux uniquement. Commande de vérification, qui ne doit rien afficher : `git diff --stat 9227a8e remediation-02-rc4 -- . ':!docs' ':!PROJECT_STATUS.md' ':!NEXT_ACTIONS.md' ':!CHANGELOG.md'` |
| Écart avec rc2 | `RC2-RC4-DIFF.txt`. Moteurs et interface inchangés. Changent : la porte de vulnérabilités, la politique de publication, le corpus publié, les workflows (`publication:check`) et la configuration ESLint. |
| Version du corpus | `0.3.0+0c9ebc16ce31` : 238 valeurs qualifiées, dont 185 `withheld` et 53 `published` |
| Publication | **Aucune** : `main` reste à `491c989` |
| Archive source | `chronosilicon-remediation-02-rc4.zip` (`git archive` du tag) : fichiers suivis uniquement, sans `node_modules`, `.cache` ni secret. Empreinte dans `DEPOSIT-SHA256SUMS.txt` sur Drive. |

## Reproduire

```sh
git clone https://github.com/s-geffroy/chronosilicon.git && cd chronosilicon && git checkout remediation-02-rc4
# conteneur : docs/audits/AUDIT-01/evidence/REPRODUCIBILITY.md §2 (fonction run)
run "npm ci && sh scripts/run-gate.sh rc4-repro"
# attendu : overall=PASS ; audit:gate OK production=0 ; 309 unitaires ; publication:check OK ; 100 e2e ; dist:manifest-check PASS
run "npm run curate && npm run build:data" && git status --porcelain data/        # attendu : vide
run "TYPESCRIPT_PATH=\$PWD/node_modules/typescript node docs/audits/AUDIT-02/remediation/probes/probes-rc2.cjs \$PWD"   # attendu : failures=0
run "sh docs/audits/AUDIT-02/remediation/run-gate-fixtures.sh"                   # attendu : identique à logs/aud02-001-after.txt
```

`audit:gate` interroge le registre npm et dépend de la date : l'exception expire le 2027-01-31.

## Changements visibles si la version est publiée

En plus de ceux de rc2 (`docs/audits/AUDIT-01/remediation/RELEASE-CANDIDATE.md`) :
- 5 courts passages entre guillemets et 1 note d'accès de source passent à `[…]` ;
- un passage déjà retiré (KPTI) s'élargit d'un mot ;
- le site servi passe le contrôle `publication:check`.

Le détail figure dans `PUBLICATION-POLICY.md` §5.

## Risques

- Les droits ne sont pas réglés juridiquement (`PUBLICATION-POLICY.md` §6), et les contenus déjà publics sont inchangés (`PUBLIC-CONTENT-OPTIONS.md`).
- `pages.yml` n'a jamais été exécuté.
- Validation interne uniquement.

## Condition d'arrêt

Le travail s'arrête ici. Aucune fusion sur `main`, publication, suppression ni réécriture d'historique ne sera faite sans **autorisation explicite de l'utilisateur**, après l'audit de clôture.
