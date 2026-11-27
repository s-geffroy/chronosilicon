# REMEDIATION-02 : rapport du mainteneur

- **Date** : 2026-11-27.
- **Auteur** : le mainteneur (session Claude Code, Claude Opus 5.5), sans agent délégué.
- **Entrée** : `AUDIT-02_RAPPORT_v1.0.md` et `PROMPT_CLAUDE_REMEDIATION-02_v1.0.md` (Drive `2026-11-27_AUDIT-02`).
- **Nature** : correction ciblée. Ce rapport n'est **pas** un audit et ne déclare aucune acceptation. ChatGPT audite ; l'utilisateur décide de la publication et de P3.

## 1. Résultat

| Constat | Statut | Preuve |
|---|---|---|
| AUD02-001, porte de vulnérabilités | Confirmé, corrigé | Correspondance exacte par avis. Avant : 6 faux PASS sur 11 fixtures ; après : seul le rapport réel passe. 18 tests. |
| AUD02-002, heuristique d'extraits | Confirmé, traité | Politique PUB-1 : champs publics explicites, 409 décisions texte par texte, contrôle global et contrôle du site construit, 0 fuite. Options pour les contenus déjà publics. |

- **Version candidate** : `remediation-02-rc4`, **non publiée**.
  - Code testé : `9227a8e`. Porte officielle PASS sur clone neuf, CI verte (run 46009666098), sondes de l'auditeur 18/18 sous Node 26.
  - **rc3 est remplacée** : la CI de son commit de tag (`5ebefa4`) a échoué au lint, sur le script de sondes de l'auditeur ajouté après le code testé. C'est mon erreur de procédure : j'ai posé le tag sans attendre la CI de ce commit. Le tag rc3 n'a pas été déplacé.
- **Inchangés depuis rc2** :
  - moteurs (simulateur, métrologie, observateurs) et interface ;
  - D1–D17 ;
  - P3, qui n'est pas engagée.
- **`main` et le site** : non modifiés. Le site sert toujours `491c989`.

## 2. Ce qui a été fait

1. **AUD02-001** (`1371911`).
   - `scripts/lib/audit-policy.ts` : fonction pure.
   - `security/audit-exceptions.json` : schéma 2.
   - Fixtures `npm audit` dérivées d'une capture réelle.
   - Preuves avant et après.
   - `SECURITY.md` mis à jour. L'exception existante est conservée sans changement d'échéance : **2027-01-31**.
2. **AUD02-002** (`7f69b83`, `e1c04c4`, `16093cf`).
   - `applyPublicationPolicy` remplace `publicView`.
   - `data/publication/text-decisions.json`, `scripts/check-public-text.ts`.
   - `publication:check` ajouté dans la porte, `ci.yml` et `pages.yml`.
   - Amendement de l'ADR-0011.
   - `PUBLICATION-POLICY.md`, `PUBLIC-TEXT-REGISTER.csv`, `PUBLIC-CONTENT-OPTIONS.md`.
3. **Reproduction** : clone neuf depuis GitHub, porte officielle et sondes de l'auditeur. Tous les essais, échecs compris, figurent dans `TEST-RESULTS.md` §6.

## 3. Limites résiduelles

- **Droits**. PUB-1 est une règle de prudence, pas un avis juridique. Elle a deux limites :
  - 386 décisions suivent une règle relue par catégorie, et non une à une ;
  - la détection ne connaît que les textes tiers enregistrés.

  Une relecture humaine qualifiée reste nécessaire.
- **Contenus déjà publics**. Le site en ligne (943 suites de 6 mots détectées), `data/raw`, `data/curated` et l'historique Git contiennent toujours les extraits. Les options sont décrites dans `PUBLIC-CONTENT-OPTIONS.md`. **Décision de l'utilisateur.**
- **Exception de vulnérabilité**. Elle expire le 2027-01-31 ; après cette date, la porte échouera.
- **`pages.yml`**. Il n'a jamais été exécuté avec l'artefact unique ni avec `publication:check`.
- **Validation**. Elle est interne uniquement : aucune reproduction sur une autre machine, aucun audit navigateur manuel ni lecteur d'écran.
- **P3 et G-FINAL**. Non traités, comme le demande le prompt. G-FINAL reste NO-GO selon AUDIT-02.

## 4. Livrables

| Fichier | Contenu |
|---|---|
| REMEDIATION-02_REPORT.md | Ce rapport |
| FINDINGS-RESPONSE.md | Réponse aux deux constats et aux réserves d'AUDIT-02 |
| TEST-RESULTS.md | Porte sur clone neuf, CI, sondes, avant et après, tous les essais |
| PUBLICATION-POLICY.md, PUBLIC-TEXT-REGISTER.csv, draft-text-decisions.py | Politique PUB-1, registre des 409 décisions, générateur du brouillon |
| PUBLIC-CONTENT-OPTIONS.md | État vérifié et options pour le site, le dépôt et l'historique |
| RELEASE-CANDIDATE.md | Identification de rc3, procédure, risques |
| RC2-RC4-DIFF.txt (et RC2-RC3-DIFF.txt, pour rc3) | Différence exacte entre rc2 et le code testé |
| old-gate-harness.ts, run-gate-fixtures.sh, logs/ | Preuves d'AUD02-001 et d'AUD02-002, journaux des sondes |
| probes/ | Sondes de l'auditeur, non modifiées, avec leurs empreintes |
| sbom.cdx.json | SBOM CycloneDX 1.5 (197 composants) |
| SHA256SUMS.txt | Empreintes des fichiers ci-dessus |

Journaux de la porte : `docs/reports/logs/rc4-fresh/` (et `rc3-fresh/`).
