# Contenus publics existants : état vérifié et options (REMEDIATION-02, AUD02-002)

- **Date** : 2026-11-27.
- **Nature** : proposition du mainteneur, **distincte** de la version candidate. **Rien n'a été exécuté.** Chaque option demande une décision explicite de l'utilisateur.
- **Avertissement** : ce document n'est pas un avis juridique. La question de fond (ces extraits peuvent-ils être reproduits, et à quelles conditions ?) relève d'une personne qualifiée.

## 1. État vérifié

| Emplacement | État au 2026-11-27 | Vérification |
|---|---|---|
| **Site GitHub Pages** | Il sert `491c989` (référence d'AUDIT-01) et publie tous les extraits : fiche, bundle JS, export JSON et CSV. | `version.json` en ligne : commit `491c989d46d0d75ecedd9741ef4b6586892b80ae`. Le contrôle PUB-1 appliqué au bundle en ligne détecte **943** suites de 6 mots issues d'extraits retenus (`logs/aud02-002-live-site-check.txt`). |
| `data/raw/*.json` (dépôt public, immuable, ADR-0005) | 248 champs `quote` dans les 6 fichiers d'extraction, et les verdicts des vérificateurs | Décompte sur `remediation-02` |
| `data/curated/measurements.json` (dépôt public) | Les mêmes extraits, dérivés de `data/raw` | — |
| Historique Git public | 59 commits sur `remediation-02`. Les extraits y figurent depuis le commit `17b8a21` (premier ajout de `data/raw`), ainsi que dans les tags `audit-01-baseline`, `remediation-01-rc1`, `remediation-01-rc2` et les branches `main`, `develop`, `remediation-01`. | `git log -- data/raw` |
| Copies Drive (dossiers datés, ZIP d'AUDIT-01, ZIP rc2) | Elles contiennent le dépôt, extraits compris. | Elles sont privées : non partagées par ce projet. |

## 2. Options

### Site en ligne

| Option | Effet | Coût et risque |
|---|---|---|
| **S1. Attendre** l'audit de clôture, puis publier `rc3` | Les extraits restent en ligne jusque-là. | Aucun travail ; l'exposition continue. |
| **S2. Correctif de précaution distinct** (recommandé si l'utilisateur juge l'exposition urgente) | Une branche courte à partir de `main` ne reprend **que** la politique de publication (PUB-1, décisions, contrôle du site). Elle passe la porte complète, puis l'utilisateur autorise la fusion sur `main`. Le site cesse alors de servir les 185 textes retenus. | C'est une publication : elle demande l'accord explicite de l'utilisateur. Elle n'inclut pas les corrections des moteurs (rc2) tant qu'elles ne sont pas acceptées. |
| **S3. Publier `rc3` entière** après autorisation | Moteurs corrigés et politique PUB-1 | Dépend de l'audit de clôture. |
| S4. Suspendre Pages | Le site disparaît. | Réglage du dépôt (Settings > Pages), que **seul l'utilisateur** peut faire. Les règles du projet interdisent au mainteneur de changer visibilité ou permissions. |

### Données de travail dans le dépôt (`data/raw`, `data/curated`)

| Option | Effet | Coût et risque |
|---|---|---|
| **R1. Conserver** | Traçabilité complète : un auditeur peut vérifier chaque valeur contre sa citation. | Les extraits restent publics. À justifier (citations courtes, attribuées, localisées) par une personne qualifiée. |
| **R2. Retirer les citations des fichiers suivis** et les garder dans un stockage privé, avec seulement leur SHA-256 dans le dépôt | Le dépôt ne montre plus les extraits **à partir de ce commit**. La vérification reste possible pour qui a accès au stockage privé. | Rouvre l'immuabilité de `data/raw` (ADR-0005, et règle de `CLAUDE.md`) : une décision de l'utilisateur et une nouvelle ADR sont nécessaires. **L'historique les garde** (voir H). L'audit externe devient plus difficile. |
| R3. Rendre le dépôt privé | Ni le dépôt ni l'historique ne sont plus visibles. | Changement de visibilité : **utilisateur seulement**. GitHub Pages sur un dépôt privé dépend du forfait GitHub. Les clones et les forks déjà faits restent. |

### Historique Git

| Option | Effet | Coût et risque |
|---|---|---|
| **H1. Ne pas réécrire** (état actuel) | L'historique garde les extraits. | Exposition historique. |
| H2. Réécrire l'historique (`git filter-repo`) puis forcer la publication | Les extraits disparaissent des commits **du dépôt GitHub**. | Interdit sans accord explicite (`--force`). Cela **casse** les tags `audit-01-baseline`, `remediation-01-rc1/rc2` et toutes les empreintes citées dans les audits, si bien que les preuves d'AUDIT-01 et d'AUDIT-02 ne sont plus rejouables. Les clones, forks, caches et archives tierces gardent l'ancien état. Il faudrait aussi demander à GitHub de purger les vues en cache. |

## 3. Recommandation du mainteneur

1. Faire relire la politique PUB-1 et le registre (`PUBLIC-TEXT-REGISTER.csv`) par une personne qualifiée.
2. Si l'exposition du site est jugée urgente : **S2**, sur autorisation explicite.
3. Pour le dépôt : **R1** tant que la relecture n'a pas conclu, puis R2 si elle le demande.
4. **H1** : ne pas réécrire l'historique, qui porte les preuves des audits.

Les décisions appartiennent à l'utilisateur.
