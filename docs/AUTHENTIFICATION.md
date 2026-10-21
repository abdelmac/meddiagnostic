# Authentification Ippomed : ouverture au public

Audit en lecture seule du **21 octobre 2026**, réalisé sur le projet Supabase `wpukzqrqajcnjltnqxvh`. Aucun paramètre distant, compte, fournisseur ni formule payante n’a été modifié ; aucun e-mail n’a été envoyé. Les sorties d’inspection ont été limitées aux états et paramètres utiles, sans secret ni adresse personnelle.

## Ce qui est confirmé

| Élément | État observé | Preuve et limite |
| --- | --- | --- |
| Service Auth | Réponse HTTP 200 | Lecture de `/auth/v1/settings` avec la clé publique du projet. |
| Connexion Google | Désactivée | `external.google = false` dans les paramètres publics distants. |
| Connexion e-mail | Activée | `external.email = true` ; cela ne démontre pas la délivrabilité des messages. |
| Création de comptes | Autorisée côté Auth | `disable_signup = false` ; les autres restrictions d’envoi restent applicables. |
| Confirmation e-mail | Requise | `mailer_autoconfirm = false` ; le fichier local déclare aussi `enable_confirmations = true`. |
| URL du site et retours | Aucun écart détecté sur les champs déclarés | `config diff` compare la configuration locale au projet distant en lecture seule. |
| Paramètres du code e-mail | 8 chiffres, expiration 600 secondes, nouvelle demande espacée d’au moins une minute | Valeurs déclarées dans `supabase/config.toml`, sans dérive détectée. Elles ne prouvent pas qu’un code figure dans l’e-mail reçu. |
| Flux applicatif | PKCE et retour web à l’origine du site | Lecture de `src/services/supabase.ts` et `src/auth.tsx`. |

La comparaison CLI ne présente aucune modification nécessaire des champs déclarés ; ses deux différences Auth concernent des options MFA TOTP distantes, hors du périmètre de cette ouverture. Aucune de ces options n’a été changée.

La route `/auth` sert d’entrée dédiée à la connexion. Elle ne nécessite pas de changer le retour final : le web continue à utiliser `https://medquiz-europe.medcompass-web.workers.dev`. Les retours supplémentaires configurés restent `http://localhost:8081`, `http://127.0.0.1:8081` et `medquiz://**`. Le callback Google, distinct, reste `https://wpukzqrqajcnjltnqxvh.supabase.co/auth/v1/callback`.

## Parcours disponible dans l’application

L’entrée `/auth` présente des modes connexion et inscription distincts, avec la nouvelle identité Ippomed et un affichage adapté aux écrans mobiles. Elle est accessible depuis l’en-tête, le profil et la compétition. La vérification e-mail conserve l’adresse, le mode et la date de la demande pendant une heure maximum pour permettre une reprise après rechargement ; le code saisi n’est jamais enregistré. Une connexion réussie ou une déconnexion retire cette demande locale.

Le renvoi attend une minute après un envoi accepté. Les erreurs de saisie, de code expiré, de réseau et de limitation d’envoi utilisent des messages FR/EN contrôlés, sans afficher le diagnostic brut du fournisseur ni confirmer l’existence d’un compte. Les retours après connexion utilisent seulement les destinations internes accueil, profil et compétition ; une URL externe fournie comme destination n’est pas suivie. Après une annulation Google, la destination et le mode initial restent disponibles pour réessayer.

La page et ces contrôles ne lèvent pas les restrictions du fournisseur. Google reste désactivé jusqu’à sa configuration. L’envoi d’e-mails au public nécessite de vérifier et de raccorder le service d’envoi ; les essais automatisés de livraison sont simulés pour ne contacter personne.

## Points encore inconnus ou à raccorder

- **Google Cloud :** le propriétaire dispose d’un projet, mais le client OAuth Web, l’audience test/production, les utilisateurs de test et la vérification de marque n’ont pas été inspectés. Le fournisseur Supabase demeure désactivé. Suivre [GOOGLE-AUTH.md](../GOOGLE-AUTH.md).
- **SMTP personnalisé distant :** aucun bloc SMTP n’est déclaré dans la configuration locale. Les commandes CLI de comparaison et de prévisualisation ne donnent pas ici un état SMTP explicite ; son activation, l’expéditeur et la délivrabilité n’ont donc pas été confirmés à nouveau. Le dernier état documenté du projet utilisait le SMTP Supabase par défaut.
- **Modèles distants :** leur contenu n’est pas exposé par les inspections réalisées. Il est impossible d’affirmer qu’ils affichent un code OTP plutôt qu’un lien. Aucun envoi d’essai n’a été déclenché pour le vérifier.
- **Domaine et expéditeur :** aucun domaine de marque contrôlé ni expéditeur SMTP vérifié n’a été fourni pour cette étape. Le sous-domaine Cloudflare existant héberge l’application ; il ne prouve pas que l’équipe contrôle un domaine d’envoi de courrier.

