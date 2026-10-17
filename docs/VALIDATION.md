# Validation — 17 octobre 2026

Environnement : Windows, Node 24.19, Expo SDK 58, React 19.3 et React Native 0.88. Dépendances natives sélectionnées avec `expo install`, verrouillées dans `package-lock.json`.

## Résultats

- TypeScript strict : réussi.
- 13 tests unitaires : réussis (banque, filtrage, absence de doublons, adaptation au stock, réponses idempotentes, score, sérialisation/reprise, nouvelles/répétées, programmation des révisions, fusion des tentatives, reconnaissance du revenu annuel et cohérence structurelle des traductions).
- Export statique web : réussi.
- 6 tests de parcours Chrome : réussis, répartis sur ordinateur 1440×1000 et écran mobile iPhone 13 simulé dans Chromium. Premier quiz complet, correction immédiate, favoris, reprise après rechargement, bilan, correction différée en examen, adaptation à la banque et persistance du mode sombre.
- 2 contrôles de mise en page supplémentaires : texte agrandi sans débordement et captures d’accueil examinées. Le contrôle visuel a permis de corriger un titre tronqué sur mobile.
- Version bilingue : 10 tests navigateur réussis au total (les 8 ci-dessus et 2 tests FR/EN). Ils vérifient les cas et corrections en anglais, la langue HTML, la préférence après rechargement et la conservation de la réponse et de la session après changement de langue. L’état `aria-checked` des réponses est maintenant explicitement renseigné sur le web.
- Couverture des messages UI explicites : `npm run check:i18n` réussi. La qualité linguistique médicale doit encore être relue par un professionnel bilingue.
- Déploiement Cloudflare confirmé : `https://medquiz-europe.medcompass-web.workers.dev`, réponse HTTPS 200 et en-tête anti-intégration `X-Frame-Options: DENY`. Quatre parcours supplémentaires réussis sur cette URL publique : quiz/révisions et changement FR/EN, chacun sur ordinateur et écran mobile.
- Exports Hermes/JavaScript iOS et Android : réussis. Aucun APK/IPA compilé ni distribué.
- Modèle économique : trois scénarios calculés sur 24 mois, paramètres modifiables. Aucune donnée commerciale réelle.

## Limites

- Aucun test physique iPhone/Android, simulateur natif, Safari mobile, VoiceOver ou TalkBack effectué. L’émulation de dimensions d’écran dans Chrome n’est pas un test natif iOS.
- Pas de test de synchronisation serveur, de RLS, d’administration ou de paiement : ces fonctions ne sont pas implémentées dans cette étape A. Le test de fusion est une fonction pure, pas une preuve de synchronisation multi-appareils.
- Les photographies cliniques et leurs licences manquent ; les questions visuelles restent en brouillon. Le zoom clinique et les annotations ne sont pas livrés.
- La qualité médicale des cas et la précision des références doivent être revues par un professionnel habilité avant commercialisation.
- `npm audit` signale 26 entrées (19 high, 7 moderate), principalement propagées dans l’outillage Expo/Metro. Les racines incluent braces 3.0.3, node-forge 1.4.0 et uuid 7.0.3. Aucun correctif compatible publié pour braces/node-forge au contrôle ; la suggestion de rétrograder Expo 44 casse la matrice actuelle. Ne pas exécuter `npm audit fix --force` sans étude. L’exposition exacte doit être évaluée avant CI/production ; aucune absence de vulnérabilité n’est revendiquée.
- Le serveur de test local écoute uniquement sur loopback. Le déploiement public statique est documenté dans HEBERGEMENT.md.

## Vérifications manuelles restantes

Publication commerciale bloquée tant que les étapes B–D de PRODUCTION.md ne sont pas remplies. Tester le stockage plein, la restauration après corruption, les changements d’heure, la longue inactivité, les changements de version de contenu, les polices système extrêmes et les lecteurs d’écran sur appareils réels.
