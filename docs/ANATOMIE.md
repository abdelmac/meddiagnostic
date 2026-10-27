# Anatomie : atlas pédagogique, cours et quiz illustrés

L’espace **Anatomie** d’Ippomed et l’espace **Spécialités** sont accessibles au même niveau sur l’accueil. Depuis le **26 octobre 2026**, le **Corps complet** ouvre une référence BodyParts3D **4.3**, avec ses nerfs, artères, veines, os, articulations et autres tissus. Le **Corps détaillé** BodyParts3D **3.0** reste une référence séparée pour ses surfaces plus fines. Sept parcours de cours et **140 questions originales en français et en anglais**, dont 98 musculaires, accompagnent les deux références.

## Explorer le corps

L’atlas s’ouvre dans sa propre page **`/anatomy`**, en plein espace, sans la navigation latérale ni le défilement de l’accueil. Le corps reste au centre. La recherche, les couches et les fiches utilisent un panneau défilant séparément : sous le modèle sur téléphone en portrait, à côté sur les grands écrans et en paysage. La barre inférieure donne accès aux outils au pouce ; les écrans de faible hauteur replient des commandes dans le panneau Couches. Le mode Agrandir la scène masque les outils secondaires. L’emblème Ippomed et le choix FR/EN restent dans l’en-tête.

Les cours disposent de la route **`/anatomy/courses`** ; le passage du corps aux questions conserve l’année d’étude, la structure et l’objectif, avec un retour explicite vers l’atlas. Les commandes autorisent rotation, pincement pour zoomer, déplacement à deux doigts et sélection de la surface touchée.

Les applications natives Android/iOS embarquent le même moteur Three.js dans un **composant DOM Expo local** : elles ne chargent pas une page web distante complète. Les métadonnées sont embarquées ; les géométries publiques restent chargées depuis le CDN avec leur progression et le repli 2D. Les états et les événements traversent un pont validé, sans jeton de session ni donnée de compte. Ce mode nécessite un accès réseau pour les maillages. Les exports Metro/Hermes ne constituent pas des applications signées ni des tests sur appareil : les prérequis et limites de publication sont indiqués dans [MOBILE.md](MOBILE.md).

Le **Rendu naturel** différencie visuellement muscles, os, tissus conjonctifs, cartilage, structures nerveuses, vaisseaux et groupes d’organes par leurs couleurs illustratives et leur réponse à la lumière. Le mode **Repérage** conserve des couleurs didactiques. La sélection utilise la teinte du tissu et un contour d’environ 1,25 pixel CSS, sans recouvrir le muscle en jaune. Les normales et les surfaces originales fournissent les reliefs : aucune fibre, texture anatomique, insertion ou microstructure n’est inventée par cette amélioration graphique. Il s’agit d’un rendu plus naturel de la même référence, sans revendication de photoréalisme ni de validation anatomique supplémentaire.

L’évolution du **25 octobre 2026** ajoute une occlusion de contact calculée à partir de la profondeur des surfaces effectivement rendues. Elle atténue localement la lumière dans les creux et entre les structures proches pour mieux lire leurs rapports. Ce calcul utilise la géométrie présente à l’écran ; il n’ajoute aucune fibre, texture anatomique ou structure. Les positions, la triangulation et les normales sources restent inchangées. Le **Corps détaillé 3.0** conserve ses **934 modèles et 26 317 506 triangles**, sa couverture et ses limites : cette évolution améliore la restitution visuelle et l’exploration, sans rendre le modèle plus précis médicalement.

Dans **Couches**, le réglage **Ombres de profondeur** (**Depth shading** en anglais), activé par défaut, permet de désactiver volontairement cet effet pour adapter son confort visuel ou la charge de rendu. Son état se conserve pendant l’exploration, y compris les changements de référence ; il ne modifie ni la caméra, ni le modèle, ni les réglages de netteté. L’adaptation automatique aux capacités de l’appareil continue de s’appliquer lorsque le réglage est activé. Ce choix traverse aussi le pont natif sous la forme d’un booléen strictement validé ; les états plus anciens sans ce champ conservent l’activation par défaut.

