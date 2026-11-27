# PUBLICATION-01 : version candidate rc5 (non publiée, à valider)

- **Date** : 2026-11-27.
- **Mandat** : `CHRONOSILICON_D18_PUBLICATION_RC4_v1.0.md`, décision D18 = B, sur Drive `2026-11-27_PUBLICATION-01`.
- **Clôture technique** : AUDIT-03.
- **Pourquoi rc5.** Une précondition non compensatoire du mandat n'était pas remplie par RC4 : « le site présente clairement son statut de prototype scientifique et pédagogique expérimental, ses limites, ses sources et versions ». Le mandat prévoit alors une nouvelle version candidate, testée entièrement, puis une **validation utilisateur avant publication**. RC4 n'est pas déplacée.

## Constat sur RC4

- Le site n'employait nulle part les mots « prototype » ni « expérimental ». La section « Méthode et limites », la version et le commit existaient.
- La page « À propos » affirmait que les sources tierces étaient « citées, pas copiées ». C'était devenu inexact sous PUB-1, qui publie encore de courts libellés, des termes et des mentions de licence.

## Changement (commit `53a5237`, branche `publication-01`, issue de RC4)

1. **Bandeau visible sur chaque vue**, avec un lien vers « Méthode et limites » (page À propos).
   - FR : « Prototype scientifique et pédagogique expérimental : valeurs sourcées, non certifiées. »
   - EN : « Experimental scientific and educational prototype: sourced values, not certified. »
2. **Section « Statut »** dans À propos.
   - FR : « Prototype scientifique et pédagogique expérimental. Chaque valeur est sourcée et vérifiée par la curation du projet, sans validation humaine externe ni certification ; le corpus est partiel et l'interface peut changer. Ne pas utiliser ces valeurs comme référence normative. »
   - EN : texte équivalent.
3. **Mention de licence précisée.** Elle conserve les licences du projet, puis :
   - FR : « Les sources tierces gardent leurs propres conditions ; elles sont citées par référence et localisateur. Quand leur droit de redistribution n'est pas établi, leurs extraits ne sont pas reproduits, hormis de courts libellés de tableau, termes et mentions de licence nécessaires pour retrouver la valeur. Cette règle de prudence n'est pas un avis juridique. »
   - EN : texte équivalent.
4. **Test e2e** : le bandeau en FR et en EN, le lien, la section Statut et la mention « pas un avis juridique ». Le test tourne sur 4 projets de navigateur : **104 e2e** au lieu de 100.

Captures : `screenshots/rc5-fr-timeline.png`, `screenshots/rc5-en-about.png`.

## Inchangé depuis RC4 (vérifié)

`git diff --stat remediation-02-rc4 53a5237 -- data packages scripts security .github` est vide : données, moteurs, scripts, politique PUB-1, porte de sécurité et workflows sont inchangés. L'historique est linéaire (RC4 est un ancêtre de rc5).

## Vérifications

| Contrôle | Résultat |
|---|---|
| Porte officielle sur **clone neuf** (`53a5237`, image épinglée, Node 26.13.1, `dirty=0`) | **PASS** à toutes les étapes : `ci`, `audit:gate`, `lint`, `typecheck`, `validate:data`, `test`, `build`, `publication:check`, `dist:manifest-write`, `test:e2e`, `dist:manifest-check` (`docs/reports/logs/rc5-fresh/`) |
| Tests unitaires | 309, comme la référence |
| E2E sur l'artefact unique | **104**, soit les 100 de référence plus le nouveau test sur 4 navigateurs ; axe (WCAG 2.1 AA) compris |
| Valeurs qualifiées | 238 (`validate:data`) |
| Sondes d'AUDIT-02 | 18/18, sous Node 26 |
| `audit:gate` | OK, production 0. Exception GHSA-g3hv-75wg-m249 inchangée : développement seulement, expiration 2027-01-31. |
| `publication:check` | OK : 0 fuite, 386 textes retenus contrôlés |
| SBOM | CycloneDX 1.5, 197 composants |
| CI GitHub `53a5237` | **success**, run 46014637201 |

## Suite

Le tag **`publication-01-rc5`** est posé sur le commit de cette documentation après sa CI verte. La **publication attend votre validation des textes ci-dessus** ; ensuite viendront l'avance rapide de `main` et le workflow Pages officiel (mandat §2 et §3).
