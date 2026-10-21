# Livraison du 21 octobre 2026

**Ippomed** reste bilingue français/anglais et hébergée sur l’offre gratuite Cloudflare/Supabase existante. L’identité violette et lime utilise l’[emblème fourni](../public/brand/ippomed-emblem.png), sans texte. L’accueil présente Anatomie et Spécialités au même niveau. Les noms techniques `medquiz`, les clés de stockage et l’adresse publique existante sont conservés pour compatibilité. Aucun changement de formule d’hébergement payante n’a été demandé.

## Comptes et forfaits

L’intégration Google utilise PKCE et le fournisseur Supabase : consulter [GOOGLE-AUTH.md](../GOOGLE-AUTH.md). Le fournisseur Google reste désactivé faute d’identifiants de configuration. Le bouton vérifie son activation réelle avant une redirection. Les liens e-mail existants restent disponibles ; le SMTP Supabase par défaut conserve sa restriction aux adresses invitées.

Le forfait gratuit accorde **trois nouvelles sessions par jour et dix questions maximum par session**, tous modes confondus : quiz, révision, participation compétitive. La journée est définie par `Europe/Paris`, changements d’heure compris. Une session commencée consomme un crédit, même si elle est abandonnée ou si son invitation est annulée. Reprendre une session ne consomme pas de crédit supplémentaire. Lire les corrigés, consulter les favoris ou les brouillons reste libre.

Pour les comptes, les réservations sont atomiques côté PostgreSQL, identifiées par UUID et idempotentes. Deux appareils partagent le compteur. Les utilisateurs ne peuvent ni effacer leurs réservations, ni modifier leur abonnement par l’API. En invité, le compteur est local au navigateur/appareil ; ce mode de découverte ne permet pas de garantir un quota par personne. Les questions de démonstration sont embarquées côté client ; cette limite commerciale ne constitue pas un mécanisme de protection contre l’extraction du catalogue.

Le code prévoit qu’un abonnement **Stripe de production**, actif, payé et non expiré, débloque les sessions sans plafond quotidien. Les sessions d’entraînement peuvent utiliser toutes les questions compatibles avec les filtres (**170 au total : 30 cas cliniques et 140 questions d’anatomie**). Les matchs gardent dix questions pour assurer des conditions comparables. Les tarifs demandés restent **5 € TTC par mois ou 25 € TTC par an**. Les paiements Stripe ne sont pas activés faute d’identifiants de configuration. Les achats sandbox ne lèvent pas le quota public. Les annulations restent valides jusqu’à l’échéance payée ; les droits expirés sont refusés sans dépendre d’un retour de navigateur. Voir [STRIPE.md](../STRIPE.md) pour les secrets, tarifs, webhooks et vérifications nécessaires.

## Séries quotidiennes de révision

Une journée devient active dès la première question répondue, juste ou fausse, en entraînement solo ou en duel. Les jours suivent le calendrier `Europe/Paris`, changements d’heure compris. L’objectif quotidien n’est pas une condition pour conserver la série. La série de la veille reste disponible jusqu’à la fin de la journée en cours ; sans activité ce jour-là, la continuité sera rompue le lendemain.

L’accueil affiche la série en cours, les sept derniers jours, le record et les paliers à 3, 7, 14, 30 et 100 jours. Le calcul utilise les tentatives enregistrées, déduplique leurs identifiants et retrouve la progression synchronisée pour les comptes. Les séries servent à encourager la régularité ; elles ne changent pas les quotas, les droits Premium ou les points du classement.

## Compétition

Deux comptes créent/rejoignent une invitation avec code. L’hôte démarre un quiz commun après un compte à rebours. Le duel dure trois minutes ; la course dure une minute. Le serveur choisit les questions, vérifie les réponses et applique l’échéance. Le score est le nombre de réponses justes ; une égalité reste une égalité. Les réponses correctes et explications sont disponibles après la partie. Fermer l’onglet ne remet pas le timer à zéro ; la reprise passe par les parties récentes.

Les pseudonymes et années d’étude 1 à 12 sont déclarés par les utilisateurs. L’année reste fixe après la première partie de la saison et pendant une invitation active. Les classements sont séparés par année et par saison universitaire. Les schémas compétitifs sont filtrés côté serveur selon l’année des deux joueurs. Les rangs Placement, Bronze, Argent, Or, Platine et Diamant décrivent des résultats de jeu. La compétition utilise des questions de démonstration non relues médicalement : classement bêta, aucune certification de compétence clinique.

Les deux joueurs doivent déclarer la même année d’étude. Seule la première partie terminée contre un même adversaire dans la journée de Paris modifie les points Elo ; les revanches restent jouables et consomment une session, mais ne permettent pas de multiplier les points.

Les questions, réponses et scores compétitifs sont stockés dans un schéma non exposé. L’API n’accepte pas de score ou de temps fourni par le client. La finalisation et la mise à jour des points sont idempotentes. Une reconnexion ou une réponse reçue deux fois ne doit pas attribuer de points supplémentaires.

## Bibliothèque

Le support [Anatomie](ANATOMIE.md) propose un atlas 3D WebGL original rendu avec Three.js : 36 structures, cinq systèmes, rotation, zoom, isolation, opacité et repères d’attaches, avec une vue 2D de repli. Sept parcours accompagnent la première année à l’internat. Les filtres combinent objectifs, structure et années 1 à 12.

Ses **140 questions anatomiques originales** incluent 98 exercices sur sept groupes musculaires, couvrant origines, insertions, actions, innervation et rapports. Les versions bilingues conservent leurs identifiants et leurs réponses. La migration Supabase intégrant les 98 questions à la banque compétitive privée est appliquée. Les volumes et schémas restent simplifiés ; aucun asset de Complete Anatomy n’est embarqué. Ces questions demeurent des **démonstrations en attente de relecture médicale**, séparées des brouillons issus des livres.

Le dossier fourni a été inventorié en lecture seule : 244 fichiers locaux, dont 170 PDF, et deux archives ISO inspectées sans les monter. Le catalogue réunit 262 références documentaires indexées. Neuf PDF ont fourni les pages lues pour rédiger 64 questions originales en français et en anglais. Les numéros de pages indiquent la position dans le PDF (commençant à 1), pas nécessairement la pagination imprimée.

La page Spécialités contient une recherche documentaire et des aperçus de questions. Les 64 questions restent des **brouillons**, séparés des quiz notés et des classements, en attente de relecture médicale. Indexer un ouvrage ne signifie pas avoir lu toutes ses pages. Les textes bruts extraits restent dans `.local/sources`, ignoré par Git et absent du site. Les livres, vidéos et illustrations ne sont pas republiés. Le script d’import permet de poursuivre le travail sur les PDF ; les scans, vidéos et anciens formats demandent OCR, transcription ou un lecteur adapté.

La mise en ligne de questions validées nécessite encore un responsable éditorial identifiable et une validation effective des sources et des contenus ; le code ne fabrique pas cette validation.
