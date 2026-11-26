# ADR-0002 : Outillage dans le conteneur Playwright officiel épinglé

- Statut : accepté (décision utilisateur du 2026-11-26)
- Contexte :
  - Règle VPS : aucun runtime installé sur l'hôte.
  - Le Node de l'hôte (20.20.2) est en fin de vie.
  - Les tests e2e exigent des navigateurs.
- Décision :
  - Le service outil `node` de `compose.yaml`, sous le profil `cli` et donc non permanent, utilise `mcr.microsoft.com/playwright:v1.65.0-noble`. Cette image fournit Node 26.13.1, une LTS, avec Chromium, Firefox et WebKit.
  - La CI utilise la même image en `container:`.
  - `@playwright/test` est épinglé à 1.65.0.
- Versions retenues (vérifiées sur le registre npm le 2026-11-26) : la règle prend des versions publiées depuis au moins deux semaines, compatibles entre elles.
  - TypeScript 6.0.3. TS 7.0.2 a été écarté : typescript-eslint 8.72 exige `<6.1` et svelte-check 4.7 exige `^5 || ^6`.
  - Vite 8.3.8, forcé par `overrides` : vitest tirait vite 8.4.0, trop récent.
  - Svelte 5.57.3, vitest 5.1.0.
- `ipc: host` est refusé par `appctl validate` ; il est remplacé par `shm_size: 1gb` pour Chromium.
- Conséquence : la même image produit les mêmes versions en local et en CI. Changer le tag impose de changer, dans le même commit, `compose.yaml`, `ci.yml`, `pages.yml` et `package.json`.
