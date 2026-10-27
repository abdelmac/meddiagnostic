# Atlas neurovasculaire — revue du 27 octobre 2026

Cette évolution prépare un atlas humain plus détaillé pour Ippomed, avec des structures bilatérales réellement présentes dans les données 3D. Les modèles ont d’abord été validés dans `.local/z-anatomy-preview-assets/`. Le 28 octobre, le propriétaire du projet a explicitement autorisé l’application de CC BY-SA 4.0 au code original d’Ippomed et la publication de cet atlas. Le déploiement reste une étape distincte : aucune disponibilité de ce nouveau corpus dans le cloud ou les applications distribuées n’est encore attestée par ce rapport.

## Ce qui est ajouté

Le corpus retenu contient **3 642 objets source**, dont **425 objets artériels** et **230 objets veineux** classés d’après les matériaux et collections officiels, avec une appartenance obligatoire au système cardiovasculaire. Le groupe cardiovasculaire contient aussi 17 autres structures, soit 672 objets au total. L’atlas contient notamment les nerfs sciatiques, fémoraux, tibiaux, fibulaires communs, saphènes, suraux et obturateurs des deux côtés. Les trajets et les profils des courbes viennent du modèle source : aucun parcours nerveux ou diamètre vasculaire n’est inventé.

**Correction de classification du 28 octobre :** les deux plexus choroïdes utilisent le matériau source `Artery`, mais appartiennent au système nerveux central. Ils restent dans le groupe nerveux, sans indicateur d’artère. La preuve de palette est conservée pour la traçabilité ; elle ne suffit pas à transformer un tissu hors du système cardiovasculaire en artère ou veine. Cette correction de métadonnées ne change ni le nombre d’objets ni leur géométrie.

Ces nombres comptent des objets 3D. Certains représentent une branche, un ensemble de branches, un territoire, une insertion musculaire ou une portion de tissu. Ils ne désignent pas autant de nerfs ou vaisseaux distincts. Le groupe d’affichage du système nerveux comprend aussi des organes sensoriels. La revue distingue **251 objets avec preuve de nerf ou branche** et **91 structures centrales conservées** ; elle ne transforme pas tous les objets de ce groupe en nerfs.

Ce corpus n’inclut pas chaque terminaison nerveuse, capillaire, variante anatomique ou réseau microscopique humain. Il complète l’atlas existant sans prétendre atteindre cette exhaustivité. L’ancien corpus BodyParts3D reste une référence distincte ; ses coordonnées ne sont pas superposées à Z-Anatomy sans recalage démontré.

## Source et transformations

