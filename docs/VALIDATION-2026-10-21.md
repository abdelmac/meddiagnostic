# Validation du 21 octobre 2026 — Ippomed et authentification dédiée

La première section décrit la version Ippomed actuellement publiée. Les suivantes conservent les contrôles des publications précédentes du jour. Le rapport historique [VALIDATION.md](VALIDATION.md) ne décrit plus les capacités actuelles des comptes et du serveur.

## Authentification dédiée publiée

Version Cloudflare : `80533347-606d-46e8-96d4-ec44ad73e207`. Entrée directe : <https://medquiz-europe.medcompass-web.workers.dev/auth>.

- Page connexion/inscription FR/EN avec l’emblème Ippomed, présentation adaptée au mobile, Google et parcours e-mail sans mot de passe. L’en-tête, le profil et la compétition ouvrent cette page.
- Écran de vérification par lien ou code si le message en contient un ; renvoi après 60 secondes, modification de l’adresse, reprise de la demande après rechargement. Le code saisi reste en mémoire et n’est jamais inclus dans la demande sauvegardée. Cette demande locale est supprimée après connexion ou déconnexion.
- Validation des champs et messages contrôlés pour code incorrect/expiré, réseau, limitation d’envoi et annulation OAuth. Les diagnostics bruts et états d’existence de compte ne sont pas affichés. Les retours acceptent seulement trois écrans internes et conservent le mode et la destination après annulation Google.
- TypeScript, audit des traductions et recherche des secrets serveur connus : réussis. **64 tests Node/PostgreSQL réussis**, dont dix nouveaux tests de validation et de messages Auth.
- **55 scénarios navigateur validés**. La première suite a réussi 52 scénarios et ignoré les trois répétitions mobiles d’intégrations serveur. Trois échecs de harnais (sélecteur ambigu et lecture dans une navigation OAuth interceptée) ont été corrigés ; la relance ciblée a réussi les sept scénarios exécutés et ignoré la répétition mobile de vérification serveur.
- Un compte synthétique s’est connecté avec un code vérifié par le serveur réel, a retrouvé le profil puis a été supprimé avec révocation de session. La livraison d’e-mails était interceptée pour ne contacter personne. Les tests comptes entre appareils et les deux modes compétitifs ont également réussi ; tous les comptes et fichiers de fixtures ont été nettoyés.
- Après publication du build final : **28 contrôles réussis** sur Chrome bureau et aux dimensions iPhone 13, sur l’URL publique. Les envois d’e-mails et le fournisseur OAuth sont simulés dans ces scénarios. Les captures `artifacts/auth-desktop.png`, `auth-mobile-web.png` et `auth-verification-desktop.png` permettent de revoir l’interface.
- Audit distant Auth : e-mail activé et confirmation exigée ; Google désactivé. Les URL et paramètres OTP déclarés correspondent au projet distant. L’état SMTP personnalisé et les modèles distants ne sont pas confirmés par cet audit ; aucune réception d’e-mail public ni authentification auprès du vrai fournisseur Google n’a été validée. Voir [AUTHENTIFICATION.md](AUTHENTIFICATION.md).
- Advisors ne remonte aucun défaut de base de données. L’avertissement Auth préexistant sur les mots de passe compromis reste présent ; le parcours proposé ne demande aucun mot de passe.

La publication du formulaire ne configure pas les fournisseurs. Google attend le client OAuth Web ; l’ouverture des e-mails au public attend un expéditeur et un service d’envoi vérifiés. Le modèle bilingue Ippomed préparé dans `supabase/templates/code.html` n’a pas été activé à distance. Aucun achat de service ou changement de formule n’a été effectué.

## Publication précédente : emblème Ippomed

Version Cloudflare : `f175af05-1b04-432e-9328-91643a77ea1e`, sur <https://medquiz-europe.medcompass-web.workers.dev>. Elle remplace `da68772b-fe26-4012-a1fd-b678aad18a19` pour utiliser l’emblème sans texte préféré par l’utilisateur.

