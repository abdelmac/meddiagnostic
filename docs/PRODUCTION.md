# Travail restant avant production

Mise à jour du 17 octobre 2026 : les comptes bêta, la synchronisation, les règles RLS, les fonctions d’entitlement/webhook sandbox et la suppression du compte sont maintenant implémentés et déployés. Les détails de configuration et limites réelles sont dans COMPTES-PAIEMENTS.md. Les étapes B et C ci-dessous conservent le plan initial ; l’administration, SMTP public, les clés et produits du fournisseur de paiement et la validation de son cycle réel restent à terminer.

## Contenu médical et iconographie — bloquant

Les 30 cas sont des démonstrations originales, non relues. Les liens actuels renvoient à des ressources générales ; chaque question doit obtenir des références précises et une date de révision médicale réelle. Améliorer les distracteurs avec un relecteur, vérifier les diagnostics différentiels et les niveaux de difficulté. La date de rédaction ne doit jamais être présentée comme une date de validation.

Obtenir des images anonymisées, avec autorisation commerciale écrite/licence documentée, attribution, URL de provenance et diversité pertinente. Les dessins décoratifs de l’interface ne sont pas des images diagnostiques. Les cas visuels restent exclus tant que les images et la relecture manquent. Implémenter alors zoom, annotations après réponse et packs hors connexion avec version et expiration.

## Étape B — comptes, serveur, administration (non implémentée)

Supabase proposé pour Auth, PostgreSQL et Storage. Paramètres publics futurs : `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Secrets serveur uniquement : `SUPABASE_SERVICE_ROLE_KEY`. Aucun de ces paramètres n’est lu ni requis dans la démo actuelle.

Prévoir des tables de versions de questions immuables, spécialités/thèmes, tentatives, sessions, favoris et échéances par utilisateur, signalements, validations et journal éditorial. RLS sur chaque table exposée, propriété par `auth.uid()`, permissions d’éditeur/relecteur dans des données serveur non modifiables par le client. Les rôles ne doivent jamais provenir de `user_metadata`. Les droits Premium ne doivent pas être modifiables par les clients.

À la création du compte : conserver un export invité, importer les tentatives par leur identifiant stable et ne supprimer la file locale qu’après accusé de réception. Séparer les caches par compte, appliquer les suppressions via tombstones et régler explicitement les conflits multi-appareils. `mergeAttempts` teste uniquement la déduplication ; ce n’est pas un service de synchronisation.

Administration à développer : brouillon → à relire → validé → publié ; interdiction de publication sans relecteur habilité, sources et licences. Tout changement après validation invalide cette validation et crée une version. Import JSON validé, archivage, aperçus ordinateur/mobile, signalements et audit des actions. Pas de panneau d’administration factice exposé dans la démo.

Pas de migration livrée à cette étape : aucun schéma serveur n’a été appliqué. La suppression du compte devra révoquer les sessions puis supprimer les données côté serveur ; la suppression locale actuelle n’est pas une suppression de compte distant.

## Étape C — abonnements sandbox (non implémentée)

Au 17 octobre 2026, piste : [RevenueCat](https://www.revenuecat.com/docs/web/stripe) avec Stripe web et achats des boutiques mobiles. Vérifier le parcours exact et les tarifs du projet avant intégration. RevenueCat recommande une [vérification des webhooks et une resynchronisation via l’API abonné](https://www.revenuecat.com/docs/integrations/webhooks).

Paramètres à fournir dans un environnement test : identifiant projet Supabase, clés publiques SDK RevenueCat par plateforme, clé secrète RevenueCat et secret webhook côté serveur, identifiants de produits mensuel/annuel, compte Stripe test, comptes développeur Apple/Google et produits sandbox. **Ne jamais préfixer les clés secrètes par `EXPO_PUBLIC_`.**

Le compte Supabase doit être l’identifiant stable du client RevenueCat. Le serveur vérifie l’entitlement Premium en consultant les informations authentifiées du fournisseur. À chaque webhook : authentifier, dédupliquer par ID, rafraîchir l’état canonique, appliquer transactionnellement et tolérer le désordre des événements. Ne pas supprimer les droits sur une simple annulation avant échéance. Tester expiration, remboursement, grâce de paiement, incident de facturation, renouvellement, transfert et restauration multi-appareils. Une interface de restauration ne vaut pas preuve de droit serveur.

Les prix de production viendront du produit retourné par la boutique, avec devise, durée et total. Vérifier un abonnement existant sur toutes les plateformes avant de proposer un nouvel achat ; afficher sa plateforme de gestion. Les quotas gratuits seront décidés côté serveur ; les corrections déjà acquises doivent rester consultables.

Aucun lien d’achat externe n’est présent dans l’application native. Avant ajout, vérifier les [règles Apple 3.1](https://developer.apple.com/app-store/review/guidelines/#in-app-purchase) et les [règles Google Play](https://support.google.com/googleplay/android-developer/answer/9858738) selon le pays et le programme applicable. Cette vérification reste un jalon avant implémentation ; aucune exemption n’est présumée.

## Mesure (non instrumentée à distance)

Événements futurs avec identifiant pseudonyme, horodatage et version de schéma, sans texte clinique libre : `first_quiz_started` (premier lancement), `first_quiz_completed` (première session terminée), `correction_viewed` (correction effectivement affichée), `review_completed`, `premium_viewed`, `subscription_confirmed`, `renewal`, `cancellation`, `refund`, `medical_issue_reported`. Les événements de paiement viennent du serveur. Dédupliquer par ID.

Activation = premier quiz terminé / nouveaux utilisateurs ayant commencé un quiz. Rétention J1/J7/J30 = utilisateurs ayant une action d’apprentissage au jour civil correspondant après leur premier quiz / cohorte initiale éligible et observée sur toute la fenêtre. Conversion = abonnés confirmés / activés, avec fenêtre fixée à 30 jours. Marge par cohorte = revenu reconnu moins coûts attribuables de cette cohorte. Distinguer production, tests et démo et afficher les dénominateurs. Aucun indicateur de rétention n’est inventé à partir des données locales.

## Étape D — appareils et distribution

1. Valider le contenu, les licences, les mentions légales, la politique de confidentialité et les règles d’abonnement.
2. Choisir les identifiants de bundle ; ajouter icône, splash, captures et liens de support réels.
3. Configurer EAS (`eas.json` fourni), comptes Apple/Google et certificats. Le développement iOS local nécessite macOS ; les builds EAS nécessitent des comptes et accès réseau. Ne pas lancer de build payant sans connaître les conditions du compte.
4. Tester sur iPhone, Android et tablettes : persistance hors connexion, reprise après arrêt forcé, chronomètre en arrière-plan, clavier, taille de texte système, VoiceOver/TalkBack, orientation, faibles réseaux et réinstallation.
5. Tests backend : isolation de deux comptes, imports répétés, publication interdite sans validation, aucun secret dans les bundles, cycle complet d’abonnement sur plusieurs appareils.
6. Beta TestFlight/Play internal auprès de 15–30 étudiants avant publication. Préparer les pages publiques par spécialité, les fiches boutiques et les éléments d’acquisition décrits dans PRODUIT.md.

Proposition de fiche boutique (à adapter après validation) : **MedQuiz — quiz médicaux**. Description courte : « Reliez les signes cliniques, comprenez vos erreurs et révisez à votre rythme. » Ne pas annoncer de photos, de synchronisation ou de banque validée avant leur disponibilité ; ne pas promettre de réussite aux examens.
