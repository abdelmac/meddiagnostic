# Ippomed

Application de formation médicale en français et en anglais, construite avec Expo SDK 58, React Native, TypeScript et Expo Router pour web, iOS et Android.

L’identité violette et lime reprend l’[emblème fourni](public/brand/ippomed-emblem.png), sans texte. À l’accueil, **Anatomie et Spécialités sont présentées au même niveau**.

**Anatomie :** le **Corps complet**, ouvert par défaut depuis le 26 octobre, propose les **3 210 maillages disponibles de BodyParts3D 4.3** : 403 nerveux, 885 artériels, 602 veineux, 376 osseux/articulaires, 429 musculaires et 515 autres tissus. Les accès directs **Nerfs / Artères / Veines / Os** affichent les couches utiles et leurs formes sélectionnables. Un seul membre des 84 groupes de variantes osseuses apparaît à la fois. Le **Corps détaillé 3.0**, avec ses 934 modèles et **26,3 millions de triangles disponibles**, reste une référence séparée. Les détails des deux corps se chargent progressivement dans leur propre repère, sans mélanger leurs poses. Sept parcours accompagnent la révision de la première année à l’internat ; les **140 questions anatomiques bilingues**, dont 98 musculaires, restent accessibles. Voir [le support anatomie, les sources et ses limites](docs/ANATOMIE.md) et [la validation du 26 octobre](docs/VALIDATION-2026-10-26.md).

L’atlas dispose de sa propre page **`/anatomy`**, avec scène occupant l’espace disponible, panneaux de recherche/couches/fiches et commandes tactiles adaptées au portrait et au paysage. Les cours sont sur `/anatomy/courses` ; les quiz conservent l’année, le repère et l’objectif choisis. Le rendu naturel utilise des matières distinctes et un éclairage neutre ; la sélection garde la couleur du tissu avec un contour fin. Le moteur 3D est également embarqué dans le code Expo Android/iOS grâce à un composant DOM local, avec téléchargement des géométries depuis le CDN public. L’APK Android de test à jour, versionCode 4, a été compilé et contrôlé le 26 octobre 2026 sur EAS Free ; la signature iOS et les essais physiques restent à réaliser. Voir [MOBILE.md](docs/MOBILE.md) pour télécharger l’APK et préparer la publication.

La version du **25 octobre** améliore la netteté du corps entier au repos, ajoute des ombres de profondeur réglables, des coupes virtuelles axiale/sagittale/coronale avec curseur tactile et une dissection réversible. Le rendu et les clics respectent le même plan, et les détails sont chargés pour les structures conservées. Les géométries source restent inchangées ; les limites et les vérifications figurent dans [ANATOMIE.md](docs/ANATOMIE.md) et [la validation du 25 octobre](docs/VALIDATION-2026-10-25.md).

Publication statique gratuite sur Cloudflare Workers Static Assets : voir [le guide de déploiement](docs/HEBERGEMENT.md). Le sélecteur FR/EN conserve la progression ; les liens `/?lang=fr` et `/?lang=en` permettent de partager une langue précise.

**Application publique : https://medquiz-europe.medcompass-web.workers.dev**

