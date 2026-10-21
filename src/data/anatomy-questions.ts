import type { Question } from "../domain/types";

export const anatomySource = (section: string) => ({
  title: `OpenStax — Anatomy and Physiology 2e, ${section.split("-").slice(0, 2).join(".")}`,
  url: `https://openstax.org/books/anatomy-and-physiology-2e/pages/${section}`,
});

const anatomyReferenceOverrides: Record<string, [string, string]> = {
  "median-nerve": ["Median nerve", "NBK448084"],
  "ulnar-nerve": ["Ulnar nerve", "NBK499892"],
  "radial-nerve": ["Radial nerve", "NBK534840"],
  "sciatic-nerve": ["Sciatic nerve", "NBK482431"],
  "femoral-nerve": ["Femoral triangle", "NBK541140"],
  "tibial-nerve": ["Tibial nerve", "NBK537028"],
  "brachial-plexus": ["Brachial plexus", "NBK531473"],
  "biceps-advanced": ["Upper limb nerves", "NBK526056"],
  "deltoid-advanced": ["Brachial plexus", "NBK531473"],
  "radial-nerve-advanced": ["Radial nerve", "NBK534840"],
  "femoral-nerve-advanced": ["Femoral triangle", "NBK541140"],
  "diaphragm-advanced": ["Diaphragm", "NBK519558"],
  "brachial-plexus-advanced": ["Brachial plexus", "NBK531473"],
};

export function anatomySeedSources(seed: AnatomySeed) {
  const key = `${seed.structureId}${seed.variant ? `-${seed.variant}` : ""}`;
  const reference = anatomyReferenceOverrides[key];
  return reference
    ? [
        {
          title: `NCBI Bookshelf — StatPearls, ${reference[0]}`,
          url: `https://www.ncbi.nlm.nih.gov/books/${reference[1]}/`,
        },
      ]
    : [anatomySource(seed.source)];
}

type Option = [label: string, explanation: string];
export type AnatomySeed = {
  structureId: string;
  year: number;
  theme: string;
  prompt: string;
  answer: Option;
  others: [Option, Option, Option];
  source: string;
  posterior?: boolean;
  variant?: string;
};

