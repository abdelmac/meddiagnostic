# Publication web à 0 € — 17 octobre 2026

URL publique vérifiée : https://medquiz-europe.medcompass-web.workers.dev

- Français : https://medquiz-europe.medcompass-web.workers.dev/?lang=fr
- English : https://medquiz-europe.medcompass-web.workers.dev/?lang=en
- Worker : `medquiz-europe` ; dernière version publiée (comptes bêta) : `9c38f5ae-62de-42d4-a3f1-79d47de6587c`.

## Choix retenu : Cloudflare Workers Static Assets

L’application Expo est exportée en fichiers statiques. [Les requêtes et le stockage des assets statiques sont gratuits](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/), avec distribution sur le CDN mondial. Il n’y a pas de Worker métier ni de `run_worker_first`. Le sous-domaine `workers.dev` évite l’achat d’un domaine. Les comptes et leur progression utilisent désormais un projet Supabase gratuit à Paris, avec ses propres quotas. Aucun service d’IA n’est utilisé pendant les quiz.

Cloudflare Pages est également adapté (500 builds mensuels sur le gratuit). Workers Static Assets a été retenu car le compte local dispose déjà des droits de déploiement Workers et que Cloudflare le documente comme son parcours pour les assets statiques. [Vercel Hobby](https://vercel.com/docs/plans/hobby) exclut l’usage commercial ; [Render Static Sites](https://render.com/docs/static-sites) convient aussi mais partage les quotas de bande passante et de builds du workspace. Ces offres sont vérifiées à la date ci-dessus, sans garantie que les conditions ne changeront pas.

L’hébergement statique convient à une bêta européenne. Cela ne signifie pas hébergement exclusivement dans l’UE : le CDN est mondial. En mode invité, les réponses restent dans le navigateur. Pour les comptes connectés, elles sont synchronisées dans le projet Supabase de Paris. Les fournisseurs reçoivent nécessairement les requêtes HTTP et leurs métadonnées. Voir COMPTES-PAIEMENTS.md pour les limites et la préparation de l’ouverture publique.

## Reproduire la publication

```sh
npm ci
npm run typecheck
npm test
npm run check:i18n
npm run build:web
npm run test:e2e
npx --yes wrangler@4.151.1 deploy
```

Commande raccourcie pour les publications suivantes : `npm run deploy:web`. Le compte est fixé par l’identifiant public dans `wrangler.jsonc` pour éviter un déploiement dans un autre compte. L’authentification reste dans le gestionnaire de credentials local, jamais dans le dépôt. Si besoin : `npx --yes wrangler@4.151.1 login`.

Ne pas activer une offre payante, acheter un domaine ou ajouter des fonctions serveur pour cette version. Les limites de taille/nombre de fichiers et les conditions d’utilisation du fournisseur s’appliquent. Les futures images doivent être optimisées ; leur acquisition et relecture médicale peuvent entraîner des coûts éditoriaux indépendants de l’hébergement.

## Français et anglais

Le sélecteur FR/EN est disponible dans l’en-tête et le profil. La préférence persiste localement et, sans choix enregistré, la langue du navigateur/appareil détermine français ou anglais. Les 30 cas, les propositions, les corrections, les indices et les objectifs ont une version anglaise. Identifiants et indices des réponses restent identiques pour conserver sessions et révisions lors du changement de langue.

Les traductions médicales, comme les originaux, sont des démonstrations non validées médicalement. Une relecture bilingue reste nécessaire avant publication commerciale d’une banque validée.

Les messages UI sont dans `src/i18n/en.ts`, les cas anglais dans `src/data/questions.en.ts`. `npm run check:i18n` contrôle la couverture des appels explicites de traduction. Les tests navigateur vérifient aussi les libellés dynamiques et un changement de langue pendant une session enregistrée.