Le mode **Corps détaillé** affiche **934 modèles anatomiques de BodyParts3D 3.0**, rendus en WebGL avec Three.js. Le corps entier et ses détails proviennent d’une même référence spatiale. Les géométries détaillées se chargent à la demande au zoom, au cadrage d’une structure et à l’exploration d’une région, puis remplacent l’aperçu du même élément dans son contexte. La transition conserve sa transformation ; elle ne recale pas une autre version du corps. Le mode **Corps complet**, sélectionné par défaut, utilise désormais la même stratégie aperçu/détails avec le corpus 4.3 décrit plus bas.

Le survol nomme la surface rencontrée et le clic sélectionne le modèle physique correspondant. Le corps détaillé conserve les identifiants **FMA** ou **BP** exacts de sa source, y compris les suffixes présents dans les tables officielles. Les 36 repères pédagogiques existants gardent leurs identifiants de cours et de quiz, avec une correspondance vers les modèles réellement disponibles : le biceps, par exemple, rassemble ses chefs droits et gauches. Le droit de l’abdomen est désormais représenté par ses deux côtés, `FMA13377` et `FMA13378`.

Les couches muscles, nerfs, squelette, organes et vaisseaux peuvent être combinées pour explorer leurs rapports. Rotation, déplacement, zoom, vues de face et de dos, cadrage de la sélection, isolation, opacité et masquage d’une structure permettent de dégager une région. Des raccourcis cadrent la tête et le cou, le thorax, l’abdomen et le bassin, les membres supérieurs ou inférieurs. Ces cadrages dérivent des limites du modèle ; ils ne créent pas de nouveaux repères anatomiques. La peau, les cheveux, les poils, les sourcils et l’aponévrose épicrânienne restent sélectionnables mais sont masqués par défaut pour dégager les structures internes. La liste et la recherche complètent le clic dans la scène.

Les sept groupes musculaires disposent de fiches d’origines, d’insertions, d’actions et d’innervation. On peut lancer un quiz ciblé sur le repère et l’objectif consultés. Les schémas 2D des repères pédagogiques restent disponibles, notamment lorsque WebGL est indisponible ; ils ne couvrent pas tous les modèles des deux catalogues.

### Coupe virtuelle et dissection réversible

Dans **Couches**, la commande **Coupe anatomique** active un plan axial, sagittal ou coronal sur la référence 3D en cours. Le curseur règle sa position relative, de 0 à 100 % des limites du corps sur l’axe choisi. Il se manipule au doigt, à la souris, au clavier et avec les actions d’accessibilité ; les boutons de réglage fin déplacent le plan de 0,5 point de pourcentage. Le panneau cesse de défiler pendant le glissement du curseur.

**Passer par la sélection** place le plan au centre géométrique des limites des composants sélectionnés. **Milieu du corps** utilise le milieu des bornes de la référence. Ces positions géométriques ne désignent pas de niveau vertébral ni de repère clinique. **Inverser le côté** change le demi-espace conservé ; **Réinitialiser la coupe** revient à un plan axial au milieu du corps, sans inversion. Désactiver la commande retire le plan. La coupe se désactive également lors d’un changement de référence, du passage en 2D ou de l’ouverture d’un détail HD isolé.

Le plan masque un côté des maillages existants pour révéler les structures internes représentées. **Les surfaces restent ouvertes au plan de coupe** : aucun tissu de remplissage ni aucune image de coupe de scanner n’est généré. Le calcul de sélection respecte le même demi-espace que le rendu : une surface retirée par le plan n’intercepte pas le clic destiné à une surface conservée. La coupe ne fusionne pas les versions BodyParts3D.

Le retrait d’une structure avec **Masquer la structure** alimente un historique borné aux **32 derniers groupes retirés**. **Annuler le dernier retrait**, dans Couches, ou **Annuler le retrait**, au-dessus du corps, réaffiche le dernier groupe encore retiré. Un groupe partiellement masqué ne réintroduit pas par erreur des éléments cachés auparavant. **Tout réafficher** vide le masquage et son historique. Ces deux commandes conservent la caméra, la sélection et le plan de coupe ; **Revoir le corps entier** reste la commande de remise à zéro du cadrage et de la visibilité.

Les paramètres du plan traversent aussi le pont natif JSON : axe autorisé, position finie entre 0 et 1 et inversion booléenne sont validés, puis seuls ces champs de rendu sont transmis. Leur présence dans le code commun ne constitue pas un essai sur appareil Android ou iOS. L’état des binaires et de leur distribution est suivi séparément dans [MOBILE.md](MOBILE.md).

### Géométrie et chargement du corps détaillé