// Original short exercises. Year bands are suggested revision paths, not a
// validated national curriculum. The drawings are our own simplified vectors.
export const anatomySeeds: AnatomySeed[] = [
  {
    structureId: "clavicle",
    year: 1,
    theme: "Ceinture scapulaire",
    prompt: "Quel os est repéré par A sur ce schéma antérieur ?",
    answer: ["Clavicule", "La clavicule relie le sternum à l’acromion."],
    others: [
      ["Scapula", "La scapula est principalement située en arrière du thorax."],
      ["Humérus", "L’humérus est l’os du bras."],
      ["Sternum", "Le sternum occupe la ligne médiane du thorax."],
    ],
    source: "8-1-the-pectoral-girdle",
  },
  {
    structureId: "scapula",
    year: 1,
    theme: "Ceinture scapulaire",
    posterior: true,
    prompt: "Quel os plat est repéré par A sur cette vue postérieure ?",
    answer: [
      "Scapula",
      "La scapula est l’os plat de la face postérieure de l’épaule.",
    ],
    others: [
      ["Clavicule", "La clavicule est antérieure et allongée."],
      ["Ulna", "L’ulna appartient à l’avant-bras."],
      ["Bassin", "Le bassin relie le tronc aux membres inférieurs."],
    ],
    source: "8-1-the-pectoral-girdle",
  },
  {
    structureId: "humerus",
    year: 1,
    theme: "Membre supérieur",
    prompt: "Quel os du bras est repéré par A ?",
    answer: ["Humérus", "L’humérus se situe entre l’épaule et le coude."],
    others: [
      ["Radius", "Le radius appartient à l’avant-bras."],
      ["Fémur", "Le fémur est l’os de la cuisse."],
      ["Scapula", "La scapula appartient à la ceinture scapulaire."],
    ],
    source: "8-2-bones-of-the-upper-limb",
  },
  {
    structureId: "radius",
    year: 1,
    theme: "Membre supérieur",
    prompt:
      "En position anatomique, l’os repéré par A est du côté du pouce. Lequel est-ce ?",
    answer: [
      "Radius",
      "Le radius est latéral dans l’avant-bras en position anatomique.",
    ],
    others: [
      ["Ulna", "L’ulna se situe du côté du petit doigt."],
      ["Humérus", "L’humérus est proximal au coude."],
      ["Fibula", "La fibula appartient à la jambe."],
    ],
    source: "8-2-bones-of-the-upper-limb",
  },
  {
    structureId: "ulna",
    year: 1,
    theme: "Membre supérieur",
    prompt: "Quel os médial de l’avant-bras est repéré par A ?",
    answer: [
      "Ulna",
      "En position anatomique, l’ulna est médial par rapport au radius.",
    ],
    others: [
      ["Radius", "Le radius est latéral en position anatomique."],
      ["Tibia", "Le tibia se situe dans la jambe."],
      ["Clavicule", "La clavicule appartient à la ceinture scapulaire."],
    ],
    source: "8-2-bones-of-the-upper-limb",
  },
  {
    structureId: "femur",
    year: 1,
    theme: "Membre inférieur",
    prompt: "Quel os de la cuisse est repéré par A ?",
    answer: ["Fémur", "Le fémur relie la hanche au genou."],
    others: [
      ["Tibia", "Le tibia se situe sous le genou."],
      ["Fibula", "La fibula est l’os latéral de la jambe."],
      ["Humérus", "L’humérus est l’os du bras."],
    ],
    source: "8-4-bones-of-the-lower-limb",
  },

  {
    structureId: "biceps",
    year: 2,
    theme: "Muscles et mouvements",
    prompt:
      "Quel mouvement de l’avant-bras est favorisé par le muscle repéré par A ?",
    answer: [
      "Supination",
      "Le biceps brachial participe à la supination et à la flexion du coude.",
    ],
    others: [
      ["Extension du coude", "L’extension dépend surtout du triceps brachial."],
      ["Pronation", "La pronation est assurée par les muscles pronateurs."],
      [
        "Extension des doigts",
        "Les extenseurs des doigts appartiennent à l’avant-bras.",
      ],
    ],
    source: "11-5-muscles-of-the-pectoral-girdle-and-upper-limbs",
  },
  {
    structureId: "triceps",
    year: 2,
    theme: "Muscles et mouvements",
    posterior: true,
    prompt: "Quelle action principale correspond au muscle repéré par A ?",
    answer: [
      "Extension du coude",
      "Le triceps brachial est un extenseur majeur du coude.",
    ],
    others: [
      [
        "Flexion du coude",
        "Le biceps et le brachial contribuent à la flexion.",
      ],
      [
        "Flexion des doigts",
        "Les fléchisseurs des doigts sont situés dans l’avant-bras.",
      ],
      [
        "Pronation isolée",
        "La pronation dépend principalement des pronateurs.",
      ],
    ],
    source: "11-5-muscles-of-the-pectoral-girdle-and-upper-limbs",
  },
  {
    structureId: "deltoid",
    year: 2,
    theme: "Muscles et mouvements",
    prompt:
      "Quelle action caractérise les fibres moyennes du muscle repéré par A ?",
    answer: [
      "Abduction du bras",
      "Les fibres moyennes du deltoïde écartent le bras du tronc.",
    ],
    others: [
      ["Extension du genou", "Cette action relève du quadriceps."],
      [
        "Flexion des doigts",
        "Cette action relève des fléchisseurs de l’avant-bras.",
      ],
      [
        "Adduction des doigts",
        "Les interosseux palmaires participent à cette action.",
      ],
    ],
    source: "11-5-muscles-of-the-pectoral-girdle-and-upper-limbs",
  },
  {
    structureId: "pectoralis-major",
    year: 2,
    theme: "Muscles et mouvements",
    prompt: "Quel muscle superficiel du thorax est repéré par A ?",
    answer: [
      "Grand pectoral",
      "Le grand pectoral occupe la partie antérieure supérieure du thorax.",
    ],
    others: [
      ["Grand dorsal", "Le grand dorsal se situe principalement dans le dos."],
      [
        "Droit de l’abdomen",
        "Le droit de l’abdomen appartient à la paroi abdominale.",
      ],
      ["Trapèze", "Le trapèze est un muscle postérieur du cou et du dos."],
    ],
    source: "11-5-muscles-of-the-pectoral-girdle-and-upper-limbs",
  },
  {
    structureId: "rectus-abdominis",
    year: 2,
    theme: "Paroi du tronc",
    prompt:
      "Quelle action appartient au muscle de la paroi abdominale repéré par A ?",
    answer: [
      "Flexion du tronc",
      "Le droit de l’abdomen contribue à la flexion du tronc.",
    ],
    others: [
      ["Extension du coude", "Cette action relève du triceps brachial."],
      ["Abduction du bras", "Cette action relève notamment du deltoïde."],
      [
        "Dorsiflexion du pied",
        "Les muscles antérieurs de la jambe réalisent cette action.",
      ],
    ],
    source: "11-4-axial-muscles-of-the-abdominal-wall-and-thorax",
  },
  {
    structureId: "quadriceps",
    year: 2,
    theme: "Muscles et mouvements",
    prompt:
      "Quel mouvement principal réalise le groupe musculaire repéré par A ?",
    answer: [
      "Extension du genou",
      "Le quadriceps étend le genou par l’appareil extenseur.",
    ],
    others: [
      [
        "Flexion du genou",
        "Les ischio-jambiers participent à la flexion du genou.",
      ],
      [
        "Flexion plantaire",
        "Le triceps sural réalise principalement cette action.",
      ],
      ["Extension du coude", "Cette action relève du triceps brachial."],
    ],
    source: "11-6-appendicular-muscles-of-the-pelvic-girdle-and-lower-limbs",
  },

  {
    structureId: "median-nerve",
    year: 3,
    theme: "Nerfs périphériques",
    prompt: "Le nerf repéré par A traverse le canal carpien. Lequel est-ce ?",
    answer: ["Nerf médian", "Le nerf médian traverse le canal carpien."],
    others: [
      [
        "Nerf ulnaire",
        "Le nerf ulnaire passe au poignet dans un autre canal, celui de Guyon.",
      ],
      ["Nerf radial", "Le nerf radial ne traverse pas le canal carpien."],
      [
        "Nerf axillaire",
        "Le nerf axillaire est associé à la région de l’épaule.",
      ],
    ],
    source: "13-4-the-peripheral-nervous-system",
  },
  {
    structureId: "ulnar-nerve",
    year: 3,
    theme: "Nerfs périphériques",
    prompt:
      "Quel nerf repéré par A passe en arrière de l’épicondyle médial de l’humérus ?",
    answer: [
      "Nerf ulnaire",
      "Le nerf ulnaire contourne l’épicondyle médial en arrière.",
    ],
    others: [
      [
        "Nerf médian",
        "Le nerf médian passe dans la région antérieure du coude.",
      ],
      [
        "Nerf axillaire",
        "Le nerf axillaire contourne le col chirurgical de l’humérus.",
      ],
      ["Nerf fémoral", "Le nerf fémoral appartient au membre inférieur."],
    ],
    source: "13-4-the-peripheral-nervous-system",
  },
  {
    structureId: "radial-nerve",
    year: 3,
    theme: "Nerfs périphériques",
    posterior: true,
    prompt:
      "Quelle fonction motrice est notamment associée au nerf repéré par A ?",
    answer: [
      "Extension du poignet",
      "Le nerf radial et ses branches innervent les extenseurs du poignet.",
    ],
    others: [
      [
        "Opposition du pouce",
        "L’opposition dépend surtout de la branche récurrente du nerf médian.",
      ],
      [
        "Adduction des doigts",
        "L’adduction des doigts dépend des interosseux, innervés par le nerf ulnaire.",
      ],
      ["Extension du genou", "Le quadriceps est innervé par le nerf fémoral."],
    ],
    source: "13-4-the-peripheral-nervous-system",
  },
  {
    structureId: "sciatic-nerve",
    year: 3,
    theme: "Nerfs périphériques",
    posterior: true,
    prompt:
      "Quel gros nerf de la face postérieure de la cuisse est repéré par A ?",
    answer: [
      "Nerf sciatique",
      "Le nerf sciatique descend dans la région postérieure de la cuisse.",
    ],
    others: [
      [
        "Nerf fémoral",
        "Le nerf fémoral rejoint principalement la région antérieure de la cuisse.",
      ],
      [
        "Nerf obturateur",
        "Le nerf obturateur dessert surtout le compartiment médial de la cuisse.",
      ],
      ["Nerf médian", "Le nerf médian appartient au membre supérieur."],
    ],
    source: "13-4-the-peripheral-nervous-system",
  },
  {
    structureId: "femoral-nerve",
    year: 3,
    theme: "Nerfs périphériques",
    prompt:
      "Quel groupe musculaire reçoit l’innervation du nerf repéré par A ?",
    answer: ["Quadriceps", "Le nerf fémoral innerve le quadriceps."],
    others: [
      [
        "Interosseux de la main",
        "Les interosseux de la main dépendent du nerf ulnaire.",
      ],
      ["Triceps brachial", "Le triceps brachial dépend du nerf radial."],
      ["Triceps sural", "Le triceps sural est innervé par le nerf tibial."],
    ],
    source: "13-4-the-peripheral-nervous-system",
  },
  {
    structureId: "tibial-nerve",
    year: 3,
    theme: "Nerfs périphériques",
    posterior: true,
    prompt: "Quel mouvement dépend notamment du nerf repéré par A ?",
    answer: [
      "Flexion plantaire du pied",
      "Le nerf tibial innerve les muscles postérieurs de la jambe, dont le triceps sural.",
    ],
    others: [
      [
        "Extension du genou",
        "Cette action dépend du nerf fémoral via le quadriceps.",
      ],
      [
        "Dorsiflexion du pied",
        "Les dorsifléchisseurs dépendent du nerf fibulaire profond.",
      ],
      [
        "Extension du poignet",
        "Les extenseurs du poignet dépendent du nerf radial.",
      ],
    ],
    source: "13-4-the-peripheral-nervous-system",
  },

  {
    structureId: "heart",
    year: 4,
    theme: "Topographie viscérale",
    prompt: "Dans quel espace thoracique se situe l’organe repéré par A ?",
    answer: [
      "Médiastin",
      "Le cœur occupe le médiastin, entre les deux poumons.",
    ],
    others: [
      [
        "Cavité pleurale droite",
        "Le cœur n’est pas situé dans une cavité pleurale.",
      ],
      ["Cavité péritonéale", "La cavité péritonéale appartient à l’abdomen."],
      [
        "Canal vertébral",
        "Le canal vertébral contient notamment la moelle spinale.",
      ],
    ],
    source: "19-1-heart-anatomy",
  },
  {
    structureId: "lungs",
    year: 4,
    theme: "Topographie viscérale",
    prompt:
      "Quelle association de lobes décrit les deux organes repérés par A ?",
    answer: [
      "Trois à droite, deux à gauche",
      "Le poumon droit possède trois lobes, le gauche deux.",
    ],
    others: [
      [
        "Deux à droite, trois à gauche",
        "Cette proposition inverse la disposition habituelle.",
      ],
      ["Deux de chaque côté", "Le poumon droit comporte aussi un lobe moyen."],
      [
        "Trois de chaque côté",
        "Le poumon gauche ne comporte pas de lobe moyen distinct.",
      ],
    ],
    source: "22-2-the-lungs",
  },
  {
    structureId: "liver",
    year: 4,
    theme: "Topographie viscérale",
    prompt: "Où se situe principalement l’organe repéré par A ?",
    answer: [
      "Sous le diaphragme, à droite",
      "Le foie est principalement situé dans la partie supérieure droite de l’abdomen.",
    ],
    others: [
      ["Dans le petit bassin", "Le petit bassin contient notamment la vessie."],
      ["Dans le médiastin", "Le médiastin est une région thoracique."],
      [
        "Dans la fosse iliaque gauche",
        "Cette région est éloignée de la position principale du foie.",
      ],
    ],
    source:
      "23-6-accessory-organs-in-digestion-the-liver-pancreas-and-gallbladder",
  },
  {
    structureId: "stomach",
    year: 4,
    theme: "Topographie viscérale",
    prompt:
      "Quel segment du tube digestif fait directement suite à l’organe repéré par A ?",
    answer: ["Duodénum", "Le pylore de l’estomac s’ouvre dans le duodénum."],
    others: [
      ["Œsophage", "L’œsophage est situé en amont de l’estomac."],
      ["Iléon", "Le jéjunum et le duodénum précèdent l’iléon."],
      ["Côlon ascendant", "Le côlon appartient au gros intestin."],
    ],
    source: "23-4-the-stomach",
  },
  {
    structureId: "kidneys",
    year: 4,
    theme: "Topographie viscérale",
    posterior: true,
    prompt:
      "Quelle situation anatomique décrit habituellement les organes repérés par A ?",
    answer: [
      "Rétropéritonéale",
      "Les reins se situent en arrière du péritoine pariétal.",
    ],
    others: [
      ["Intrapleurale", "Les cavités pleurales sont thoraciques."],
      ["Intrapéricardique", "Le péricarde entoure le cœur."],
      [
        "Dans le canal vertébral",
        "Les reins sont de part et d’autre de la colonne, hors du canal vertébral.",
      ],
    ],
    source: "25-3-gross-anatomy-of-the-kidney",
  },
  {
    structureId: "bladder",
    year: 4,
    theme: "Topographie viscérale",
    prompt:
      "Quels conduits amènent normalement l’urine à l’organe repéré par A ?",
    answer: [
      "Les uretères",
      "Les deux uretères conduisent l’urine des reins vers la vessie.",
    ],
    others: [
      ["L’urètre", "L’urètre conduit l’urine de la vessie vers l’extérieur."],
      ["Les artères rénales", "Les artères rénales transportent du sang."],
      [
        "Les canaux déférents",
        "Les canaux déférents appartiennent aux voies génitales masculines.",
      ],
    ],
    source: "25-2-gross-anatomy-of-urine-transport",
  },

  {
    structureId: "aorta",
    year: 5,
    theme: "Trajets vasculaires",
    prompt:
      "De quelle cavité cardiaque provient directement le vaisseau repéré par A ?",
    answer: ["Ventricule gauche", "L’aorte naît du ventricule gauche."],
    others: [
      [
        "Ventricule droit",
        "Le ventricule droit éjecte le sang dans le tronc pulmonaire.",
      ],
      ["Oreillette droite", "L’oreillette droite reçoit les veines caves."],
      [
        "Oreillette gauche",
        "L’oreillette gauche reçoit les veines pulmonaires.",
      ],
    ],
    source: "19-1-heart-anatomy",
  },
  {
    structureId: "carotid",
    year: 5,
    theme: "Trajets vasculaires",
    prompt:
      "En quelles branches principales se divise l’artère carotide commune repérée par A ?",
    answer: [
      "Carotides interne et externe",
      "La carotide commune se divise en carotide interne et carotide externe.",
    ],
    others: [
      [
        "Artères radiale et ulnaire",
        "Ces artères résultent de la division de l’artère brachiale.",
      ],
      [
        "Artères tibiales antérieure et postérieure",
        "Ces artères appartiennent au membre inférieur.",
      ],
      [
        "Artères rénales droite et gauche",
        "Les artères rénales naissent habituellement de l’aorte abdominale.",
      ],
    ],
    source: "20-5-circulatory-pathways",
  },
  {
    structureId: "subclavian-artery",
    year: 5,
    theme: "Trajets vasculaires",
    prompt:
      "Quel nom prend le vaisseau repéré par A au-delà du bord latéral de la première côte ?",
    answer: [
      "Artère axillaire",
      "L’artère subclavière devient axillaire au bord latéral de la première côte.",
    ],
    others: [
      [
        "Artère radiale",
        "L’artère radiale est une branche distale de l’artère brachiale.",
      ],
      [
        "Artère carotide interne",
        "La carotide interne provient de la carotide commune.",
      ],
      ["Artère fémorale", "L’artère fémorale appartient au membre inférieur."],
    ],
    source: "20-5-circulatory-pathways",
  },
  {
    structureId: "femoral-artery",
    year: 5,
    theme: "Trajets vasculaires",
    prompt:
      "Quel vaisseau devient l’artère repérée par A après son passage sous le ligament inguinal ?",
    answer: [
      "Artère iliaque externe",
      "L’artère iliaque externe devient fémorale sous le ligament inguinal.",
    ],
    others: [
      [
        "Artère iliaque interne",
        "L’artère iliaque interne dessert surtout les territoires pelviens.",
      ],
      [
        "Artère poplitée",
        "L’artère poplitée fait suite à l’artère fémorale plus distalement.",
      ],
      ["Artère rénale", "L’artère rénale rejoint le rein."],
    ],
    source: "20-5-circulatory-pathways",
  },
  {
    structureId: "inferior-vena-cava",
    year: 5,
    theme: "Trajets vasculaires",
    prompt:
      "Où se termine normalement le grand vaisseau veineux repéré par A ?",
    answer: [
      "Oreillette droite",
      "La veine cave inférieure ramène le sang à l’oreillette droite.",
    ],
    others: [
      [
        "Oreillette gauche",
        "L’oreillette gauche reçoit les veines pulmonaires.",
      ],
      [
        "Ventricule gauche",
        "Le ventricule gauche reçoit le sang depuis l’oreillette gauche.",
      ],
      [
        "Tronc pulmonaire",
        "Le tronc pulmonaire reçoit le sang du ventricule droit.",
      ],
    ],
    source: "20-5-circulatory-pathways",
  },
  {
    structureId: "pulmonary-artery",
    year: 5,
    theme: "Trajets vasculaires",
    prompt:
      "Quel trajet correspond au vaisseau artériel pulmonaire repéré par A ?",
    answer: [
      "Du cœur droit vers les poumons",
      "Les artères pulmonaires acheminent le sang du ventricule droit vers les poumons.",
    ],
    others: [
      [
        "Des poumons vers l’oreillette gauche",
        "Ce trajet est celui des veines pulmonaires.",
      ],
      [
        "Du ventricule gauche vers le corps",
        "Ce trajet est celui de l’aorte et de ses branches.",
      ],
      [
        "Du foie vers l’oreillette droite",
        "Ce retour emprunte les veines hépatiques et la veine cave inférieure.",
      ],
    ],
    source: "20-5-circulatory-pathways",
  },

  {
    structureId: "diaphragm",
    year: 6,
    theme: "Anatomie intégrée",
    prompt:
      "Quelle proposition associe correctement le muscle repéré par A à son innervation motrice principale ?",
    answer: [
      "Diaphragme — nerfs phréniques",
      "Les nerfs phréniques assurent l’innervation motrice du diaphragme.",
    ],
    others: [
      [
        "Diaphragme — nerfs vagues",
        "Les nerfs vagues n’assurent pas son innervation motrice principale.",
      ],
      [
        "Grand pectoral — nerfs phréniques",
        "Le grand pectoral reçoit les nerfs pectoraux.",
      ],
      [
        "Droit de l’abdomen — nerfs fémoraux",
        "Les nerfs fémoraux sont destinés au membre inférieur.",
      ],
    ],
    source: "11-4-axial-muscles-of-the-abdominal-wall-and-thorax",
  },
  {
    structureId: "brachial-plexus",
    year: 6,
    theme: "Anatomie intégrée",
    prompt:
      "Quels rameaux ventraux forment habituellement le réseau nerveux repéré par A ?",
    answer: [
      "C5 à T1",
      "Le plexus brachial est habituellement formé des rameaux ventraux C5 à T1.",
    ],
    others: [
      [
        "C1 à C4",
        "Ces niveaux correspondent principalement au plexus cervical.",
      ],
      ["L1 à L4", "Ces niveaux forment principalement le plexus lombaire."],
      [
        "S2 à S4 uniquement",
        "Ces racines ne constituent pas le plexus brachial.",
      ],
    ],
    source: "13-4-the-peripheral-nervous-system",
  },
  {
    structureId: "spinal-cord",
    year: 6,
    theme: "Anatomie intégrée",
    posterior: true,
    prompt:
      "Chez l’adulte, à quel niveau vertébral se termine habituellement la structure repérée par A ?",
    answer: [
      "Vers L1–L2",
      "La moelle spinale adulte se termine habituellement vers L1–L2 ; les racines poursuivent leur trajet.",
    ],
    others: [
      [
        "Vers S4–S5",
        "À ces niveaux, la moelle spinale adulte n’est normalement plus présente.",
      ],
      [
        "Vers T1–T2",
        "La moelle se prolonge normalement bien au-delà de ces niveaux.",
      ],
      [
        "À la base du crâne",
        "La moelle se poursuit depuis le tronc cérébral dans le canal vertébral.",
      ],
    ],
    source: "13-2-the-central-nervous-system",
  },
  {
    structureId: "pelvis",
    year: 6,
    theme: "Anatomie intégrée",
    prompt: "Quels éléments composent l’ensemble osseux repéré par A ?",
    answer: [
      "Deux os coxaux, sacrum et coccyx",
      "Le bassin osseux réunit les os coxaux, le sacrum et le coccyx.",
    ],
    others: [
      [
        "Deux fémurs et une patella",
        "Ces os appartiennent aux membres inférieurs.",
      ],
      [
        "Deux scapulas et deux clavicules",
        "Ces os constituent les ceintures scapulaires.",
      ],
      [
        "Sacrum et vertèbres cervicales",
        "Les vertèbres cervicales n’appartiennent pas au bassin.",
      ],
    ],
    source: "8-3-the-pelvic-girdle-and-pelvis",
  },
  {
    structureId: "patella",
    year: 6,
    theme: "Anatomie intégrée",
    prompt: "Dans quel tendon est intégré l’os sésamoïde repéré par A ?",
    answer: [
      "Tendon du quadriceps",
      "La patella est un os sésamoïde de l’appareil extenseur, intégré au tendon du quadriceps.",
    ],
    others: [
      [
        "Tendon calcanéen",
        "Le tendon calcanéen s’insère sur le calcanéus, au talon.",
      ],
      [
        "Tendon distal du biceps brachial",
        "Ce tendon se termine sur le radius.",
      ],
      [
        "Tendon du long fibulaire",
        "Ce tendon appartient à la cheville et au pied.",
      ],
    ],
    source: "8-4-bones-of-the-lower-limb",
  },
  {
    structureId: "tibia",
    year: 6,
    theme: "Anatomie intégrée",
    prompt: "Quel relief distal appartient à l’os repéré par A ?",
    answer: [
      "Malléole médiale",
      "La malléole médiale est une projection distale du tibia.",
    ],
    others: [
      ["Malléole latérale", "La malléole latérale appartient à la fibula."],
      ["Olécrane", "L’olécrane appartient à l’ulna."],
      ["Acromion", "L’acromion appartient à la scapula."],
    ],
    source: "8-4-bones-of-the-lower-limb",
  },

  {
    structureId: "biceps",
    variant: "advanced",
    year: 7,
    theme: "Rapports et innervation",
    prompt: "Quel nerf assure l’innervation motrice du muscle repéré par A ?",
    answer: [
      "Nerf musculocutané",
      "Le nerf musculocutané innerve le biceps brachial.",
    ],
    others: [
      ["Nerf radial", "Le nerf radial innerve notamment le triceps brachial."],
      ["Nerf axillaire", "Le nerf axillaire innerve notamment le deltoïde."],
      [
        "Nerf ulnaire",
        "Le nerf ulnaire ne fournit pas l’innervation motrice du biceps brachial.",
      ],
    ],
    source: "13-4-the-peripheral-nervous-system",
  },
  {
    structureId: "deltoid",
    variant: "advanced",
    year: 7,
    theme: "Rapports et innervation",
    prompt:
      "Quel nerf contourne le col chirurgical de l’humérus pour innerver le muscle repéré par A ?",
    answer: [
      "Nerf axillaire",
      "Le nerf axillaire contourne le col chirurgical et innerve le deltoïde.",
    ],
    others: [
      ["Nerf médian", "Le nerf médian rejoint l’avant-bras puis la main."],
      [
        "Nerf ulnaire",
        "Le nerf ulnaire passe en arrière de l’épicondyle médial.",
      ],
      [
        "Nerf musculocutané",
        "Le nerf musculocutané innerve principalement le compartiment antérieur du bras.",
      ],
    ],
    source: "13-4-the-peripheral-nervous-system",
  },
  {
    structureId: "radial-nerve",
    variant: "advanced",
    year: 7,
    theme: "Rapports et innervation",
    posterior: true,
    prompt:
      "Quel rapport osseux est associé au nerf repéré par A dans le bras ?",
    answer: [
      "Sillon du nerf radial sur l’humérus",
      "Le nerf radial passe dans la région du sillon radial, à la face postérieure de l’humérus.",
    ],
    others: [
      [
        "Gouttière derrière l’épicondyle médial",
        "Ce rapport est celui du nerf ulnaire.",
      ],
      ["Col de la fibula", "Ce rapport appartient au nerf fibulaire commun."],
      ["Canal obturateur", "Ce canal est emprunté par le nerf obturateur."],
    ],
    source: "13-4-the-peripheral-nervous-system",
  },
  {
    structureId: "femoral-nerve",
    variant: "advanced",
    year: 7,
    theme: "Rapports et innervation",
    prompt:
      "Sous le ligament inguinal, où se situe le nerf repéré par A par rapport à l’artère fémorale ?",
    answer: [
      "Latéralement à l’artère",
      "Le nerf fémoral se situe latéralement à l’artère fémorale sous le ligament inguinal.",
    ],
    others: [
      [
        "Médialement à la veine fémorale",
        "Le nerf fémoral n’occupe pas cette position médiale.",
      ],
      [
        "À l’intérieur de l’artère",
        "Le nerf est une structure distincte du vaisseau.",
      ],
      [
        "Dans le canal obturateur",
        "Le canal obturateur est traversé par le nerf obturateur.",
      ],
    ],
    source: "13-4-the-peripheral-nervous-system",
  },
  {
    structureId: "diaphragm",
    variant: "advanced",
    year: 7,
    theme: "Rapports et innervation",
    prompt:
      "Quel repère vertébral correspond classiquement au hiatus œsophagien du muscle repéré par A ?",
    answer: [
      "T10",
      "Le hiatus œsophagien est classiquement situé au niveau T10.",
    ],
    others: [
      [
        "T8",
        "T8 est le repère classique de l’orifice de la veine cave inférieure.",
      ],
      ["T12", "T12 est le repère classique du hiatus aortique."],
      ["L5", "L5 se situe sous les principaux orifices du diaphragme."],
    ],
    source: "11-4-axial-muscles-of-the-abdominal-wall-and-thorax",
  },
  {
    structureId: "brachial-plexus",
    variant: "advanced",
    year: 7,
    theme: "Rapports et innervation",
    prompt:
      "Quels nerfs terminaux proviennent du faisceau postérieur du réseau repéré par A ?",
    answer: [
      "Nerfs radial et axillaire",
      "Les nerfs radial et axillaire sont des branches terminales du faisceau postérieur du plexus brachial.",
    ],
    others: [
      [
        "Nerfs médian et ulnaire",
        "Le nerf ulnaire provient du faisceau médial et le médian reçoit deux racines.",
      ],
      [
        "Nerfs fémoral et obturateur",
        "Ces nerfs appartiennent au plexus lombaire.",
      ],
      [
        "Nerfs tibial et fibulaire commun",
        "Ces nerfs sont les branches terminales du nerf sciatique.",
      ],
    ],
    source: "13-4-the-peripheral-nervous-system",
  },
];