Les données proviennent du dépôt [officiel Z-Anatomy](https://github.com/Z-Anatomy/Models-of-human-anatomy/tree/caf0f6078f2a0ac9e65e81dce042d5a30b65d0f0), au commit `caf0f6078f2a0ac9e65e81dce042d5a30b65d0f0`. L’archive originale de 86 734 957 octets a été contrôlée par son identifiant Git et son SHA-256. Le fichier `Z-Anatomy/Startup.blend` a pour SHA-256 `9f08a17ea0115fed80b2a73ecdf0a1bc2ab2f6956f37c593ce23d513ea35afcd`.

Blender est lancé avec l’exécution automatique désactivée. Aucun module de l’application Z-Anatomy, script embarqué, article Wikipédia, définition ou traduction de son interface n’est exécuté ou importé. Les noms originaux des objets et les métadonnées nécessaires à leur identification et à leur revue sont conservés.

Tous les systèmes utilisent les mêmes coordonnées mondiales en mètres. Une seule rotation convertit `(x, y, z)` de Blender en `(x, z, -y)` pour le lecteur. Chaque objet garde son identité et sa transformation propre : les côtés gauche et droit partagent parfois un même datablock, ce qui interdit de les fusionner simplement par nom de maillage. Les transformations réfléchies reçoivent une correction du sens des triangles.

Le niveau **HIGH** conserve tous les triangles évalués de la source. Les seules opérations prévues sont la fusion des sommets aux positions et normales strictement identiques, le réordonnancement et la compression. La quantification est bornée à 0,02 mm pour les positions et à 1° pour les normales ; les positions restent en flottants lorsque la grille de 16 bits dépasserait cette borne. L’aperçu seul est simplifié, avec une erreur d’apparence estimée maximale de 0,5 mm. Cette estimation d’affichage ne constitue pas une précision médicale certifiée.

La source contient 230 normales exactement nulles sur dix objets. Leur correction d’éclairage est dérivée uniquement des triangles incidents déjà présents. Les positions, les indices et toutes les normales initialement valides restent inchangés. Chaque correction et chaque empreinte des données brutes sont consignées dans la provenance du pack.

## Éléments écartés

| Décision                                      | Objets physiques | Motif                                                                                                              |
| --------------------------------------------- | ---------------: | ------------------------------------------------------------------------------------------------------------------ |
| Provenance cérébrale incertaine               |              174 | Matériaux `Brain`, `Brain-Inner` ou `White matter`, y compris les objets à matériaux mixtes                        |
| Famille rénale conservativement écartée       |               10 | Reins, pelvis, uretères et vaisseaux intrarénaux ; correspondance exacte avec la contribution tierce non démontrée |
| Oreille et éléments nerveux associés à revoir |               22 | Contribution d’oreille sous condition non commerciale et périmètre exact incertain                                 |
| Guides, annotations ou éléments techniques    |               59 | Flèches, titres en maillage, profils et objets sans système anatomique validé                                      |

Les 206 exclusions de licence/provenance constituent une mesure prudente. Elles n’affirment pas que chaque objet exclu est juridiquement une adaptation de la contribution tierce concernée. Les collections sémantiques peuvent aussi relier un nerf à ses muscles innervés : cette relation n’est pas utilisée pour classer ces muscles comme des nerfs ou pour leur attribuer automatiquement une licence tierce.

Les reins sont volontairement absents de ce pack. Une structure voisine n’est pas utilisée pour masquer une absence : la dure-mère, par exemple, ne remplace pas un vrai modèle de moelle épinière. Les raccourcis du lecteur ne reçoivent une correspondance que si un objet source admissible existe.

Les 60 surfaces à une face du groupe officiel des articulations sont conservées : elles comprennent de vrais plans ligamentaires de la source. À l’inverse, le guide `Visceral systems.g`, un titre planaire déporté hors du corps, est exclu. Aucun compteur n’est augmenté avec des étiquettes FONT, des points de repère sans surface ou des groupes vides. L’objet dont le nom source est inconnu reçoit une désignation neutre et ne devient pas une structure anatomique inventée.

## Licences et publication

La [licence épinglée de Z-Anatomy](https://github.com/Z-Anatomy/Models-of-human-anatomy/blob/caf0f6078f2a0ac9e65e81dce042d5a30b65d0f0/License.txt) déclare le corpus général sous CC BY-SA 4.0 et crédite son ancien socle BodyParts3D sous CC BY-SA 2.1 Japan. Elle mentionne aussi des exceptions : modèle d’oreille de Dundee sous CC BY-NC-SA 4.0, modèle de rein de Lissie Cowley sous CC BY-NC 4.0 et contributions cérébrales sans licence précisée. Ces mentions ne sont pas remplacées par la licence générale.

La [page originale de l’oreille de Dundee](https://sketchfab.com/3d-models/anatomy-of-the-inner-ear-f80bda64666c4b8aaac8f63b7b82a0a0) décrit notamment le tympan, des osselets et des éléments nerveux. Retirer seulement deux cochlées, deux vestibules et deux reins ne démontre donc pas l’élimination de toutes les contributions soumises à une restriction non commerciale. Les objets restants ne sont pas présentés ici comme bénéficiant d’une garantie globale d’usage commercial.

L’auteur de Z-Anatomy indique dans [la discussion du 23 octobre 2026](https://github.com/Z-Anatomy/Models-of-human-anatomy/issues/13) que le code d’une application lisant le modèle doit être partagé, même dans l’hypothèse d’un pack séparé. Il y précise aussi ne pas disposer d’informations supplémentaires permettant d’identifier exactement certaines contributions tierces. Le [guide de licence de l’auteur](https://docs.google.com/document/d/1peWW_7IiVgTTAwcI_auv38YSJ6qGWRuTMxzzhkRpXIk/edit) associe son exigence de partage aux œuvres dérivées ; des [réponses antérieures](https://github.com/Z-Anatomy/Models-of-human-anatomy/issues/8) mentionnent aussi la même licence pour l’application. Cette position et le périmètre de licence du code doivent être distingués des licences des fichiers 3D.

Le dépôt [abdelmac/meddiagnostic](https://github.com/abdelmac/meddiagnostic) est déjà public, d’après la vérification du connecteur GitHub effectuée pendant ce travail. Le propriétaire a autorisé le 28 octobre l’application de **CC BY-SA 4.0 au code original d’Ippomed**, attribué à **Ippomed contributors**. Le [fichier LICENSE](../LICENSE) contient le texte officiel non modifié ; [NOTICE.md](../NOTICE.md) distingue le code des dépendances, médias, logos et modèles tiers dont les conditions restent inchangées. L’archive exacte du code de cette release est préparée pour être publiée à [cette adresse stable](https://medquiz-europe.medcompass-web.workers.dev/source/ippomed-source-2026-10-28.zip), avec son empreinte séparée. La visibilité antérieure du dépôt et l’autorisation explicite de licence sont deux faits distincts.

Le pack de release porte le statut `approved` après l’accord explicite du propriétaire. Ses notices conservent les licences et crédits amont, les 206 exclusions de provenance et l’absence de garantie globale sur les composants tiers. Les anciennes décisions de revue privée restent des instantanés de provenance, distincts de cette autorisation ultérieure. L’application de CC BY-SA 4.0 au code original et la publication approuvée du pack ne changent aucune licence de tiers. La mise en ligne effective doit encore être vérifiée après déploiement.

## Vérification reproductible

Exécuter, après la conversion contrôlée des données source :

```sh
node scripts/verify-z-anatomy.mjs
```

Le script écrit `.local/z-anatomy-source/validation-report.json`. Il contrôle les identités stables dérivées du nom source exact, la liste autorisée, les exclusions, les classifications, les structures bilatérales, les empreintes des fichiers et des tableaux bruts, les coordonnées mondiales communes, le décodage Meshopt, les indices, les normales et les triangles HIGH comparés aux triangles source orientés après quantification déclarée. Il vérifie également que les 230 corrections de normales restent documentées sur dix objets et qu’aucun identifiant FMA n’a été inféré.

Ce contrôle est un audit local volontaire ; il n’impose pas de télécharger les données de travail pour exécuter la CI ordinaire. Le code de sortie 2 signifie que les fichiers de préparation ne sont pas encore prêts, le code 1 indique une divergence et le code 0 signifie que les vérifications ont réussi.

**Résultat de l’audit final du 28 octobre : réussi, code de sortie 0.** Les 3 649 fichiers GLB ont été décodés et contrôlés, avec le statut de release `approved`, la licence de code CC BY-SA 4.0 et la classification corrigée. Les **10 571 764 triangles HIGH** correspondent au multiensemble des triangles source orientés après la quantification déclarée ; l’aperçu contient **2 689 783 triangles**. L’audit contrôle également l’absence de fichiers GLB périmés non référencés dans le dossier de préparation.

L’écart maximal de quantification mesuré est de **0,01038 mm** pour les positions et de **0,00150°** pour les normales. Les 230 corrections de normales sont documentées sur dix objets ; toutes les normales source initialement valides restent inchangées avant quantification. Les comptes de classification sont vérifiés : 251 objets avec preuve de nerf ou branche, 91 structures centrales et 48 objets sensoriels ou associés composent les 390 objets du groupe d’affichage nerveux.

Le manifeste complet approuvé et contrôlé a pour SHA-256 `42ddef0f0ecb3afa60c1b402dbbb25edd88240682c954a6d4cc9d62f336edfd3`. Les 425 objets artériels et 230 objets veineux sont tous dans le groupe cardiovasculaire ; les deux plexus choroïdes restent dans le système nerveux central sans indicateur vasculaire. Le rapport machine local conserve les empreintes de chaque fichier et les mesures détaillées. Cet audit ne constitue ni une vérification de déploiement ni une garantie globale sur les composants tiers ; leurs licences et limites de provenance restent celles indiquées ci-dessus.
