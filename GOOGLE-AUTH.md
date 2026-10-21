# Connexion Google

Le bouton Google interroge les paramètres publics Supabase. Il ne démarre une connexion que si le fournisseur Google est activé. La connexion utilise PKCE : le code reçu est échangé par le SDK dans le navigateur qui a commencé la connexion. Les messages d’erreur fournis dans les URL ne sont jamais affichés tels quels.

Dans Google Cloud / Google Auth Platform, créer ou utiliser un client OAuth de type **Application Web** :

- Origine JavaScript autorisée : `https://medquiz-europe.medcompass-web.workers.dev`.
- URI de redirection autorisée : `https://wpukzqrqajcnjltnqxvh.supabase.co/auth/v1/callback`.
- Consentement : application externe, identité MedQuiz, contact de support et URL publique de confidentialité. Utiliser uniquement les scopes `openid`, `email`, `profile` ; aucun accès Gmail ou Drive.
- Tant que l’application Google reste en mode test, ajouter les comptes de test dans Google. Passer l’audience en production lorsque les éléments requis par Google sont prêts.

Dans [Supabase / fournisseur Google](https://supabase.com/dashboard/project/wpukzqrqajcnjltnqxvh/auth/providers?provider=Google), activer Google et renseigner l’identifiant client et son secret **uniquement côté Supabase**. Aucun secret Google ne doit être ajouté à une variable `EXPO_PUBLIC_*`, à Git, ni au bundle du site. La configuration de l’application ne nécessite pas le secret Google.

Supabase doit conserver le Site URL `https://medquiz-europe.medcompass-web.workers.dev` et les retours autorisés `http://localhost:8081`, `http://127.0.0.1:8081`, `medquiz://**`. Le web revient à l’origine du site. Un build natif revient à `medquiz://auth/callback` ; le code natif vérifie cette adresse avant tout échange PKCE. Ce chemin natif n’a pas été validé sur un appareil physique.

Choisir « Créer un compte » puis Google autorise l’import de la progression invitée de cet appareil dans le compte vérifié par Google. L’intention expire après 15 minutes. Choisir « Se connecter » évite cet import automatique ; il reste disponible manuellement dans le profil.

La connexion par e-mail reste disponible. Avec PKCE, ouvrir le lien dans le même navigateur et sur le même appareil, ou saisir le code reçu lorsque le modèle e-mail en propose un. Le SMTP Supabase par défaut conserve ses restrictions de destinataires ; Google fonctionne indépendamment de ce SMTP une fois configuré.

Références : [configuration Google officielle Supabase](https://supabase.com/docs/guides/auth/social-login/auth-google), [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow), [retours natifs](https://supabase.com/docs/guides/auth/native-mobile-deep-linking).
