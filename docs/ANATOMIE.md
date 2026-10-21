# Anatomie : atlas pédagogique, cours et quiz illustrés

L’espace **Anatomie** d’Ippomed et l’espace **Spécialités** sont accessibles au même niveau sur l’accueil. L’anatomie regroupe deux références 3D BodyParts3D distinctes, sept parcours de cours et **140 questions originales en français et en anglais**, dont 98 questions musculaires.

## Explorer le corps

Le mode **Corps détaillé**, sélectionné par défaut, affiche **934 modèles anatomiques de BodyParts3D 3.0**, rendus en WebGL avec Three.js. Le corps entier et ses détails proviennent d’une même référence spatiale. Les géométries détaillées se chargent à la demande au zoom, au cadrage d’une structure et à l’exploration d’une région, puis remplacent l’aperçu du même élément dans son contexte. La transition conserve sa transformation ; elle ne recale pas une autre version du corps.

Le survol nomme la surface rencontrée et le clic sélectionne le modèle physique correspondant. Le corps détaillé conserve les identifiants **FMA** ou **BP** exacts de sa source, y compris les suffixes présents dans les tables officielles. Les 36 repères pédagogiques existants gardent leurs identifiants de cours et de quiz, avec une correspondance vers les modèles réellement disponibles : le biceps, par exemple, rassemble ses chefs droits et gauches. Le droit de l’abdomen est désormais représenté par ses deux côtés, `FMA13377` et `FMA13378`.

Les couches muscles, nerfs, squelette, organes et vaisseaux peuvent être combinées pour explorer leurs rapports. Rotation, déplacement, zoom, vues de face et de dos, cadrage de la sélection, isolation, opacité et masquage d’une structure permettent de dégager une région. Des raccourcis cadrent la tête et le cou, le thorax, l’abdomen et le bassin, les membres supérieurs ou inférieurs. Ces cadrages dérivent des limites du modèle ; ils ne créent pas de nouveaux repères anatomiques. La peau, les cheveux, les poils, les sourcils et l’aponévrose épicrânienne restent sélectionnables mais sont masqués par défaut pour dégager les structures internes. La liste et la recherche complètent le clic dans la scène.

Les sept groupes musculaires disposent de fiches d’origines, d’insertions, d’actions et d’innervation. On peut lancer un quiz ciblé sur le repère et l’objectif consultés. Les schémas 2D des repères pédagogiques restent disponibles, notamment lorsque WebGL est indisponible ; ils ne couvrent pas tous les modèles des deux catalogues.

### Géométrie et chargement du corps détaillé

| Représentation 3.0             |  Triangles | Fichiers GLB | Taille totale |
| ------------------------------ | ---------: | -----------: | ------------: |
| Aperçu par systèmes            |  3 302 522 |           10 |   38,2548 Mio |
| Détails d’origine, par élément | 26 317 506 |          934 |  187,7310 Mio |

Ces **944 fichiers totalisent 225,99 Mio** ; ils ne sont pas tous téléchargés à l’ouverture. Les couches et les détails se chargent selon les besoins. Le fichier le plus volumineux mesure **14,51 Mio**, sous la limite de 25 Mio de l’hébergement. Le premier chargement d’une couche peut prendre du temps sur une connexion lente. Les compteurs décrivent ce corpus, pas une couverture exhaustive de l’anatomie.

Pour rendre les gros plans plus lisibles, le corps détaillé relève sa résolution jusqu’à un DPR de 2 après 220 ms d’immobilité, lorsque le champ vertical représente moins de 82 % de la hauteur du corps. Le rendu revient à sa résolution légère pendant les gestes et en vue entière. Le tampon est plafonné à 1,5 million de pixels sur les appareils détectés comme mobiles ou peu puissants, et à 3 millions sur les autres. Cette adaptation est déclenchée par les interactions et un délai unique ; elle n’ajoute pas de boucle de rendu continue. L’Atlas étendu conserve ses propres limites de résolution.

