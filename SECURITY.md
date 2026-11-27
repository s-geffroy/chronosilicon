# Politique de sécurité — CHRONOSILICON

Le site est **statique** (GitHub Pages) : il n'a ni backend, ni compte, ni cookie, ni stockage local, ni analytics, et n'envoie aucune requête vers une autre origine (test e2e). La surface d'attaque se réduit donc à deux éléments :
- le code JavaScript livré au navigateur ;
- la chaîne de construction : dépendances npm, image de conteneur, actions GitHub.

## Signaler une vulnérabilité

Ouvrir une *issue* GitHub sans détail exploitable et demander un canal privé, ou utiliser le signalement privé de vulnérabilités de GitHub s'il est activé sur le dépôt. Ne jamais publier de secret : le dépôt n'en contient aucun.

## Contrôle des dépendances (AUD-014, REMEDIATION-01)

- **Porte bloquante** : `npm run audit:gate` (`scripts/audit-gate.ts`), exécutée en CI (`ci.yml`), avant chaque déploiement (`pages.yml`) et dans `scripts/run-gate.sh`. Ses règles :
  - **dépendances de production** (code livré : `svelte`, `d3-scale`, `d3-array`) : toute vulnérabilité, quelle que soit sa gravité, fait échouer ;
  - **dépendances de développement** : la gravité *high* ou *critical* fait toujours échouer. La gravité *moderate* ou *low* fait échouer, sauf exception datée et motivée ;
  - une exception expirée fait échouer.
- **Exceptions** : `security/audit-exceptions.json`. Chacune indique l'avis concerné, les paquets, la portée (développement uniquement), la raison pour laquelle l'avis ne s'applique pas au site publié, la date de décision et la date d'expiration (trois mois au plus).
- **SBOM** : `npm run sbom` produit un inventaire CycloneDX 1.5 des dépendances. La CI l'écrit et en affiche le nombre de composants. Une copie datée accompagne chaque dossier de remédiation.
- **Épinglage** : versions exactes dans `package.json` et `package-lock.json` (intégrité SHA-512), image Playwright épinglée par digest, actions GitHub épinglées par SHA de commit.
- **Mises à jour** : uniquement des versions publiées depuis au moins deux semaines, chacune dans un commit dédié qui rejoue la porte complète.

## Artefact publié (AUD-018)

Le site est construit **une seule fois**. L'artefact est empreinté (`npm run dist:manifest -- write`), puis testé tel quel par la suite e2e (`E2E_PREBUILT=1`, sans reconstruction). Ses empreintes sont revérifiées (`-- check`) avant le téléversement vers Pages. Les SHA-256 figurent dans le résumé du run GitHub Actions.

## Limites

Il n'y a ni test de pénétration, ni analyse statique de sécurité dédiée (SAST), ni Dependabot. `npm audit` dépend de la base d'avis du registre npm au moment de l'exécution.
