import { anatomySeedSources, anatomySeeds } from "./anatomy-questions";

export type AnatomyText = { fr: string; en: string };
export type AnatomyCourse = {
  year: number;
  title: AnatomyText;
  introduction: AnatomyText;
  objectives: AnatomyText[];
  sections: { title: AnatomyText; body: AnatomyText }[];
  structureIds: string[];
};
const bilingual = (fr: string, en: string): AnatomyText => ({ fr, en });

export const anatomyCourses: AnatomyCourse[] = [
  {
    year: 1,
    title: bilingual(
      "Se repérer dans le corps",
      "Find your way around the body",
    ),
    introduction: bilingual(
      "Commencer par la position anatomique et les grands repères osseux, puis retrouver chaque structure sur la silhouette.",
      "Start with the anatomical position and major bony landmarks, then locate each structure on the silhouette.",
    ),
    objectives: [
      bilingual(
        "Distinguer médial et latéral sur un corps vu de face.",
        "Distinguish medial from lateral on an anterior view.",
      ),
      bilingual(
        "Nommer les os des ceintures et des membres.",
        "Name the bones of the girdles and limbs.",
      ),
    ],
    sections: [
      {
        title: bilingual("Position et orientation", "Position and orientation"),
        body: bilingual(
          "La position anatomique décrit un sujet debout, face à l’observateur, les paumes tournées vers l’avant. La droite anatomique est celle du sujet représenté : elle apparaît à gauche sur une vue de face.",
          "The anatomical position describes a person standing upright, facing the observer, with palms forward. Anatomical right belongs to the person shown: it appears on the left of an anterior view.",
        ),
      },
      {
        title: bilingual(
          "Ceinture scapulaire et bras",
          "Pectoral girdle and arm",
        ),
        body: bilingual(
          "La clavicule et la scapula constituent la ceinture scapulaire. L’humérus appartient au bras ; le radius et l’ulna à l’avant-bras. En position anatomique, le radius est latéral et l’ulna médial.",
          "The clavicle and scapula form the pectoral girdle. The humerus belongs to the arm; the radius and ulna belong to the forearm. In the anatomical position, the radius is lateral and the ulna medial.",
        ),
      },
      {
        title: bilingual("Cuisse et jambe", "Thigh and leg"),
        body: bilingual(
          "Le fémur occupe la cuisse, entre hanche et genou. Le tibia et la fibula occupent la jambe, entre genou et cheville. Le mot « jambe » a donc un sens anatomique plus précis que dans le langage courant.",
          "The femur occupies the thigh, between hip and knee. The tibia and fibula occupy the leg, between knee and ankle. In anatomy, “leg” therefore has a more precise meaning than in everyday language.",
        ),
      },
    ],
    structureIds: ["clavicle", "scapula", "humerus", "radius", "ulna", "femur"],
  },
  {
    year: 2,
    title: bilingual(
      "Relier muscles et mouvements",
      "Connect muscles and movement",
    ),
    introduction: bilingual(
      "Associer le nom d’un muscle à sa position, à l’articulation qu’il traverse et à une action identifiable.",
      "Connect each muscle’s name to its location, the joint it crosses and an identifiable action.",
    ),
    objectives: [
      bilingual(
        "Associer un muscle à une action dominante.",
        "Match a muscle with a main action.",
      ),
      bilingual(
        "Distinguer les compartiments antérieurs et postérieurs.",
        "Distinguish anterior and posterior compartments.",
      ),
    ],
    sections: [
      {
        title: bilingual("Autour du coude", "Around the elbow"),
        body: bilingual(
          "Le biceps brachial participe à la flexion du coude et à la supination de l’avant-bras. Le triceps brachial est un extenseur du coude. Une même articulation est donc mobilisée par des groupes musculaires différents.",
          "Biceps brachii assists elbow flexion and forearm supination. Triceps brachii extends the elbow. Different muscle groups therefore act on the same joint.",
        ),
      },
      {
        title: bilingual(
          "Épaule et paroi abdominale",
          "Shoulder and abdominal wall",
        ),
        body: bilingual(
          "Les fibres moyennes du deltoïde participent à l’abduction du bras. Le grand pectoral est superficiel sur le thorax antérieur. Le droit de l’abdomen contribue à la flexion du tronc et appartient à la paroi abdominale.",
          "The middle fibres of the deltoid assist arm abduction. Pectoralis major lies superficially on the anterior chest. Rectus abdominis assists trunk flexion and belongs to the abdominal wall.",
        ),
      },
      {
        title: bilingual(
          "Appareil extenseur du genou",
          "Knee extensor mechanism",
        ),
        body: bilingual(
          "Le quadriceps est situé à la face antérieure de la cuisse. Son action commune est l’extension du genou. Son tendon, la patella et le ligament patellaire participent à la transmission de cette force vers le tibia.",
          "The quadriceps lies on the anterior thigh. Its shared action is knee extension. Its tendon, the patella and the patellar ligament help transmit this force to the tibia.",
        ),
      },
    ],
    structureIds: [
      "biceps",
      "triceps",
      "deltoid",
      "pectoralis-major",
      "rectus-abdominis",
      "quadriceps",
    ],
  },
  {
    year: 3,
    title: bilingual(
      "Suivre les nerfs périphériques",
      "Follow peripheral nerves",
    ),
    introduction: bilingual(
      "Construire une carte simple des trajets nerveux et relier les principaux nerfs à leurs territoires moteurs.",
      "Build a simple map of nerve pathways and connect major nerves to their motor territories.",
    ),
    objectives: [
      bilingual(
        "Différencier les principaux nerfs des membres.",
        "Distinguish the major nerves of the limbs.",
      ),
      bilingual(
        "Associer un trajet à une fonction motrice.",
        "Connect a pathway with a motor function.",
      ),
    ],
    sections: [
      {
        title: bilingual(
          "Trois nerfs du membre supérieur",
          "Three upper-limb nerves",
        ),
        body: bilingual(
          "Le nerf médian traverse le canal carpien. Le nerf ulnaire passe derrière l’épicondyle médial du coude. Le nerf radial et ses branches innervent les muscles extenseurs du poignet. Ces trajets ne se confondent pas.",
          "The median nerve passes through the carpal tunnel. The ulnar nerve passes behind the medial epicondyle at the elbow. The radial nerve and its branches supply the wrist extensors. These are distinct pathways.",
        ),
      },
      {
        title: bilingual("Deux régions de la cuisse", "Two thigh regions"),
        body: bilingual(
          "Le nerf fémoral rejoint la région antérieure de la cuisse et innerve le quadriceps. Le nerf sciatique descend dans la région postérieure. Toujours distinguer le trajet d’un nerf de l’étendue complète de son territoire.",
          "The femoral nerve reaches the anterior thigh and supplies the quadriceps. The sciatic nerve descends through the posterior thigh. Always distinguish a nerve’s course from the full extent of its territory.",
        ),
      },
      {
        title: bilingual(
          "Du sciatique au pied",
          "From the sciatic nerve to the foot",
        ),
        body: bilingual(
          "Le nerf sciatique se divise en nerfs tibial et fibulaire commun. Le nerf tibial innerve les muscles postérieurs de la jambe et participe à la flexion plantaire. Les dorsifléchisseurs dépendent du nerf fibulaire profond.",
          "The sciatic nerve divides into the tibial and common fibular nerves. The tibial nerve supplies posterior leg muscles and supports plantar flexion. The dorsiflexors are supplied by the deep fibular nerve.",
        ),
      },
    ],
    structureIds: [
      "median-nerve",
      "ulnar-nerve",
      "radial-nerve",
      "sciatic-nerve",
      "femoral-nerve",
      "tibial-nerve",
    ],
  },
  {
    year: 4,
    title: bilingual(
      "Situer les organes et leurs rapports",
      "Locate organs and their relations",
    ),
    introduction: bilingual(
      "Replacer les viscères dans les cavités du corps et suivre les continuités digestives et urinaires.",
      "Place the organs in the body cavities and follow digestive and urinary continuity.",
    ),
    objectives: [
      bilingual(
        "Distinguer thorax, abdomen et pelvis.",
        "Distinguish thorax, abdomen and pelvis.",
      ),
      bilingual(
        "Reconstituer les principaux trajets entre organes.",
        "Reconstruct the main pathways between organs.",
      ),
    ],
    sections: [
      {
        title: bilingual("Thorax", "Thorax"),
        body: bilingual(
          "Le cœur siège dans le médiastin, entre les poumons. Le poumon droit comporte trois lobes et le gauche deux. Le diaphragme forme la limite inférieure de la cavité thoracique et sépare celle-ci de l’abdomen.",
          "The heart sits in the mediastinum, between the lungs. The right lung has three lobes and the left two. The diaphragm forms the lower boundary of the thoracic cavity and separates it from the abdomen.",
        ),
      },
      {
        title: bilingual("Abdomen supérieur", "Upper abdomen"),
        body: bilingual(
          "Le foie occupe principalement la partie supérieure droite de l’abdomen, sous le diaphragme. L’estomac fait suite à l’œsophage ; son pylore communique avec le duodénum. Les dessins indiquent la topographie, sans représenter toutes les attaches péritonéales.",
          "The liver mainly occupies the upper right abdomen beneath the diaphragm. The stomach follows the oesophagus; its pylorus connects to the duodenum. The drawings show topography without depicting every peritoneal attachment.",
        ),
      },
      {
        title: bilingual("Voies urinaires", "Urinary pathways"),
        body: bilingual(
          "Les reins sont rétropéritonéaux. L’urine chemine par les uretères jusqu’à la vessie, puis par l’urètre vers l’extérieur. Un uretère et l’urètre sont des conduits différents, à ne pas confondre.",
          "The kidneys are retroperitoneal. Urine travels through the ureters to the bladder, then through the urethra to the outside. A ureter and the urethra are different tubes.",
        ),
      },
    ],
    structureIds: ["heart", "lungs", "liver", "stomach", "kidneys", "bladder"],
  },
  {
    year: 5,
    title: bilingual(
      "Reconstruire les trajets vasculaires",
      "Reconstruct vascular pathways",
    ),
    introduction: bilingual(
      "Suivre le sang depuis les cavités cardiaques et comprendre les changements de nom des gros vaisseaux.",
      "Follow blood from the heart chambers and understand where major vessels change names.",
    ),
    objectives: [
      bilingual(
        "Distinguer circuits systémique et pulmonaire.",
        "Distinguish systemic and pulmonary circuits.",
      ),
      bilingual(
        "Reconnaître les continuités artérielles aux repères anatomiques.",
        "Recognise arterial continuity at anatomical landmarks.",
      ),
    ],
    sections: [
      {
        title: bilingual("Deux circuits", "Two circuits"),
        body: bilingual(
          "Le ventricule gauche éjecte dans l’aorte vers le circuit systémique. Le ventricule droit éjecte dans le tronc pulmonaire vers les poumons. Une artère est définie par son trajet depuis le cœur, et non par son oxygénation.",
          "The left ventricle ejects into the aorta towards the systemic circuit. The right ventricle ejects into the pulmonary trunk towards the lungs. An artery is defined by carrying blood away from the heart, not by oxygenation.",
        ),
      },
      {
        title: bilingual(
          "Repères de changement de nom",
          "Landmarks for name changes",
        ),
        body: bilingual(
          "La subclavière devient axillaire au bord latéral de la première côte. L’iliaque externe devient fémorale sous le ligament inguinal. Retenir le repère explique la continuité du trajet plutôt qu’une succession de noms isolés.",
          "The subclavian becomes the axillary artery at the lateral border of the first rib. The external iliac becomes the femoral artery below the inguinal ligament. Learning the landmark explains a continuous pathway rather than a list of isolated names.",
        ),
      },
      {
        title: bilingual("Retour vers le cœur", "Return to the heart"),
        body: bilingual(
          "La veine cave inférieure rejoint l’oreillette droite. Les veines pulmonaires rejoignent l’oreillette gauche. La couleur conventionnelle d’un schéma ne suffit pas : préciser le vaisseau, son origine et sa destination.",
          "The inferior vena cava enters the right atrium. The pulmonary veins enter the left atrium. A diagram’s colour convention is not enough: identify the vessel, its origin and its destination.",
        ),
      },
    ],
    structureIds: [
      "aorta",
      "carotid",
      "subclavian-artery",
      "femoral-artery",
      "inferior-vena-cava",
      "pulmonary-artery",
    ],
  },
  {
    year: 6,
    title: bilingual(
      "Intégrer os, nerfs et fonctions",
      "Integrate bones, nerves and function",
    ),
    introduction: bilingual(
      "Croiser les cartes du squelette, du système nerveux et des muscles pour consolider les rapports anatomiques.",
      "Combine skeletal, nervous and muscle maps to consolidate anatomical relations.",
    ),
    objectives: [
      bilingual(
        "Associer une structure à ses rapports et à sa fonction.",
        "Connect a structure with its relations and function.",
      ),
      bilingual(
        "Distinguer moelle spinale, racines et plexus.",
        "Distinguish spinal cord, nerve roots and plexuses.",
      ),
    ],
    sections: [
      {
        title: bilingual(
          "Diaphragme et commande motrice",
          "Diaphragm and motor supply",
        ),
        body: bilingual(
          "Le diaphragme sépare thorax et abdomen. Sa commande motrice dépend des nerfs phréniques. Distinguer cette innervation de celle d’autres structures thoraciques, notamment les trajets des nerfs vagues.",
          "The diaphragm separates thorax and abdomen. Its motor supply depends on the phrenic nerves. Distinguish this supply from that of other thoracic structures, including the pathways of the vagus nerves.",
        ),
      },
      {
        title: bilingual("Organisation nerveuse", "Nervous organisation"),
        body: bilingual(
          "Le plexus brachial est habituellement formé par les rameaux ventraux C5 à T1. La moelle spinale adulte se termine généralement vers L1–L2 ; les racines se poursuivent plus bas. Un niveau vertébral et un segment médullaire sont des repères distincts.",
          "The brachial plexus is usually formed by ventral rami C5 to T1. The adult spinal cord generally ends near L1–L2; the roots continue below. A vertebral level and a spinal cord segment are distinct landmarks.",
        ),
      },
      {
        title: bilingual(
          "Bassin et appareil extenseur",
          "Pelvis and extensor mechanism",
        ),
        body: bilingual(
          "Le bassin osseux réunit deux os coxaux, le sacrum et le coccyx. Au genou, la patella est intégrée au tendon du quadriceps. À la cheville, la malléole médiale appartient au tibia et la malléole latérale à la fibula.",
          "The bony pelvis comprises two hip bones, the sacrum and the coccyx. At the knee, the patella is embedded in the quadriceps tendon. At the ankle, the medial malleolus belongs to the tibia and the lateral malleolus to the fibula.",
        ),
      },
    ],
    structureIds: [
      "diaphragm",
      "brachial-plexus",
      "spinal-cord",
      "pelvis",
      "patella",
      "tibia",
    ],
  },
  {
    year: 7,
    title: bilingual(
      "Internat : approfondir les rapports",
      "Residency: deepen your knowledge of relations",
    ),
    introduction: bilingual(
      "Revenir sur des structures connues avec des questions de trajets, de faisceaux et d’innervation, à adapter à votre spécialité.",
      "Revisit familiar structures through questions about pathways, cords and innervation, adapted to your specialty.",
    ),
    objectives: [
      bilingual(
        "Relier un muscle à son nerf et un nerf à son trajet.",
        "Connect a muscle to its nerve and a nerve to its course.",
      ),
      bilingual(
        "Identifier des rapports et repères avant un approfondissement spécialisé.",
        "Identify relations and landmarks before further specialty study.",
      ),
    ],
    sections: [
      {
        title: bilingual(
          "Plexus et branches terminales",
          "Plexus and terminal branches",
        ),
        body: bilingual(
          "Le faisceau postérieur du plexus brachial donne les nerfs radial et axillaire. Le musculocutané innerve le biceps brachial ; l’axillaire innerve le deltoïde. Rattacher chaque fonction au trajet anatomique aide à organiser ces connaissances.",
          "The posterior cord of the brachial plexus gives rise to the radial and axillary nerves. The musculocutaneous supplies biceps brachii; the axillary supplies the deltoid. Connecting each function to an anatomical course helps organise this knowledge.",
        ),
      },
      {
        title: bilingual("Rapports de proximité", "Neighbouring relations"),
        body: bilingual(
          "Dans le bras, le nerf radial passe dans la région du sillon radial, à la face postérieure de l’humérus. Sous le ligament inguinal, le nerf fémoral est latéral à l’artère fémorale. Les variantes et les rapports tridimensionnels exigent des supports plus détaillés.",
          "In the arm, the radial nerve follows the radial groove region on the posterior humerus. Below the inguinal ligament, the femoral nerve lies lateral to the femoral artery. Variants and three-dimensional relations require more detailed resources.",
        ),
      },
      {
        title: bilingual("Orifices du diaphragme", "Diaphragmatic openings"),
        body: bilingual(
          "Les repères classiques sont T8 pour l’orifice cave, T10 pour le hiatus œsophagien et T12 pour le hiatus aortique. Ce sont des repères de mémorisation généraux ; le dessin simplifié ne sert pas à planifier un geste.",
          "Classical landmarks are T8 for the caval opening, T10 for the oesophageal hiatus and T12 for the aortic hiatus. These are general memory landmarks; the simplified drawing is not for planning a procedure.",
        ),
      },
    ],
    structureIds: [
      "biceps",
      "deltoid",
      "radial-nerve",
      "femoral-nerve",
      "diaphragm",
      "brachial-plexus",
    ],
  },
];

export function anatomyCourseForYear(year: number) {
  return (
    anatomyCourses.find((course) => course.year === (year >= 7 ? 7 : year)) ??
    anatomyCourses[0]!
  );
}

export function anatomyCourseSources(year: number) {
  const sources = anatomySeeds
    .filter((seed) => seed.year === (year >= 7 ? 7 : year))
    .flatMap(anatomySeedSources);
  return [...new Map(sources.map((source) => [source.url, source])).values()];
}