export function buildAnatomyQuestions(
  seeds: AnatomySeed[],
  language: "fr" | "en",
): Question[] {
  return seeds.map((seed, index) => {
    const choices = [seed.answer, ...seed.others];
    const offset = index % choices.length;
    const ordered = [...choices.slice(offset), ...choices.slice(0, offset)];
    return {
      id: `anatomie-${seed.structureId}${seed.variant ? `-${seed.variant}` : ""}`,
      version: 1,
      specialty: "anatomie",
      theme: seed.theme,
      difficulty: seed.year <= 2 ? "débutant" : seed.year >= 5 ? "avancé" : "intermédiaire",
      type: "visuel",
      objective:
        language === "fr"
          ? `Réviser l’anatomie : ${seed.theme.toLowerCase()}.`
          : `Review anatomy: ${seed.theme.toLowerCase()}.`,
      title: seed.prompt,
      context:
        language === "fr"
          ? "Le repère A désigne la structure à étudier. La silhouette indique une position générale ; les proportions et les trajets sont simplifiés."
          : "Marker A identifies the structure to study. The silhouette shows a general location; proportions and pathways are simplified.",
      clues:
        language === "fr"
          ? ["Observer le repère A", "Se placer en position anatomique"]
          : ["Locate marker A", "Use the anatomical position"],
      options: ordered.map(([label, explanation]) => ({ label, explanation })),
      correct: ordered.indexOf(seed.answer),
      reasoning: seed.answer[1],
      takeaway: seed.answer[1],
      sources: anatomySeedSources(seed),
      editorialDate: "2026-10-21",
      status: "demo",
      medicalReviewer: null,
      diagram: {
        structureId: seed.structureId,
        view: seed.posterior ? "back" : "front",
      },
      studyYears: seed.year === 7 ? [7, 8, 9, 10, 11, 12] : [seed.year],
    };
  });
}

export const anatomyQuestions = buildAnatomyQuestions(anatomySeeds, "fr");
