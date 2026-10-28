# Ippomed — licences et attributions

## Code original d’Ippomed

Copyright © 2026 Ippomed contributors.

Le code original de l’application Ippomed est distribué sous la licence **Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)**, sauf mention spécifique applicable à un élément tiers. Cette licence a été appliquée avec l’autorisation explicite du propriétaire du projet le 28 octobre 2026.

- Texte officiel complet, conservé sans modification : [LICENSE](LICENSE).
- Licence officielle : [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
- Dépôt du projet : [abdelmac/meddiagnostic](https://github.com/abdelmac/meddiagnostic).
- Code exact de cette release, distribué avec l’atlas : [ippomed-source-2026-10-28.zip](https://medquiz-europe.medcompass-web.workers.dev/source/ippomed-source-2026-10-28.zip). Son empreinte SHA-256 est fournie dans le fichier `.sha256` séparé.

Attribution du code : **Ippomed contributors — Ippomed — CC BY-SA 4.0**, avec un lien vers le dépôt ou l’archive de la release. Les adaptations doivent conserver les attributions et signaler les modifications conformément à la licence.

## Données, modèles et composants tiers

La licence du code original ne remplace pas celles des dépendances, modèles, données, médias, fontes ou autres contributions de tiers. Les notices déjà présentes restent applicables. Les marques et les logos fournis au projet ne reçoivent pas de nouvelle licence par l’application de CC BY-SA 4.0 au code.

| Élément                                      | Licence et attribution applicables                                                                                                                                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Adaptation neurovasculaire Z-Anatomy         | Adaptation retenue sous CC BY-SA 4.0, avec crédits Z-Anatomy et contributions amont conservés dans les notices du pack. Le socle BodyParts3D identifié par cette source est crédité sous CC BY-SA 2.1 Japan. |
| Modèles BodyParts3D déjà présents            | Licences spécifiques inchangées, notamment CC BY-SA 2.1 Japan et CC BY 4.0 selon le corpus ; voir les notices existantes sous `public/anatomy/`.                                                             |
| Dépendances et composants logiciels tiers    | Licences propres de leurs auteurs ; leurs fichiers de licence et attributions ne sont pas remplacés par LICENSE.                                                                                             |
| Médias et identité visuelle fournis ou cités | Droits et conditions applicables à chaque élément ; exclus du changement de licence du code.                                                                                                                 |

Pour l’adaptation Z-Anatomy, les modifications comprennent l’évaluation des géométries source, la conversion dans un repère mondial commun, la correction du sens des triangles réfléchis, la fusion exacte de sommets, la compression et une simplification limitée à l’aperçu. Les normales source exactement nulles reçoivent une correction d’éclairage documentée. Les détails HIGH conservent tous les triangles évalués de la source.

La revue a écarté **206 objets physiques** en raison de licences ou de provenances incertaines, ainsi que 59 éléments techniques. Les exceptions d’oreille et de rein soumises à une restriction non commerciale ne sont pas incluses par simple application de la licence générale. Le périmètre exact de certaines contributions amont reste insuffisamment documenté : ces exclusions prudentes ne constituent pas une garantie globale d’usage commercial de chaque composant tiers.

Sources et détails : [rapport neurovasculaire et de licence](docs/ANATOMIE-NEUROVASCULAIRE-2026-10-27.md), [licence Z-Anatomy épinglée](https://github.com/Z-Anatomy/Models-of-human-anatomy/blob/caf0f6078f2a0ac9e65e81dce042d5a30b65d0f0/License.txt) et notices générées avec les modèles. L’autorisation de publication du propriétaire du projet ne change pas les licences des auteurs tiers.

La licence et la distribution de cette release sont effectives. La disponibilité réseau des modèles et du code est contrôlée séparément dans les rapports de validation de la publication.