| Représentation 3.0             |  Triangles | Fichiers GLB | Taille totale |
| ------------------------------ | ---------: | -----------: | ------------: |
| Aperçu par systèmes            |  3 302 522 |           10 |   38,2548 Mio |
| Détails d’origine, par élément | 26 317 506 |          934 |  187,7310 Mio |

Ces **944 fichiers totalisent 225,99 Mio** ; ils ne sont pas tous téléchargés à l’ouverture. Les couches et les détails se chargent selon les besoins. Le fichier le plus volumineux mesure **14,51 Mio**, sous la limite de 25 Mio de l’hébergement. Le premier chargement d’une couche peut prendre du temps sur une connexion lente. Les compteurs décrivent ce corpus, pas une couverture exhaustive de l’anatomie.

Pour rendre le corps entier et les gros plans plus lisibles, les références disposant d’un aperçu et de détails relèvent leur résolution jusqu’à un DPR de 2 après 220 ms d’immobilité, dans la limite de la densité réelle de l’écran. Le rendu revient à sa résolution légère pendant les gestes. Le tampon est plafonné à 1,5 million de pixels sur les appareils détectés comme mobiles ou peu puissants, et à 3 millions sur les autres. Cette adaptation est déclenchée par les interactions et un délai unique ; elle n’ajoute pas de boucle de rendu continue. Le réglage Ombres de profondeur ne modifie pas cette netteté.

L’occlusion de contact possède ses propres budgets dans [anatomy-occlusion.web.ts](../src/ui/anatomy-occlusion.web.ts). Une passe de profondeur supplémentaire alimente un tampon réduit, puis un filtrage respectant les discontinuités de profondeur limite les halos sur les silhouettes. Le contour de sélection et l’ombre de présentation sont exclus de cette passe. Le résultat est mis en cache pour la vue courante : un changement de couleur de survol ou de sélection peut le réutiliser ; changer la caméra, la projection, la taille du tampon, la coupe ou les géométries visibles invalide le cache.

| Budget d’occlusion                                                              |              Bureau |    Mobile ou appareil détecté peu puissant |
| ------------------------------------------------------------------------------- | ------------------: | -----------------------------------------: |
| Échantillons de profondeur                                                      |                  12 |                                          8 |
| Tampon, au plus à demi-résolution sur chaque axe                                |      500 000 pixels | 147 456 pixels, côté maximal de 384 pixels |
| Géométrie rendue maximale pour cette passe                                      | 6 000 000 triangles |                        3 800 000 triangles |
| Repos après les gestes de caméra ou les déplacements du plan                    |              260 ms |                                     360 ms |
| Seuil GPU, après deux mesures lentes consécutives                               |               90 ms |                                      28 ms |
| Seuil de soumission, après deux captures lentes suivant la compilation initiale |              180 ms |                                      65 ms |

L’effet est suspendu pendant les gestes de caméra et les déplacements du plan, en mode transparence ou lorsque le budget géométrique de la vue est dépassé. Sur les appareils détectés peu puissants, le mécanisme de mesure GPU doit être disponible ; une mesure non fiable ou un dépassement confirmé conduit au rendu de base. Une erreur de shader ou un tampon indisponible désactive également l’effet pour l’instance concernée. Le rendu des tissus, le modèle et les interactions restent utilisables lorsque l’occlusion est suspendue ou désactivée. Les ressources GPU sont libérées avec le moteur. Ces bornes limitent le travail supplémentaire ; elles ne constituent pas une garantie de cadence ni une validation sur téléphone physique.

Les cinq systèmes regroupent 437 modèles musculaires, 251 modèles du squelette et des articulations, 99 modèles nerveux, 56 modèles vasculaires et 91 organes ou autres structures. Les noms et relations viennent des tables officielles 3.0. Les 935 entrées du ZIP comprennent un répertoire et **934 OBJ réels**.

La variante source « 95 % » désigne un **taux de réduction des polygones**, et non un pourcentage de fidélité anatomique. La conversion HD conserve ses **26 317 506 triangles et 16 189 200 sommets**, sans décimation supplémentaire, subdivision ou création de détails. Elle convertit les axes et les millimètres en mètres, avec Y vers le haut, l’avant vers +Z et le sol à Y = 0. Le réordonnancement des sommets et des triangles conserve la topologie et leur orientation.

