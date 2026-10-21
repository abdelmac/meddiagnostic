export type AnatomyLanguage = "fr" | "en";
export type AnatomyView = "anterior" | "posterior";
export type AnatomySystem = "muscles" | "nerves" | "skeleton" | "organs" | "vessels";
export type AnatomyText = Record<AnatomyLanguage, string>;
export type AnatomyStructure = {
  id: string;
  system: AnatomySystem;
  name: AnatomyText;
  region: AnatomyText;
  summary: AnatomyText;
  views: readonly AnatomyView[];
  sources: readonly string[];
};

const book = "https://open.oregonstate.education/anatomy2e/chapter/";
const source = {
  upperBones: `${book}bones-upper-limb/`,
  lowerBones: `${book}bones-lower-limb/`,
  girdle: `${book}pectoral-girdle/`,
  pelvis: `${book}pelvic-girdle-pelvis/`,
  upperMuscles: `${book}muscles-pectoral-girdle-upper-limbs/`,
  lowerMuscles: `${book}appendicular-muscles-pelvic-girdle-lower-limbs/`,
  trunkMuscles: `${book}axial-muscles-abdominal-wall-thorax/`,
  nerves: `${book}spinal-cranial-nerves/`,
  central: `${book}structure-function-nervous-system/`,
  heart: `${book}heart-anatomy/`,
  lungs: `${book}lungs/`,
  digestive: `${book}stomach/`,
  liver: `${book}accessory-organs-digestion/`,
  kidney: `${book}internal-external-anatomy-kidney/`,
  urinary: `${book}urine-transport-elimination/`,
  vessels: `${book}circulatory-pathways/`,
};

export const anatomySystems: readonly {
  id: AnatomySystem;
  name: AnatomyText;
  color: string;
  pale: string;
}[] = [
  { id: "muscles", name: { fr: "Muscles", en: "Muscles" }, color: "#a74e50", pale: "#f2d5ce" },
  { id: "nerves", name: { fr: "Nerfs", en: "Nerves" }, color: "#9a7516", pale: "#fae7a2" },
  { id: "skeleton", name: { fr: "Squelette", en: "Skeleton" }, color: "#647b8d", pale: "#dee9ee" },
  { id: "organs", name: { fr: "Organes", en: "Organs" }, color: "#85719b", pale: "#e8dff0" },
  { id: "vessels", name: { fr: "Vaisseaux", en: "Vessels" }, color: "#b25853", pale: "#f5d9d5" },
];

const upper = { fr: "Membre supérieur", en: "Upper limb" };
const lower = { fr: "Membre inférieur", en: "Lower limb" };
const thorax = { fr: "Thorax", en: "Thorax" };
const abdomen = { fr: "Abdomen", en: "Abdomen" };
const pelvis = { fr: "Bassin", en: "Pelvis" };
const anterior: readonly AnatomyView[] = ["anterior"];
const posterior: readonly AnatomyView[] = ["posterior"];
const both: readonly AnatomyView[] = ["anterior", "posterior"];