- Nom Ippomed, emblème sans texte fourni conservé à l’identique, avec fond transparent, palette violette et vert citron, titre et favicon actualisés. Les identifiants techniques `medquiz` et l’adresse existante sont conservés pour préserver les sessions et la progression.
- Remplacement de l’icône : export web et deux contrôles visuels bureau/mobile réussis ; après publication, comparaison des octets de l’emblème et du favicon avec les fichiers locaux et vérification de la référence HTML.
- Entrées Anatomie et Spécialités au même niveau sur l’accueil. Atlas WebGL2 Three.js : rotation réelle, zoom, sélection, isolation, transparence, repères d’attaches et vue 2D alternative. 36 structures originales dans cinq systèmes ; 34 appels de rendu GPU mesurés, rendu à la demande et résolution limitée sur mobile.
- 98 questions musculaires FR/EN supplémentaires, couvrant sept groupes, leurs origines, insertions, actions, innervation et applications. Banque totale : 140 questions d’anatomie et 30 cas cliniques, soit 170 démonstrations. Filtres par structure, objectif et année 1–12 ; sept parcours de cours. Les 64 brouillons issus des livres restent séparés.
- Séries calculées par jours calendaires de Paris : semaine, record, objectif et paliers. Une réponse suffit, même incorrecte. Les duels ajoutent les horodatages du serveur ; identifiants stables, rechargement et fusion entre appareils évitent les doublons.
- Migration `20261021150104_muscle_quiz_bank.sql` appliquée sur le projet dédié. Les 98 questions enrichissent la banque compétitive privée. L’instantané compétitif expose uniquement les dates de réponse du joueur connecté ; corrigés et scores restent protégés par les contrôles existants.
- TypeScript, audit de traduction, export web et recherche des secrets serveur connus dans les artefacts : réussis. **54 tests Node/PostgreSQL réussis**.
- Suite complète avant publication : **31 tests navigateur réussis**, trois répétitions mobiles d’intégrations serveur explicitement ignorées. Deux comptes réels synthétiques ont joué le duel et le sprint ; les 20 réponses ont produit 20 événements uniques et une série d’un jour, conservée après rechargement.
- Après publication : **14 contrôles réussis** sur Chrome bureau et aux dimensions iPhone 13. Identité Ippomed, WebGL2 et rotation, quiz d’insertion ciblé, atlas 2D, cours avancé, traduction, profil et série persistante. Deux de ces contrôles simulent l’absence de WebGL et confirment le repli 2D interactif.
- Comptes synthétiques et fichiers de sessions nettoyés. Advisors ne signale aucun défaut de base de données ; l’avertissement Auth préexistant sur la protection contre les mots de passe compromis reste présent. L’interface publique utilise Google ou des liens e-mail et ne demande aucun mot de passe.

Les volumes et les repères d’attaches sont schématiques ; cette livraison n’est pas un atlas exhaustif. Le contenu attend une relecture médicale. Aucun asset de Complete Anatomy n’a été utilisé ; la notice MIT de Three.js est distribuée dans `/licenses/three-MIT.txt`. Ces tests ne valident ni la précision scientifique, ni Safari/appareils physiques, ni une charge à l’échelle européenne. Google et les achats Stripe réels restent désactivés jusqu’au raccordement des identifiants fournisseur décrits plus bas.

## Publication précédente : anatomie 2D

Version Cloudflare finale : `548e4592-8e81-4c19-b80b-bcd6985a25f9`, sur <https://medquiz-europe.medcompass-web.workers.dev>.

- 36 structures dessinées dans le projet, cinq calques, vues face/dos, sélection directe sur le corps, recherche bilingue et zoom.
- 42 questions illustrées FR/EN, six pour chaque année 1–6 et six avancées partagées par les années 7–12 ; sept parcours de cours. Le catalogue jouable compte désormais 72 démonstrations, séparées des 64 brouillons issus des livres.
- Migration `20261021143820_anatomy_competitive_bank.sql` appliquée : banque privée enrichie, questions anatomiques filtrées par année, profils et classements 1–12.
- TypeScript, audit i18n, build web et recherche de secrets dans le bundle réussis. 37 tests Node/PostgreSQL réussis ; les quatre tests de contenu et filtrage anatomique ont été relancés avec succès après l’ajout du niveau Avancé.
- Suite complète : 27 tests Chrome réussis, trois intégrations serveur volontairement non répétées en dimensions mobiles. Les deux modes compétitifs ont été rejoués avec deux comptes réels de test.
- Après le dernier build, les quatre tests anatomie passent encore : clic sur le biceps dans le SVG, cinq calques, recherche du nerf sciatique, face/dos, zoom, traduction, quiz année 12, nom masqué puis révélé dans le corrigé.
- Après publication, huit contrôles réussissent sur le site public : profil, sources, atlas et quiz anatomie, sur Chrome bureau et en dimensions iPhone 13. Les comptes synthétiques ont ensuite été supprimés. Le dernier passage d’Advisors Supabase retourne une liste vide de problèmes.