Les cinq systèmes regroupent 437 modèles musculaires, 251 modèles du squelette et des articulations, 99 modèles nerveux, 56 modèles vasculaires et 91 organes ou autres structures. Les noms et relations viennent des tables officielles 3.0. Les 935 entrées du ZIP comprennent un répertoire et **934 OBJ réels**.

La variante source « 95 % » désigne un **taux de réduction des polygones**, et non un pourcentage de fidélité anatomique. La conversion HD conserve ses **26 317 506 triangles et 16 189 200 sommets**, sans décimation supplémentaire, subdivision ou création de détails. Elle convertit les axes et les millimètres en mètres, avec Y vers le haut, l’avant vers +Z et le sol à Y = 0. Le réordonnancement des sommets et des triangles conserve la topologie et leur orientation.

Les positions HD utilisent une grille uniforme de 16 bits par élément lorsque sa précision le permet ; la peau conserve des positions flottantes. Les normales fournies par la source sont normalisées puis encodées sur 16 bits signés. Cette quantification est une approximation bornée, suivie d’une compression Meshopt sans perte supplémentaire. Les plafonds sont **0,02 mm d’erreur vectorielle de position et 1° d’erreur angulaire de normale** ; les maxima mesurés sur l’export sont **0,007934 mm et 0,001503°**. L’aperçu seul est simplifié avec MeshoptSimplifier, à partir de ces mêmes géométries, avec bords verrouillés et une limite d’erreur d’apparence estimée de **0,5 mm**. Cette estimation n’est pas une garantie de précision médicale. Aperçu et détail conservent la même transformation uniforme par élément pour permettre leur remplacement dans la scène.

### Atlas étendu et détails HD isolés

Le sélecteur **Atlas étendu** ouvre une référence distincte : **2 320 maillages sélectionnables et 6 409 428 triangles**, répartis entre les cinq systèmes. La base provient des archives officielles ISA et PART-OF de BodyParts3D 4.0 ; un supplément séparé de 240 maillages neuraux de la version 4.3 apporte notamment des nerfs périphériques et des éléments du plexus brachial. Les éléments physiques communs sont dédupliqués. Leurs identifiants associent le concept FMA et l’élément FJ, pour distinguer les côtés et les composants.

Ce corps reste distribué dans **10 GLB, pour 95,01 Mio**, sans décimation supplémentaire des sources sélectionnées. Ces archives 4.0 sont les variantes déjà réduites « 99 % ». L’atlas étendu offre davantage de petites branches nerveuses et vasculaires ; le corps détaillé privilégie des géométries plus fines dans une référence 3.0 cohérente. **Les deux références ne sont jamais superposées ou mélangées.**

Dans l’atlas étendu, le bouton **Détail HD** conserve l’inspection séparée de **31 surfaces musculaires BodyParts3D 3.0, variante « 95 % »** : les deux côtés du biceps, du triceps, du deltoïde, du grand pectoral et du quadriceps, ainsi que le diaphragme. Le bouton est disponible pour une surface possédant un détail, ou pour un groupe dont tous les composants disposent de leur détail.

Cette vue masque entièrement le corps étendu et cadre les seuls modèles HD sélectionnés. Les coordonnées et formes des versions 3.0 et 4.0 diffèrent : **les versions ne sont ni superposées ni recalées**. Pour étudier des détails 3.0 dans les rapports de leur propre corps, on choisit le mode Corps détaillé.

Ces anciennes inspections ajoutent **31 GLB, 1 454 864 triangles et 18,75 Mio** au corpus étendu, avec un maximum de 2,38 Mio par fichier. Elles ont leurs identifiants compatibles, leurs normales source et leurs propres crédits. Leur préparation conserve la géométrie source, avec conversion des unités et des axes, sans recalage ni décimation supplémentaire. Ces fichiers sont distincts des 934 détails du nouveau corps.

La nomenclature française est **partielle**. Les noms reconnus sont traduits ; les autres restent dans leur langue source, en anglais, avec une indication dans l’interface. Les fiches et références détaillées concernent surtout les repères pédagogiques existants ; les autres surfaces disposent de leur nom source et de leur identification anatomique.

