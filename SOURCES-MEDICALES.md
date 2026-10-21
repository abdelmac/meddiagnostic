# Bibliothèque locale et nouveaux contenus

Le dossier fourni `C:\Users\zakariaB\Desktop\book med` a été inventorié en lecture seule. Aucun livre, film, scan, texte extrait ni chemin personnel n’est envoyé à un service externe ou intégré au site public.

L’inventaire du 21 octobre 2026 comprend **244 fichiers locaux, soit 13,62 Go** : 170 PDF, 6 vidéos AVI, 2 images ISO, 7 livres PDB, 3 CHM, 1 DjVu et des documents, tableaux et fichiers auxiliaires. Après regroupement des PDF identiques présents sur disque et lecture des tables des ISO, le catalogue public contient **262 références**, dont **214 références PDF**. Ces chiffres désignent des entrées documentaires : les copies présentes à la fois sur disque et dans une archive ne sont pas toutes dédupliquées. Les tables des deux ISO contiennent 488 fichiers, dont des fichiers techniques qui ne constituent pas des ouvrages. Un ISO imbriqué est référencé sans monter le disque ni exécuter ses programmes.

Le panneau « Bibliothèque & nouveaux contenus », dans Spécialités, permet de rechercher les titres et les cours, filtrer les formats et consulter les **64 questions originales bilingues** préparées. Les thèmes sont l’anatomie respiratoire et cardiovasculaire, l’histologie, l’embryologie et la physiologie. Les choix et explications sont rédigés pour l’application ; aucune illustration de livre n’est réutilisée.

Ces questions portent obligatoirement `status: "draft"` et `medicalReviewer: null`. Elles sont consultables comme aperçus éditoriaux, **exclues des sessions notées, des duels et des classements**. La liste `reviewedSourceQuestionIds` reste vide. L’existence d’un livre dans l’inventaire n’atteste ni sa qualité médicale, ni la lecture intégrale de son contenu, ni une autorisation de republication. Plusieurs ouvrages sont anciens et certains cours comportent des formulations ou erreurs nécessitant une vérification indépendante. Aucune conduite thérapeutique actuelle n’est déduite automatiquement de ces documents.

Les 64 brouillons citent **9 PDF effectivement lus** : six livrets PASS de l’appareil circulatoire et respiratoire, *Netter’s Essential Histology*, deuxième édition, *Langman’s Medical Embryology*, quatorzième édition, et *Textbook of Medical Physiology* de Guyton et Hall, onzième édition. Chaque question référence un identifiant de source et une ou plusieurs positions de page dans le PDF, comptées à partir de 1. La pagination imprimée peut différer. Les pages exploitées se trouvent uniquement sous `.local/sources/`, dossier ignoré par Git et exclu de l’export web.

## Reproduire l’inventaire

Python 3 est nécessaire. Les outils sont gratuits et installés dans le projet, sans modification globale de Python :

```powershell
python -m pip install --target .local/source-tools -r scripts/source-requirements.txt
python scripts/source-import.py inventory --root 'C:\Users\zakariaB\Desktop\book med'
```

Le script écrit les métadonnées publiques dans `src/data/source-catalog.json` et les correspondances avec les chemins privés dans `.local/sources/locations.json`. Il hache les PDF pour identifier les doublons sur disque et détecte le texte sur les trois premières pages. « Pas de texte dans l’échantillon initial » ne prouve pas que l’ensemble du PDF nécessite un OCR : les couvertures peuvent simplement être des images.

Pour lire des pages précises dans l’atelier éditorial local :

```powershell
python scripts/source-import.py extract src-ad5feba24e85cd3f --pages 33-70
python scripts/source-import.py extract src-fb910a41b2f52e4b --pages 19-55
```

Le lecteur accepte les PDF sur disque et les PDF référencés dans un ISO. Les extractions successives conservent les pages déjà extraites. `--pages all` est disponible pour une lecture intégrale délibérée. Les extractions restent locales : elles ne sont pas copiées dans `src`, `public` ou `dist`.

Les vidéos demandent une transcription ou un travail éditorial manuel. Les CHM/PDB/DjVu/DOC et l’ISO imbriqué ne sont pas convertis automatiquement. Aucun contournement de protection, montage de disque, exécution de programme ou récupération de mot de passe n’est effectué. Un PDF protégé ou illisible reste signalé.

## Passer d’un brouillon à une question publiée

Un professionnel de santé doit vérifier l’énoncé, l’unicité de la bonne réponse, les distracteurs, les deux langues, la référence de page et l’adéquation au niveau d’étude. Les affirmations doivent être recoupées avec une source médicale actuelle lorsque nécessaire. Toute réutilisation de texte ou d’image nécessite une licence compatible documentée. La promotion doit être explicite, versionnée et accompagnée de l’identité du relecteur et de sa date de validation ; modifier seulement l’étiquette d’un brouillon ne suffit pas. La banque du serveur compétitif doit alors être mise à jour séparément avec les réponses conservées côté serveur.

`tests/source-catalog.test.ts` vérifie les références de page, la présence des deux langues, l’absence de chemins ou d’extraits dans les métadonnées publiques et le maintien des brouillons hors du registre de validation.
