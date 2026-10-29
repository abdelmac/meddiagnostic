# Extension anatomique régionale

L’extension **Anatomie régionale / Regional anatomy** utilise le corpus officiel **BodyParts3D 20181210i412**, jeu d’objets **20181210**, moteur source **5.3**, ontologie **FMA4.12.0-inference**. Le propriétaire a autorisé sa publication le 29 octobre 2026 avec un lecteur **BodyParts3D uniquement**, sans publication du dépôt applicatif ; la décision et ses limites figurent dans [DROITS-COMMERCIALISATION.md](DROITS-COMMERCIALISATION.md).

## Explorer les détails

Dans `/anatomy`, le bouton **Nouveaux détails / New details** ouvre cette référence et sa recherche filtrée. Les pièces peuvent être sélectionnées, cadrées, isolées, masquées et étudiées avec la coupe virtuelle. Le filtre peut être désactivé pour retrouver le reste du catalogue. Les noms source et identifiants sont conservés ; les traductions reconnues sont affichées en français, les termes spécialisés restant à traduire sont signalés.

Après **Isoler**, **Centrer la structure** utilise les dimensions de la pièce pour exploiter l’espace d’étude, y compris pour les structures millimétriques. Le cadrage en contexte conserve les structures voisines.

La nouvelle référence conserve son propre repère spatial. Les atlas BodyParts3D 4.3 et 3.0 restent disponibles séparément. Le lecteur courant n’importe plus Z-Anatomy ; ses fichiers et sources historiques sont conservés pour les anciennes installations. Les trois références courantes ne modélisent pas tous les nerfs du corps : les trajets 3D des nerfs sciatiques, fémoraux et tibiaux de Z-Anatomy ne sont pas repris ; les cours conservent leurs schémas 2D.

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

- **152 tests unitaires et d’intégration passent**, sans test exclu : atlas et modèles existants, neuf tests géométriques régionaux et six tests des garde-fous BodyParts3D uniquement. Les contrôles régionaux décodent les **4 621 GLB**, vérifient les empreintes et comparent les réparations aux OBJ originaux.
- **20 scénarios navigateur locaux passent** sur ordinateur et mobile simulé : couches, changements entre trois références, six vrais clics/taps bilatéraux sur les structures disponibles, recherche, nouveautés, isolation, cadrage lisible, coupe, variantes, dissection, bascule FR/EN et anciennes notices. Les captures ont été examinées ; le centrage des petites pièces a été corrigé après ce contrôle visuel.
- Typage TypeScript, audit des traductions, build web et exports locaux Android/iOS avec lecteur DOM embarqué réussis.
- Les guards de build confirment l’absence de ZIP public du code applicatif et de données de modèles Z-Anatomy dans les bundles web, DOM et Hermes. Aucun build cloud, nouvel APK signé, publication sur les stores ou push du code source n’a été effectué pour cette extension.

L’aperçu est disponible sur `http://127.0.0.1:8081/anatomy?lang=fr`. Le lecteur courant est **déployé** sur [Ippomed](https://medquiz-europe.medcompass-web.workers.dev/anatomy?lang=fr), version Cloudflare **`1672ff96-f204-4586-acd5-170bfe98e711`**. Le déploiement contient 12 568 fichiers et a envoyé 4 633 assets nouveaux ou modifiés par la procédure existante, sans publication du dépôt applicatif.

**Huit scénarios publics passent** sur ordinateur et mobile simulé : les trois sources actives chargent uniquement BodyParts3D, aucun identifiant physique Z n’est embarqué dans le JavaScript chargé, les nouveaux détails répondent aux vrais clics/taps, et l’ancien ZIP répond toujours HTTP 404 pour GET, HEAD, Range, paramètres et ancien ETag. Les notices, le manifeste et un vrai GLB historique restent accessibles aux anciens lecteurs. Le manifeste régional public et trois modèles HIGH, dont le ganglion ayant révélé le défaut de quantification, ont été comparés octet par octet aux sorties locales vérifiées.

SHA-256 du manifeste client et public : `d8796e83eee5ab4662c06b353bb6e06f59a279ee41146d5eeccd88bda84d1e45`. Preuves privées : `.local/bodyparts-only-release/public-assets.json`, résultats Playwright et captures de `.local/regional-anatomy-review/`. L’ancienne publication GitHub reste inchangée ; les nouveaux apports contrôlés restent hors du dépôt distant inspecté.