Neuf repères pédagogiques n’ont pas de maillage correspondant dans le **corps détaillé 3.0** : les nerfs médian, ulnaire, radial, sciatique, fémoral et tibial, le plexus brachial, la moelle spinale et l’artère fémorale. Le canal central de la moelle est présent, mais **un canal ne représente pas le tissu de la moelle** et ne lui est pas substitué. L’atlas étendu représente certains de ces repères ; il reste dépourvu du droit de l’abdomen et des nerfs sciatique, fémoral et tibial. Les cours et questions illustrées des repères absents restent accessibles.

Les atlas ne fournissent pas une couverture exhaustive de l’anatomie. Ils représentent des modèles de référence masculins adultes, sans toutes les variations individuelles. Les textes, traductions et correspondances pédagogiques attendent une relecture médicale identifiée ; cet outil de formation ne permet pas de préparer ou de guider un geste médical.

## Cours par niveau

Sept parcours : les années 1 à 6, puis un parcours avancé pour l’internat (années 7 à 12). Le niveau est un repère de révision adaptable aux études de chaque pays, pas une équivalence officielle de programme. Chaque parcours présente ses objectifs, ses notions, des structures à explorer et des questions pour s’entraîner. Les cours et la consultation du corps ne consomment pas de session de quiz.

## Questions avec schémas

La banque anatomique comprend les 42 questions de repérage initiales et **98 questions musculaires**, soit 140 questions. Les sept groupes étudiés sont le biceps brachial, le triceps brachial, le deltoïde, le grand pectoral, le droit de l’abdomen, le quadriceps fémoral et le diaphragme. Chaque groupe possède quatorze exercices couvrant ses attaches, ses actions, son innervation et des points plus précis sur ses chefs, ses rapports ou sa mécanique.

Les questions utilisent des schémas 2D avec un repère A, distincts de la scène d’exploration 3D. Lors des questions de repérage, la figure masque le nom de la structure ciblée ; les exercices sur les attaches ou la fonction peuvent annoncer le muscle étudié sans dévoiler la réponse. Le corrigé affiche la légende et l’explication. Les chefs, insertions fines et petits reliefs ne sont pas représentés à l’échelle. Les identifiants, versions et positions des bonnes réponses sont conservés lors d’un changement FR/EN.

Le configurateur permet de choisir Anatomie, le type « Schéma anatomique », une année de 1 à 12 et un objectif : origines, insertions, actions, innervation ou identification. Depuis l’atlas, une structure peut également être présélectionnée, puis le filtre élargi. Les questions fondamentales restent accessibles tout au long des études ; des questions intermédiaires et avancées complètent les niveaux ultérieurs. La longueur s’adapte au stock filtré sans répétition. Les quotas existants s’appliquent aux nouvelles sessions ; reprendre une session ne consomme pas de crédit supplémentaire.

La compétition utilise aussi les diagrammes dans une banque mixte avec les 30 cas cliniques, soit **170 questions de démonstration** au total. Le serveur filtre selon l’année des joueurs, garde le corrigé privé jusqu’à la fin et vérifie les réponses et le timer. Les 98 questions musculaires ont été ajoutées à la banque privée par une migration Supabase appliquée.

## Sources

Le **corps détaillé BodyParts3D 3.0** est distribué sous **Creative Commons Attribution-ShareAlike 2.1 Japan**, conformément au [README officiel de la version 3.0](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/README_e.html). Attribution : « BodyParts3D, Copyright(C) 2010-2011 The Database Center for Life Science licensed under CC Attribution-ShareAlike 2.1 Japan ». Les fichiers d’aperçu et les détails conservent cette licence après adaptation. Leurs [crédits publics](../public/anatomy/bodyparts3d-complete/ATTRIBUTION.txt), leur [provenance](../public/anatomy/bodyparts3d-complete/provenance.json) et leur [manifeste](../public/anatomy/bodyparts3d-complete/manifest.json) identifient les sources, les transformations et les fichiers produits. Les OBJ originaux sont vérifiés par CRC et SHA-256 ; chaque GLB possède sa somme SHA-256.

Pour reproduire ce corps à partir des sources officielles :

```sh
node scripts/import-bodyparts3d-complete.mjs
```

