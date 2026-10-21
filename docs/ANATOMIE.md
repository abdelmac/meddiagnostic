# Anatomie : atlas pédagogique, cours et quiz illustrés

L’espace **Anatomie** d’Ippomed et l’espace **Spécialités** sont accessibles au même niveau sur l’accueil. L’anatomie regroupe un corps humain interactif, sept parcours de cours et **140 questions originales en français et en anglais**, dont 98 questions musculaires. L’identité violette et lime utilise l’[emblème fourni](../public/brand/ippomed-emblem.png), sans texte.

## Explorer le corps

L’atlas web utilise une **scène 3D WebGL rendue avec Three.js**, construite dans le projet. Ses 36 structures sont réparties entre cinq systèmes : muscles, nerfs, squelette, organes et vaisseaux. La rotation permet de changer de point de vue ; le zoom, l’isolation d’une structure et le réglage de l’opacité aident à explorer les rapports. Les vues de face et de dos offrent des repères de départ. La sélection sur le corps ou dans la liste affiche le nom, la région, une synthèse et les références.

Les sept groupes musculaires disposent aussi de fiches d’origines, d’insertions, d’actions et d’innervation. Les attaches sont repérées dans la scène pour relier les fiches au corps ; leur position est indicative et simplifiée. On peut lancer un quiz ciblé sur la structure et l’objectif consultés. Une vue 2D de repli conserve l’exploration lorsque WebGL est indisponible. La liste de structures fournit une autre façon de sélectionner un élément.

Les volumes, schémas et effets sont originaux ; **aucun asset de Complete Anatomy ni aucune illustration extraite d’un manuel ne sont embarqués**. Malgré la profondeur et la rotation réelles, le modèle reste un **schéma pédagogique simplifié** : formes, proportions, attaches et trajets ne décrivent pas toute l’anatomie individuelle. Les textes et représentations attendent une relecture médicale identifiée. Cette sélection de repères ne permet pas de préparer ou de guider un geste médical.

## Cours par niveau

Sept parcours : les années 1 à 6, puis un parcours avancé pour l’internat (années 7 à 12). Le niveau est un repère de révision adaptable aux études de chaque pays, pas une équivalence officielle de programme. Chaque parcours présente ses objectifs, ses notions, des structures à explorer et des questions pour s’entraîner. Les cours et la consultation du corps ne consomment pas de session de quiz.

## Questions avec schémas

La banque anatomique comprend les 42 questions de repérage initiales et **98 questions musculaires**, soit 140 questions. Les sept groupes étudiés sont le biceps brachial, le triceps brachial, le deltoïde, le grand pectoral, le droit de l’abdomen, le quadriceps fémoral et le diaphragme. Chaque groupe possède quatorze exercices couvrant ses attaches, ses actions, son innervation et des points plus précis sur ses chefs, ses rapports ou sa mécanique.

Les questions utilisent des schémas 2D avec un repère A, distincts de la scène d’exploration 3D. Lors des questions de repérage, la figure masque le nom de la structure ciblée ; les exercices sur les attaches ou la fonction peuvent annoncer le muscle étudié sans dévoiler la réponse. Le corrigé affiche la légende et l’explication. Les chefs, insertions fines et petits reliefs ne sont pas représentés à l’échelle. Les identifiants, versions et positions des bonnes réponses sont conservés lors d’un changement FR/EN.

Le configurateur permet de choisir Anatomie, le type « Schéma anatomique », une année de 1 à 12 et un objectif : origines, insertions, actions, innervation ou identification. Depuis l’atlas, une structure peut également être présélectionnée, puis le filtre élargi. Les questions fondamentales restent accessibles tout au long des études ; des questions intermédiaires et avancées complètent les niveaux ultérieurs. La longueur s’adapte au stock filtré sans répétition. Les quotas existants s’appliquent aux nouvelles sessions ; reprendre une session ne consomme pas de crédit supplémentaire.

La compétition utilise aussi les diagrammes dans une banque mixte avec les 30 cas cliniques, soit **170 questions de démonstration** au total. Le serveur filtre selon l’année des joueurs, garde le corrigé privé jusqu’à la fin et vérifie les réponses et le timer. Les 98 questions musculaires ont été ajoutées à la banque privée par une migration Supabase appliquée.

## Sources

Les références de chaque structure et question renvoient aux chapitres d’Anatomy & Physiology adaptés par [Oregon State University](https://open.oregonstate.education/anatomy2e/), aux ressources [OpenStax](https://openstax.org/details/books/anatomy-and-physiology-2e) et à [NCBI Bookshelf](https://www.ncbi.nlm.nih.gov/books/), notamment pour les attaches musculaires, l’innervation et les rapports. Les faits anatomiques sont reformulés ; les sources ne cautionnent pas Ippomed et leur présence ne remplace pas une relecture du contenu produit. Le contrôle HTTP direct des pages Oregon State reçoit un refus CloudFront dans notre environnement ; les liens ont été vérifiés dans le sommaire du livre et les chapitres accessibles via l’outil de navigation.