Les dessins restent des schémas 2D simplifiés et une sélection de repères. Les cours et questions attendent une relecture médicale. Les tests d’interface ne valident pas la qualité scientifique, l’exhaustivité du programme ni l’accessibilité sur des lecteurs d’écran physiques. Voir [ANATOMIE.md](ANATOMIE.md).

## Résultats

- TypeScript et export statique web : réussis.
- 29 tests Node/SQL : réussis. PostgreSQL embarqué PGlite exécute les migrations et vérifie notamment l’isolation des comptes, les droits Premium, les quotas, la compétition et les données Stripe privées.
- 4 tests Deno des fonctions Stripe : réussis avec fournisseur simulé. Ils ne constituent pas un paiement Stripe réel.
- 23 parcours Chrome : réussis sur le build testé. Trois répétitions mobiles de scénarios d’intégration serveur ont été explicitement ignorées ; elles ne sont pas comptées comme réussies.
- Quota vérifié sur Supabase distant : huit réservations simultanées pour un compte gratuit ont donné exactement trois acceptations. La reprise est idempotente et le plafond de dix questions est contrôlé côté serveur pour les comptes connectés. Les droits de test ne suppriment pas le quota de production.
- Advisors Supabase : aucun défaut de sécurité de base de données remonté. L’avertissement de protection contre les mots de passe compromis reste présent ; l’interface publique ne demande aucun mot de passe.
- Les comptes synthétiques des parcours comptes et compétition ont été supprimés avec les scripts de nettoyage dédiés. Les fichiers locaux de leurs sessions ont aussi été retirés.

## Vérification après publication

URL : <https://medquiz-europe.medcompass-web.workers.dev>.

Version Cloudflare contrôlée : `39a77fa1-255b-46a8-8f1f-be8ea4f42655`.

Huit contrôles ont réussi sur cette URL publique : profil Google/quotas/Stripe, catalogue de sources et brouillons bilingues, quota invité persistant et reprise, puis changement FR/EN pendant une session. Chaque scénario a été exécuté sur Chrome bureau et sur Chrome avec les dimensions d’un iPhone 13.

Les fonctions Stripe distantes ont également répondu comme prévu :

| Requête | Résultat constaté |
| --- | --- |
| `stripe-billing`, action publique `plans` | HTTP 200, `available: false`, aucune offre achetable |
| `stripe-billing`, action `status` sans session | HTTP 401, `unauthorized` |
| `stripe-webhook` sans configuration fournisseur | HTTP 503, `not_configured` |

Ces contrôles n’ont effectué aucun achat et n’ont envoyé aucun e-mail.

## Limites de validation et d’activation

Google Cloud et Stripe ont été choisis, avec les tarifs demandés de 5 € par mois ou 25 € par an. L’activation réelle attend les identifiants OAuth et la configuration Stripe côté serveur : prix, clés et secret de signature du webhook. Aucun secret ne doit être placé dans le bundle web. Une connexion Google réelle et un paiement réel n’ont pas été validés.

Les tests Stripe utilisent des réponses simulées ; renouvellement, annulation, échec de paiement et restitution des droits devront aussi être vérifiés contre le compte Stripe configuré avant l’ouverture des achats. L’envoi d’e-mails Supabase par défaut reste limité ; la délivrabilité publique n’a pas été validée.

Le quota invité repose sur le stockage du navigateur et peut être remis à zéro par l’utilisateur. Les contrôles serveur des comptes connectés sont distincts. Les quiz pédagogiques restent des contenus de démonstration ; les propositions issues des documents sont signalées comme brouillons non relus et ne constituent pas des contenus médicaux validés.

La compétition a été vérifiée avec des comptes fictifs et un score/timer calculés par le serveur. Cela ne constitue ni un test de charge à l’échelle européenne ni une preuve d’absence de toute triche.

Les dimensions mobiles sont simulées dans Chromium. Aucun test physique iPhone/Android, Safari mobile, application native, VoiceOver ou TalkBack n’est revendiqué. Les contrôles de l’anatomie sont décrits dans la première section de ce rapport.