Les positions HD utilisent une grille uniforme de 16 bits par élément lorsque sa précision le permet ; la peau conserve des positions flottantes. Les normales fournies par la source sont normalisées puis encodées sur 16 bits signés. Cette quantification est une approximation bornée, suivie d’une compression Meshopt sans perte supplémentaire. Les plafonds sont **0,02 mm d’erreur vectorielle de position et 1° d’erreur angulaire de normale** ; les maxima mesurés sur l’export sont **0,007934 mm et 0,001503°**. L’aperçu seul est simplifié avec MeshoptSimplifier, à partir de ces mêmes géométries, avec bords verrouillés et une limite d’erreur d’apparence estimée de **0,5 mm**. Cette estimation n’est pas une garantie de précision médicale. Aperçu et détail conservent la même transformation uniforme par élément pour permettre leur remplacement dans la scène.

### Corps complet 4.3 : nerfs, vaisseaux et formes osseuses

Le **Corps complet** contient les **3 210 maillages FJ** du manifeste officiel BodyParts3D 4.3, avec **8 647 172 triangles d’origine disponibles en HIGH**. Ce nombre décrit des fichiers de surfaces, dont des composants et des représentations alternatives ; il ne signifie pas 3 210 structures anatomiques distinctes. Les os, les articulations, les muscles, le système nerveux, les vaisseaux et les autres tissus sont issus de cette même référence. **Les versions 3.0, 4.0 et 4.3 ne sont pas superposées pour fabriquer ce corps.**

La référence conserve les véritables géométries, leurs reliefs et leurs normales. Les triangles HIGH ne sont ni lissés, ni subdivisés, ni décimés. Un aperçu simplifié dans le même repère laisse explorer le corps pendant le chargement des détails. La compression Meshopt et la quantification bornée réduisent les transferts ; elles ne créent pas de surface anatomique. Les limites de quantification restent de 0,02 mm d’erreur vectorielle et de 1° pour les normales, sans signification de précision médicale.

Les familles artérielles et veineuses sont d’abord déterminées par les composants du manifeste source : **849 segments artériels** (`FMA86187`) et **577 segments veineux** (`FMA86188`), sans intersection. Ces deux ensembles couvrent les 1 426 composants de `FMA50722`. Des branches, réseaux et arches nommés explicitement par les auteurs, mais absents de ces racines, complètent la classification. Leur origine est documentée séparément : une classification par nom ne génère ni trajet vasculaire ni relation anatomique. Les couches permettent de distinguer artères et veines et d’étudier leurs rapports avec les nerfs et le squelette.

Le catalogue classe **1 487 maillages vasculaires**, dont **885 artériels et 602 veineux**, ainsi que **403 maillages nerveux**, **376 du squelette et des articulations**, **429 musculaires** et **515 autres tissus**. Les nombres incluent des composants, des segments et les alternatives osseuses disponibles. Le groupe « organes » contient aussi les tissus résiduels de la source ; son nom n’affirme pas que chacun est un organe distinct.

Les quatre accès directs **Nerfs**, **Artères**, **Veines** et **Os** ouvrent la référence complète avec les couches utiles. Les vues vasculaires gardent le squelette comme repère ; la vue **Nerfs** le masque par défaut pour dégager le cerveau, la moelle et les nerfs crâniens. Le squelette reste réactivable dans **Couches** pour étudier leurs rapports. Les filtres des artères et des veines suivent la classification des maillages, indépendamment de leur couleur. Un nerf explicitement nommé dans la source reste dans le groupe nerveux même lorsqu’une racine d’organe composite le contient aussi ; une branche artérielle « vers un nerf » conserve en priorité sa famille vasculaire.

| Représentation 4.3 | Triangles | Fichiers GLB | Taille totale |
| --- | ---: | ---: | ---: |
| Aperçu par systèmes | 2 336 378 | 6 | 27,1766 Mio |
| Détails d’origine, par élément | 8 647 172 | 3 210 | 70,3083 Mio |

Ces **3 216 fichiers totalisent 97,48 Mio** et se chargent selon les couches et les régions consultées. Le plus gros fichier mesure **6,99 Mio**, sous la limite d’hébergement de 25 Mio. La précision numérique mesurée de la quantification atteint au plus **0,010638 mm** sur les positions et **0,001506°** sur les normales ; elle décrit la conversion des données, pas une précision anatomique. Les contrôles décodent chaque fichier et comparent intégralement neuf maillages nerveux, vasculaires et osseux aux OBJ source, y compris la topologie orientée des triangles.

