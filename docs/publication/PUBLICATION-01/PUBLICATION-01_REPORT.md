# PUBLICATION-01 : rapport (D18 = B), suivi de la publication R1 v2.1

- **Date** : 2026-11-27.
- **Mandat** : `CHRONOSILICON_D18_PUBLICATION_RC4_v1.0.md`, puis les directives R1 v2.0 et v2.1, qui prévalent sur la gouvernance D1–D18.
- **Exécution** : Claude Code. Ce rapport n'est pas un audit et ne revendique aucune certification. **G-FINAL n'est plus un objectif de publication** (directive v2.0).

## Verdicts

| Étape | Résultat |
|---|---|
| Préconditions D18 | Le statut de prototype manquait à RC4 : **rc5** a été créée (`publication-01-rc5`, code `53a5237`) avec le bandeau, la section Statut et la mention de licence. RC4 n'a pas été déplacée. |
| Porte sur clone neuf de rc5 | PASS : 309 unitaires, 104 e2e, 238 valeurs, 18 sondes, SBOM de 197 composants, `audit:gate` OK, `publication:check` OK |
| Validation utilisateur | Donnée par les directives v2.0 et v2.1 (« terminer PUBLICATION-01… sans arbitrage intermédiaire »), puis par la commande de publication tapée par l'utilisateur |
| Publication rc5 | `main` avancé en fast-forward `491c989` → `c2f191e`, sans force. Pages : run **46023767047**, success. |
| Publication R1 v2.1 | `main` avancé en fast-forward `c2f191e` → `e48db4e` (branche `editorial-r1c`, CI **46022383516** verte), sur commande de l'utilisateur. Pages : run **46023822104**, success. |
| Commit servi | `version.json` = **`e48db4e3b695535e53553a3e5b2185068e5fe01a`**, HTTP 200 sur `/` et sur `/404.html` |

La première tentative de publication, par l'agent, a été refusée par le contrôle de permissions de la session. La publication a eu lieu après la commande explicite de l'utilisateur. Le run CI de `c2f191e` sur `main` a été annulé par la poussée suivante ; ce commit avait déjà sa CI verte sur sa branche (run 46015239410).

## Contrôles après déploiement

| Contrôle | Résultat |
|---|---|
| Empreintes des fichiers servis (`index.html`, bundle JS, CSS, `version.json`) | **Identiques** à une reconstruction locale de `e48db4e` avec le même commit injecté (SHA-256 : `cc22ee01…` JS, `6e076393…` CSS, `e47f2f0a…` HTML, `bca7c454…` version) |
| `publication:check` sur les fichiers effectivement servis | OK : 0 suite de 6 mots d'un texte tiers retenu, sur 440 textes contrôlés. **Zéro détection ne veut pas dire zéro risque juridique.** |
| Navigateur (production) | Sous-titre FR/EN, bandeau prototype, 279 valeurs, 13 bandes, 12 univers, comparaisons entre univers, simulation, fiche (avec la note « illustratif »), bascule FR/EN : OK. **0 erreur de console.** |
| Exports JSON/CSV | Couverts par les e2e sur l'artefact (116 tests, run local `r1-v21` et CI). Pas de téléchargement manuel en production. |

Une première comparaison d'empreintes avait donné une différence : ma reconstruction locale n'injectait pas le commit (`"commit": "unknown"`). Corrigée en fixant `GITHUB_SHA`, la comparaison est identique. Aucun défaut du déploiement.

## Contenu publié (R1 v2.1)

- **Chronologie universelle** de 10⁻¹⁸ à 10¹⁸ s : 13 bandes, zoom, fenêtre étendue (temps de Planck), recherche, filtre sur 12 univers, double échelle physique et subjective.
- **Comparaisons entre univers**, calculées à partir du corpus.
- **Sous-titre** « An Open Atlas of Time ».
- **Corpus** : 279 valeurs qualifiées, dont 41 hors informatique, vérifiées contre leurs sources.

## Registre des risques résiduels

| Risque | État | Suite |
|---|---|---|
| Droits sur les extraits historiques (dépôt public, historique Git, données brutes) | Ouvert. PUB-1 protège ce qui est publié, pas l'historique. | Décision de l'utilisateur (`docs/audits/AUDIT-02/remediation/PUBLIC-CONTENT-OPTIONS.md`). Aucune suppression, réécriture ni changement de visibilité. |
| Décisions PUB-1 par règle, non relues une à une | Ouvert | Revue humaine qualifiée |
| Vulnérabilité de développement GHSA-g3hv-75wg-m249 (minimatch, via typescript-eslint) | Réduite : ESLint 10.15.0 appliqué (8 → 7 avis) | Mettre typescript-eslint à 8.74.0 ou plus à partir du 2026-12-07 ; l'exception expire le 2027-01-31 |
| Univers peu remplis (chimie, nature, transports, histoire et géologie, cognition) | En cours (lot 2) | Lots sourcés successifs |
| Valeurs non publiées : saccade (source primaire non lue), 2 doublons écartés | Documenté (`data/curated/decisions.json`) | — |
| Nom « CHRONOSILICON » non vérifié en marque | Ouvert | Recherche EUIPO, INPI et USPTO par le propriétaire |