## Ouvrir les comptes e-mail au public

Si le projet utilise toujours le SMTP Supabase par défaut, l’envoi est limité aux adresses des membres de l’équipe du projet, avec actuellement deux messages par heure. Il ne suffit donc pas d’afficher une page d’inscription pour accepter les étudiants extérieurs. Un serveur SMTP personnalisé est nécessaire pour cette ouverture ; ses limites et celles de Supabase continuent à s’appliquer. Ces restrictions sont décrites dans la [documentation SMTP officielle](https://supabase.com/docs/guides/auth/auth-smtp).

Dans Supabase, vérifier d’abord l’état de **Authentication → Email → SMTP Settings**. Si un service existe déjà, conserver ses identifiants dans ce panneau ou dans un gestionnaire de secrets. Sinon, choisir avec le propriétaire un fournisseur compatible avec le budget de 0 €, vérifier son quota gratuit et les conditions d’envoi du moment, puis recueillir l’hôte, le port, l’utilisateur et le mot de passe SMTP par un canal sécurisé. Aucun fournisseur ni abonnement n’est provisionné par cet audit.

Configurer un nom d’expéditeur **Ippomed** et une adresse vérifiée chez le fournisseur. Si l’envoi utilise un domaine propre, appliquer les enregistrements DNS exigés par ce fournisseur, notamment SPF/DKIM et la politique DMARC retenue. Le propriétaire doit identifier le domaine et l’accès DNS disponibles ; aucun achat de domaine n’est présumé. Vérifier les liens de confidentialité et de support avant la diffusion publique.

Après configuration, un essai contrôlé sur une adresse extérieure autorisée par son propriétaire devra vérifier la réception, l’expéditeur, le lien ou le code, l’expiration et la connexion effective. Cet essai reste à réaliser, sans l’assimiler aux tests locaux qui simulent une livraison.

## Lien magique et code OTP

`signInWithOtp` peut envoyer un lien magique ou un code selon le modèle du message. Le nom de cette méthode ne garantit pas l’affichage d’un code. Pour un lien PKCE, l’utilisateur doit conserver le navigateur et l’appareil qui ont lancé la demande. La saisie manuelle reste une option uniquement si l’e-mail reçu contient effectivement le code. Voir la [connexion e-mail sans mot de passe](https://supabase.com/docs/guides/auth/auth-email-passwordless) et [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow).

Le fichier local `supabase/templates/code.html` a ensuite été préparé sous la marque **Ippomed**, en français et en anglais, avec le lien `{{ .ConfirmationURL }}` et le code `{{ .Token }}`. Il n’est pas référencé dans `supabase/config.toml` et son activation distante n’est pas confirmée : sa préparation ne change aucun e-mail envoyé par le serveur.

Depuis le 3 juin 2026, les nouveaux projets gratuits utilisant le SMTP Supabase par défaut ne peuvent pas personnaliser leurs modèles Auth. Un SMTP personnalisé permet cette personnalisation sans imposer un changement de formule Supabase. Le projet Ippomed a été créé après cette date : activer un modèle personnalisé suppose donc de vérifier d’abord le fournisseur SMTP. Voir le [changement officiel sur les modèles e-mail gratuits](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier).

## Informations à obtenir

Le propriétaire a confirmé ne disposer d’aucun domaine ni service d’envoi. Le [raccordement Brevo Free préparé](BREVO-GRATUIT.md) décrit une solution de démarrage sans achat de domaine, sous réserve de validation de l’expéditeur et d’activation du transactionnel par Brevo. Aucun fournisseur n’a encore été raccordé.

1. Projet Google Cloud, client OAuth Web choisi et état de l’audience ; saisie du secret directement dans Supabase.
2. Contact de support et page de confidentialité publics à déclarer sous la marque Ippomed.
3. Domaine contrôlé et accès DNS disponibles, ou expéditeur déjà vérifié chez un service SMTP.
4. Fournisseur SMTP existant ou formule gratuite choisie, quota d’envoi et mode de message souhaité : lien, code ou les deux.

Ne demander aucune clé secrète dans une conversation ni dans un fichier public. Les variables `EXPO_PUBLIC_*` sont visibles dans le client : elles ne doivent contenir ni secret OAuth, ni mot de passe SMTP, ni clé Supabase privilégiée.

## Documentation consultée

Le [changelog Supabase](https://supabase.com/changelog) et les guides Auth ont été relus pour cet audit. Le changement du 3 juin sur les modèles affecte directement la préparation des e-mails. La [fin annoncée de certains chiffrements TLS anciens](https://supabase.com/changelog/cbc-tls-ciphers-deprecated), au plus tôt le 10 novembre 2026, concerne les clients obsolètes et ne démontre pas un blocage des navigateurs modernes d’Ippomed. Le guide [Observability](https://supabase.com/docs/guides/observability), désormais cible du guide Monitoring and Debugging, sert de référence pour l’analyse des erreurs ; aucun log utilisateur n’a été exporté.
