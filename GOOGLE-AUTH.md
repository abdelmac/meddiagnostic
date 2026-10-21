# Connexion Google — Ippomed

## État vérifié le 21 octobre 2026

L’API publique Auth du projet Supabase répond HTTP 200 et déclare **Google désactivé** (`external.google = false`). L’intégration PKCE existe dans l’application, mais aucun parcours Google réel ne peut être validé tant que le fournisseur n’est pas configuré. L’existence du projet Google Cloud a été indiquée par le propriétaire ; son client OAuth, son audience et sa validation de marque n’ont pas été inspectés.

Le bouton Google interroge les paramètres publics Supabase. Il ne démarre une connexion que si le fournisseur Google est activé. La connexion utilise PKCE : le code reçu est échangé par le SDK dans le navigateur qui a commencé la connexion. Les messages d’erreur fournis dans les URL ne sont jamais affichés tels quels.

## Configuration Google Cloud

Dans [Google Auth Platform](https://console.cloud.google.com/auth/overview), sélectionner le projet du propriétaire et créer ou utiliser un client OAuth de type **Application Web** :

- Origine JavaScript autorisée : `https://medquiz-europe.medcompass-web.workers.dev`.
- URI de redirection autorisée : `https://wpukzqrqajcnjltnqxvh.supabase.co/auth/v1/callback`.
- Branding : nom **Ippomed**, [emblème fourni](public/brand/ippomed-emblem.png), contact de support du propriétaire, accueil et politique de confidentialité accessibles publiquement. Les noms techniques `medquiz` dans les URL et le stockage restent conservés pour compatibilité.
- Audience : externe pour les utilisateurs européens hors de l’organisation Google Cloud. Vérifier l’état test/production et les comptes autorisés dans la console ; leur état actuel est inconnu.
- Accès aux données : uniquement `openid`, `userinfo.email` et `userinfo.profile`, correspondant à la connexion et au profil de base. Aucun accès Gmail ou Drive n’est nécessaire.

Pour afficher publiquement la marque et l’emblème dans le consentement, suivre les demandes de vérification Google concernant le site, les coordonnées et les domaines contrôlés. La marque Ippomed n’a pas été vérifiée pendant cet audit. Un domaine Auth Supabase personnalisé n’est pas nécessaire au callback actuel et n’est pas provisionné. Voir les guides officiels [Supabase Google](https://supabase.com/docs/guides/auth/social-login/auth-google) et [vérification de marque Google](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification).

## Configuration Supabase et retours

Dans [Supabase / fournisseur Google](https://supabase.com/dashboard/project/wpukzqrqajcnjltnqxvh/auth/providers?provider=Google), activer Google et renseigner l’identifiant client et son secret **uniquement côté Supabase**. Aucun secret Google ne doit être ajouté à une variable `EXPO_PUBLIC_*`, à Git, ni au bundle du site. La configuration de l’application ne nécessite pas le secret Google.

Le Site URL reste `https://medquiz-europe.medcompass-web.workers.dev` et les retours supplémentaires restent `http://localhost:8081`, `http://127.0.0.1:8081`, `medquiz://**`. La comparaison distante en lecture seule du 21 octobre ne détecte aucune dérive sur ces champs déclarés dans `supabase/config.toml`.

Le web revient à **l’origine du site**, même lorsque la connexion commence depuis l’entrée dédiée `/auth`. Il n’est pas nécessaire de remplacer le callback Google ni les retours Supabase par `/auth`. Le callback Google vers Supabase et le retour final vers Ippomed remplissent deux rôles distincts. Un build natif revient à `medquiz://auth/callback` ; le code natif vérifie cette adresse avant tout échange PKCE. Ce chemin natif n’a pas été validé sur un appareil physique. Voir [les URL de retour Supabase](https://supabase.com/docs/guides/auth/redirect-urls).

## Compte, progression et vérifications à réaliser

Choisir « Créer un compte » puis Google autorise l’import de la progression invitée de cet appareil dans le compte vérifié par Google. L’intention expire après 15 minutes. Choisir « Se connecter » évite cet import automatique ; il reste disponible manuellement dans le profil.

Après configuration, vérifier une création de compte et une reconnexion dans le même navigateur, l’annulation du consentement, l’import invité intentionnel et la synchronisation entre deux sessions autorisées. Cet audit n’a activé aucun fournisseur, créé aucun utilisateur ni envoyé d’e-mail.

Les méthodes e-mail sont détaillées dans [AUTHENTIFICATION.md](docs/AUTHENTIFICATION.md). Avec PKCE, ouvrir le lien dans le même navigateur et sur le même appareil ; un code ne peut être saisi que si le modèle reçu en propose réellement un. L’état actuel du SMTP personnalisé et des modèles distants n’a pas été confirmé par les outils d’inspection disponibles. Google, une fois correctement configuré pour les profils Google vérifiés, ne dépend pas de l’envoi du lien de connexion par le SMTP d’Ippomed.

Informations à demander au propriétaire : projet Google Cloud à utiliser, client OAuth Web choisi, état de publication de l’audience, contact de support et URL publique de confidentialité à déclarer. Le secret doit être saisi dans Supabase par un canal sécurisé, jamais collé dans la conversation.

Références : [configuration Google officielle Supabase](https://supabase.com/docs/guides/auth/social-login/auth-google), [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow), [retours natifs](https://supabase.com/docs/guides/auth/native-mobile-deep-linking).
