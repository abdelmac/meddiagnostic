# Comptes et paiements de test — livraison du 17 octobre 2026

## Infrastructure appliquée

- Organisation Supabase dédiée : MedQuiz (`hyfbnpzekiyhehyjnujo`), sans activation d’abonnement payant.
- Projet : `wpukzqrqajcnjltnqxvh`, région Paris `eu-west-3`.
- Migration `20261017143433_accounts_and_subscriptions.sql` appliquée et versionnée.
- Fonctions serveur `entitlement`, `revenuecat-webhook`, `delete-account` déployées. Elles vérifient elles-mêmes la session ou l’authentification du webhook ; la vérification JWT de passerelle est désactivée pour permettre les nouvelles clés publiques et les webhooks externes.
- Aucun plan payant, SMTP payant ou achat réel activé. Le frontend reste un export statique Cloudflare ; le backend utilise les quotas du projet gratuit.

## Comptes et conservation des données

Connexion par lien e-mail, avec saisie d’un OTP si le message en contient un. Les adresses sont vérifiées par Supabase ; aucun mot de passe n’est demandé par l’application. Les données invitées existantes gardent la même clé locale. Chaque compte possède son propre cache local ; changer de compte remonte un Store différent afin d’éviter de montrer les données du compte précédent.

Lors d’une création de compte demandée depuis ce navigateur, une intention d’import liée à l’adresse vérifiée est enregistrée. Après vérification, les résultats invités sont fusionnés avec ceux du compte, sauvegardés localement et envoyés au serveur. Un import manuel reste disponible. La source invitée n’est pas effacée sur erreur réseau. Les identifiants des tentatives assurent la déduplication ; les questions, versions et réponses ne changent pas avec la langue.

La synchronisation se déclenche après modification, à la reprise de l’application, manuellement et périodiquement. Les snapshots utilisent une version serveur et un compare-and-swap transactionnel : un conflit oblige à relire et fusionner avant une nouvelle écriture. Les favoris, marqueurs et préférences utilisent des horloges logiques avec identifiant d’appareil, y compris les suppressions, pour éviter la réapparition des favoris retirés. Les révisions sont recalculées à partir des tentatives fusionnées. Une session en cours reste propre à l’appareil ; les sessions terminées sont synchronisées.

Limites actuelles : snapshot complet plafonné à 2 Mio par utilisateur, sans pagination des tentatives dans ce format initial ; prévoir une normalisation/archivage quand les volumes l’exigeront. Les caches de comptes ne sont pas chiffrés contre une personne ayant accès au navigateur ou à son stockage. Ne jamais conserver de données réelles de patients.

## Limite confirmée sur les e-mails — ouverture publique bloquée

L’envoi Supabase par défaut est limité aux membres de l’organisation et à un quota réduit. Il ne permet pas l’inscription publique de tous les étudiants. Le serveur a également refusé la personnalisation du modèle d’e-mail sans SMTP personnalisé ; aucun passage au payant n’a été effectué. Le parcours utilise donc le lien de connexion standard, avec une indication de bêta dans l’interface.

Pour ouvrir les inscriptions : raccorder un compte SMTP transactionnel (hôte, port, utilisateur, secret, expéditeur autorisé), vérifier la délivrabilité et les limites gratuites du fournisseur choisi. Ne pas désactiver la confirmation d’e-mail. Le modèle bilingue `supabase/templates/code.html` est prêt à activer une fois SMTP configuré ; il n’est pas activé avec l’envoi par défaut.

