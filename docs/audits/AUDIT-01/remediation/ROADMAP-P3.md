# Feuille de route P3 (écarts fonctionnels D1, D2, D5, D7, D8, D9, D13, D16)

- **Statut** : **plan, non engagé**.
- **Conditions préalables** : consolider P0 à P2 (AUDIT-02), puis vérifier chaque source avant de l'implémenter.
- **Règles** :
  - ne pas gonfler le corpus ;
  - ne fabriquer aucune distribution ;
  - si les données manquent, documenter l'abstention.
- **Décision de l'utilisateur** : chaque item indique s'il en demande une ; la colonne « Décision structurante ? » le précise.

| ID | Décision | Écart | Travail proposé | Données nécessaires (à vérifier avant implémentation) | Décision structurante ? |
|---|---|---|---|---|---|
| P3-1 | D1 | Aucun observateur dont l'opération de référence soit une instruction ou un registre | Observateurs « 1 ADD r64 », « 1 accès L1 » dérivés de latences en cycles déjà qualifiées. Il faut une fréquence sourcée de la même microarchitecture pour passer en secondes. | Latence ADD r64 sur Alder Lake-P (déjà au corpus, en cycles) et fréquence effective sourcée | Non. Le moteur existe déjà (`reference-operation`). |
| P3-2 | D2 | Apple Silicon : 1 valeur | Hiérarchie de caches et latences sourcées pour M-series | Sources primaires ou mesures publiées avec protocole. **Abstention** si seules des estimations tierces existent. | Non |
| P3-3 | D5 | Énergie et jitter absents | Grandeur `energy` (J) dans `metrology`, puis des valeurs sourcées (énergie par opération, par accès DRAM). Jitter, uniquement à partir de distributions publiées. | Sources avec protocole. Pour le jitter, une dispersion publiée. | **Oui** : nouvelle grandeur dans l'ontologie (extension de D13) |
| P3-4 | D8 | Fréquence variable absente de l'interface ; domaines d'horloge | Exposer `clocked-segments` dans l'interface (Immersion et Observateurs), avec affichage de l'incomplétude. Le journal le gère déjà, voir AUD-008. | Profils DVFS **sourcés** : aucun profil inventé | Non |
| P3-5 | D7, D13 | Incertitude non propagée, aucune distribution empirique, protocole en texte libre | Propagation de premier ordre pour les valeurs calculées ; type `empirical` dans le schéma des scénarios ; protocole structuré (matériel, logiciel, n, méthode) | Distributions publiées complètes, sinon abstention | **Oui** : changement de schéma (ADR) |
| P3-6 | D9 | Durées déterministes ; scénarios web, LLM et HPC absents | Scénarios adossés à des valeurs qualifiées (MLPerf TTFT déjà au corpus, TOP500) ; durées conditionnelles | Valeurs qualifiées pour chaque étape du scénario, sinon scénario non publié | Non |
| P3-7 | D10 | Import de mesures natives absent | Import documenté d'un fichier de mesures natives (CS-06), étiqueté « mesure locale », jamais versé au corpus | — | Non |
| P3-8 | D11 | Aucun budget de performance ni banc natif | Budget chiffré (poids, temps de chargement) vérifié en CI ; mesure navigateur hors fil principal si elle le justifie | Mesures de TEST-RESULTS.md comme point de départ | Non |
| P3-9 | D16 | Marque non vérifiée ; notes en anglais ; droits | Recherche EUIPO, INPI et USPTO **par le propriétaire** ; traduction des textes de curation ; revue humaine des droits (SOURCE-RIGHTS.md) | — | **Oui** : identité et droits, décisions du propriétaire |

Ordre recommandé : P3-9 (droits et marque), puis P3-1 et P3-4, qui réutilisent l'existant, puis P3-6, P3-5, P3-3, P3-2, P3-7 et P3-8. **La qualité du corpus passe avant son extension.**
