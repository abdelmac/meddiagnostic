import type { AnatomyText } from "./anatomy-structures";

export type AnatomyFocus = "origin" | "insertion" | "action" | "innervation" | "identification";
export type MuscleAttachment = {
  id: string;
  name: AnatomyText;
  origin: AnatomyText;
  insertion: AnatomyText;
  action: AnatomyText;
  innervation: AnatomyText;
  sources: { title: string; url: string }[];
};

const text = (fr: string, en: string): AnatomyText => ({ fr, en });
const reference = (title: string, code: string) => ({
  title: `NCBI Bookshelf — StatPearls, ${title}`,
  url: `https://www.ncbi.nlm.nih.gov/books/${code}/`,
});
const upper = {
  title: "OpenStax — Anatomy and Physiology 2e, Muscles of the Pectoral Girdle and Upper Limbs",
  url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/11-5-muscles-of-the-pectoral-girdle-and-upper-limbs",
};

// Original concise revision notes, not a substitute for a complete atlas.
// They describe the usual anatomy; normal variants exist. Medical review pending.
export const muscleAttachments: Record<string, MuscleAttachment> = {
  biceps: {
    id: "biceps", name: text("Biceps brachial", "Biceps brachii"),
    origin: text("Chef long : tubercule supraglénoïdal de la scapula. Chef court : processus coracoïde.", "Long head: supraglenoid tubercle of the scapula. Short head: coracoid process."),
    insertion: text("Tubérosité radiale ; l’aponévrose bicipitale rejoint le fascia antébrachial.", "Radial tuberosity; the bicipital aponeurosis joins the forearm fascia."),
    action: text("Flexion du coude et supination de l’avant-bras ; participation à la flexion de l’épaule.", "Elbow flexion and forearm supination; assists shoulder flexion."),
    innervation: text("Nerf musculocutané, principalement C5–C6.", "Musculocutaneous nerve, predominantly C5–C6."),
    sources: [reference("Biceps Muscle", "NBK519538"), upper],
  },
  triceps: {
    id: "triceps", name: text("Triceps brachial", "Triceps brachii"),
    origin: text("Chef long : tubercule infraglénoïdal. Chefs latéral et médial : face postérieure de l’humérus, respectivement au-dessus et au-dessous du sillon radial.", "Long head: infraglenoid tubercle. Lateral and medial heads: posterior humerus, above and below the radial groove respectively."),
    insertion: text("Olécrâne de l’ulna par le tendon tricipital.", "Olecranon of the ulna through the triceps tendon."),
    action: text("Extension du coude ; le chef long participe à l’extension et à l’adduction de l’épaule.", "Elbow extension; the long head assists shoulder extension and adduction."),
    innervation: text("Nerf radial, principalement C6–C8, avec prédominance C7 pour l’extension du coude.", "Radial nerve, predominantly C6–C8, with C7 particularly important for elbow extension."),
    sources: [reference("Triceps Muscle", "NBK536996"), upper],
  },
  deltoid: {
    id: "deltoid", name: text("Deltoïde", "Deltoid"),
    origin: text("Tiers latéral de la clavicule, acromion et épine de la scapula.", "Lateral third of the clavicle, acromion and spine of the scapula."),
    insertion: text("Tubérosité deltoïdienne de l’humérus.", "Deltoid tuberosity of the humerus."),
    action: text("Faisceau moyen : abduction. Faisceau antérieur : flexion et rotation médiale. Faisceau postérieur : extension et rotation latérale.", "Middle fibres: abduction. Anterior fibres: flexion and medial rotation. Posterior fibres: extension and lateral rotation."),
    innervation: text("Nerf axillaire, C5–C6.", "Axillary nerve, C5–C6."),
    sources: [upper, reference("Brachial Plexus", "NBK531473")],
  },
  "pectoralis-major": {
    id: "pectoralis-major", name: text("Grand pectoral", "Pectoralis major"),
    origin: text("Moitié médiale de la clavicule, sternum et cartilages costaux supérieurs ; contribution de l’aponévrose de l’oblique externe.", "Medial half of the clavicle, sternum and upper costal cartilages; a contribution from the external oblique aponeurosis."),
    insertion: text("Lèvre latérale du sillon intertuberculaire de l’humérus.", "Lateral lip of the intertubercular groove of the humerus."),
    action: text("Adduction et rotation médiale du bras. Chef claviculaire : flexion. Chef sternocostal : retour en extension d’un bras déjà fléchi.", "Arm adduction and medial rotation. Clavicular head: flexion. Sternocostal head: extension of an already flexed arm."),
    innervation: text("Nerfs pectoraux latéral et médial issus du plexus brachial.", "Lateral and medial pectoral nerves from the brachial plexus."),
    sources: [reference("Pectoralis Major", "NBK525991"), upper],
  },
  "rectus-abdominis": {
    id: "rectus-abdominis", name: text("Droit de l’abdomen", "Rectus abdominis"),
    origin: text("Crête pubienne et symphyse pubienne.", "Pubic crest and pubic symphysis."),
    insertion: text("Processus xiphoïde et cartilages costaux 5 à 7.", "Xiphoid process and costal cartilages 5–7."),
    action: text("Flexion du tronc, compression abdominale et participation à la rétroversion du bassin.", "Trunk flexion, abdominal compression and contribution to posterior pelvic tilt."),
    innervation: text("Nerfs thoracoabdominaux T7–T11 et nerf subcostal T12.", "Thoracoabdominal nerves T7–T11 and the subcostal nerve T12."),
    sources: [reference("Rectus Sheath", "NBK537153"), reference("Abdominal Wall", "NBK551649")],
  },
  quadriceps: {
    id: "quadriceps", name: text("Quadriceps fémoral", "Quadriceps femoris"),
    origin: text("Droit fémoral : épine iliaque antéro-inférieure et région supra-acétabulaire. Vastes latéral, médial et intermédiaire : fémur.", "Rectus femoris: anterior inferior iliac spine and supra-acetabular region. Vastus lateralis, medialis and intermedius: femur."),
    insertion: text("Patella par le tendon quadricipital, puis tubérosité tibiale par le ligament patellaire.", "Patella through the quadriceps tendon, then tibial tuberosity through the patellar ligament."),
    action: text("Les quatre chefs étendent le genou ; le droit fémoral participe aussi à la flexion de hanche.", "All four heads extend the knee; rectus femoris also assists hip flexion."),
    innervation: text("Nerf fémoral, L2–L4.", "Femoral nerve, L2–L4."),
    sources: [reference("Thigh Quadriceps Muscle", "NBK513334"), reference("Rectus Femoris Muscle", "NBK539897")],
  },
  diaphragm: {
    id: "diaphragm", name: text("Diaphragme", "Diaphragm"),
    origin: text("Processus xiphoïde, six dernières côtes et leurs cartilages, piliers lombaires et ligaments arqués.", "Xiphoid process, lower six ribs and their cartilages, lumbar crura and arcuate ligaments."),
    insertion: text("Centre tendineux du diaphragme.", "Central tendon of the diaphragm."),
    action: text("À la contraction, les coupoles s’abaissent et le volume thoracique augmente : c’est le principal muscle inspiratoire.", "Contraction lowers the domes and increases thoracic volume: it is the main muscle of inspiration."),
    innervation: text("Nerfs phréniques droit et gauche, C3–C5, pour la commande motrice.", "Right and left phrenic nerves, C3–C5, provide motor supply."),
    sources: [reference("Diaphragm", "NBK519558"), reference("Phrenic Nerves", "NBK513325")],
  },
};

export function getMuscleAttachment(id: string): MuscleAttachment | undefined {
  return muscleAttachments[id];
}

export const anatomyFocusLabels: Record<AnatomyFocus, AnatomyText> = {
  origin: text("Origines", "Origins"),
  insertion: text("Insertions", "Insertions"),
  action: text("Actions", "Actions"),
  innervation: text("Innervation", "Innervation"),
  identification: text("Repérage et rapports", "Identification and relations"),
};
