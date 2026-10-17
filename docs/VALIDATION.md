# Validation — 17 octobre 2026

Environnement : Windows, Node 24.19, Expo SDK 58, React 19.3 et React Native 0.88. Dépendances natives sélectionnées avec `expo install`, verrouillées dans `package-lock.json`.

## Résultats

- TypeScript strict : réussi.
- 11 tests unitaires : réussis (banque, filtrage, absence de doublons, adaptation au stock, réponses idempotentes, score, sérialisation/reprise, nouvelles/répétées, programmation des révisions, fusion des tentatives et reconnaissance du revenu annuel).
- Export statique web : réussi.
- 6 tests de parcours Chrome : réussis, répartis sur ordinateur 1440×1000 et écran mobile iPhone 13 simulé dans Chromium. Premier quiz complet, correction immédiate, favoris, reprise après rechargement, bilan, correction différée en examen, adaptation à la banque et persistance du mode sombre.
- 2 contrôles de mise en page supplémentaires : texte agrandi sans débordement et captures d’accueil examinées. Le contrôle visuel a permis de corriger un titre tronqué sur mobile.
- Exports Hermes/JavaScript iOS et Android : réussis. Aucun APK/IPA compilé ni distribué.
- Modèle économique : trois scénarios calculés sur 24 mois, paramètres modifiables. Aucune donnée commerciale réelle.

## Limites

- Aucun test physique iPhone/Android, simulateur natif, Safari mobile, VoiceOver ou TalkBack effectué. L’émulation de dimensions d’écran dans Chrome n’est pas un test natif iOS.
- Pas de test de synchronisation serveur, de RLS, d’administration ou de paiement : ces fonctions ne sont pas implémentées dans cette étape A. Le test de fusion est une fonction pure, pas une preuve de synchronisation multi-appareils.
- Les photographies cliniques et leurs licences manquent ; les questions visuelles restent en brouillon. Le zoom clinique et les annotations ne sont pas livrés.
- La qualité médicale des cas et la précision des références doivent être revues par un professionnel habilité avant commercialisation.
- `npm audit` signale 26 entrées (19 high, 7 moderate), principalement propagées dans l’outillage Expo/Metro. Les racines incluent braces 3.0.3, node-forge 1.4.0 et uuid 7.0.3. Aucun correctif compatible publié pour braces/node-forge au contrôle ; la suggestion de rétrograder Expo 44 casse la matrice actuelle. Ne pas exécuter `npm audit fix --force` sans étude. L’exposition exacte doit être évaluée avant CI/production ; aucune absence de vulnérabilité n’est revendiquée.
- Aucune mise en ligne n’a été effectuée. Le serveur de test écoute uniquement sur loopback.

## Vérifications manuelles restantes

Publication commerciale bloquée tant que les étapes B–D de PRODUCTION.md ne sont pas remplies. Tester le stockage plein, la restauration après corruption, les changements d’heure, la longue inactivité, les changements de version de contenu, les polices système extrêmes et les lecteurs d’écran sur appareils réels.