// Original introductory summaries and schematic drawings, pending medical review.
// References support the anatomical landmarks; their illustrations are not reused.
export const anatomyStructures: readonly AnatomyStructure[] = [
  { id: "clavicle", system: "skeleton", name: { fr: "Clavicule", en: "Clavicle" }, region: upper,
    summary: { fr: "Relie le sternum à l’acromion et participe à la ceinture scapulaire.", en: "Connects the sternum to the acromion within the shoulder girdle." }, views: anterior, sources: [source.girdle] },
  { id: "scapula", system: "skeleton", name: { fr: "Scapula", en: "Scapula" }, region: upper,
    summary: { fr: "Os plat postérieur portant la glène, qui s’articule avec la tête humérale.", en: "Posterior flat bone whose glenoid cavity articulates with the humeral head." }, views: posterior, sources: [source.girdle] },
  { id: "humerus", system: "skeleton", name: { fr: "Humérus", en: "Humerus" }, region: upper,
    summary: { fr: "Os du bras, entre l’articulation de l’épaule et celle du coude.", en: "Bone of the arm, extending between the shoulder and elbow joints." }, views: both, sources: [source.upperBones] },
  { id: "radius", system: "skeleton", name: { fr: "Radius", en: "Radius" }, region: upper,
    summary: { fr: "Os latéral de l’avant-bras, du côté du pouce en position anatomique.", en: "Lateral forearm bone, on the thumb side in anatomical position." }, views: anterior, sources: [source.upperBones] },
  { id: "ulna", system: "skeleton", name: { fr: "Ulna", en: "Ulna" }, region: upper,
    summary: { fr: "Os médial de l’avant-bras ; son olécrâne forme la saillie du coude.", en: "Medial forearm bone; its olecranon forms the point of the elbow." }, views: anterior, sources: [source.upperBones] },
  { id: "femur", system: "skeleton", name: { fr: "Fémur", en: "Femur" }, region: lower,
    summary: { fr: "Os de la cuisse, articulé avec le bassin à la hanche et le tibia au genou.", en: "Thigh bone, articulating with the pelvis at the hip and tibia at the knee." }, views: both, sources: [source.lowerBones] },
  { id: "pelvis", system: "skeleton", name: { fr: "Bassin osseux", en: "Bony pelvis" }, region: pelvis,
    summary: { fr: "Associe les os coxaux au sacrum et transmet les charges vers les membres inférieurs.", en: "Joins the hip bones and sacrum, transferring weight to the lower limbs." }, views: both, sources: [source.pelvis] },
  { id: "patella", system: "skeleton", name: { fr: "Patella", en: "Patella" }, region: lower,
    summary: { fr: "Os sésamoïde placé à l’avant du genou, dans le tendon du quadriceps.", en: "Sesamoid bone at the front of the knee within the quadriceps tendon." }, views: anterior, sources: [source.lowerBones] },
  { id: "tibia", system: "skeleton", name: { fr: "Tibia", en: "Tibia" }, region: lower,
    summary: { fr: "Os médial de la jambe, principal support osseux entre le genou et la cheville.", en: "Medial leg bone, the main weight-bearing connection between knee and ankle." }, views: anterior, sources: [source.lowerBones] },
  { id: "deltoid", system: "muscles", name: { fr: "Deltoïde", en: "Deltoid" }, region: upper,
    summary: { fr: "Recouvre l’épaule ; ses faisceaux moyens participent à l’abduction du bras.", en: "Covers the shoulder; its middle fibres contribute to arm abduction." }, views: both, sources: [source.upperMuscles] },
  { id: "biceps", system: "muscles", name: { fr: "Biceps brachial", en: "Biceps brachii" }, region: upper,
    summary: { fr: "Muscle antérieur du bras participant à la flexion du coude et à la supination.", en: "Anterior arm muscle contributing to elbow flexion and forearm supination." }, views: anterior, sources: [source.upperMuscles] },
  { id: "triceps", system: "muscles", name: { fr: "Triceps brachial", en: "Triceps brachii" }, region: upper,
    summary: { fr: "Muscle postérieur du bras, principal extenseur du coude.", en: "Posterior arm muscle and principal extensor of the elbow." }, views: posterior, sources: [source.upperMuscles] },
  { id: "pectoralis-major", system: "muscles", name: { fr: "Grand pectoral", en: "Pectoralis major" }, region: thorax,
    summary: { fr: "Muscle antérieur du thorax participant à l’adduction et à la rotation médiale du bras.", en: "Anterior chest muscle contributing to arm adduction and medial rotation." }, views: anterior, sources: [source.upperMuscles] },
  { id: "rectus-abdominis", system: "muscles", name: { fr: "Droit de l’abdomen", en: "Rectus abdominis" }, region: abdomen,
    summary: { fr: "Muscle vertical de la paroi abdominale antérieure, participant à la flexion du tronc.", en: "Vertical anterior abdominal-wall muscle contributing to trunk flexion." }, views: anterior, sources: [source.trunkMuscles] },
  { id: "quadriceps", system: "muscles", name: { fr: "Quadriceps fémoral", en: "Quadriceps femoris" }, region: lower,
    summary: { fr: "Groupe antérieur de la cuisse dont l’action commune est l’extension du genou.", en: "Anterior thigh muscle group whose shared action is knee extension." }, views: anterior, sources: [source.lowerMuscles] },
  { id: "diaphragm", system: "muscles", name: { fr: "Diaphragme", en: "Diaphragm" }, region: thorax,
    summary: { fr: "Sépare thorax et abdomen ; sa contraction augmente le volume thoracique à l’inspiration.", en: "Separates thorax and abdomen; contraction increases thoracic volume during inspiration." }, views: anterior, sources: [source.trunkMuscles] },
  { id: "median-nerve", system: "nerves", name: { fr: "Nerf médian", en: "Median nerve" }, region: upper,
    summary: { fr: "Nerf du plexus brachial traversant le canal carpien.", en: "Brachial plexus nerve that passes through the carpal tunnel." }, views: anterior, sources: [source.nerves] },
  { id: "ulnar-nerve", system: "nerves", name: { fr: "Nerf ulnaire", en: "Ulnar nerve" }, region: upper,
    summary: { fr: "Passe en arrière de l’épicondyle médial de l’humérus.", en: "Passes behind the medial epicondyle of the humerus." }, views: anterior, sources: [source.nerves] },
  { id: "radial-nerve", system: "nerves", name: { fr: "Nerf radial", en: "Radial nerve" }, region: upper,
    summary: { fr: "Nerf du plexus brachial associé aux muscles extenseurs du membre supérieur.", en: "Brachial plexus nerve supplying upper-limb extensor muscles." }, views: posterior, sources: [source.nerves] },
  { id: "sciatic-nerve", system: "nerves", name: { fr: "Nerf sciatique", en: "Sciatic nerve" }, region: lower,
    summary: { fr: "Nerf du plexus sacral parcourant la région postérieure de la cuisse.", en: "Sacral plexus nerve running through the posterior thigh." }, views: posterior, sources: [source.nerves] },
  { id: "femoral-nerve", system: "nerves", name: { fr: "Nerf fémoral", en: "Femoral nerve" }, region: lower,
    summary: { fr: "Issu du plexus lombaire, il innerve notamment le quadriceps.", en: "Arises from the lumbar plexus and supplies the quadriceps." }, views: anterior, sources: [source.nerves] },
  { id: "tibial-nerve", system: "nerves", name: { fr: "Nerf tibial", en: "Tibial nerve" }, region: lower,
    summary: { fr: "Branche du nerf sciatique poursuivant son trajet derrière la jambe.", en: "Sciatic nerve branch continuing through the posterior leg." }, views: posterior, sources: [source.nerves] },
  { id: "brachial-plexus", system: "nerves", name: { fr: "Plexus brachial", en: "Brachial plexus" }, region: upper,
    summary: { fr: "Réseau de rameaux ventraux C5–T1 destiné au membre supérieur.", en: "Network of C5–T1 ventral rami supplying the upper limb." }, views: anterior, sources: [source.nerves] },
  { id: "spinal-cord", system: "nerves", name: { fr: "Moelle spinale", en: "Spinal cord" }, region: { fr: "Rachis", en: "Spine" },
    summary: { fr: "Partie du système nerveux central protégée dans le canal vertébral.", en: "Part of the central nervous system protected within the vertebral canal." }, views: posterior, sources: [source.central] },
  { id: "heart", system: "organs", name: { fr: "Cœur", en: "Heart" }, region: thorax,
    summary: { fr: "Organe musculaire du médiastin ; sa pointe se dirige vers la gauche.", en: "Muscular organ in the mediastinum; its apex points to the left." }, views: anterior, sources: [source.heart] },
  { id: "lungs", system: "organs", name: { fr: "Poumons", en: "Lungs" }, region: thorax,
    summary: { fr: "Occupent les cavités pleurales de part et d’autre du médiastin.", en: "Occupy the pleural cavities on either side of the mediastinum." }, views: anterior, sources: [source.lungs] },
  { id: "liver", system: "organs", name: { fr: "Foie", en: "Liver" }, region: abdomen,
    summary: { fr: "Organe situé surtout dans la partie supérieure droite de l’abdomen.", en: "Organ located mainly in the upper right part of the abdomen." }, views: anterior, sources: [source.liver] },
  { id: "stomach", system: "organs", name: { fr: "Estomac", en: "Stomach" }, region: abdomen,
    summary: { fr: "Segment digestif entre œsophage et duodénum, principalement dans l’abdomen supérieur gauche.", en: "Digestive segment between oesophagus and duodenum, mainly in the upper left abdomen." }, views: anterior, sources: [source.digestive] },
  { id: "kidneys", system: "organs", name: { fr: "Reins", en: "Kidneys" }, region: abdomen,
    summary: { fr: "Organes rétropéritonéaux disposés de part et d’autre du rachis lombaire.", en: "Retroperitoneal organs on either side of the lumbar spine." }, views: posterior, sources: [source.kidney] },
  { id: "bladder", system: "organs", name: { fr: "Vessie", en: "Urinary bladder" }, region: pelvis,
    summary: { fr: "Réservoir musculaire pelvien recevant l’urine par les uretères.", en: "Muscular pelvic reservoir receiving urine through the ureters." }, views: anterior, sources: [source.urinary] },
  { id: "aorta", system: "vessels", name: { fr: "Aorte", en: "Aorta" }, region: { fr: "Thorax et abdomen", en: "Thorax and abdomen" },
    summary: { fr: "Part du ventricule gauche et distribue le sang à la circulation systémique.", en: "Leaves the left ventricle and supplies the systemic circulation." }, views: anterior, sources: [source.vessels] },
  { id: "carotid", system: "vessels", name: { fr: "Artère carotide commune", en: "Common carotid artery" }, region: { fr: "Cou", en: "Neck" },
    summary: { fr: "Monte dans le cou avant de se diviser en carotides interne et externe.", en: "Ascends through the neck before dividing into internal and external carotid arteries." }, views: anterior, sources: [source.vessels] },
  { id: "subclavian-artery", system: "vessels", name: { fr: "Artère subclavière", en: "Subclavian artery" }, region: upper,
    summary: { fr: "Chemine sous la clavicule et se prolonge par l’artère axillaire.", en: "Runs beneath the clavicle and continues as the axillary artery." }, views: anterior, sources: [source.vessels] },
  { id: "femoral-artery", system: "vessels", name: { fr: "Artère fémorale", en: "Femoral artery" }, region: lower,
    summary: { fr: "Prolonge l’artère iliaque externe après son passage sous le ligament inguinal.", en: "Continues the external iliac artery beyond the inguinal ligament." }, views: anterior, sources: [source.vessels] },
  { id: "inferior-vena-cava", system: "vessels", name: { fr: "Veine cave inférieure", en: "Inferior vena cava" }, region: { fr: "Abdomen et thorax", en: "Abdomen and thorax" },
    summary: { fr: "Ramène le sang veineux des régions sous-diaphragmatiques vers l’atrium droit.", en: "Returns venous blood from below the diaphragm to the right atrium." }, views: anterior, sources: [source.vessels] },
  { id: "pulmonary-artery", system: "vessels", name: { fr: "Tronc et artères pulmonaires", en: "Pulmonary trunk and arteries" }, region: thorax,
    summary: { fr: "Transportent le sang du ventricule droit vers les poumons.", en: "Carry blood from the right ventricle to the lungs." }, views: anterior, sources: [source.vessels] },
];

export function anatomyStructure(id: string): AnatomyStructure | undefined {
  return anatomyStructures.find((structure) => structure.id === id);
}

export function anatomySystem(id: AnatomySystem) {
  return anatomySystems.find((system) => system.id === id)!;
}
