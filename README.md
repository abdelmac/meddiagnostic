# MedQuiz

Application de formation médicale en français et en anglais, construite avec Expo SDK 58, React Native, TypeScript et Expo Router pour web, iOS et Android.

Publication statique gratuite sur Cloudflare Workers Static Assets : voir [le guide de déploiement](docs/HEBERGEMENT.md). Le sélecteur FR/EN conserve la progression ; les liens `/?lang=fr` et `/?lang=en` permettent de partager une langue précise.

**Application publique : https://medquiz-europe.medcompass-web.workers.dev**

**Livraison actuelle : démonstration bilingue et comptes bêta.** Le parcours invité, les comptes Supabase, l’import invité, la synchronisation et la suppression du compte sont implémentés. L’envoi d’e-mails reste limité aux adresses de l’équipe tant qu’un SMTP personnalisé n’est pas raccordé. Le paiement sandbox est préparé mais attend les clés et produits RevenueCat ; aucun achat réel n’est activé. L’administration et la banque médicale validée restent à développer.

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

Le QR code Expo permet d’ouvrir le projet depuis un appareil du même réseau ; la version d’Expo Go doit correspondre au SDK. Le mode invité fonctionne sans identifiant. Pour les comptes, copier `.env.example` vers `.env` et renseigner les valeurs publiques du projet Supabase (jamais la clé service-role). Les identifiants de bundle `fr.medquiz.app` sont provisoires, à remplacer avant distribution.

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
- Export des données, suppression locale avec confirmation et signalements sauvegardés avec la progression. Les signalements ne sont pas encore traités par une administration éditoriale.
- Connexion bêta, import des résultats invités, caches séparés par compte et synchronisation sans doublons.
- Suppression du compte avec connexion récente, révocation des sessions et suppression des données distantes.

Les données sont stockées avec AsyncStorage (stockage navigateur sur le web), et synchronisées vers Supabase Paris pour les comptes connectés. Elles ne sont pas conçues pour conserver des données de santé : **ne pas entrer de données de patients**. La démo ne réalise aucun diagnostic personnalisé. Un signalement n’est pas transmis à un service médical opérationnel ; il est conservé dans la progression et l’export.

## Organisation

- `src/data/questions.ts` : 30 cas originaux de démonstration et brouillon visuel exclu des sessions.
- `src/domain/engine.ts` : logique pure de sessions, scores et révisions ; `types.ts` : contrats.
- `src/state.tsx` : chargement et file de sauvegarde locale.
- `src/ui/` : composants visuels et thèmes ; `app/` : navigation et parcours.
- `tests/` : moteur et modèle économique ; `e2e/` : parcours Chrome.
- `docs/` : décisions produit, algorithme, modèle économique, travail restant et validation.

Les données médicales sont séparées de l’interface et chaque tentative conserve un numéro de version. La banque démo v1 doit rester immuable pour que les anciennes tentatives gardent leur sens. Le futur serveur devra stocker chaque version intégralement. Les messages UI anglais sont regroupés dans `src/i18n/en.ts`, les 30 cas traduits dans `src/data/questions.en.ts`. Les identifiants et positions des bonnes réponses sont identiques dans les deux langues.

## Suite et publication

Lire [le périmètre et les décisions](docs/PRODUIT.md), [les règles de révision](docs/ALGORITHME-REVISION.md), [la préparation de production](docs/PRODUCTION.md) et [le bilan de validation](docs/VALIDATION.md).

État précis des comptes, restrictions e-mail, synchronisation et configuration du paiement de test : [COMPTES-PAIEMENTS.md](docs/COMPTES-PAIEMENTS.md).

Ne pas présenter la démonstration publique comme un produit médical validé ni activer d’abonnement avant relecture, images sous licence, serveur et tests de sécurité. Aucun achat n’est activé.
