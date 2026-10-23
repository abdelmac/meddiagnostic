# Applications Android et iOS

Ippomed utilise Expo SDK 58 pour ses applications natives. Les écrans et la navigation restent natifs ; l’atlas 3D utilise notre moteur Three.js embarqué dans un composant DOM local. Il ne charge pas le site ou une page de connexion distante dans une WebView. Cette architecture est prise en charge par [Expo DOM](https://docs.expo.dev/guides/dom-components/) et son module `@expo/dom-webview`, déjà fourni par le SDK. `expo-dev-client` est installé pour le profil de développement.

Les identifiants techniques existants sont conservés : `fr.medquiz.app` sur Android et iOS, schéma de liens `medquiz`, nom affiché Ippomed. Aucun identifiant de projet EAS fictif n’a été ajouté. Il faudra lier le véritable projet Expo du propriétaire avant un premier build cloud.

## Atlas 3D natif

Le moteur, ses manifestes et le décodeur Meshopt sont inclus dans l’application. Les modèles publics se chargent à la demande depuis l’origine HTTPS épinglée `https://medquiz-europe.medcompass-web.workers.dev`, dans les seuls répertoires anatomiques autorisés. Le chargement des géométries utilise `credentials: "omit"`, et les ressources publiques disposent d’en-têtes CORS. Une connexion réseau est nécessaire au premier téléchargement des modèles ; les schémas 2D et un bouton de réessai restent disponibles si la 3D ne démarre pas.

[AnatomyScene.tsx](../src/ui/AnatomyScene.tsx) échange avec le composant local [AnatomyScene.dom.tsx](../src/ui/AnatomyScene.dom.tsx) par des propriétés JSON et une action asynchrone. La sélection, les couches, le système, la langue, les vues, l’apparence naturel/étude, l’opacité, le masquage, l’isolation, le zoom et les demandes de cadrage sont synchronisés sans rechargement à chaque clic. Un changement de référence ou un réessai crée une nouvelle instance, pour libérer l’ancien contexte 3D.

Le [contrat validé](../src/domain/anatomy-native-bridge.ts) borne les nombres, tableaux et régions, refuse les identifiants de sélection absents du catalogue et les événements d’une autre référence, et ne transmet que les champs nécessaires au rendu. Les retours tardifs d’une instance remplacée sont ignorés. Aucun jeton, compte, cookie ou secret serveur n’est envoyé au composant DOM. Le pont général vers les modules Expo est désactivé ; les liens internes à la scène sont bloqués et les crédits restent accessibles depuis l’interface de l’application.

`EXPO_PUBLIC_FOLDER=public-native` sélectionne un petit dossier public pour les exports et builds mobiles. Sans ce réglage, Expo DOM pourrait copier les volumineuses géométries publiques dans le binaire alors qu’elles sont téléchargées à la demande. Le fichier [.easignore](../.easignore) reprend les exclusions de `.gitignore` et exclut aussi les modèles publics et les captures de diagnostic. Les manifestes importés depuis `src/data` et le logo utilisé par l’application restent inclus.

## Vérifier les exports

La commande fonctionne sous Windows et sur les systèmes de CI ; elle fixe le dossier public natif et exporte les deux plateformes successivement :

```sh
npm run build:native
```

Pour une seule plateforme :

```sh
npm run build:android
npm run build:ios
```

Les résultats vont dans `dist-native/android` et `dist-native/ios`. Ce sont des **exports Metro avec bytecode Hermes et moteur DOM**, pas des APK ou IPA signés. Les modèles GLB ne doivent pas se trouver dans ces dossiers.

L’audit des secrets connus vérifie tous les fichiers, y compris les tables de chaînes binaires des `.hbc`, avec `Buffer.includes()`. Il ne journalise aucune valeur :

```sh
node scripts/check-client-secrets.mjs dist-native/android dist-native/ios
```

Les tests ciblés sont dans [anatomy-native-bridge.test.ts](../tests/anatomy-native-bridge.test.ts), [mobile-config.test.ts](../tests/mobile-config.test.ts) et [client-secrets.test.ts](../tests/client-secrets.test.ts). Un export réussi valide le bundling ; il ne remplace pas les essais de WebGL, gestes, mémoire, reprise et parcours de compte sur de vrais appareils.

Les exports Android et iOS ont réussi, avec le moteur DOM réellement présent et aucun GLB, OBJ ou ZIP embarqué. L’audit binaire des secrets connus et les dix tests ciblés passent, ainsi que le contrôle TypeScript.

Le contrôle `npx expo install --check` du 21 octobre 2026 recommande cinq correctifs du même SDK : `expo ~58.0.17`, `expo-constants ~58.0.13`, `expo-linking ~58.0.14`, `expo-router ~58.0.25` et `expo-status-bar ~58.0.4`. Ces mises à jour ne sont pas appliquées à la candidate validée. Cette recommandation de compatibilité ne constitue pas un échec des exports actuels ; elle sera à reprendre lors d’une mise à jour du SDK suivie de ses vérifications.

## Produire les binaires

Les profils de [eas.json](../eas.json) sont prêts :

| Profil        | Android                     | iOS                                        |
| ------------- | --------------------------- | ------------------------------------------ |
| `development` | Client de développement     | Client de développement                    |
| `preview`     | APK installable directement | Application pour simulateur                |
| `production`  | AAB pour Google Play        | Binaire appareil pour App Store/TestFlight |

Après connexion au véritable compte Expo et association au projet du propriétaire :

```sh
npx eas-cli@latest login --device
npx eas-cli@latest init
npx eas-cli@latest build --platform android --profile preview
```

Les builds de production se demandent séparément, une fois les comptes des stores et leurs signatures disponibles :

```sh
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest build --platform ios --profile production
```

Les variables publiques de connexion utilisées par l’application doivent être définies dans l’environnement EAS correspondant ; `.env` est volontairement exclu des envois. Ne pas utiliser une clé serveur ou un mot de passe de base de données dans une variable `EXPO_PUBLIC_*`. Les identifiants de signature et de soumission se gèrent via EAS et les consoles des stores, sans les ajouter au dépôt. Le [guide officiel EAS Build](https://docs.expo.dev/build/setup/) décrit l’association du projet et les signatures.

Le propriétaire confirme déjà disposer des comptes **Apple Developer et Google Play**. Leur accès depuis cette session et leur association au projet EAS restent à réaliser. Au contrôle du **21 octobre 2026**, `expo whoami` et `eas whoami` indiquaient une session non connectée ; aucun `EXPO_TOKEN` n’était fourni. La connexion EAS par navigateur, notamment `login --device`, évite de demander un mot de passe dans le chat. Java et `adb` n’étaient pas disponibles dans le PATH de cette machine Windows. Aucun build cloud, achat, certificat ou dépôt sur un store n’a été exécuté. Un build iOS pour simulateur s’utilise sur un Mac ; Windows peut vérifier l’export JavaScript iOS mais ne peut pas exécuter le simulateur Apple.

## Budget et publication

Le plan [EAS Free](https://expo.dev/pricing) annonce actuellement 15 builds Android et 15 builds iOS par mois, avec une file d’attente de faible priorité. Les quotas et conditions sont à vérifier au moment du lancement d’un build ; aucun forfait payant n’est activé ici.

Les inscriptions ordinaires aux stores ont leurs propres frais : [Google Play](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en) demande **25 USD une fois**, et l’[Apple Developer Program](https://developer.apple.com/programs/enroll/) **99 USD par an**, avec variations locales et éventuelles exonérations Apple pour les organismes éligibles. Ces montants sont fournis pour contexte ; les comptes existants du propriétaire doivent être utilisés, sans nouvel achat automatique.

Les abonnements actuels utilisent Stripe pour le web. **StoreKit et Google Play Billing ne sont pas encore intégrés** dans cette version native ; les achats réels restent désactivés. Les exports réussis ne valident donc pas encore un parcours d’achat dans les stores.

Les essais sur appareils, les signatures, les accès App Store Connect/Play Console et la validation des parcours de compte et d’abonnement restent nécessaires avant une soumission. Les exports ne signifient pas que l’application est déjà publiée ou acceptée par Apple ou Google.
