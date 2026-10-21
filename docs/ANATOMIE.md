# Anatomie : atlas pédagogique, cours et quiz illustrés

L’espace **Anatomie** d’Ippomed et l’espace **Spécialités** sont accessibles au même niveau sur l’accueil. L’anatomie regroupe un atlas 3D BodyParts3D, sept parcours de cours et **140 questions originales en français et en anglais**, dont 98 questions musculaires.

## Explorer le corps

L’atlas web affiche les **géométries anatomiques de BodyParts3D**, rendues en WebGL avec Three.js : **2 320 maillages sélectionnables et 6 409 428 triangles**, répartis entre muscles, nerfs, squelette, organes et vaisseaux. La base provient des archives officielles ISA et PART-OF de BodyParts3D 4.0 ; un supplément de 240 maillages neuraux de la version 4.3 apporte notamment des nerfs et des éléments du plexus brachial. Les éléments physiques communs sont dédupliqués, et les versions remplacées ne sont pas affichées en double.

Le survol nomme la surface rencontrée et le clic sélectionne le maillage physique correspondant. Son identifiant associe le concept **FMA** et l’élément **FJ** de la source, ce qui distingue les côtés et les composants d’un même ensemble. Les 36 repères pédagogiques existants conservent leurs identifiants de cours et de quiz, avec une correspondance vers les maillages disponibles : le biceps, par exemple, rassemble ses chefs droits et gauches.

Les couches peuvent être combinées pour explorer les rapports entre systèmes. Rotation, zoom, vues de face et de dos, cadrage de la sélection, isolation, opacité et masquage d’une structure permettent de dégager une région. La peau est conservée pour une sélection explicite et masquée par défaut afin de laisser voir les structures internes. La liste et la recherche offrent une sélection complémentaire au clic dans la scène.

Les sept groupes musculaires disposent de fiches d’origines, d’insertions, d’actions et d’innervation. On peut lancer un quiz ciblé sur le repère et l’objectif consultés. Les schémas 2D des repères pédagogiques restent disponibles, notamment lorsque WebGL est indisponible ; ils ne couvrent pas les 2 320 maillages du catalogue.

Les modèles sont distribués dans **10 fichiers GLB, pour 95,01 Mio au total**, chargés par couches selon les besoins. Chaque fichier reste sous la limite de 25 Mio de l’hébergement ; le plus volumineux mesure environ 13,58 Mio. La conversion conserve les triangles des sources sélectionnées, sans décimation supplémentaire, et applique une compression Meshopt sans perte. Les positions sont exprimées en mètres, avec l’axe Y vers le haut, l’avant vers +Z et le sol à Y = 0. Les archives 4.0 utilisées sont elles-mêmes les variantes réduites « 99 % » publiées par BodyParts3D. Le premier chargement d’une couche peut donc prendre du temps sur une connexion lente.

La nomenclature française est **partielle**. Les noms reconnus sont traduits ; les autres restent dans leur langue source, en anglais, avec une indication dans l’interface. Les fiches et références détaillées concernent surtout les repères pédagogiques existants ; les autres surfaces disposent de leur nom source et de leur identification anatomique.

Quatre repères pédagogiques n’ont pas de correspondance 3D dans les sources retenues : **le droit de l’abdomen, le nerf sciatique, le nerf fémoral et le nerf tibial**. Leurs cours et questions illustrées restent accessibles. L’atlas ne fournit donc pas une couverture exhaustive de l’anatomie. Il représente un modèle de référence masculin adulte, sans toutes les variations individuelles. Les textes, traductions et correspondances pédagogiques attendent une relecture médicale identifiée ; cet outil de formation ne permet pas de préparer ou de guider un geste médical.

## Cours par niveau

Sept parcours : les années 1 à 6, puis un parcours avancé pour l’internat (années 7 à 12). Le niveau est un repère de révision adaptable aux études de chaque pays, pas une équivalence officielle de programme. Chaque parcours présente ses objectifs, ses notions, des structures à explorer et des questions pour s’entraîner. Les cours et la consultation du corps ne consomment pas de session de quiz.

## Questions avec schémas

