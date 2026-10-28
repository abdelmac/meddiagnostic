# Validation Ippomed — 28 octobre 2026

L’[atlas neurovasculaire est publié](https://medquiz-europe.medcompass-web.workers.dev/anatomy?lang=fr). La première version Cloudflare vérifiée est `de921958-b2b4-4f97-b70b-3edb06d379be`. Les références BodyParts3D 4.3 et 3.0 restent accessibles séparément ; leurs géométries ne sont pas superposées à celles du nouveau corpus.

## Corpus et précision de conversion

Le nouvel atlas contient **3 642 objets source** : 680 du système squelettique/articulaire, 1 374 du système musculaire et des insertions, 526 autres organes, tissus ou surfaces, 390 nerveux/sensoriels et 672 cardiovasculaires. Les compteurs ne désignent pas autant de structures anatomiques uniques.

Les classifications contrôlées distinguent **425 objets artériels, 230 veineux et 17 autres cardiovasculaires**. Le groupe nerveux/sensoriel comprend **251 objets avec preuve de nerf ou branche**, 91 structures centrales et 48 éléments sensoriels ou associés. Les deux plexus choroïdes restent dans le système nerveux, sans étiquette d’artère fondée sur leur couleur.

Les **10 571 764 triangles HIGH** correspondent aux triangles évalués de la source, après les transformations déclarées. L’aperçu contient 2 689 783 triangles. Les positions restent dans un repère mondial commun ; les côtés gauche et droit gardent leur identité. L’erreur maximale mesurée de quantification est de **0,01038 mm** en position et **0,00150°** pour les normales. Il s’agit d’erreurs d’encodage, sans certification de précision anatomique. Les 230 normales nulles de dix objets ont été dérivées de leurs triangles incidents ; aucun trajet ni diamètre n’a été ajouté.

Les exclusions, les sources épinglées et les licences sont détaillées dans [le rapport anatomique](ANATOMIE-NEUROVASCULAIRE-2026-10-27.md). Les microbranches, capillaires et variantes anatomiques ne sont pas exhaustifs.

## Vérifications effectuées

- TypeScript, audit français/anglais et **128 tests automatiques** réussis.
- **28 scénarios navigateur locaux distincts** validés sur ordinateur et mobile émulé : 24 parcours existants et quatre nouveaux parcours neurovasculaires. Deux fixtures 2D ont été corrigées pour fixer explicitement la vue de face avant leurs clics ; leurs relances passent.
- **Quatre scénarios sur le site public** réussis : sélection réelle des sciatiques, fémoraux et tibiaux des deux côtés, chargement HIGH, filtres artères/veines, contexte osseux et changement entre les trois références. Les douze sélections souris/tactiles enregistrent un point 3D sur la surface réelle.
- **3 649 GLB publics** téléchargés : HTTP 200, tailles et SHA-256 conformes. Le manifeste publié conserve le SHA-256 `42ddef0f0ecb3afa60c1b402dbbb25edd88240682c954a6d4cc9d62f336edfd3`.
- Archive du code, licence officielle et anciennes notices BodyParts3D vérifiées en ligne. L’empreinte de l’[archive de cette release](https://medquiz-europe.medcompass-web.workers.dev/source/ippomed-source-2026-10-28.zip) est fournie dans son fichier `.sha256` séparé.
- Audit des artefacts web et des exports Android/iOS : aucun des trois secrets serveur connus détecté. Cette comparaison ne constitue pas un audit de sécurité général.

Les rapports détaillés sont conservés dans `.local/z-anatomy-source/validation-report.json`, `.local/neurovascular-release/public-validation.json` et `.local/z-anatomy-review/`. Aucun contenu APK n’est exécuté par ces contrôles.

## Licence et mobile

Le propriétaire a explicitement autorisé le 28 octobre l’application de **CC BY-SA 4.0 au code propre d’Ippomed** et la publication de l’atlas. Le texte officiel est dans [LICENSE](../LICENSE), avec les [attributions et exceptions](../NOTICE.md). Les licences des bibliothèques, logos et autres ressources restent distinctes.

Les exports finaux **Android et iOS** ont réussi. Le [build Android versionCode 5](https://expo.dev/accounts/hikmamif/projects/medquiz/builds/314f49d1-73c0-40dd-9a4a-0d77ca0b1d25) a **réussi le 28 octobre à 0 h 27, heure de Paris**, sur EAS Free. [Télécharger l’APK](https://expo.dev/artifacts/eas/jzPjMjTKjj0U0AhDI9YoK8V5vWgMMrG8K8LfDO-eEtk.apk).

L’APK téléchargé pèse **105 995 908 octets**, SHA-256 `dc4a419ae5833222038965c20ac5c75714f9a8aee93b49fbe7a3dbd10272b324`. Le package `fr.medquiz.app`, le DEX, Hermes et le moteur DOM sont présents ; les **3 642 identifiants** de l’atlas et les six nerfs des jambes des deux côtés sont retrouvés. Aucun GLB/OBJ/ZIP embarqué et aucun des trois secrets connus dans les huit fichiers extraits. Le bloc de signature v2 est structurellement valide, sans vérification cryptographique indépendante. Preuve : `.local/native-apk5-validation-2026-10-28.json`.

Après compilation, le quota vérifié indique **5/15 builds Android**, **0/15 iOS**, **5/30 au total** et **0 centime** estimé ou en dépassement. Aucun forfait payant n’a été activé.

Les essais navigateur mobile sont émulés. Aucune installation sur téléphone physique, soumission aux stores ou signature Apple n’est validée dans cette étape.
