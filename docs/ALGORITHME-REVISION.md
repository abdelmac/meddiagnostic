# Révision espacée v1

Calcul déterministe, sans IA et sans prétendre être un modèle clinique validé. Les échéances sont des instants UTC ; l’interface les affiche en date locale. Les intervalles représentent des jours de 24 heures, et non des jours civils.

| Dernière réponse | Confiance | Prochain intervalle |
| --- | --- | --- |
| Incorrecte | Toute | 1 jour ; série de réussites remise à zéro |
| Correcte | Fragile | 1 jour |
| Correcte | Moyenne | max(2, ancien intervalle × 2), plafond 14 jours |
| Correcte | Solide | max(4, ancien intervalle × 3), plafond 60 jours |

Une question jamais revue a un ancien intervalle de 1 jour. Les questions échues sont triées par échéance ; les questions marquées « À revoir » sont ajoutées immédiatement sans doublon. Une session tire au plus 20 questions sans remplacement. Une réponse à une question marquée retire le marqueur ; le marquer après la correction permet de la reproposer immédiatement.

La confiance est subjective : « Je peux l’expliquer » n’est pas une preuve de compétence. La réussite sur une question nouvelle et celle sur une répétition sont calculées séparément. Les tentatives stockent la version du contenu ; la banque v1 est immuable. Une future correction éditoriale devra conserver les anciennes versions sur le serveur.

Une réponse est identifiée par session/question/version ; une seconde validation dans la même session ne crée pas de tentative. Le chronomètre d’examen utilise l’instant de début (il continue pendant une interruption). Les non-réponses ne rapportent aucun point. Le score a pour dénominateur le nombre de questions de la session.

Les filtres ne portent que sur les cas réellement disponibles. Une longueur demandée dépassant le stock est réduite avant le départ et annoncée à l’étudiant.
