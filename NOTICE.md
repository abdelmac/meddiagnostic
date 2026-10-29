# Ippomed — licences et attributions

## Lecteur courant : BodyParts3D uniquement

Le propriétaire a choisi le **29 octobre 2026** de garder les nouveaux apports applicatifs hors publication du dépôt source et de retirer Z-Anatomy du nouveau lecteur. Les références actives sont **BodyParts3D 2018 (5.3)**, **BodyParts3D 4.3** et **BodyParts3D 3.0** ; la référence régionale 2018 s’ouvre par défaut avec ses 4 614 objets et 2 374 repères supplémentaires identifiés.

Les modèles et adaptations BodyParts3D conservent leurs licences et crédits DBCLS, notamment **CC BY-SA 2.1 Japan** pour ces trois corpus. Ils ne deviennent pas propriétaires. Les anciens packs, attributions et sources de la version Z-Anatomy restent disponibles pour les installations existantes ; le nouveau code n’importe pas ces modèles et ne les demande pas. Aucun nouveau partage du code complet n’est autorisé par cette décision. Les conditions propriétaires futures restent limitées aux droits effectivement établis, avec leur brouillon et ses champs à confirmer.

## Version antérieure et retrait de l’archive

La version du code propre antérieurement publiée le 28 octobre 2026 a été diffusée sous **CC BY-SA 4.0** pour les droits alors valablement accordés. Le retrait de l’archive complète du site ne révoque pas ces autorisations et n’efface pas les copies déjà reçues. Cette mention ne constitue pas une nouvelle licence ouverte globale pour les versions futures.

- Texte officiel historique inchangé : [CC BY-SA 4.0](licenses/legacy-2026-10-28/CC-BY-SA-4.0.txt).
- Notice historique inchangée : [notice du 28 octobre](licenses/legacy-2026-10-28/NOTICE.md).
- [Statut actuel de distribution](LICENSE) et [inventaire des droits](docs/DROITS-COMMERCIALISATION.md).
- Source historique de l’application conservée pour l’intégration Z-Anatomy : [révision publique vérifiée](https://github.com/abdelmac/meddiagnostic/tree/8bbcd75fc6946a0a1b2dbcd889892177776db500).

L’attribution historique **« Ippomed contributors — Ippomed — CC BY-SA 4.0 »** est conservée ; cette désignation générique n’établit pas l’identité juridique du titulaire ni une chaîne de cessions. La correspondance des 226 fichiers de l’ancienne archive avec cette révision a été vérifiée, avec une seule différence de fins de ligne. Le dépôt reste public et son historique contient encore les anciennes distributions ; le projet n’est donc pas entièrement privé.

## Conditions envisagées pour les futures versions

Le projet souhaite ne plus publier volontairement son dépôt source complet et envisage des conditions propriétaires pour ses futurs apports admissibles. Le [brouillon des conditions](docs/CONDITIONS-PROPRIETAIRES-DRAFT.md) reste à confirmer : identité du titulaire, périmètre des droits et compatibilité des composants. Aucun titulaire n’est inventé et aucune condition propriétaire globale n’est annoncée comme déjà applicable. Les questions, corrections, schémas, logos et contributions dont les droits sont insuffisamment établis restent à examiner.

L’auteur de Z-Anatomy a exprimé une exigence de partage du code de l’application lisant son modèle. Cette position documentée n’est pas une règle universelle imposée à tout logiciel par CC BY-SA ; elle explique la continuité de source maintenue pour les anciens lecteurs. Le remplacement autorisé le 29 octobre retire ce corpus du lecteur courant. Les fichiers historiques conservés ne constituent pas une nouvelle licence sur le code de cette version BodyParts3D.

## Données, modèles et composants tiers

La licence du code original ne remplace pas celles des dépendances, modèles, données, médias, fontes ou autres contributions de tiers. Les notices déjà présentes restent applicables. Les marques et les logos fournis au projet ne reçoivent pas de nouvelle licence par l’application de CC BY-SA 4.0 au code.

| Élément                                      | Licence et attribution applicables                                                                                                                                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Adaptation neurovasculaire Z-Anatomy historique | Hors lecteur courant ; pack conservé sous CC BY-SA 4.0 pour les anciennes installations, avec ses crédits et la référence de code antérieure. Le socle BodyParts3D identifié par cette source est crédité sous CC BY-SA 2.1 Japan. |
| Modèles BodyParts3D déjà présents            | Licences spécifiques inchangées, notamment CC BY-SA 2.1 Japan et CC BY 4.0 selon le corpus ; voir les notices existantes sous `public/anatomy/`.                                                             |
| Dépendances et composants logiciels tiers    | Licences propres de leurs auteurs ; leurs fichiers de licence et attributions ne sont pas remplacés par LICENSE.                                                                                             |
| Médias et identité visuelle fournis ou cités | Droits et conditions applicables à chaque élément ; exclus du changement de licence du code.                                                                                                                 |

Pour l’adaptation Z-Anatomy, les modifications comprennent l’évaluation des géométries source, la conversion dans un repère mondial commun, la correction du sens des triangles réfléchis, la fusion exacte de sommets, la compression et une simplification limitée à l’aperçu. Les normales source exactement nulles reçoivent une correction d’éclairage documentée. Les détails HIGH conservent tous les triangles évalués de la source.

La revue a écarté **206 objets physiques** en raison de licences ou de provenances incertaines, ainsi que 59 éléments techniques. Les exceptions d’oreille et de rein soumises à une restriction non commerciale ne sont pas incluses par simple application de la licence générale. Le périmètre exact de certaines contributions amont reste insuffisamment documenté : ces exclusions prudentes ne constituent pas une garantie globale d’usage commercial de chaque composant tiers.

Sources et détails : [rapport neurovasculaire et de licence](docs/ANATOMIE-NEUROVASCULAIRE-2026-10-27.md), [licence Z-Anatomy épinglée](https://github.com/Z-Anatomy/Models-of-human-anatomy/blob/caf0f6078f2a0ac9e65e81dce042d5a30b65d0f0/License.txt) et notices générées avec les modèles. L’autorisation de publication du propriétaire du projet ne change pas les licences des auteurs tiers.

Les archives de développement futures restent privées ; les notices tierces et la source historique requise pour la version déjà publiée restent disponibles. Le retrait du ZIP du site, ses statuts HTTP et les anciennes URL de prévisualisation sont vérifiés séparément après déploiement.
