# MedQuiz

Application de formation médicale en français, construite avec Expo SDK 58, React Native, TypeScript et Expo Router pour web, iOS et Android.

**Livraison actuelle : étape A, démonstration locale.** Le parcours invité est implémenté, avec 30 cas fictifs. Les étapes B–D ne sont pas présentées comme terminées : pas encore de comptes, backend, paiements, administration ni contenu médical validé.

## Installation et lancement

Node.js 22.13+ (v24.19 utilisée ici), npm et Git. Sous PowerShell avec scripts désactivés, utiliser `npm.cmd` et `npx.cmd`.

```sh
npm ci
npm run web
# ou, pour Expo Go compatible SDK 58 / un development build :
npm start
npm run android
# macOS + Xcode requis pour le simulateur iOS local :
npm run ios
```

Le QR code Expo permet d’ouvrir le projet depuis un appareil du même réseau ; la version d’Expo Go doit correspondre au SDK. Aucun identifiant n’est nécessaire pour cette démonstration. Les identifiants de bundle `fr.medquiz.app` sont provisoires, à remplacer avant distribution.

## Vérification

```sh
npm run typecheck
npm test
npm run build:web
npm run test:e2e
npm run economics
npx expo export --platform ios --platform android --output-dir dist-native
```

Les tests E2E utilisent Google Chrome installé, sur `127.0.0.1:8081`, avec un écran ordinateur et un écran mobile simulé dans Chromium. Ils servent l’export `dist` : reconstruire avant de tester des modifications UI. Pour une consultation locale de cet export : `npm run preview` puis ouvrir http://127.0.0.1:8081.

L’export JavaScript iOS/Android ne compile pas d’IPA/APK et ne prouve pas un fonctionnement sur appareil. Les contrôles VoiceOver/TalkBack et les essais physiques restent à réaliser.

## Ce qui fonctionne

- Accueil, spécialités, configuration courte du niveau, des matières et de l’objectif quotidien.
- Sessions de 5, 10 ou 20 cas adaptées à la banque filtrée, sans doublon.
- Apprentissage avec correction immédiate et examen avec correction différée et chronomètre optionnel.
- Réponse unique, confiance, score, session reprenable et historique local.
- Explication du raisonnement et des distracteurs, indices, objectif pédagogique, encadré À retenir et liens de ressources pour relecture.
- Révisions espacées, carnet des dernières erreurs, favoris et marqueurs À revoir.
- Progression par thème, distinction questions nouvelles/répétées et bilan glissant de sept jours.
- Mode sombre, texte agrandi, rôles d’accessibilité, interface adaptée aux grands et petits écrans.
- Export des données, suppression locale avec confirmation et signalements explicitement locaux.

Les données sont stockées avec AsyncStorage (stockage navigateur sur le web). Elles ne sont pas chiffrées pour conserver des données de santé : **ne pas entrer de données de patients**. La démo ne réalise aucun diagnostic personnalisé. Un signalement n’est pas transmis à un service médical : il est conservé dans l’export local.

## Organisation

- `src/data/questions.ts` : 30 cas originaux de démonstration et brouillon visuel exclu des sessions.
- `src/domain/engine.ts` : logique pure de sessions, scores et révisions ; `types.ts` : contrats.
- `src/state.tsx` : chargement et file de sauvegarde locale.
- `src/ui/` : composants visuels et thèmes ; `app/` : navigation et parcours.
- `tests/` : moteur et modèle économique ; `e2e/` : parcours Chrome.
- `docs/` : décisions produit, algorithme, modèle économique, travail restant et validation.

Les données médicales sont séparées de l’interface et chaque tentative conserve un numéro de version. La banque démo v1 doit rester immuable pour que les anciennes tentatives gardent leur sens. Le futur serveur devra stocker chaque version intégralement. L’internationalisation est préparée dans les types/contenus par séparation des données, mais l’extraction des chaînes UI vers des dictionnaires reste à faire.

## Suite et publication

Lire [le périmètre et les décisions](docs/PRODUIT.md), [les règles de révision](docs/ALGORITHME-REVISION.md), [la préparation de production](docs/PRODUCTION.md) et [le bilan de validation](docs/VALIDATION.md).

Ne pas publier comme produit médical validé ni activer d’abonnement avant relecture, images sous licence, serveur et tests de sécurité. Aucun déploiement ni achat n’a été effectué.
