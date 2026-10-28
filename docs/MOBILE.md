# Applications Android et iOS

Ippomed utilise Expo SDK 58 pour ses applications natives. Les écrans et la navigation restent natifs ; l’atlas 3D utilise notre moteur Three.js embarqué dans un composant DOM local. Il ne charge pas le site ou une page de connexion distante dans une WebView. Cette architecture est prise en charge par [Expo DOM](https://docs.expo.dev/guides/dom-components/) et son module `@expo/dom-webview`, déjà fourni par le SDK. `expo-dev-client` est installé pour le profil de développement.

Les identifiants techniques existants sont conservés : `fr.medquiz.app` sur Android et iOS, schéma de liens `medquiz`, nom affiché Ippomed. Depuis le **23 octobre 2026**, la session Expo/EAS est connectée au compte `hikmamif` et le projet est lié à [`@hikmamif/medquiz`](https://expo.dev/accounts/hikmamif/projects/medquiz), UUID `4e62f61a-560f-4030-81de-514b26120b00`. Les champs `owner` et `extra.eas.projectId` correspondent au projet réel du propriétaire.

**Mise à jour du 28 octobre :** l’atlas neurovasculaire apporte une troisième référence cohérente, avec 3 642 objets, dont les nerfs des jambes des deux côtés. Le [build Android versionCode 5](https://expo.dev/accounts/hikmamif/projects/medquiz/builds/314f49d1-73c0-40dd-9a4a-0d77ca0b1d25) a **réussi le 28 octobre à 0 h 27, heure de Paris**, sur EAS Free. **[Télécharger l’APK Android à jour](https://expo.dev/artifacts/eas/jzPjMjTKjj0U0AhDI9YoK8V5vWgMMrG8K8LfDO-eEtk.apk)**. Les exports Android/iOS et les contrôles de l’APK passent ; les 3 642 identifiants du nouvel atlas sont présents dans son moteur. Voir [la validation du 28 octobre](VALIDATION-2026-10-28.md).

L’APK 5 est conservé dans `artifacts/native/ippomed-android-0.1.0-preview-5.apk` : **105 995 908 octets**, SHA-256 `dc4a419ae5833222038965c20ac5c75714f9a8aee93b49fbe7a3dbd10272b324`. Le package attendu, le DEX, Hermes et le moteur DOM sont présents. Aucun GLB/OBJ/ZIP embarqué et aucun des trois secrets serveur connus détecté. Le bloc de signature v2 est structurellement valide ; l’installation sur téléphone et une vérification cryptographique indépendante ne sont pas attestées. Preuve : `.local/native-apk5-validation-2026-10-28.json`.

**Version précédente du 26 octobre :** le Corps complet 4.3 contient les 3 210 maillages de cette référence, avec accès directs Nerfs / Artères / Veines / Os, filtres vasculaires et variantes osseuses conservées à l’affichage. Les exports Android/iOS et leurs audits passent avec le choix des variantes transmis au moteur natif. Le [build Android versionCode 4](https://expo.dev/accounts/hikmamif/projects/medquiz/builds/4a0251a2-e3c0-4b88-8ddd-3aa44ff5d08e) a **réussi le 26 octobre à 23 h 07, heure de Paris**, sur EAS Free, avec la clé existante. [Télécharger l’ancien APK 4](https://expo.dev/artifacts/eas/SH2csmDH5FJupBCJpoq7V2jl-ziQQv85GpRfJEwViIE.apk). Voir [la validation du 26 octobre](VALIDATION-2026-10-26.md).

L’APK 4 est conservé dans `artifacts/native/ippomed-android-0.1.0-preview-4.apk` : **104 555 340 octets**, SHA-256 `2b62da8af521023a7692d5498a29b6b4cf82e8ccb7562b192e79e1b9bdb33aa2`. Le package `fr.medquiz.app`, le DEX, Hermes, le DOM et les fonctions finales sont présents ; les 3 210 identifiants du manifeste sont retrouvés dans le moteur. Aucun GLB/OBJ/ZIP embarqué et aucun des trois secrets connus détecté dans les huit fichiers extraits. Le bloc de signature v2 est structurellement présent ; sa vérification cryptographique indépendante et les essais sur appareil restent à effectuer. Preuve privée : `.local/native-apk4-validation-2026-10-26.json`.

**Version précédente du 25 octobre :** la netteté du corps entier, le réglage des ombres de profondeur, les coupes virtuelles et la dissection réversible ont été publiés. Le [build Android versionCode 3](https://expo.dev/accounts/hikmamif/projects/medquiz/builds/552ab320-e2eb-4dde-bc66-441951a32d26) a réussi à **23 h 11, heure de Paris**. [Télécharger l’ancien APK Android](https://expo.dev/artifacts/eas/ggTRVFAA8wRzsVlB0j_P-Zwu8gVQuYREx6i2gSpJ-sU.apk). Il utilise la même clé Android. Le premier APK du 23 octobre décrit plus bas est également une version précédente.

L’APK du 25 octobre se trouve dans `artifacts/native/ippomed-android-0.1.0-preview-3.apk` : **102 444 476 octets**, SHA-256 `30e86d27964d6f7ce803d256d3a8887276fb3a04be8dced68c6b9495d314de3a`. Le manifeste, le package, le DEX, Hermes et le moteur anatomique DOM sont présents. Les marqueurs des coupes, de sélection et des ombres confirment les fonctions de cette version. Aucun GLB/OBJ/ZIP n’est embarqué et aucun des trois secrets connus n’est détecté dans les huit fichiers extraits. Le bloc de signature v2 est structurellement présent, sans vérification cryptographique indépendante. Voir [la validation du 25 octobre](VALIDATION-2026-10-25.md).

## Atlas 3D natif

Le moteur, ses manifestes et le décodeur Meshopt sont inclus dans l’application. Les modèles publics se chargent à la demande depuis l’origine HTTPS épinglée `https://medquiz-europe.medcompass-web.workers.dev`, dans les seuls répertoires anatomiques autorisés. Le chargement des géométries utilise `credentials: "omit"`, et les ressources publiques disposent d’en-têtes CORS. Une connexion réseau est nécessaire au premier téléchargement des modèles ; les schémas 2D et un bouton de réessai restent disponibles si la 3D ne démarre pas.

[AnatomyScene.tsx](../src/ui/AnatomyScene.tsx) échange avec le composant local [AnatomyScene.dom.tsx](../src/ui/AnatomyScene.dom.tsx) par des propriétés JSON et une action asynchrone. La sélection, les couches, le système, la langue, les vues, l’apparence naturel/étude, l’opacité, le masquage, l’isolation, le zoom et les demandes de cadrage sont synchronisés sans rechargement à chaque clic. Un changement de référence ou un réessai crée une nouvelle instance, pour libérer l’ancien contexte 3D.

Le [contrat validé](../src/domain/anatomy-native-bridge.ts) borne les nombres, tableaux et régions, refuse les identifiants de sélection absents du catalogue et les événements d’une autre référence, et ne transmet que les champs nécessaires au rendu. Les retours tardifs d’une instance remplacée sont ignorés. Aucun jeton, compte, cookie ou secret serveur n’est envoyé au composant DOM. Le pont général vers les modules Expo est désactivé ; les liens internes à la scène sont bloqués et les crédits restent accessibles depuis l’interface de l’application.

`EXPO_PUBLIC_FOLDER=public-native` sélectionne un petit dossier public pour les exports et builds mobiles. Sans ce réglage, Expo DOM pourrait copier les volumineuses géométries publiques dans le binaire alors qu’elles sont téléchargées à la demande. Le fichier [.easignore](../.easignore) reprend les exclusions de `.gitignore` et exclut aussi les modèles publics, les captures de diagnostic et, depuis le 23 octobre, `.git/`. Le dossier `artifacts/native/` est exclu par `.gitignore` et `.easignore` : les APK téléchargés ne sont ni versionnés ni renvoyés dans les sources des builds suivants. Les manifestes importés depuis `src/data` et le logo utilisé par l’application restent inclus.

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

Les builds `preview` incrémentent désormais automatiquement le numéro distant afin qu’une nouvelle version Android soit identifiée comme une mise à jour. Le nom Ippomed, le package et la clé de signature sont conservés.

La connexion et la liaison au projet sont réalisées. Le profil `preview` sélectionne explicitement l’environnement EAS `preview`. Les variables `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` sont configurées séparément dans `preview` et `production`. Leurs valeurs ont ensuite été relues et comparées aux valeurs attendues dans les deux environnements, sans les afficher.

Le premier [build Android preview](https://expo.dev/accounts/hikmamif/projects/medquiz/builds/9bd2f3a3-766c-41ce-88b8-7b6985c8deba), identifiant `9bd2f3a3-766c-41ce-88b8-7b6985c8deba`, a **réussi le 23 octobre 2026 à 22 h 12, heure de Paris** (`20:12:13.980Z`). Le bundling JavaScript et la compilation Gradle sont terminés. L’**[APK Android est disponible au téléchargement](https://expo.dev/artifacts/eas/_FzzRT9I_lFqAnkNMkxyx4ok3cmgGWAu2Oct-wMS4sw.apk)**. EAS a généré la clé de signature dans le cloud et signé le build Android. Aucune installation sur téléphone physique n’est encore validée et l’application n’est pas publiée sur Google Play.

Le contrôle Expo Doctor du build cloud compte **19 vérifications réussies sur 20**. Le seul échec concerne les cinq correctifs du SDK déjà documentés plus haut ; il n’a pas empêché la production de l’APK. Ces mises à jour et les essais sur appareil restent à traiter.

L’APK téléchargé se trouve dans `artifacts/native/ippomed-android-0.1.0-preview-1.apk` : **102 425 952 octets** (environ 102,4 Mo), SHA-256 `f952331fbe6577161d4335d62c0759a82873f2f6cea10dd9b1a829f89b07fd0e`. L’inspection confirme le manifeste binaire avec le package `fr.medquiz.app`, le DEX, le bytecode Hermes et le moteur anatomique DOM embarqué. Aucun GLB, OBJ ou ZIP n’est embarqué. Le bloc de signature APK v2 est présent et structurellement valide ; sa présence ne constitue pas une vérification cryptographique indépendante.

Les huit fichiers extraits (assets et manifeste, 9 690 367 octets) ont été contrôlés contre les trois secrets serveur connus : aucune détection. Les bibliothèques natives sont restées compressées et aucun contenu APK n’a été exécuté. La preuve privée est conservée dans `.local/eas-apk-audit/f952331fbe657716-e458551e/inspection.json`. Les deux tests de configuration mobile passent après la mise à jour des exclusions.

Pour un prochain build, vérifier d’abord le quota disponible, puis exécuter la commande depuis la racine du projet. Ce sous-processus PowerShell limite les variables de copie au seul lancement EAS :

```powershell
powershell -NoProfile -Command {
    $env:EAS_NO_VCS = "1"
    $env:EAS_PROJECT_ROOT = (Get-Location).Path
    npx.cmd eas-cli@latest build --platform android --profile preview --non-interactive --no-wait
}
```

`EAS_NO_VCS=1` évite le clone Git temporaire et son pack d’environ 396 Mo ; `EAS_PROJECT_ROOT` fixe explicitement la racine copiée. Les exclusions `.easignore` continuent de s’appliquer. Le contrôle de l’archive effective du 23 octobre compte **192 fichiers pour 7,46 Mo**, et l’archive compressée envoyée à EAS pèse environ **2,7 Mo**. Aucun `.git`, `.env`, `.local`, GLB ou OBJ n’y est présent. L’audit ne détecte aucun des trois secrets connus et les deux tests de configuration mobile passent. Ce mode retire les métadonnées de commit du build ; il ne modifie pas le dépôt Git local.

Les builds de production utilisent un profil séparé. La signature iPhone reste à préparer.

Pour préparer la signature iPhone, le propriétaire peut lancer cette commande dans son terminal et se connecter directement à Apple, sans partager d’identifiant secret ni de code de vérification dans le chat :

```sh
npx eas-cli@latest credentials:configure-build --platform ios --profile production
```

Une fois les signatures prêtes :

```sh
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest build --platform ios --profile production
```

Les variables publiques de connexion doivent être définies séparément dans chaque environnement EAS utilisé ; `preview` et `production` sont configurés ici, et `development` reste à renseigner s’il est utilisé. `.env` est volontairement exclu des envois. Ne pas utiliser une clé serveur ou un mot de passe de base de données dans une variable `EXPO_PUBLIC_*`. Les identifiants de signature et de soumission se gèrent via EAS et les consoles des stores, sans les ajouter au dépôt. Le [guide officiel EAS Build](https://docs.expo.dev/build/setup/) décrit l’association du projet et les signatures.

Le propriétaire confirme déjà disposer des comptes **Apple Developer et Google Play**. Leur accès depuis cette session et leur association aux consoles des stores restent à réaliser. Le contrôle du **21 octobre 2026** indiquait encore une session Expo/EAS déconnectée ; cet état historique est remplacé par la connexion et le premier build Android réussi du **23 octobre**. La connexion s’effectue par navigateur, sans mot de passe partagé dans le chat. Java et `adb` n’étaient pas disponibles dans le PATH de cette machine Windows au contrôle initial. Aucun achat ni dépôt sur un store n’a été exécuté. Aucun build iOS signé ni certificat Apple n’est validé ici. Un build iOS pour simulateur s’utilise sur un Mac ; Windows peut vérifier l’export JavaScript iOS mais ne peut pas exécuter le simulateur Apple.

## Budget et publication

Après le build du **28 octobre 2026**, le compte reste **Free** : **5/15 builds Android**, **0/15 iOS**, **5/30 au total**, avec coût estimé et dépassement à **0 centime**. Un seul APK a été construit pour cette évolution. Les modèles et l’archive publique du code sont exclus de l’envoi EAS ; les modèles se chargent depuis le site publié. Aucun abonnement payant n’a été activé.

Après le build du **26 octobre 2026**, le compte reste **Free** : **4/15 builds Android**, **0/15 iOS**, **4/30 au total**, avec estimation totale, abonnement et dépassement à **0 centime**. Un seul APK a été construit pendant cette étape ; aucune offre payante n’a été activée. Les contrôles datés ci-dessous décrivent les étapes précédentes.

Après le build du **25 octobre 2026**, le compte reste sur **Free** : **3/15 builds Android**, **0/15 iOS**, **3/30 au total**, avec coût estimé, abonnement et dépassement à **0 centime**. Aucun service payant n’a été activé. Le contrôle ci-dessous du 23 octobre décrit la première compilation.

Le compte `hikmamif` est confirmé sur le plan **[EAS Free](https://expo.dev/pricing)** au **23 octobre 2026**. Juste avant le lancement, la consommation vérifiée était de **0/15 builds Android** et **0/30 builds au total**. Le contrôle réalisé **après le build réussi** indique **1/15 builds Android**, **0/15 builds iOS** et **1/30 builds au total**. Le coût estimé reste **nul**, sans abonnement récurrent ni dépassement facturé. Le build a utilisé la file gratuite ; aucun forfait payant n’est activé. Vérifier le quota courant avant toute nouvelle construction :

```sh
npx eas-cli@latest account:usage hikmamif --json --non-interactive
```

Le plan Free bloque les nouvelles constructions au plafond. Le budget du projet reste fixé à **0 €** ; aucune montée en gamme ni construction payante n’a été activée.

Les inscriptions ordinaires aux stores ont leurs propres frais : [Google Play](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en) demande **25 USD une fois**, et l’[Apple Developer Program](https://developer.apple.com/programs/enroll/) **99 USD par an**, avec variations locales et éventuelles exonérations Apple pour les organismes éligibles. Ces montants sont fournis pour contexte ; les comptes existants du propriétaire doivent être utilisés, sans nouvel achat automatique.

Les abonnements actuels utilisent Stripe pour le web. **StoreKit et Google Play Billing ne sont pas encore intégrés** dans cette version native ; les achats réels restent désactivés. Les exports réussis ne valident donc pas encore un parcours d’achat dans les stores.

Les essais sur appareils, les signatures Apple, les accès App Store Connect/Play Console et la validation des parcours de compte et d’abonnement restent nécessaires avant une soumission. L’APK signé ne valide pas encore l’installation ou le fonctionnement sur téléphone. Les exports et le build Android réussi ne signifient pas que l’application est déjà publiée ou acceptée par Apple ou Google.
