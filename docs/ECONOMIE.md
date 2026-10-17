# Modèle économique illustratif

Exécuter `npm run economics`. Modifier les hypothèses dans `scripts/economics.ts`. Le modèle effectue une simulation mensuelle de cohortes sur 24 mois avec répartition mensuel/annuel et renouvellements. Tous les paramètres sont **non validés** ; les taux de frais et de taxe ne constituent pas des tarifs contractuels ou une qualification fiscale.

Prix TTC hypothétiques : 9,99 €/mois et 69,99 €/an. Taxe simulée : 20 %. Frais agrégés simulés : 20 % du revenu hors taxe, à remplacer par une ventilation boutique/web, frais fixes, RevenueCat et frais bancaires réels. Le modèle est une approximation financière, pas une comptabilité réglementaire.

| Paramètre | Prudent | Intermédiaire | Favorable |
| --- | ---: | ---: | ---: |
| Visiteurs mensuels | 2 000 | 5 000 | 12 000 |
| Inscription | 12 % | 12 % | 12 % |
| Activation parmi inscrits | 60 % | 60 % | 60 % |
| Conversion parmi activés | 3 % | 6 % | 10 % |
| Part annuelle des nouveaux achats | 65 % | 65 % | 65 % |
| Résiliation mensuelle | 12 % | 8 % | 5 % |
| Renouvellement annuel | 40 % | 55 % | 70 % |
| Remboursements initiaux | 3 % | 3 % | 3 % |
| Utilisateurs gratuits actifs | 1 200 | 1 200 | 3 000 |

Coût par utilisateur gratuit actif : 0,08 €/mois ; par abonné : 0,25 €/mois. Ces coûts variables simulent stockage/transfert et charge opérationnelle. Coûts fixes mensuels intermédiaires : hébergement 80 €, rédaction/relecture 800 €, licences 150 €, support 150 €, maintenance 500 €, acquisition 200 €. Favorable : rédaction/relecture 1 600 €, support 300 €, acquisition 600 €. Ces budgets ne sont pas des devis et peuvent être très insuffisants selon le contenu acquis.

- **Encaissements HT** : règlements mensuels et achats/renouvellements annuels du mois, après remboursements et taxe simulée.
- **CA HT / MRR HT** : mensualités actives + abonnements annuels actifs divisés par 12, hors taxe. Un paiement annuel n’est pas intégralement compté comme revenu du mois.
- **Marge contributive** : CA moins frais de paiement provisionnés sur ce revenu, coût variable des abonnés et coût des gratuits.
- **Résultat mensuel** : marge contributive moins tous les coûts fixes listés. N’inclut pas les coûts absents des hypothèses (juridique, assurance, rémunération dirigeant, impôt sur résultat, investissements initiaux, etc.).
- **Seuil** : plafond((coûts fixes + coût des gratuits) / marge unitaire mensuelle). N’est calculé que si cette marge est positive. Utilise la répartition mensuel/annuel cible ; la répartition réelle du stock d’abonnés peut différer.

Le churn mensuel est appliqué avant les nouvelles souscriptions. Les nouveaux annuels sont remboursés selon le taux simulé ; les renouvellements interviennent après 12 mois pour chaque cohorte. Une annulation annuelle ne retire les droits qu’en fin de période : le taux de renouvellement modélise ce comportement. Les impayés sont compris dans l’attrition ; aucune prévision de recouvrement n’est fournie.

Résultats illustratifs à M12 (arrondis, hors taxe) :

| Scénario | Abonnés actifs | CA mensuel reconnu | Marge contributive | Résultat mensuel | Seuil d’abonnés cible |
| --- | ---: | ---: | ---: | ---: | ---: |
| Prudent | 42 | 239 € | 84 € | −1 796 € | 429 |
| Intermédiaire | 221 | 1 277 € | 870 € | −1 010 € | 429 |
| Favorable | 923 | 5 422 € | 3 867 € | 637 € | 753 |

La rentabilité dépend fortement d’hypothèses d’acquisition, de conversion et de coûts éditoriaux encore non vérifiées.

Pour affiner : prix/frais par territoire et boutique, TVA effective, frais fixes par transaction, coûts de support par cohorte, rétention gratuite, coût d’acquisition réel et calendrier de production médicale. Les résultats ne garantissent aucun revenu.
