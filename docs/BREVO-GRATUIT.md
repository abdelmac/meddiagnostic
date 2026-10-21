# E-mails Ippomed à 0 € sans domaine propre

Choix préparé le 21 octobre 2026 après confirmation du propriétaire : aucun domaine ni fournisseur d’envoi existant. Aucun compte Brevo n’a été créé, aucune configuration distante n’a été changée et aucun e-mail n’a été envoyé.

## Solution de démarrage

L’offre Brevo Free inclut actuellement 300 e-mails par jour, les envois transactionnels et l’accès SMTP, sans carte bancaire. Les e-mails d’inscription et de connexion sont transactionnels. Ce quota convient au démarrage ; il ne représente pas une capacité illimitée à l’échelle européenne.

Brevo permet de vérifier individuellement une adresse d’expéditeur par code reçu dans cette boîte. Pour une adresse gratuite ou un domaine non authentifié, sa documentation prévoit une réécriture temporaire de l’expéditeur transactionnel sous `t-sender-sib.com`. Les destinataires peuvent donc voir une adresse technique Brevo plutôt qu’un domaine Ippomed. L’accès au transactionnel doit être activé et peut demander une validation de Brevo ; la documentation de réécriture ne garantit pas l’acceptation immédiate de chaque nouveau compte.

Sources officielles : [offre gratuite](https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans), [expéditeur vérifié](https://help.brevo.com/hc/en-us/articles/208836149-Create-a-new-sender-From-name-and-From-email), [réécriture de l’expéditeur](https://help.brevo.com/hc/en-us/articles/14925263522578-Comply-with-Gmail-Yahoo-and-Microsoft-s-requirements-for-email-senders), [activation SMTP](https://help.brevo.com/hc/en-us/articles/115000188150-Troubleshooting-Issues-with-Brevo-SMTP).

## Étape du propriétaire

1. Créer un compte sur [Brevo](https://onboarding.brevo.com/account/register), conserver l’offre gratuite et confirmer l’adresse e-mail.
2. Créer un expéditeur nommé **Ippomed** avec une adresse dont le propriétaire contrôle la boîte ; valider le code envoyé par Brevo.
3. Vérifier que l’envoi transactionnel/SMTP est activé. Si Brevo demande une validation, décrire l’usage réel : liens et codes de connexion à une application de révision médicale, sans campagne marketing.
4. Ouvrir les paramètres **SMTP & API → SMTP**, relever l’identifiant SMTP et créer une **clé SMTP**. Une clé API Brevo ne remplace pas cette clé.

Ces actions nécessitent la validation de la boîte du propriétaire. Aucun mot de passe ou secret ne doit être collé dans la conversation, placé dans le code source ou dans une variable `EXPO_PUBLIC_*`.

## Raccordement Supabase préparé

Dans les [paramètres SMTP du projet Ippomed](https://supabase.com/dashboard/project/wpukzqrqajcnjltnqxvh/auth/smtp), renseigner :

| Champ | Valeur |
| --- | --- |
| Custom SMTP | Activé après activation Brevo |
| Sender email | Adresse d’expéditeur vérifiée dans Brevo |
| Sender name | Ippomed |
| Host | `smtp-relay.brevo.com` |
| Port | `587`, selon les réglages TLS indiqués par Brevo |
| Username | Identifiant SMTP fourni par Brevo |
| Password | Clé SMTP Brevo, stockée uniquement côté serveur |

Conserver la confirmation e-mail obligatoire. Ne pas augmenter automatiquement les limites Supabase : elles s’ajoutent au quota Brevo et doivent rester compatibles avec lui. Le modèle bilingue local `supabase/templates/code.html` est prêt, avec lien et code, mais n’est pas activé à distance.

Références : [SMTP Brevo](https://help.brevo.com/hc/en-us/articles/7924908994450-Send-transactional-emails-using-Brevo-SMTP), [SMTP Supabase](https://supabase.com/docs/guides/auth/auth-smtp).

## Vérification avant ouverture

Après configuration, vérifier la réception sur une adresse extérieure dont le propriétaire autorise l’essai, le lien dans le navigateur d’origine, le code, l’expiration et la reconnexion. La délivrabilité réelle ne peut pas être déduite des tests automatisés qui simulent l’envoi. Retirer l’indication d’inscription e-mail limitée à la bêta dans l’application seulement après cette vérification.

Google reste un moyen d’inscription indépendant du SMTP une fois le client OAuth raccordé : voir [GOOGLE-AUTH.md](../GOOGLE-AUTH.md). Aucun achat de domaine n’est requis par ce guide de démarrage ; le fournisseur pourra demander des éléments supplémentaires lors de l’activation.
