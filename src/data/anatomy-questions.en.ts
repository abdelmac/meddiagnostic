import {
  anatomySeeds,
  buildAnatomyQuestions,
  type AnatomySeed,
} from "./anatomy-questions";

type Translation = Pick<AnatomySeed, "theme" | "prompt" | "answer" | "others">;
export const anatomyTranslations: Record<string, Translation> = {
  clavicle: {
    theme: "Pectoral girdle",
    prompt: "Which bone is marked A on this anterior diagram?",
    answer: ["Clavicle", "The clavicle connects the sternum to the acromion."],
    others: [
      ["Scapula", "The scapula lies mainly behind the thorax."],
      ["Humerus", "The humerus is the bone of the upper arm."],
      ["Sternum", "The sternum lies in the midline of the thorax."],
    ],
  },
  scapula: {
    theme: "Pectoral girdle",
    prompt: "Which flat bone is marked A on this posterior view?",
    answer: [
      "Scapula",
      "The scapula is the flat bone at the back of the shoulder.",
    ],
    others: [
      ["Clavicle", "The clavicle is anterior and elongated."],
      ["Ulna", "The ulna belongs to the forearm."],
      ["Pelvis", "The pelvis connects the trunk to the lower limbs."],
    ],
  },
  humerus: {
    theme: "Upper limb",
    prompt: "Which bone of the upper arm is marked A?",
    answer: ["Humerus", "The humerus lies between the shoulder and the elbow."],
    others: [
      ["Radius", "The radius belongs to the forearm."],
      ["Femur", "The femur is the thigh bone."],
      ["Scapula", "The scapula belongs to the pectoral girdle."],
    ],
  },
  radius: {
    theme: "Upper limb",
    prompt:
      "In the anatomical position, the bone marked A is on the thumb side. Which bone is it?",
    answer: [
      "Radius",
      "The radius is lateral in the forearm in the anatomical position.",
    ],
    others: [
      ["Ulna", "The ulna lies on the little-finger side."],
      ["Humerus", "The humerus is proximal to the elbow."],
      ["Fibula", "The fibula belongs to the leg."],
    ],
  },
  ulna: {
    theme: "Upper limb",
    prompt: "Which medial forearm bone is marked A?",
    answer: [
      "Ulna",
      "In the anatomical position, the ulna lies medial to the radius.",
    ],
    others: [
      ["Radius", "The radius is lateral in the anatomical position."],
      ["Tibia", "The tibia lies in the leg."],
      ["Clavicle", "The clavicle belongs to the pectoral girdle."],
    ],
  },
  femur: {
    theme: "Lower limb",
    prompt: "Which thigh bone is marked A?",
    answer: ["Femur", "The femur extends from the hip to the knee."],
    others: [
      ["Tibia", "The tibia lies below the knee."],
      ["Fibula", "The fibula is the lateral bone of the leg."],
      ["Humerus", "The humerus is the bone of the upper arm."],
    ],
  },

  biceps: {
    theme: "Muscles and movement",
    prompt: "Which forearm movement is assisted by the muscle marked A?",
    answer: [
      "Supination",
      "The biceps brachii assists forearm supination and elbow flexion.",
    ],
    others: [
      [
        "Elbow extension",
        "Elbow extension depends mainly on the triceps brachii.",
      ],
      ["Pronation", "Pronation is produced by the pronator muscles."],
      ["Finger extension", "The finger extensors belong to the forearm."],
    ],
  },
  triceps: {
    theme: "Muscles and movement",
    prompt: "What is the main action of the muscle marked A?",
    answer: [
      "Elbow extension",
      "The triceps brachii is a major elbow extensor.",
    ],
    others: [
      [
        "Elbow flexion",
        "The biceps and brachialis contribute to elbow flexion.",
      ],
      ["Finger flexion", "The finger flexors are located in the forearm."],
      [
        "Isolated pronation",
        "Pronation depends mainly on the pronator muscles.",
      ],
    ],
  },
  deltoid: {
    theme: "Muscles and movement",
    prompt:
      "Which action characterises the middle fibres of the muscle marked A?",
    answer: [
      "Arm abduction",
      "The middle fibres of the deltoid move the arm away from the trunk.",
    ],
    others: [
      ["Knee extension", "This action is performed by the quadriceps."],
      ["Finger flexion", "This action is performed by the forearm flexors."],
      ["Finger adduction", "The palmar interossei assist this action."],
    ],
  },
  "pectoralis-major": {
    theme: "Muscles and movement",
    prompt: "Which superficial chest muscle is marked A?",
    answer: [
      "Pectoralis major",
      "Pectoralis major covers the upper anterior part of the thorax.",
    ],
    others: [
      ["Latissimus dorsi", "Latissimus dorsi lies mainly in the back."],
      ["Rectus abdominis", "Rectus abdominis belongs to the abdominal wall."],
      ["Trapezius", "Trapezius is a posterior muscle of the neck and back."],
    ],
  },
  "rectus-abdominis": {
    theme: "Trunk wall",
    prompt: "Which action is performed by the abdominal wall muscle marked A?",
    answer: ["Trunk flexion", "Rectus abdominis contributes to trunk flexion."],
    others: [
      ["Elbow extension", "This action is performed by triceps brachii."],
      ["Arm abduction", "The deltoid contributes to this action."],
      ["Foot dorsiflexion", "The anterior leg muscles perform this action."],
    ],
  },
  quadriceps: {
    theme: "Muscles and movement",
    prompt: "What is the main movement produced by the muscle group marked A?",
    answer: [
      "Knee extension",
      "The quadriceps extends the knee through the extensor mechanism.",
    ],
    others: [
      ["Knee flexion", "The hamstrings contribute to knee flexion."],
      ["Plantar flexion", "The triceps surae is a major plantar flexor."],
      ["Elbow extension", "This action is performed by triceps brachii."],
    ],
  },

  "median-nerve": {
    theme: "Peripheral nerves",
    prompt:
      "The nerve marked A passes through the carpal tunnel. Which nerve is it?",
    answer: [
      "Median nerve",
      "The median nerve passes through the carpal tunnel.",
    ],
    others: [
      [
        "Ulnar nerve",
        "At the wrist, the ulnar nerve passes through a different canal, Guyon’s canal.",
      ],
      [
        "Radial nerve",
        "The radial nerve does not pass through the carpal tunnel.",
      ],
      [
        "Axillary nerve",
        "The axillary nerve is associated with the shoulder region.",
      ],
    ],
  },
  "ulnar-nerve": {
    theme: "Peripheral nerves",
    prompt:
      "Which nerve marked A passes behind the medial epicondyle of the humerus?",
    answer: [
      "Ulnar nerve",
      "The ulnar nerve passes posterior to the medial epicondyle.",
    ],
    others: [
      ["Median nerve", "The median nerve crosses the anterior elbow region."],
      [
        "Axillary nerve",
        "The axillary nerve travels around the surgical neck of the humerus.",
      ],
      ["Femoral nerve", "The femoral nerve belongs to the lower limb."],
    ],
  },
  "radial-nerve": {
    theme: "Peripheral nerves",
    prompt: "Which motor function is associated with the nerve marked A?",
    answer: [
      "Wrist extension",
      "The radial nerve and its branches supply the wrist extensors.",
    ],
    others: [
      [
        "Thumb opposition",
        "Opposition depends mainly on the recurrent branch of the median nerve.",
      ],
      [
        "Finger adduction",
        "Finger adduction depends on interossei supplied by the ulnar nerve.",
      ],
      ["Knee extension", "The quadriceps is supplied by the femoral nerve."],
    ],
  },
  "sciatic-nerve": {
    theme: "Peripheral nerves",
    prompt:
      "Which large nerve on the posterior aspect of the thigh is marked A?",
    answer: [
      "Sciatic nerve",
      "The sciatic nerve descends through the posterior thigh.",
    ],
    others: [
      ["Femoral nerve", "The femoral nerve mainly reaches the anterior thigh."],
      [
        "Obturator nerve",
        "The obturator nerve mainly supplies the medial thigh compartment.",
      ],
      ["Median nerve", "The median nerve belongs to the upper limb."],
    ],
  },
  "femoral-nerve": {
    theme: "Peripheral nerves",
    prompt: "Which muscle group is supplied by the nerve marked A?",
    answer: ["Quadriceps", "The femoral nerve supplies the quadriceps."],
    others: [
      [
        "Hand interossei",
        "The hand interossei are supplied by the ulnar nerve.",
      ],
      ["Triceps brachii", "Triceps brachii is supplied by the radial nerve."],
      ["Triceps surae", "Triceps surae is supplied by the tibial nerve."],
    ],
  },
  "tibial-nerve": {
    theme: "Peripheral nerves",
    prompt: "Which movement depends on the nerve marked A?",
    answer: [
      "Foot plantar flexion",
      "The tibial nerve supplies posterior leg muscles, including triceps surae.",
    ],
    others: [
      [
        "Knee extension",
        "This action depends on the femoral nerve through the quadriceps.",
      ],
      [
        "Foot dorsiflexion",
        "The dorsiflexors are supplied by the deep fibular nerve.",
      ],
      [
        "Wrist extension",
        "The wrist extensors are supplied by the radial nerve.",
      ],
    ],
  },

  heart: {
    theme: "Organ topography",
    prompt: "In which thoracic space is the organ marked A located?",
    answer: [
      "Mediastinum",
      "The heart occupies the mediastinum, between the lungs.",
    ],
    others: [
      [
        "Right pleural cavity",
        "The heart is not located inside a pleural cavity.",
      ],
      ["Peritoneal cavity", "The peritoneal cavity is in the abdomen."],
      [
        "Vertebral canal",
        "The vertebral canal contains the spinal cord, among other structures.",
      ],
    ],
  },
  lungs: {
    theme: "Organ topography",
    prompt: "Which combination of lobes describes the two organs marked A?",
    answer: [
      "Three on the right, two on the left",
      "The right lung has three lobes and the left lung has two.",
    ],
    others: [
      [
        "Two on the right, three on the left",
        "This reverses the usual arrangement.",
      ],
      ["Two on each side", "The right lung also has a middle lobe."],
      ["Three on each side", "The left lung has no separate middle lobe."],
    ],
  },
  liver: {
    theme: "Organ topography",
    prompt: "Where is the organ marked A mainly located?",
    answer: [
      "Below the diaphragm, on the right",
      "The liver lies mainly in the upper right part of the abdomen.",
    ],
    others: [
      [
        "In the lesser pelvis",
        "The lesser pelvis contains the urinary bladder, among other organs.",
      ],
      ["In the mediastinum", "The mediastinum is a thoracic region."],
      [
        "In the left iliac fossa",
        "This region is distant from the liver’s main location.",
      ],
    ],
  },
  stomach: {
    theme: "Organ topography",
    prompt:
      "Which digestive tract segment directly follows the organ marked A?",
    answer: ["Duodenum", "The pylorus of the stomach opens into the duodenum."],
    others: [
      ["Oesophagus", "The oesophagus is upstream from the stomach."],
      ["Ileum", "The duodenum and jejunum precede the ileum."],
      ["Ascending colon", "The colon belongs to the large intestine."],
    ],
  },
  kidneys: {
    theme: "Organ topography",
    prompt: "Which anatomical position normally describes the organs marked A?",
    answer: [
      "Retroperitoneal",
      "The kidneys lie behind the parietal peritoneum.",
    ],
    others: [
      ["Intrapleural", "The pleural cavities are in the thorax."],
      ["Intrapericardial", "The pericardium surrounds the heart."],
      [
        "Inside the vertebral canal",
        "The kidneys lie beside the spine, outside the vertebral canal.",
      ],
    ],
  },
  bladder: {
    theme: "Organ topography",
    prompt: "Which tubes normally carry urine to the organ marked A?",
    answer: [
      "Ureters",
      "The two ureters carry urine from the kidneys to the bladder.",
    ],
    others: [
      ["Urethra", "The urethra carries urine from the bladder to the outside."],
      ["Renal arteries", "The renal arteries carry blood."],
      [
        "Ductus deferentes",
        "The ductus deferentes belong to the male reproductive tract.",
      ],
    ],
  },

  aorta: {
    theme: "Vascular pathways",
    prompt: "From which heart chamber does the vessel marked A arise directly?",
    answer: ["Left ventricle", "The aorta arises from the left ventricle."],
    others: [
      [
        "Right ventricle",
        "The right ventricle ejects blood into the pulmonary trunk.",
      ],
      ["Right atrium", "The right atrium receives the venae cavae."],
      ["Left atrium", "The left atrium receives the pulmonary veins."],
    ],
  },
  carotid: {
    theme: "Vascular pathways",
    prompt:
      "Into which main branches does the common carotid artery marked A divide?",
    answer: [
      "Internal and external carotid arteries",
      "The common carotid divides into the internal and external carotid arteries.",
    ],
    others: [
      [
        "Radial and ulnar arteries",
        "These result from division of the brachial artery.",
      ],
      [
        "Anterior and posterior tibial arteries",
        "These arteries belong to the lower limb.",
      ],
      [
        "Right and left renal arteries",
        "The renal arteries usually arise from the abdominal aorta.",
      ],
    ],
  },
  "subclavian-artery": {
    theme: "Vascular pathways",
    prompt:
      "What is the vessel marked A called beyond the lateral border of the first rib?",
    answer: [
      "Axillary artery",
      "The subclavian artery becomes the axillary artery at the lateral border of the first rib.",
    ],
    others: [
      [
        "Radial artery",
        "The radial artery is a distal branch of the brachial artery.",
      ],
      [
        "Internal carotid artery",
        "The internal carotid arises from the common carotid.",
      ],
      ["Femoral artery", "The femoral artery belongs to the lower limb."],
    ],
  },
  "femoral-artery": {
    theme: "Vascular pathways",
    prompt:
      "Which vessel becomes the artery marked A after passing under the inguinal ligament?",
    answer: [
      "External iliac artery",
      "The external iliac artery becomes the femoral artery below the inguinal ligament.",
    ],
    others: [
      [
        "Internal iliac artery",
        "The internal iliac mainly supplies pelvic territories.",
      ],
      [
        "Popliteal artery",
        "The popliteal artery continues from the femoral artery farther distally.",
      ],
      ["Renal artery", "The renal artery reaches the kidney."],
    ],
  },
  "inferior-vena-cava": {
    theme: "Vascular pathways",
    prompt: "Where does the large vein marked A normally terminate?",
    answer: [
      "Right atrium",
      "The inferior vena cava returns blood to the right atrium.",
    ],
    others: [
      ["Left atrium", "The left atrium receives the pulmonary veins."],
      [
        "Left ventricle",
        "The left ventricle receives blood from the left atrium.",
      ],
      [
        "Pulmonary trunk",
        "The pulmonary trunk receives blood from the right ventricle.",
      ],
    ],
  },
  "pulmonary-artery": {
    theme: "Vascular pathways",
    prompt: "Which pathway matches the pulmonary arterial vessel marked A?",
    answer: [
      "From the right heart to the lungs",
      "The pulmonary arteries carry blood from the right ventricle towards the lungs.",
    ],
    others: [
      [
        "From the lungs to the left atrium",
        "This is the pathway of the pulmonary veins.",
      ],
      [
        "From the left ventricle to the body",
        "This is the pathway of the aorta and its branches.",
      ],
      [
        "From the liver to the right atrium",
        "This return follows the hepatic veins and inferior vena cava.",
      ],
    ],
  },

  diaphragm: {
    theme: "Integrated anatomy",
    prompt:
      "Which pairing correctly matches the muscle marked A with its main motor innervation?",
    answer: [
      "Diaphragm — phrenic nerves",
      "The phrenic nerves provide motor innervation to the diaphragm.",
    ],
    others: [
      [
        "Diaphragm — vagus nerves",
        "The vagus nerves do not provide its main motor innervation.",
      ],
      [
        "Pectoralis major — phrenic nerves",
        "Pectoralis major is supplied by the pectoral nerves.",
      ],
      [
        "Rectus abdominis — femoral nerves",
        "The femoral nerves supply the lower limbs.",
      ],
    ],
  },
  "brachial-plexus": {
    theme: "Integrated anatomy",
    prompt: "Which ventral rami usually form the nerve network marked A?",
    answer: [
      "C5 to T1",
      "The brachial plexus is usually formed by the ventral rami of C5 to T1.",
    ],
    others: [
      ["C1 to C4", "These levels mainly correspond to the cervical plexus."],
      ["L1 to L4", "These levels mainly form the lumbar plexus."],
      ["S2 to S4 only", "These roots do not form the brachial plexus."],
    ],
  },
  "spinal-cord": {
    theme: "Integrated anatomy",
    prompt:
      "In adults, near which vertebral level does the structure marked A usually end?",
    answer: [
      "L1–L2",
      "The adult spinal cord usually ends near L1–L2; the nerve roots continue below.",
    ],
    others: [
      [
        "S4–S5",
        "At these levels, the adult spinal cord is normally no longer present.",
      ],
      ["T1–T2", "The spinal cord normally extends well beyond these levels."],
      [
        "Base of the skull",
        "The cord continues from the brainstem into the vertebral canal.",
      ],
    ],
  },
  pelvis: {
    theme: "Integrated anatomy",
    prompt: "Which elements make up the bony structure marked A?",
    answer: [
      "Two hip bones, sacrum and coccyx",
      "The bony pelvis comprises the hip bones, sacrum and coccyx.",
    ],
    others: [
      ["Two femurs and one patella", "These bones belong to the lower limbs."],
      [
        "Two scapulae and two clavicles",
        "These bones make up the pectoral girdles.",
      ],
      [
        "Sacrum and cervical vertebrae",
        "The cervical vertebrae do not belong to the pelvis.",
      ],
    ],
  },
  patella: {
    theme: "Integrated anatomy",
    prompt: "In which tendon is the sesamoid bone marked A embedded?",
    answer: [
      "Quadriceps tendon",
      "The patella is a sesamoid bone of the extensor mechanism, embedded in the quadriceps tendon.",
    ],
    others: [
      [
        "Calcaneal tendon",
        "The calcaneal tendon inserts on the calcaneus at the heel.",
      ],
      ["Distal biceps brachii tendon", "This tendon inserts on the radius."],
      ["Fibularis longus tendon", "This tendon belongs to the ankle and foot."],
    ],
  },
  tibia: {
    theme: "Integrated anatomy",
    prompt: "Which distal bony landmark belongs to the bone marked A?",
    answer: [
      "Medial malleolus",
      "The medial malleolus is a distal projection of the tibia.",
    ],
    others: [
      ["Lateral malleolus", "The lateral malleolus belongs to the fibula."],
      ["Olecranon", "The olecranon belongs to the ulna."],
      ["Acromion", "The acromion belongs to the scapula."],
    ],
  },
  "biceps-advanced": {
    theme: "Relations and innervation",
    prompt: "Which nerve provides motor innervation to the muscle marked A?",
    answer: [
      "Musculocutaneous nerve",
      "The musculocutaneous nerve supplies biceps brachii.",
    ],
    others: [
      [
        "Radial nerve",
        "The radial nerve supplies triceps brachii, among other muscles.",
      ],
      [
        "Axillary nerve",
        "The axillary nerve supplies the deltoid, among other muscles.",
      ],
      [
        "Ulnar nerve",
        "The ulnar nerve does not provide motor innervation to biceps brachii.",
      ],
    ],
  },
  "deltoid-advanced": {
    theme: "Relations and innervation",
    prompt:
      "Which nerve travels around the surgical neck of the humerus to supply the muscle marked A?",
    answer: [
      "Axillary nerve",
      "The axillary nerve passes around the surgical neck and supplies the deltoid.",
    ],
    others: [
      ["Median nerve", "The median nerve continues into the forearm and hand."],
      ["Ulnar nerve", "The ulnar nerve passes behind the medial epicondyle."],
      [
        "Musculocutaneous nerve",
        "The musculocutaneous nerve mainly supplies the anterior arm compartment.",
      ],
    ],
  },
  "radial-nerve-advanced": {
    theme: "Relations and innervation",
    prompt:
      "Which bony relation is associated with the nerve marked A in the arm?",
    answer: [
      "Radial groove of the humerus",
      "The radial nerve travels through the radial groove region on the posterior aspect of the humerus.",
    ],
    others: [
      [
        "Groove behind the medial epicondyle",
        "This relation belongs to the ulnar nerve.",
      ],
      [
        "Neck of the fibula",
        "This relation belongs to the common fibular nerve.",
      ],
      ["Obturator canal", "This canal is traversed by the obturator nerve."],
    ],
  },
  "femoral-nerve-advanced": {
    theme: "Relations and innervation",
    prompt:
      "Below the inguinal ligament, where is the nerve marked A relative to the femoral artery?",
    answer: [
      "Lateral to the artery",
      "The femoral nerve lies lateral to the femoral artery below the inguinal ligament.",
    ],
    others: [
      [
        "Medial to the femoral vein",
        "The femoral nerve does not occupy this medial position.",
      ],
      [
        "Inside the artery",
        "The nerve is a separate structure from the vessel.",
      ],
      [
        "In the obturator canal",
        "The obturator canal is traversed by the obturator nerve.",
      ],
    ],
  },
  "diaphragm-advanced": {
    theme: "Relations and innervation",
    prompt:
      "Which vertebral landmark classically corresponds to the oesophageal hiatus of the muscle marked A?",
    answer: ["T10", "The oesophageal hiatus is classically located at T10."],
    others: [
      [
        "T8",
        "T8 is the classical landmark for the inferior vena cava opening.",
      ],
      ["T12", "T12 is the classical landmark for the aortic hiatus."],
      ["L5", "L5 lies below the principal openings of the diaphragm."],
    ],
  },
  "brachial-plexus-advanced": {
    theme: "Relations and innervation",
    prompt:
      "Which terminal nerves arise from the posterior cord of the network marked A?",
    answer: [
      "Radial and axillary nerves",
      "The radial and axillary nerves are terminal branches of the posterior cord of the brachial plexus.",
    ],
    others: [
      [
        "Median and ulnar nerves",
        "The ulnar nerve arises from the medial cord; the median nerve has two roots.",
      ],
      [
        "Femoral and obturator nerves",
        "These nerves belong to the lumbar plexus.",
      ],
      [
        "Tibial and common fibular nerves",
        "These nerves are the terminal branches of the sciatic nerve.",
      ],
    ],
  },
};

export const anatomyQuestionsEn = buildAnatomyQuestions(
  anatomySeeds.map((seed) => {
    const translated =
      anatomyTranslations[
        `${seed.structureId}${seed.variant ? `-${seed.variant}` : ""}`
      ];
    if (!translated)
      throw new Error(`Missing anatomy translation: ${seed.structureId}`);
    return { ...seed, ...translated };
  }),
  "en",
);
