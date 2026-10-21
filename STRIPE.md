# Abonnements Stripe

Tarifs choisis : **5 € TTC par mois** ou **25 € TTC par an**, renouvelés automatiquement jusqu’à annulation. Gratuit : trois nouvelles sessions quotidiennes de dix questions au maximum. Seul un droit Premium **PRODUCTION** valide retire le quota. Un achat de test ne débloque pas les quotas publics.

Le site utilise directement Stripe Checkout et le portail client Stripe. Aucun compte RevenueCat n’est nécessaire. Aucun paiement réel n’est activé sans les quatre secrets serveur ci-dessous. Les frais de transaction éventuels relèvent du compte Stripe ; aucun service payant supplémentaire ni Stripe Tax n’est activé par le code.

Dans le [catalogue Stripe](https://dashboard.stripe.com/products), créer un produit Premium avec deux prix récurrents **EUR**, facturation par unité et taxes incluses (`tax_behavior=inclusive`) :

- Mensuel : `unit_amount=500`, intervalle `month`, `interval_count=1`.
- Annuel : `unit_amount=2500`, intervalle `year`, `interval_count=1`.

Le serveur refuse tout autre montant, devise, durée ou prix hors taxes. Ne pas remplacer les identifiants de prix d’abonnés existants sans migration de la liste des prix autorisés. Pour cette première configuration, conserver les prix autorisés pour tous les abonnés Premium.

Dans [Supabase / secrets des fonctions](https://supabase.com/dashboard/project/wpukzqrqajcnjltnqxvh/functions/secrets), ajouter uniquement côté serveur :

```
STRIPE_SECRET_KEY=sk_test_...          # puis clé live lorsque le lancement est prêt
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_YEARLY=price_...
```

Ne jamais mettre ces valeurs dans `EXPO_PUBLIC_*`, dans Git, dans un document public ou dans le bundle. Les prix et le webhook doivent appartenir au même environnement Stripe que la clé. La facturation reste indisponible tant que ces quatre valeurs ne sont pas présentes. Une clé `sk_test_` produit uniquement des droits SANDBOX ; une clé `sk_live_` permet PRODUCTION.

Dans [Stripe Workbench / Webhooks](https://dashboard.stripe.com/webhooks), créer une destination **Snapshot** avec le SDK Stripe 23.0.0 / sa version d’API, pour :

`https://wpukzqrqajcnjltnqxvh.supabase.co/functions/v1/stripe-webhook`

Événements : `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`, `invoice.paid`, `invoice.payment_failed`. Copier son secret de signature `whsec_...` dans Supabase. Conserver une destination pour l’environnement utilisé. Le serveur ignore les événements d’un environnement différent.

Dans le [portail client Stripe](https://dashboard.stripe.com/settings/billing/portal), activer la gestion des moyens de paiement, des factures et de l’annulation. Configurer l’annulation à la fin de la période payée si c’est la politique choisie. Autoriser uniquement les deux prix Premium lors d’un changement d’offre. Un abonnement actif, incomplet ou impayé empêche un deuxième achat ; le portail permet de gérer celui qui existe.

Avant un lancement avec paiements réels, renseigner dans Stripe l’identité du vendeur, les coordonnées de support, la politique de remboursement et les conditions applicables, puis configurer le traitement des taxes adapté à l’activité. L’option « taxes incluses » stabilise le montant payé ; elle ne réalise pas à elle seule le calcul, la déclaration ou le versement de TVA.

## Contrôles mis en œuvre

Les fonctions authentifient le compte Supabase et utilisent une correspondance client Stripe privée, inaccessible au navigateur. Elles n’acceptent jamais du navigateur un montant, un identifiant client Stripe ou un identifiant de prix. Un retour `?billing=success` n’active aucun droit.

Le serveur relit les abonnements depuis Stripe et exige un abonnement actif, une dernière facture payée, une période non expirée et un prix autorisé. Les états impayé, suspendu, expiré ou annulé retirent l’accès. Une annulation programmée conserve l’accès jusqu’à la fin de la période payée.

Chaque webhook est vérifié sur son corps brut avec la signature Stripe. Le serveur relit l’état actuel chez Stripe, y compris lors d’un ancien événement reçu en retard. La base déduplique l’événement. Une lease de 120 secondes par compte et environnement sérialise les vérifications et les achats, sans transaction SQL ouverte pendant les appels réseau. Une tentative Checkout conserve ses paramètres et sa clé d’idempotence en base ; les nouveaux clics réutilisent la session ouverte.

Un remboursement ou un litige doit être traité avec la politique du vendeur et la gestion de l’abonnement dans Stripe : rembourser une facture ne constitue pas une annulation automatique d’abonnement. Ce premier flux ne suspend pas automatiquement un abonnement à la seule réception d’un remboursement.

## Validation

Tests locaux : `npm.cmd test`. Contrôle des fonctions, sans résoudre les dépendances Expo : définir `DENO_NO_PACKAGE_JSON=1`, puis exécuter `npx.cmd --yes deno@2.9.6 check --no-config --no-lock --node-modules-dir=none supabase/functions/stripe-billing/index.ts supabase/functions/stripe-webhook/index.ts`.

La validation réelle d’un cycle d’achat, renouvellement, annulation et impayé exige les secrets de test du compte Stripe. Les tests de code et de base ne remplacent pas ce contrôle du fournisseur. Aucune transaction réelle ne doit servir de test.

Tests isolés des handlers avec Stripe et Supabase simulés, sans accès réseau : avec `DENO_NO_PACKAGE_JSON=1`, exécuter `npx.cmd --yes deno@2.9.6 test --no-config --no-lock --node-modules-dir=none --allow-env supabase/functions/_tests/stripe_test.ts`. Ils couvrent le catalogue public, l’authentification, les montants choisis, les identités imposées côté serveur, les doublons, la reprise idempotente et la vérification de signature sur les octets bruts.

Références : [abonnements Checkout](https://docs.stripe.com/billing/subscriptions/build-subscriptions), [signature des webhooks](https://docs.stripe.com/webhooks), [portail client](https://docs.stripe.com/api/customer_portal/sessions/create), [taxes incluses](https://docs.stripe.com/tax/products-prices-tax-codes-tax-behavior).