Le **tissu neural de la moelle spinale** (`FMA242005`, `FJ4426`) est présent. Il est distinct du canal central (`FJ1737`), qui ne lui est jamais substitué. La queue de cheval, les nerfs ciliaires courts et les composants olfactifs réellement fournis restent dans le groupe nerveux. Les artères et veines des membres, les branches cérébrales, les réseaux de la main et les branches intercostales conservent leur identité source et restent sélectionnables.

Certains os disposent de plusieurs représentations de la même surface complète. **84 groupes de deux alternatives**, soit 168 surfaces disponibles et 84 surfaces masquées par défaut, sont limités au squelette. Les membres partagent les mêmes identifiants FMA et BP et le même nom ; chaque paire doit conserver au moins 85 % de correspondance des dimensions sur chaque axe et du volume, avec un déplacement des centres inférieur à 10 % de la plus petite diagonale. Ces critères sont documentés dans l’importeur et la provenance. Un seul membre est affiché par défaut ; le choix privilégie le plus grand nombre de triangles, puis un identifiant stable. Sélectionner une alternative permet de l’inspecter sans superposer l’autre représentation. Les deux os sésamoïdes adjacents d’un même pied restent distincts, même s’ils partagent un nom ou un concept. Tous les fichiers source restent disponibles dans le catalogue et en HIGH.

La source 4.3 apporte davantage de composants nerveux, vasculaires et osseux que les références précédentes, avec sa propre densité de maillage. La version 3.0 possède davantage de triangles sur plusieurs grandes surfaces ; le changement de référence reste explicite pour choisir le support adapté à la révision.

### Compatibilité des anciens assets

La collection précédente de **2 320 maillages** (BodyParts3D 4.0 et supplément nerveux 4.3), ses **10 GLB de 95,01 Mio** et ses notices restent disponibles pour les anciens clients, sous `legacy-manifest.json`. Elle n’est plus la référence du mode Corps complet. Les **31 inspections musculaires isolées 3.0**, soit **1 454 864 triangles et 18,75 Mio**, conservent aussi leurs fichiers, leurs crédits et leur provenance. Une inspection isolée masque entièrement le corps courant : ses coordonnées ne sont pas recalées sur une autre version.

La nomenclature française est **partielle**. Les noms reconnus sont traduits ; les autres restent dans leur langue source, en anglais, avec une indication dans l’interface. Les fiches et références détaillées concernent surtout les repères pédagogiques existants ; les autres surfaces disposent de leur nom source et de leur identification anatomique.

Neuf repères pédagogiques n’ont pas de maillage correspondant dans le **Corps détaillé 3.0** : les nerfs médian, ulnaire, radial, sciatique, fémoral et tibial, le plexus brachial, la moelle spinale et l’artère fémorale. Le **Corps complet 4.3** apporte notamment les nerfs médian, ulnaire et radial, le plexus brachial, le tissu de la moelle et l’artère fémorale. Les nerfs **sciatique, fémoral et tibial restent absents du corpus 4.3** : leurs noms ne doivent pas être attribués à des maillages voisins. Les cours et questions illustrées de ces repères restent accessibles.

Les atlas ne fournissent pas une couverture exhaustive de l’anatomie. Ils représentent des modèles de référence masculins adultes, sans toutes les variations individuelles. Les textes, traductions et correspondances pédagogiques attendent une relecture médicale identifiée ; cet outil de formation ne permet pas de préparer ou de guider un geste médical.

## Cours par niveau

Sept parcours : les années 1 à 6, puis un parcours avancé pour l’internat (années 7 à 12). Le niveau est un repère de révision adaptable aux études de chaque pays, pas une équivalence officielle de programme. Chaque parcours présente ses objectifs, ses notions, des structures à explorer et des questions pour s’entraîner. Les cours et la consultation du corps ne consomment pas de session de quiz.

## Questions avec schémas

La banque anatomique comprend les 42 questions de repérage initiales et **98 questions musculaires**, soit 140 questions. Les sept groupes étudiés sont le biceps brachial, le triceps brachial, le deltoïde, le grand pectoral, le droit de l’abdomen, le quadriceps fémoral et le diaphragme. Chaque groupe possède quatorze exercices couvrant ses attaches, ses actions, son innervation et des points plus précis sur ses chefs, ses rapports ou sa mécanique.