Référence : [SMTP Supabase et restrictions de l’envoi par défaut](https://supabase.com/docs/guides/auth/auth-smtp).

## Paiements sandbox — configuration fournisseur manquante

Le SDK web RevenueCat est intégré avec chargement à la demande. Seules les clés sandbox `rcb_sb_…` sont acceptées et le SDK doit confirmer `isSandbox()`. Le compte Supabase est l’identifiant client RevenueCat. Les prix mensuel/annuel, la devise, le total et la période proviennent des produits du fournisseur ; aucun prix de vente n’est codé en dur pour le checkout. L’accès actif et les achats existants sont vérifiés avant de proposer un nouvel achat.

Les clés RevenueCat ne sont pas disponibles dans cet environnement. Aucun produit ni Offering n’a été créé, aucun checkout exécuté et aucune transaction sandbox réelle validée. L’écran indique donc que les produits attendent la configuration. Les achats natifs iOS/Android restent à intégrer avec les comptes boutiques et un development build ; aucun lien d’achat externe n’a été ajouté aux applications natives.

Pour tester le web :

1. Créer/configurer un projet RevenueCat et son moteur Web Billing sandbox avec Stripe test ou le sandbox proposé par RevenueCat.
2. Créer les produits mensuel et annuel, l’entitlement `premium` et un Offering courant. Utiliser les prix hypothétiques seulement comme prix de test.
3. Ajouter `EXPO_PUBLIC_REVENUECAT_WEB_SANDBOX_KEY` au build Expo.
4. Configurer côté Supabase les secrets `REVENUECAT_SECRET_KEY` et `REVENUECAT_WEBHOOK_AUTHORIZATION` (jamais dans le bundle client).
5. Configurer un webhook sandbox vers `https://wpukzqrqajcnjltnqxvh.supabase.co/functions/v1/revenuecat-webhook`, avec exactement le même en-tête Authorization.
6. Tester achat, renouvellement, annulation à échéance, expiration, remboursement, échec de paiement, doublon de livraison et accès sur plusieurs appareils. Vérifier la gestion de l’abonnement via le portail renvoyé par RevenueCat.

La fonction `entitlement` authentifie le compte et consulte l’état canonique RevenueCat côté serveur. Un entitlement absent, expiré ou non sandbox n’accorde aucun droit. Le webhook est authentifié, puis son ID est enregistré transactionnellement avec la mise à jour des droits. Les doublons et événements anciens ne remplacent pas un événement plus récent. Les clients n’ont aucun droit d’écriture sur les entitlements ou événements de paiement.

La banque de démonstration reste gratuite. Il n’existe pas encore de banque commerciale validée à débloquer. La sécurisation des contenus Premium devra être faite sur les futurs endpoints du catalogue, pas seulement dans l’interface.

## Suppression et export

L’export local est disponible dans le profil. Synchroniser avant export pour récupérer les modifications des autres appareils. La suppression du compte requiert une connexion récente (< 10 minutes), la saisie DELETE et une vérification serveur. Elle révoque les sessions puis supprime l’utilisateur ; les données des tables liées sont supprimées par cascade. Un abonnement de test encore actif doit être géré avant suppression pour éviter un abonnement orphelin.

L’information de confidentialité et les conditions de vente devront être finalisées avec les coordonnées réelles de l’éditeur avant l’ouverture publique et la monétisation. Aucune conformité juridique complète n’est revendiquée.

## Vérification effectuée

18 tests unitaires/SQL : scores, reprise, révisions, fusion, horloges logiques, retraits de favoris, RLS entre deux comptes, compare-and-swap, interdiction d’écrire les droits Premium, événements idempotents et droits sandbox. PostgreSQL embarqué PGlite exécute réellement le SQL de migration.

11 parcours navigateur ont passé ensemble (10 parcours invité/bilingue sur ordinateur et mobile, 1 intégration multi-contextes contre le Supabase réel). Un test supplémentaire de vérification du code et suppression du compte fictif a passé séparément : l’envoi d’e-mail y est intercepté pour ne contacter personne, tandis que la vérification du code et la suppression utilisent le serveur réel. Cela ne prouve pas la délivrabilité des e-mails.

RLS a aussi été contrôlé directement sur le serveur pour les trois tables. L’advisor Supabase ne signale pas de défaut de RLS ; il signale la protection contre les mots de passe compromis non activée. L’interface est sans mot de passe ; cette option de fournisseur n’a pas été activée par un abonnement payant.

Les fixtures sont des comptes aléatoires `@example.invalid`, supprimables avec `node scripts/account-fixtures.mjs --clean`. Les fichiers `.local/` contiennent des secrets de provisionnement et de tests et sont ignorés par Git. Ne jamais les publier ni les inclure dans un export web.

Après publication : quatre contrôles navigateur réussis sur l’URL publique (profil bilingue et parcours FR/EN, chacun sur ordinateur et mobile). Les trois fonctions serveur renvoient 401 sans authentification. Les comptes de test ont été supprimés et une requête distante confirme qu’il n’en reste aucun. La version Cloudflare publiée est `9c38f5ae-62de-42d4-a3f1-79d47de6587c`.

Les liens de connexion ont été préparés et testés pour le web. Le traitement des liens d’authentification natifs, les achats iOS/Android et les essais sur appareils restent à finaliser ; aucune nouvelle validation native n’est revendiquée pour cette livraison.