La [page de connexion et d’inscription](https://medquiz-europe.medcompass-web.workers.dev/auth) dispose d’un parcours dédié FR/EN : Google, lien e-mail ou code quand le message en contient un, erreurs contextualisées, renvoi temporisé et retour à l’espace demandé. Le code saisi reste en mémoire ; la demande en cours peut être reprise après rechargement. Voir [l’état réel des fournisseurs et les éléments nécessaires à l’ouverture publique](docs/AUTHENTIFICATION.md).

**Livraison du 21 octobre 2026 :** 170 questions de démonstration bilingues (30 cliniques et 140 anatomiques), séries quotidiennes de révision avec semaine, record et paliers, comptes e-mail, gratuit limité à 3 sessions de 10 questions par jour, compétition à deux avec timer et classements par année, bibliothèque documentaire et 64 questions originales bilingues en brouillon. Les intégrations Google PKCE et Premium Stripe sont codées ; Google et les paiements restent désactivés faute d’identifiants de configuration. Les tarifs prévus restent **5 € par mois ou 25 € par an**. Le SMTP par défaut reste limité aux adresses invitées. Voir [les fonctionnalités et limites](docs/FONCTIONNALITES.md), [Google](GOOGLE-AUTH.md) et [Stripe](STRIPE.md). L’administration éditoriale et la validation médicale restent à organiser.

## Licence et code source

Le **code original d’Ippomed** est sous **CC BY-SA 4.0**, avec l’autorisation explicite du propriétaire du projet le 28 octobre 2026. Attribution : **Ippomed contributors**. Voir le [texte officiel intégral](LICENSE) et les [attributions, périmètres et exceptions](NOTICE.md).

Le [dépôt du projet](https://github.com/abdelmac/meddiagnostic) est déjà public. Le code exact de cette release est préparé pour être distribué dans [ippomed-source-2026-10-28.zip](https://medquiz-europe.medcompass-web.workers.dev/source/ippomed-source-2026-10-28.zip), avec une empreinte SHA-256 séparée lors du déploiement. L’archive et le nouvel atlas ne sont pas déclarés en ligne avant vérification de leur publication.

Les dépendances, médias, logos et modèles tiers conservent leurs droits et licences propres. Les notices des corpus BodyParts3D, notamment CC BY-SA 2.1 Japan lorsqu’elle s’applique, restent inchangées. La nouvelle adaptation Z-Anatomy est autorisée pour publication avec ses notices et exclusions prudentes ; elle contient 3 642 objets, dont 425 artériels et 230 veineux. Voir le [rapport neurovasculaire, ses vérifications et ses limites de provenance](docs/ANATOMIE-NEUROVASCULAIRE-2026-10-27.md).

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

Le QR code Expo permet d’ouvrir le projet depuis un appareil du même réseau ; la version d’Expo Go doit correspondre au SDK. Le mode invité fonctionne sans identifiant. Pour les comptes, copier `.env.example` vers `.env` et renseigner les valeurs publiques du projet Supabase (jamais la clé service-role). Les identifiants techniques `fr.medquiz.app` sont conservés dans l’APK de test ; leur disponibilité et leur association aux comptes des stores restent à confirmer avant la première publication.

## Vérification

```sh
npm run typecheck
npm test
npm run build:web
npm run test:e2e
npm run economics
npm run build:native
```

Les tests E2E utilisent Google Chrome installé, sur `127.0.0.1:8081`, avec un écran ordinateur et un écran mobile simulé dans Chromium. Ils servent l’export `dist` : reconstruire avant de tester des modifications UI. Pour une consultation locale de cet export : `npm run preview` puis ouvrir http://127.0.0.1:8081.

L’export JavaScript iOS/Android ne compile pas d’IPA/APK et ne prouve pas un fonctionnement sur appareil. Les contrôles VoiceOver/TalkBack et les essais physiques restent à réaliser.

## Ce qui fonctionne

- Accueil, spécialités, configuration courte du niveau, des matières et de l’objectif quotidien.
- Atlas anatomique 3D avec repli 2D, fiches musculaires et quiz filtrés par objectif, structure et année d’étude de 1 à 12.
- Sessions adaptées à la banque filtrée, sans doublon : dix questions maximum en gratuit ; toutes les questions compatibles peuvent être proposées avec des droits Premium actifs.
- Apprentissage avec correction immédiate et examen avec correction différée et chronomètre optionnel.
- Réponse unique, confiance, score, session reprenable et historique local.
- Explication du raisonnement et des distracteurs, indices, objectif pédagogique, encadré À retenir et liens de ressources pour relecture.
- Révisions espacées, carnet des dernières erreurs, favoris et marqueurs À revoir.
- Progression par thème, distinction questions nouvelles/répétées et bilan glissant de sept jours.
- Séries quotidiennes calculées selon les jours de Paris : activité de la semaine, record et paliers à 3, 7, 14, 30 et 100 jours ; réponses solo et duels, synchronisées pour les comptes.
- Mode sombre, texte agrandi, rôles d’accessibilité, interface adaptée aux grands et petits écrans.
- Export des données, suppression locale avec confirmation et signalements sauvegardés avec la progression. Les signalements ne sont pas encore traités par une administration éditoriale.
- Connexion bêta, import des résultats invités, caches séparés par compte et synchronisation sans doublons.
- Suppression du compte avec connexion récente, révocation des sessions et suppression des données distantes.

Les données sont stockées avec AsyncStorage (stockage navigateur sur le web), et synchronisées vers Supabase Paris pour les comptes connectés. Elles ne sont pas conçues pour conserver des données de santé : **ne pas entrer de données de patients**. La démo ne réalise aucun diagnostic personnalisé. Un signalement n’est pas transmis à un service médical opérationnel ; il est conservé dans la progression et l’export.

## Organisation

- `src/data/questions.ts` : catalogue de 170 questions de démonstration, dont 30 cas cliniques ; brouillons exclus des sessions.
- `src/data/anatomy-*.ts` et `muscle-*.ts` : 140 questions anatomiques, structures, cours et fiches d’origines, d’insertions, d’actions et d’innervation.
- `public/anatomy/bodyparts3d/` : surfaces GLB, crédits, licences et provenance ; `scripts/import-bodyparts3d.mjs` : import reproductible depuis les sources conservées hors publication.
- `public/anatomy/bodyparts3d-complete/` : aperçu du corps et détails progressifs de la même source 3.0 ; `scripts/import-bodyparts3d-complete.mjs` : récupération, conversion et vérification des 934 modèles.
- `src/domain/engine.ts` : logique pure de sessions, scores et révisions ; `types.ts` : contrats.
- `src/state.tsx` : chargement et file de sauvegarde locale.
- `src/ui/` : composants visuels et thèmes ; `app/` : navigation et parcours.
- `tests/` : moteur et modèle économique ; `e2e/` : parcours Chrome.
- `docs/` : décisions produit, algorithme, modèle économique, travail restant et validation.

Les données médicales sont séparées de l’interface et chaque tentative conserve un numéro de version. Les questions déjà utilisées gardent leur version afin que les anciennes tentatives conservent leur sens. Les versions de la banque compétitive sont stockées côté serveur, avec les corrigés privés jusqu’à la fin du match ; la migration ajoutant les 98 questions musculaires est appliquée. Les messages UI anglais sont regroupés dans `src/i18n/en.ts` et les traductions du catalogue dans `src/data/questions.en.ts` et les modules anatomiques bilingues. Les identifiants et positions des bonnes réponses sont identiques dans les deux langues.

Le nom produit est **Ippomed**. Les identifiants techniques `medquiz`, l’adresse publique et les clés de stockage existantes sont conservés pour assurer la compatibilité.

## Suite et publication

Lire [le périmètre et les décisions](docs/PRODUIT.md), [les règles de révision](docs/ALGORITHME-REVISION.md), [la préparation de production](docs/PRODUCTION.md) et [le bilan de validation](docs/VALIDATION.md).

État précis des comptes, restrictions e-mail, synchronisation et configuration du paiement de test : [COMPTES-PAIEMENTS.md](docs/COMPTES-PAIEMENTS.md).

Le Corps détaillé utilise uniquement BodyParts3D 3.0 (CC BY-SA 2.1 Japon), avec un aperçu léger et les détails issus de la même géométrie. L’Atlas étendu utilise séparément BodyParts3D 4.0 (CC BY 4.0), un supplément nerveux 4.3 et 31 inspections isolées 3.0 (CC BY-SA 2.1 Japon). Les poses des versions ne sont pas superposées. Les modèles et notices restent disponibles sous leurs licences respectives. Les schémas de quiz restent simplifiés ; les corpus 3D sont incomplets et leur nomenclature française partielle. Le contenu attend une relecture médicale identifiée. Aucun asset de Complete Anatomy n’est embarqué. Aucun achat réel n’est activé.