Les questions utilisent des schémas 2D avec un repère A, distincts de la scène d’exploration 3D. Lors des questions de repérage, la figure masque le nom de la structure ciblée ; les exercices sur les attaches ou la fonction peuvent annoncer le muscle étudié sans dévoiler la réponse. Le corrigé affiche la légende et l’explication. Les chefs, insertions fines et petits reliefs ne sont pas représentés à l’échelle. Les identifiants, versions et positions des bonnes réponses sont conservés lors d’un changement FR/EN.

Le configurateur permet de choisir Anatomie, le type « Schéma anatomique », une année de 1 à 12 et un objectif : origines, insertions, actions, innervation ou identification. Depuis l’atlas, une structure peut également être présélectionnée, puis le filtre élargi. Les questions fondamentales restent accessibles tout au long des études ; des questions intermédiaires et avancées complètent les niveaux ultérieurs. La longueur s’adapte au stock filtré sans répétition. Les quotas existants s’appliquent aux nouvelles sessions ; reprendre une session ne consomme pas de crédit supplémentaire.

La compétition utilise aussi les diagrammes dans une banque mixte avec les 30 cas cliniques, soit **170 questions de démonstration** au total. Le serveur filtre selon l’année des joueurs, garde le corrigé privé jusqu’à la fin et vérifie les réponses et le timer. Les 98 questions musculaires ont été ajoutées à la banque privée par une migration Supabase appliquée.

## Sources

