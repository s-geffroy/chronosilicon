# ADR-0008 : V4, journal dérivé ; V5, laboratoire et contributions

- Statut : accepté (choix mineur réversible, 2026-11-26)
- Contexte : CS-08 et CS-10 demandent un journal à la première personne présenté comme une métaphore, dont la durée subjective et l'état d'activité dérivent du simulateur, et qui n'invente jamais d'activité du CPU pendant une attente. CS-06 et CS-11 demandent des mesures navigateur étiquetées comme telles, des statistiques documentées (n, méthode), la conservation des données contradictoires et des contributions de qualité.
- Décisions :
  1. **Journal** (`apps/web/src/lib/narrative.ts`) : une ligne par événement simulé, dans l'ordre, rattachée à son numéro de séquence. Entre deux événements, une ligne « temps écoulé » donne la durée subjective exacte et dit explicitement que *le modèle ne dit pas ce que je fais*. Les phrases sont des **gabarits fixes** FR/EN ; un test vérifie que chaque ligne correspond à un gabarit.
  2. **Statistiques** (`packages/metrology/src/stats.ts`) : quantiles de Hyndman et Fan, type 7, vérifiés contre les valeurs de R. Le couple min–max est présenté comme tel, jamais comme un intervalle de confiance.
  3. **Mesures navigateur** (`lib/browser-measure.ts`) : granularité de l'horloge et coût d'un appel. Elles sont étiquetées « mesure du navigateur, pas du CPU ». Les échantillons bruts sont exportables et rien n'est envoyé. Ces mesures **n'entrent jamais au corpus**.
  4. **Valeurs écartées** : publiées dans `corpus.withheld`, avec statut et motif, et affichées dans le Laboratoire (CS-11 : conserver les données contradictoires).
  5. **Contributions** : schéma `raw-extraction.schema.json`, commande `npm run contribute:check`, appliquée aussi aux extractions existantes par `validate:data`, et modèle d'issue GitHub.
- Limites : pas de contribution de mesures natives importées en V5 ; le format d'import reste à définir sur un cas réel. La revue humaine des contributions reste nécessaire (CS-12).
