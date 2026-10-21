import type { Question, Specialty } from "../domain/types";
import { anatomyQuestions } from "./anatomy-questions";
import { muscleQuestions } from "./muscle-questions";

export const specialties: {
  id: Specialty;
  name: string;
  subtitle: string;
  color: string;
  tint: string;
  icon: "skin" | "heart" | "lungs" | "body";
}[] = [
  {
    id: "dermatologie",
    name: "Dermatologie",
    subtitle: "Lire les signes de la peau",
    color: "#b56a48",
    tint: "#fbefdf",
    icon: "skin",
  },
  {
    id: "cardiologie",
    name: "Cardiologie",
    subtitle: "Comprendre le rythme du cœur",
    color: "#bd6476",
    tint: "#fbe9ee",
    icon: "heart",
  },
  {
    id: "pneumologie",
    name: "Pneumologie",
    subtitle: "Explorer la clinique respiratoire",
    color: "#4d859d",
    tint: "#e7f2f8",
    icon: "lungs",
  },
  {
    id: "anatomie",
    name: "Anatomie",
    subtitle: "Explorer le corps, de la première à la dernière année",
    color: "#6f6397",
    tint: "#f0edf8",
    icon: "body",
  },
];
// Original educational drafts. No medical validation or image rights are implied.
type Seed = [string, string, string, string[], string, string];
const dermatology: Seed[] = [
  [
    "Psoriasis en plaques",
    "Plaques et squames",
    "Une personne de 29 ans présente depuis plusieurs mois des plaques symétriques bien limitées sur les coudes et les genoux. Elles sont couvertes de squames épaisses. On observe de petites dépressions sur les ongles.",
    ["Faces d’extension", "Squames épaisses", "Atteinte unguéale"],
    "La distribution, les limites nettes et les anomalies unguéales convergent vers un psoriasis en plaques.",
    "Associer la morphologie des lésions à leur distribution et à l’examen des ongles.",
  ],
  [
    "Dermatite atopique",
    "Eczémas",
    "Une étudiante de 19 ans, avec antécédents personnels d’asthme, décrit des poussées de lésions prurigineuses et mal limitées des plis des coudes. Sa peau est sèche en dehors des poussées.",
    ["Prurit chronique", "Atteinte des plis", "Terrain atopique"],
    "Le prurit, la xérose et la topographie flexurale sur terrain atopique orientent vers une dermatite atopique.",
    "Le terrain et la chronologie complètent la description d’un eczéma.",
  ],
  [
    "Urticaire aiguë",
    "Lésions prurigineuses",
    "Une personne de 24 ans présente des plaques surélevées très prurigineuses. Chaque lésion disparaît en quelques heures sans trace, tandis que d’autres apparaissent ailleurs. Il n’y a pas d’atteinte muqueuse.",
    ["Lésions fugaces", "Migration", "Absence de squames"],
    "La disparition individuelle en moins de 24 heures est un argument majeur pour une urticaire.",
    "Demander combien de temps persiste UNE lésion, et non l’éruption entière.",
  ],
  [
    "Gale",
    "Parasitoses",
    "Plusieurs membres d’un même foyer se grattent surtout la nuit. Une personne présente des papules entre les doigts et aux poignets, avec de fins sillons.",
    ["Prurit nocturne", "Cas dans l’entourage", "Sillons interdigitaux"],
    "Le caractère collectif et nocturne du prurit associé aux sillons évoque la gale.",
    "Examiner les espaces interdigitaux et rechercher des cas dans l’entourage.",
  ],
  [
    "Zona",
    "Infections cutanées",
    "Une personne de 67 ans ressent une douleur brûlante sur un côté du thorax. Deux jours après apparaissent des vésicules groupées en bande, sans franchir la ligne médiane.",
    ["Douleur précédant l’éruption", "Vésicules", "Trajet unilatéral"],
    "Une éruption vésiculeuse douloureuse suivant un dermatome évoque une réactivation du virus varicelle-zona.",
    "La distribution dermatomérique est plus discriminante que la seule présence de vésicules.",
  ],
  [
    "Dermatophytie du corps",
    "Mycoses",
    "Une personne présente une plaque annulaire qui s’étend progressivement. Sa bordure est rouge et squameuse, tandis que le centre devient plus clair. Le prurit est modéré.",
    [
      "Extension centrifuge",
      "Bordure active squameuse",
      "Éclaircissement central",
    ],
    "La bordure active et l’extension centrifuge orientent vers une dermatophytie ; un prélèvement mycologique peut confirmer.",
    "Décrire la bordure d’une lésion annulaire et confirmer en cas de doute.",
  ],
  [
    "Impétigo",
    "Infections cutanées",
    "Un enfant de 6 ans a des érosions superficielles autour du nez et de la bouche, recouvertes de croûtes jaunâtres couleur miel. Un autre enfant de sa classe a des lésions similaires.",
    ["Croûtes mélicériques", "Topographie péribuccale", "Contagiosité"],
    "Les croûtes mélicériques sur lésions superficielles chez l’enfant sont évocatrices d’impétigo.",
    "Les croûtes couleur miel sont un indice, à interpréter dans le contexte.",
  ],
  [
    "Rosacée",
    "Dermatoses du visage",
    "Une personne de 43 ans rapporte des bouffées vasomotrices puis une rougeur persistante des joues et du nez. Des télangiectasies et des papules sont présentes, sans comédons.",
    ["Érythème centrofacial", "Flushs", "Absence de comédons"],
    "Le siège centrofacial, les flushs et l’absence de comédons orientent vers la rosacée plutôt que l’acné.",
    "Chercher les comédons pour distinguer des éruptions faciales papuleuses.",
  ],
  [
    "Acné vulgaire",
    "Dermatoses du visage",
    "Une adolescente présente des comédons ouverts et fermés sur le front, associés à des papules inflammatoires et quelques pustules sur le visage et le haut du dos.",
    ["Comédons", "Lésions polymorphes", "Zones séborrhéiques"],
    "La présence de comédons parmi des lésions inflammatoires dans les zones séborrhéiques oriente vers l’acné.",
    "Les comédons sont une clé du diagnostic d’acné.",
  ],
  [
    "Dermatite de contact allergique",
    "Eczémas",
    "Une personne développe des plaques eczémateuses prurigineuses sous un nouveau bracelet métallique, environ deux jours après l’avoir porté. Les lésions débordent légèrement la zone de contact.",
    ["Exposition localisée", "Délai retardé", "Eczéma prurigineux"],
    "La relation topographique et le délai après contact suggèrent un mécanisme allergique retardé ; des tests épicutanés peuvent être indiqués.",
    "Relier l’éruption à l’exposition et à sa chronologie sans affirmer l’allergène sans bilan.",
  ],
];
const cardiology: Seed[] = [
  [
    "Péricardite aiguë",
    "Douleurs thoraciques",
    "Une personne de 28 ans présente une douleur thoracique augmentée par l’inspiration et le décubitus, soulagée en se penchant en avant. L’ECG décrit un sus-décalage ST diffus et un sous-décalage PR.",
    ["Douleur positionnelle", "ST diffus", "PR abaissé"],
    "L’association douleur positionnelle et anomalies diffuses du ST/PR évoque une inflammation péricardique.",
    "Un ST diffus ne se lit pas comme un territoire coronaire unique.",
  ],
  [
    "Infarctus du myocarde aigu",
    "Douleurs thoraciques",
    "Une personne de 61 ans présente une douleur rétrosternale constrictive prolongée avec sueurs. L’ECG montre un sus-décalage ST dans des dérivations contiguës et les troponines augmentent avec une cinétique significative.",
    ["Douleur prolongée", "Territoire ECG", "Cinétique des troponines"],
    "Le contexte ischémique, les modifications territoriales et la lésion myocardique aiguë convergent vers un infarctus.",
    "Interpréter les troponines avec la clinique et l’ECG ; leur élévation isolée ne suffit pas.",
  ],
  [
    "Fibrillation auriculaire",
    "Troubles du rythme",
    "Une personne de 76 ans consulte pour des palpitations. Le pouls est irrégulier. L’ECG décrit des intervalles RR irréguliers sans ondes P organisées, avec des QRS fins.",
    ["RR irréguliers", "Absence de P organisées", "Pouls irrégulier"],
    "L’irrégularité complète et l’absence d’activité atriale organisée orientent vers la fibrillation auriculaire.",
    "Toujours analyser la régularité et l’activité atriale ensemble.",
  ],
  [
    "Insuffisance cardiaque gauche",
    "Dyspnée cardiaque",
    "Une personne de 72 ans se réveille essoufflée et dort désormais avec trois oreillers. L’examen retrouve des crépitants bilatéraux et l’échographie une fraction d’éjection ventriculaire gauche diminuée.",
    ["Orthopnée", "Crépitants bilatéraux", "Dysfonction ventriculaire gauche"],
    "La congestion pulmonaire associée à une dysfonction ventriculaire gauche explique la dyspnée.",
    "L’orthopnée est un indice de congestion, à confronter aux examens.",
  ],
  [
    "Rétrécissement aortique",
    "Valvulopathies",
    "Une personne de 79 ans présente une dyspnée et une syncope à l’effort. L’auscultation décrit un souffle systolique éjectionnel au foyer aortique irradiant vers les carotides.",
    ["Syncope d’effort", "Souffle éjectionnel", "Irradiation carotidienne"],
    "La clinique d’effort et le souffle éjectionnel irradiant aux carotides orientent vers un obstacle aortique ; l’échographie l’évalue.",
    "Caractériser le temps, le foyer et l’irradiation d’un souffle.",
  ],
  [
    "Insuffisance mitrale",
    "Valvulopathies",
    "Une personne présente une dyspnée progressive et un souffle holosystolique maximal à la pointe, irradiant vers l’aisselle. L’échographie montre un reflux systolique vers l’oreillette gauche.",
    ["Souffle apical holosystolique", "Irradiation axillaire", "Reflux mitral"],
    "Le reflux systolique ventriculo-atrial et la sémiologie du souffle correspondent à une insuffisance mitrale.",
    "Un souffle se confirme et se quantifie par l’échographie.",
  ],
  [
    "Endocardite infectieuse",
    "Infections cardiaques",
    "Une personne porteuse d’une prothèse valvulaire a une fièvre persistante. Plusieurs hémocultures sont positives au même germe et l’échographie transœsophagienne décrit une végétation sur la prothèse.",
    ["Prothèse valvulaire", "Hémocultures concordantes", "Végétation"],
    "L’association microbiologique et échographique sur terrain à risque est très évocatrice d’endocardite.",
    "Intégrer microbiologie, imagerie et contexte dans une suspicion d’endocardite.",
  ],
  [
    "Dissection aortique",
    "Urgences vasculaires",
    "Une personne hypertendue de 64 ans présente brutalement une douleur thoracique maximale d’emblée irradiant dans le dos, avec une asymétrie des pouls. L’angioscanner décrit un flap intimal aortique.",
    ["Début maximal brutal", "Asymétrie des pouls", "Flap intimal"],
    "Le dédoublement de la lumière aortique par un flap confirme la dissection dans ce contexte.",
    "Une douleur maximale d’emblée et des signes vasculaires doivent alerter.",
  ],
  [
    "Tamponnade cardiaque",
    "Péricarde",
    "Une personne ayant un épanchement péricardique devient hypotendue, avec turgescence jugulaire. L’échographie retrouve une compression diastolique des cavités droites.",
    ["Hypotension", "Turgescence jugulaire", "Compression des cavités droites"],
    "Un épanchement compromettant le remplissage cardiaque produit une tamponnade.",
    "C’est le retentissement hémodynamique, et non le seul volume, qui compte.",
  ],
  [
    "Syncope réflexe vasovagale",
    "Syncopes",
    "Une étudiante perd brièvement connaissance après être restée longtemps debout dans une pièce chaude. Elle avait des nausées, une sensation de chaleur et des sueurs. La récupération est rapide et l’ECG de repos est normal.",
    ["Station debout prolongée", "Prodromes végétatifs", "Récupération rapide"],
    "Le déclencheur et les prodromes sont compatibles avec une syncope réflexe ; les signes d’alarme doivent néanmoins être recherchés.",
    "Distinguer une syncope réflexe probable d’un épisode d’effort ou sans prodrome.",
  ],
];
const pulmonology: Seed[] = [
  [
    "Asthme",
    "Obstruction bronchique",
    "Une personne de 22 ans décrit des épisodes de dyspnée sifflante nocturne et à l’effort, avec des périodes sans symptômes. La spirométrie objective une obstruction variable avec réversibilité significative après bronchodilatateur.",
    ["Variabilité", "Sibilants épisodiques", "Obstruction réversible"],
    "La variabilité des symptômes et du débit expiratoire oriente vers l’asthme.",
    "Documenter la variabilité de l’obstruction plutôt que se fonder sur un sifflement isolé.",
  ],
  [
    "BPCO",
    "Obstruction bronchique",
    "Une personne de 65 ans avec 45 paquets-années présente toux chronique et dyspnée progressive. La spirométrie après bronchodilatateur confirme une obstruction persistante selon les critères adaptés au contexte.",
    [
      "Exposition tabagique",
      "Progression chronique",
      "Obstruction persistante",
    ],
    "L’exposition, la chronicité et l’obstruction persistante sont compatibles avec une bronchopneumopathie chronique obstructive.",
    "La BPCO nécessite une confirmation spirométrique.",
  ],
  [
    "Embolie pulmonaire",
    "Dyspnée aiguë",
    "Une personne de 38 ans, opérée récemment, présente une dyspnée brutale et une douleur thoracique inspiratoire. L’angioscanner met en évidence un défaut de rehaussement endoluminal d’une artère pulmonaire.",
    ["Chirurgie récente", "Début brutal", "Thrombus à l’angioscanner"],
    "Un défaut endoluminal artériel pulmonaire dans ce contexte correspond à une embolie pulmonaire.",
    "Les facteurs de risque orientent la probabilité, l’imagerie confirme ici.",
  ],
  [
    "Pneumothorax spontané",
    "Plèvre",
    "Une personne de 21 ans présente une douleur thoracique unilatérale brutale et une dyspnée. Le murmure vésiculaire est diminué d’un côté ; la radiographie décrit une ligne pleurale avec absence de trame vasculaire au-delà.",
    ["Douleur unilatérale brutale", "Murmure diminué", "Air pleural"],
    "La présence d’air dans l’espace pleural explique le décollement pulmonaire.",
    "Rechercher des signes de mauvaise tolérance devant un pneumothorax.",
  ],
  [
    "Pneumonie communautaire",
    "Infections respiratoires",
    "Une personne de 47 ans présente fièvre, toux productive et douleur basithoracique. Des crépitants sont localisés à droite et la radiographie montre une opacité alvéolaire systématisée avec bronchogramme aérien.",
    ["Fièvre", "Foyer auscultatoire", "Condensation alvéolaire"],
    "L’infection aiguë avec un foyer de condensation est compatible avec une pneumonie communautaire.",
    "Associer syndrome infectieux et atteinte parenchymateuse focale.",
  ],
  [
    "Épanchement pleural liquidien",
    "Plèvre",
    "Une personne présente une dyspnée progressive. L’examen retrouve une matité déclive et une diminution du murmure vésiculaire. L’échographie montre une collection liquidienne dans l’espace pleural.",
    ["Matité", "Murmure diminué", "Liquide à l’échographie"],
    "La collection pleurale explique la matité et la diminution des bruits respiratoires ; sa cause reste à préciser.",
    "Reconnaître le syndrome pleural avant d’en rechercher l’étiologie.",
  ],
  [
    "Tuberculose pulmonaire",
    "Infections respiratoires",
    "Une personne décrit une toux depuis six semaines, des sueurs nocturnes et un amaigrissement. L’imagerie retrouve des cavernes apicales et un test moléculaire sur expectoration détecte Mycobacterium tuberculosis.",
    ["Évolution prolongée", "Signes généraux", "Confirmation moléculaire"],
    "La mise en évidence du complexe tuberculeux confirme l’hypothèse suggérée par la clinique et l’imagerie.",
    "Une toux prolongée avec altération de l’état général nécessite une exploration.",
  ],
  [
    "Bronchectasies",
    "Voies aériennes",
    "Une personne a des infections respiratoires répétées et des expectorations quotidiennes abondantes. Le scanner montre des bronches dilatées dont le calibre dépasse celui de l’artère adjacente.",
    [
      "Bronchorrhée chronique",
      "Infections répétées",
      "Dilatation bronchique au scanner",
    ],
    "Le scanner objective des dilatations bronchiques permanentes responsables de l’encombrement.",
    "La description scanographique permet de reconnaître les bronchectasies.",
  ],
  [
    "Syndrome d’apnées obstructives du sommeil",
    "Sommeil",
    "Une personne de 54 ans décrit une somnolence diurne. Son entourage signale des ronflements et des pauses respiratoires nocturnes. L’enregistrement montre des interruptions répétées du débit avec persistance de l’effort respiratoire.",
    ["Somnolence", "Pauses observées", "Effort respiratoire conservé"],
    "La persistance de l’effort lors d’une interruption du débit caractérise un mécanisme obstructif.",
    "L’interrogatoire oriente ; l’enregistrement caractérise les événements.",
  ],
  [
    "Fibrose pulmonaire",
    "Atteintes interstitielles",
    "Une personne de 70 ans présente une dyspnée d’effort progressive et des crépitants secs aux bases. Les EFR montrent un trouble restrictif et le scanner des réticulations avec rayon de miel sous-pleural basal.",
    ["Crépitants secs", "Restriction", "Rayon de miel"],
    "Ces éléments évoquent une atteinte interstitielle fibrosante. Le caractère idiopathique ne peut être affirmé sans bilan étiologique.",
    "Reconnaître une fibrose ne suffit pas à la qualifier d’idiopathique.",
  ],
];
const groups = [dermatology, cardiology, pulmonology];
export const clinicalQuestions: Question[] = groups.flatMap((seeds, group) =>
  seeds.map((seed, index) => {
    const [diagnosis, theme, context, clues, reasoning, takeaway] = seed;
    const alternatives = [
      seed,
      seeds[(index + 1) % 10]!,
      seeds[(index + 3) % 10]!,
      seeds[(index + 6) % 10]!,
    ];
    const offset = index % 4;
    const ordered = [
      ...alternatives.slice(offset),
      ...alternatives.slice(0, offset),
    ];
    return {
      id: `${specialties[group]!.id}-${index + 1}`,
      version: 1,
      specialty: specialties[group]!.id,
      theme,
      difficulty: index < 6 ? "débutant" : "intermédiaire",
      type: "clinique",
      objective: `Identifier ${diagnosis.toLowerCase()} à partir d’indices discriminants.`,
      title: "Quelle est l’hypothèse la plus probable ?",
      context,
      clues,
      options: ordered.map((item) => ({
        label: item[0],
        explanation:
          item === seed
            ? reasoning
            : `Cette hypothèse ne rend pas aussi bien compte de l’ensemble des indices : ${clues.join(", ").toLowerCase()}. À comparer : ${item[4]}`,
      })),
      correct: ordered.indexOf(seed),
      reasoning,
      takeaway,
      sources:
        group === 0
          ? [
              {
                title:
                  "DermNet — ressources de dermatologie (relecture à réaliser)",
                url: "https://dermnetnz.org/topics",
              },
            ]
          : [
              {
                title: `Manuel MSD — ${group === 1 ? "cardiologie" : "pneumologie"} (relecture à réaliser)`,
                url: `https://www.msdmanuals.com/fr/professional/${group === 1 ? "troubles-cardiovasculaires" : "troubles-pulmonaires"}`,
              },
            ],
      editorialDate: "2026-10-17",
      status: "demo",
      medicalReviewer: null,
    };
  }),
);

export const questions: Question[] = [...clinicalQuestions, ...anatomyQuestions, ...muscleQuestions];

export const visualDrafts: Question[] = [
  {
    ...questions[0]!,
    id: "visual-psoriasis-draft",
    type: "visuel",
    status: "draft",
    context:
      "Cas visuel en attente d’une photographie avec licence commerciale et d’une validation médicale.",
  },
];