La banque anatomique comprend les 42 questions de repérage initiales et **98 questions musculaires**, soit 140 questions. Les sept groupes étudiés sont le biceps brachial, le triceps brachial, le deltoïde, le grand pectoral, le droit de l’abdomen, le quadriceps fémoral et le diaphragme. Chaque groupe possède quatorze exercices couvrant ses attaches, ses actions, son innervation et des points plus précis sur ses chefs, ses rapports ou sa mécanique.

Les questions utilisent des schémas 2D avec un repère A, distincts de la scène d’exploration 3D. Lors des questions de repérage, la figure masque le nom de la structure ciblée ; les exercices sur les attaches ou la fonction peuvent annoncer le muscle étudié sans dévoiler la réponse. Le corrigé affiche la légende et l’explication. Les chefs, insertions fines et petits reliefs ne sont pas représentés à l’échelle. Les identifiants, versions et positions des bonnes réponses sont conservés lors d’un changement FR/EN.

Le configurateur permet de choisir Anatomie, le type « Schéma anatomique », une année de 1 à 12 et un objectif : origines, insertions, actions, innervation ou identification. Depuis l’atlas, une structure peut également être présélectionnée, puis le filtre élargi. Les questions fondamentales restent accessibles tout au long des études ; des questions intermédiaires et avancées complètent les niveaux ultérieurs. La longueur s’adapte au stock filtré sans répétition. Les quotas existants s’appliquent aux nouvelles sessions ; reprendre une session ne consomme pas de crédit supplémentaire.

La compétition utilise aussi les diagrammes dans une banque mixte avec les 30 cas cliniques, soit **170 questions de démonstration** au total. Le serveur filtre selon l’année des joueurs, garde le corrigé privé jusqu’à la fin et vérifie les réponses et le timer. Les 98 questions musculaires ont été ajoutées à la banque privée par une migration Supabase appliquée.

## Sources

Les géométries de la base **BodyParts3D 4.0** sont distribuées sous **Creative Commons Attribution 4.0 International**, selon la [licence officielle de l’archive](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html). Attribution : « BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International ».

Le supplément **BodyParts3D 4.3** est distribué séparément dans `nerves-peripheral.glb`, sous **Creative Commons Attribution-ShareAlike 2.1 Japan**. Il conserve cette licence après conversion. Les [conditions du site source](https://lifesciencedb.jp/bp3d/info_en/license/index.html) et le [miroir de distribution épinglé](https://github.com/olivercase/body_parts_3d_api/tree/fd527e6f4daf732fd814314d9257df5877b844bc) sont référencés dans les crédits ; les fichiers 4.0 et le supplément 4.3 conservent des notices distinctes.

Les [crédits publics](../public/anatomy/bodyparts3d/ATTRIBUTION.txt), la [provenance et les sommes SHA-256](../public/anatomy/bodyparts3d/provenance.json) et le [manifeste des modèles](../public/anatomy/bodyparts3d/manifest.json) accompagnent les assets. Le script [import-bodyparts3d.mjs](../scripts/import-bodyparts3d.mjs) reproduit la sélection, la déduplication, la conversion des coordonnées, le calcul des normales et l’export GLB à partir des sources locales. Les OBJ bruts restent hors du dossier public. La notice [MIT de Meshoptimizer](../public/licenses/meshoptimizer-MIT.txt) accompagne le décodeur embarqué.

Les références des repères pédagogiques et des questions renvoient aux chapitres d’Anatomy & Physiology adaptés par [Oregon State University](https://open.oregonstate.education/anatomy2e/), aux ressources [OpenStax](https://openstax.org/details/books/anatomy-and-physiology-2e) et à [NCBI Bookshelf](https://www.ncbi.nlm.nih.gov/books/), notamment pour les attaches musculaires, l’innervation et les rapports. Les faits anatomiques sont reformulés ; les sources ne cautionnent pas Ippomed et leur présence ne remplace pas une relecture du contenu produit. Le contrôle HTTP direct des pages Oregon State reçoit un refus CloudFront dans notre environnement ; les liens ont été vérifiés dans le sommaire du livre et les chapitres accessibles via l’outil de navigation.