Le **Corps complet BodyParts3D 4.3** est distribué sous **Creative Commons Attribution-ShareAlike 2.1 Japan**, conformément aux [conditions officielles du viewer](https://lifesciencedb.jp/bp3d/info_en/license/index.html). Son appartenance est contrôlée par le [manifeste officiel 4.3](https://lifesciencedb.jp/bp3d/get-info.cgi?version=4.3&cmd=concept-objfiles-list), dont les en-têtes indiquent « Data Version 4.3 » et « Objects set 4.3 ». Le miroir de données est épinglé au [commit `fd527e6f4daf732fd814314d9257df5877b844bc`](https://github.com/olivercase/body_parts_3d_api/tree/fd527e6f4daf732fd814314d9257df5877b844bc). Chaque pointeur Git LFS est vérifié par son empreinte Git ; chaque OBJ est vérifié par SHA-256, taille, nombres de faces/sommets et identifiants File/Representation/Concept de son en-tête. Le code du miroir n’est pas exécuté. Les [crédits](../public/anatomy/bodyparts3d/v43/ATTRIBUTION.txt), la [provenance](../public/anatomy/bodyparts3d/v43/provenance.json) et le [manifeste](../public/anatomy/bodyparts3d/v43/manifest.json) accompagnent les adaptations.

Pour reproduire le corpus 4.3 et ses aperçus :

```sh
node scripts/import-bodyparts3d-networks.mjs
```

Les OBJ bruts restent dans `.local/bodyparts3d-highres/objs`, hors des assets publics. L’importeur conserve le manifeste et les notices de l’ancienne collection avant de publier les fichiers 4.3 dans `v43/`. Le catalogue de la version 3.0 reste indépendant.

Le **corps détaillé BodyParts3D 3.0** est distribué sous **Creative Commons Attribution-ShareAlike 2.1 Japan**, conformément au [README officiel de la version 3.0](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/README_e.html). Attribution : « BodyParts3D, Copyright(C) 2010-2011 The Database Center for Life Science licensed under CC Attribution-ShareAlike 2.1 Japan ». Les fichiers d’aperçu et les détails conservent cette licence après adaptation. Leurs [crédits publics](../public/anatomy/bodyparts3d-complete/ATTRIBUTION.txt), leur [provenance](../public/anatomy/bodyparts3d-complete/provenance.json) et leur [manifeste](../public/anatomy/bodyparts3d-complete/manifest.json) identifient les sources, les transformations et les fichiers produits. Les OBJ originaux sont vérifiés par CRC et SHA-256 ; chaque GLB possède sa somme SHA-256.

Pour reproduire ce corps à partir des sources officielles :

```sh
node scripts/import-bodyparts3d-complete.mjs
```

Le script [import-bodyparts3d-complete.mjs](../scripts/import-bodyparts3d-complete.mjs) lit l’index ZIP officiel, récupère les 934 OBJ par requêtes HTTP partielles et réutilise les fichiers valides de `.local/bodyparts3d-3.0-95/objs`. Il télécharge également les tables de noms, de relations et de composites de cette même version. Le corpus source représente environ 522 Mio compressés et 1,83 Gio d’OBJ bruts ; le fichier ZIP complet n’est pas enregistré. La conversion reproduit la normalisation commune, la quantification bornée, les aperçus simplifiés et les détails non décimés. Les OBJ restent hors du dossier public. Les deux niveaux de détail restent issus exclusivement de la version 3.0.

Les géométries de la collection historique **BodyParts3D 4.0** sont distribuées sous **Creative Commons Attribution 4.0 International**, selon la [licence officielle de l’archive](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html). Attribution : « BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International ». Cette licence de l’archive 4.0 ne remplace pas celle des géométries 4.3 du viewer.

Le supplément historique **BodyParts3D 4.3** est conservé séparément dans `nerves-peripheral.glb`, sous **Creative Commons Attribution-ShareAlike 2.1 Japan**. Il conserve cette licence après conversion. Les [conditions du site source](https://lifesciencedb.jp/bp3d/info_en/license/index.html) et le [miroir de distribution épinglé](https://github.com/olivercase/body_parts_3d_api/tree/fd527e6f4daf732fd814314d9257df5877b844bc) sont référencés dans les crédits ; les anciens fichiers 4.0 et leur supplément 4.3 conservent des notices distinctes.

Les **31 anciens détails HD isolés BodyParts3D 3.0** sont également distribués sous **Creative Commons Attribution-ShareAlike 2.1 Japan**, conformément au même README 3.0. Les fichiers `details/*.glb` possèdent une [notice propre](../public/anatomy/bodyparts3d/details/LICENSE.txt) et une [provenance distincte](../public/anatomy/bodyparts3d/details/provenance.json), qui identifient chaque concept source, son entrée ZIP, son CRC et sa somme SHA-256. Ils restent sous cette licence après adaptation.

Les [crédits publics de l’atlas étendu](../public/anatomy/bodyparts3d/ATTRIBUTION.txt), sa [provenance](../public/anatomy/bodyparts3d/provenance.json) et son [manifeste](../public/anatomy/bodyparts3d/manifest.json) accompagnent ses assets. À partir des caches de sources officielles, sa reproduction et celle de ses inspections isolées s’effectuent dans cet ordre :

```sh
node scripts/import-bodyparts3d.mjs
node scripts/import-bodyparts3d-details.mjs
node scripts/import-bodyparts3d-networks.mjs
```

Le premier script reproduit la sélection, la déduplication, la conversion des coordonnées, le calcul des normales et l’export GLB du corps étendu historique. Le second lit l’index ZIP distant puis récupère uniquement les entrées des muscles concernés par des requêtes HTTP partielles, vérifie leur intégrité et génère les inspections isolées. Il réutilise les OBJ valides du cache et conserve les normales d’origine. Le dernier importe la référence 4.3 et la rétablit comme catalogue courant, tout en conservant les anciens assets. Les scripts sont disponibles dans [import-bodyparts3d.mjs](../scripts/import-bodyparts3d.mjs), [import-bodyparts3d-details.mjs](../scripts/import-bodyparts3d-details.mjs) et [import-bodyparts3d-networks.mjs](../scripts/import-bodyparts3d-networks.mjs). Les OBJ bruts restent hors du dossier public. La notice [MIT de Meshoptimizer](../public/licenses/meshoptimizer-MIT.txt) accompagne le décodeur embarqué.

Les références des repères pédagogiques et des questions renvoient aux chapitres d’Anatomy & Physiology adaptés par [Oregon State University](https://open.oregonstate.education/anatomy2e/), aux ressources [OpenStax](https://openstax.org/details/books/anatomy-and-physiology-2e) et à [NCBI Bookshelf](https://www.ncbi.nlm.nih.gov/books/), notamment pour les attaches musculaires, l’innervation et les rapports. Les faits anatomiques sont reformulés ; les sources ne cautionnent pas Ippomed et leur présence ne remplace pas une relecture du contenu produit. Le contrôle HTTP direct des pages Oregon State reçoit un refus CloudFront dans notre environnement ; les liens ont été vérifiés dans le sommaire du livre et les chapitres accessibles via l’outil de navigation.
