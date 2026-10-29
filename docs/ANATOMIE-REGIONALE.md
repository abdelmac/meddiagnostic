# Extension anatomique régionale

L’extension **Anatomie régionale / Regional anatomy** utilise le corpus officiel **BodyParts3D 20181210i412**, jeu d’objets **20181210**, moteur source **5.3**, ontologie **FMA4.12.0-inference**. Elle est préparée localement ; sa publication applicative reste en attente du choix décrit dans [DROITS-COMMERCIALISATION.md](DROITS-COMMERCIALISATION.md).

## Explorer les détails

Dans `/anatomy`, le bouton **Nouveaux détails / New details** ouvre cette référence et sa recherche filtrée. Les pièces peuvent être sélectionnées, cadrées, isolées, masquées et étudiées avec la coupe virtuelle. Le filtre peut être désactivé pour retrouver le reste du catalogue. Les noms source et identifiants sont conservés ; les traductions reconnues sont affichées en français, les termes spécialisés restant à traduire sont signalés.

Après **Isoler**, **Centrer la structure** utilise les dimensions de la pièce pour exploiter l’espace d’étude, y compris pour les structures millimétriques. Le cadrage en contexte conserve les structures voisines.

La nouvelle référence conserve son propre repère spatial. Elle ne superpose pas des géométries issues de corps différents aux atlas Z-Anatomy, BodyParts3D 4.3 ou BodyParts3D 3.0, qui restent disponibles séparément.

## Contenu et comptage

Le catalogue officiel comprend **4 679 identifiants d’objets**. **4 614 objets nommés** ont une correspondance source exploitable et ont été téléchargés ; **65 objets sans correspondance officielle suffisante sont exclus**, sans remplacement inventé. Leurs fichiers OBJ représentent **17 249 143 triangles source**. L’audit vérifie **2 374 concepts numériques supplémentaires**, représentés par **2 588 maillages**, selon les critères décrits ci-dessous.

Le rendu HIGH conserve **17 249 139 triangles** : seuls quatre triangles d’aire strictement nulle, associés à des normales indéfinies, sont retirés. Sur vingt objets, 229 normales source nulles proviennent notamment de faces exactement opposées ; 450 coins sont séparés pour porter les normales orientées de leurs faces. Les positions et orientations des faces conservées, ainsi que les normales d’auteur déjà valides, sont préservées. Les quatre suppressions et les réparations sont identifiées dans la provenance. Les aperçus seuls sont simplifiés.

Les exemples comprennent des corps, pédicules, lames et processus vertébraux, des ligaments, des segments nerveux et des parties musculaires. Les régions, espaces et surfaces anatomiques gardent leur désignation d’auteur ; ils ne sont pas tous présentés comme des tissus ou des organes distincts.

Le compteur des nouveautés repose sur `detailExpansion` dans le manifeste. Il exige un concept FMA numérique, un nom canonique et un identifiant physique absents des trois catalogues antérieurs ; il vérifie les empreintes source disponibles et élimine les géométries exactement identiques du nouveau comptage. Les extensions d’auteur et les variantes gauche/droite ne multiplient pas artificiellement le nombre de concepts numériques. Cette comparaison d’index ne constitue pas une preuve d’inédit anatomique dans Z-Anatomy, dont tous les objets ne possèdent pas de correspondance FMA.

La visibilité initiale garde les os entiers ; neuf reliefs régionaux proches restent accessibles par leur sélection. Quatre groupes de représentations étayés par comparaison géométrique évitent les surfaces superposées : une copie d’artère, une portion de tronc coronaire et deux courts segments de faisceaux trigéminaux. Les disques intervertébraux, ligaments et autres branches d’un même concept restent des structures indépendantes.

## Provenance et reproduction

- [Correspondances concepts → objets officielles](https://lifesciencedb.jp/bp3d/get-info.cgi?version=20181210i412&cmd=concept-objfiles-list).
- [Table des objets de cette version](https://lifesciencedb.jp/bp3d/get-info.cgi?cmd=upload-all-list&load=1&md_abbr=bp3d&md_id=1&mr_id=1&mv_id=28&title=obj2FMA&tree=isa&version=20181210i412).
- [Conditions et crédit officiels BodyParts3D](https://lifesciencedb.jp/bp3d/info_en/license/index.html).

`scripts/lib/bodyparts3d-regional-source.mjs` vérifie la version, les identités, les correspondances, les CRC des archives et les SHA-256. Les originaux et checkpoints restent dans `.local/bodyparts3d-v53-audit/`. Aucun script tiers téléchargé n’est exécuté.

`scripts/import-bodyparts3d-regional.mjs --audit-only` produit l’audit privé. L’export des dérivés exige une revue locale des superpositions puis `--export-assets`. Les adaptations conservent la licence **CC BY-SA 2.1 Japan** et le crédit DBCLS, indépendamment des conditions du code applicatif. L’export ne publie aucun ZIP du code de l’application.

Le bridge et le lecteur DOM natifs reconnaissent la référence `bodyparts3d-2018`. Une nouvelle compilation Android/iOS sera nécessaire pour l’embarquer dans une application installée ; l’APK déjà distribué ne contient pas ce nouveau catalogue.

## Vérifications du 29 octobre 2026

- **146 tests unitaires et d’intégration passent** : 137 tests de régression et 9 tests propres au nouvel atlas. Ces derniers décodent les **4 621 GLB**, contrôlent leurs empreintes et vérifient les réparations contre les OBJ originaux.
- **4 scénarios navigateur passent** sur ordinateur et mobile simulé : anciennes couches et changements de référence, ouverture des nouveautés, sélection de deux nouvelles pièces, vrais clics/taps sur leurs surfaces, isolation, cadrage lisible, coupe et bascule FR/EN. Les captures ont été examinées ; le centrage des petites pièces a été corrigé après ce contrôle visuel.
- Typage TypeScript, audit des traductions, build web et exports locaux Android/iOS avec lecteur DOM embarqué réussis.
- Les guards de build confirment l’absence de ZIP public du code applicatif. Aucun déploiement, build cloud, APK signé, publication sur les stores ni nouvelle publication du code n’a été effectué pour cette extension.

L’aperçu est disponible sur `http://127.0.0.1:8081/anatomy?lang=fr`. Le site en production reste sur la version antérieure : conserver Z-Anatomy dans le lecteur modifié tout en gardant son code privé reste incompatible avec la condition de partage affirmée par son auteur. Le choix de publication doit être résolu avant mise en ligne.
