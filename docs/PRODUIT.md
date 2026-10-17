# MedQuiz — décisions produit

## Comparaison courte, consultée le 17 octobre 2026

Faits observés sur les sites officiels, sans extrapoler leurs résultats pédagogiques :

| Solution | Cible et pédagogie | Gratuit et abonnement |
| --- | --- | --- |
| [AMBOSS](https://www.amboss.com/us/students) | Étudiants en médecine ; Qbank liée à une bibliothèque médicale | [Essai de 5 jours et 50 questions](https://support.amboss.com/hc/en-us/articles/360044684571-Set-up-your-AMBOSS-account). Accès payant bibliothèque/Qbank ; tarif dépendant du forfait, à consulter dans le panier. |
| [Kenhub](https://www.kenhub.com/fr/pricing) | Étudiants en santé ; atlas, vidéos et quiz d’anatomie | [Articles et atlas gratuits](https://www.kenhub.com/en/library/education/kenhub-for-free-is-it-possible), quiz et vidéos Premium. Plusieurs durées ; prix local à vérifier au paiement. |
| [DermNet](https://dermnetnz.org/quizzes) | Professionnels et apprenants ; cas dermatologiques visuels par thème | Quiz publics consultables gratuitement. Aucun abonnement nécessaire observé pour ces quiz ; cela ne signifie pas que toutes les offres DermNet sont gratuites. |

Hypothèse à valider : les étudiants entrant en clinique apprécient une boucle courte en français « reconnaître → comprendre chaque distracteur → réviser selon ses erreurs et sa confiance ». Pas de revendication d’unicité ni de supériorité clinique.

## Ordre de livraison

A. Parcours invité commun Expo : découverte, personnalisation courte, quiz, correction, résultat, révision ; persistance locale, historique, favoris, erreurs et progression. Banque de démonstration séparée, non validée médicalement.

B. Comptes et migration des données invitées vers un serveur, synchronisation idempotente, administration avec rôles et journal, mesures consenties.

C. RevenueCat/Stripe en sandbox, prix issus des boutiques, droits serveur et webhooks authentifiés/idempotents ; achats externes uniquement après vérification territoriale des règles Apple/Google.

D. Relecture médicale habilitée, iconographie sous licence commerciale, tests physiques iOS/Android et publication. Ne pas commercialiser la démo comme une banque validée.

## Arbitrages de la première livraison

- Une seule base Expo/React Native/Router, sans backend fictif ni paiement simulé donnant des droits Premium.
- Aucun compte demandé avant le quiz. Données locales conservées à la fermeture, sans serveur ni collecte distante.
- 30 cas cliniques originaux, 10 par spécialité. Aucun nom de relecteur inventé. Les liens bibliographiques permettent la relecture ; ils ne constituent pas une validation de ces questions.
- Pas de photographie clinique sans provenance/licence. La reconnaissance visuelle reste un travail éditorial explicitement bloquant pour le lancement.
- Corrections et révisions des réponses accessibles gratuitement dans cette version de démonstration.
- Les résultats décrivent des réponses à des QCM ; ils ne mesurent pas une compétence clinique.

## Bêta et acquisition

Recruter 15 à 30 étudiants entrant en clinique, avec consentement ; une semaine d’usage libre, entretien initial et final. Mesurer premier quiz terminé, correction consultée, retour J1/J7/J30 et révision terminée (cohortes définies par date du premier quiz). Séparer systématiquement démonstration et production ; ne pas conclure sur un petit effectif.

Questionnaire : compréhension des corrections (1–5), utilité pour identifier les indices (1–5), point de blocage, exemple d’explication ambiguë, intention de retour, disposition à payer 9,99 €/mois ou 69,99 €/an, autre prix proposé. Ces prix sont des hypothèses.

Expériences proposées, non exécutées : partenariat tutorat (budget 100 €, 20 quiz terminés), contenu pédagogique organique par spécialité (100 €, 10 retours J7), campagne test ciblée (150 €, coût par premier quiz terminé < 5 €). N’augmenter le budget qu’après validation rétention et marge.