Le script [import-bodyparts3d-complete.mjs](../scripts/import-bodyparts3d-complete.mjs) lit l’index ZIP officiel, récupère les 934 OBJ par requêtes HTTP partielles et réutilise les fichiers valides de `.local/bodyparts3d-3.0-95/objs`. Il télécharge également les tables de noms, de relations et de composites de cette même version. Le corpus source représente environ 522 Mio compressés et 1,83 Gio d’OBJ bruts ; le fichier ZIP complet n’est pas enregistré. La conversion reproduit la normalisation commune, la quantification bornée, les aperçus simplifiés et les détails non décimés. Les OBJ restent hors du dossier public. Les deux niveaux de détail restent issus exclusivement de la version 3.0.

Les géométries de la base **BodyParts3D 4.0** sont distribuées sous **Creative Commons Attribution 4.0 International**, selon la [licence officielle de l’archive](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html). Attribution : « BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International ».

Le supplément **BodyParts3D 4.3** est distribué séparément dans `nerves-peripheral.glb`, sous **Creative Commons Attribution-ShareAlike 2.1 Japan**. Il conserve cette licence après conversion. Les [conditions du site source](https://lifesciencedb.jp/bp3d/info_en/license/index.html) et le [miroir de distribution épinglé](https://github.com/olivercase/body_parts_3d_api/tree/fd527e6f4daf732fd814314d9257df5877b844bc) sont référencés dans les crédits ; les fichiers 4.0 et le supplément 4.3 conservent des notices distinctes.

Les **31 anciens détails HD isolés BodyParts3D 3.0** sont également distribués sous **Creative Commons Attribution-ShareAlike 2.1 Japan**, conformément au même README 3.0. Les fichiers `details/*.glb` possèdent une [notice propre](../public/anatomy/bodyparts3d/details/LICENSE.txt) et une [provenance distincte](../public/anatomy/bodyparts3d/details/provenance.json), qui identifient chaque concept source, son entrée ZIP, son CRC et sa somme SHA-256. Ils restent sous cette licence après adaptation.

Les [crédits publics de l’atlas étendu](../public/anatomy/bodyparts3d/ATTRIBUTION.txt), sa [provenance](../public/anatomy/bodyparts3d/provenance.json) et son [manifeste](../public/anatomy/bodyparts3d/manifest.json) accompagnent ses assets. À partir des caches de sources officielles, sa reproduction et celle de ses inspections isolées s’effectuent dans cet ordre :

```sh
node scripts/import-bodyparts3d.mjs
node scripts/import-bodyparts3d-details.mjs
```

Le premier script reproduit la sélection, la déduplication, la conversion des coordonnées, le calcul des normales et l’export GLB du corps étendu. Le second lit l’index ZIP distant puis récupère uniquement les entrées des muscles concernés par des requêtes HTTP partielles, vérifie leur intégrité et génère les inspections isolées. Il réutilise les OBJ valides du cache et conserve les normales d’origine. Les scripts sont disponibles dans [import-bodyparts3d.mjs](../scripts/import-bodyparts3d.mjs) et [import-bodyparts3d-details.mjs](../scripts/import-bodyparts3d-details.mjs). Les OBJ bruts restent hors du dossier public. La notice [MIT de Meshoptimizer](../public/licenses/meshoptimizer-MIT.txt) accompagne le décodeur embarqué.

Les références des repères pédagogiques et des questions renvoient aux chapitres d’Anatomy & Physiology adaptés par [Oregon State University](https://open.oregonstate.education/anatomy2e/), aux ressources [OpenStax](https://openstax.org/details/books/anatomy-and-physiology-2e) et à [NCBI Bookshelf](https://www.ncbi.nlm.nih.gov/books/), notamment pour les attaches musculaires, l’innervation et les rapports. Les faits anatomiques sont reformulés ; les sources ne cautionnent pas Ippomed et leur présence ne remplace pas une relecture du contenu produit. Le contrôle HTTP direct des pages Oregon State reçoit un refus CloudFront dans notre environnement ; les liens ont été vérifiés dans le sommaire du livre et les chapitres accessibles via l’outil de navigation.
