/**
 * Display names for the English FMA labels distributed with BodyParts3D 4.0.
 * This dictionary never changes FMA IDs, source names or source geometry.
 * Unrecognised labels stay in English rather than receiving a guessed name.
 */
type Language = "fr" | "en";
type Gender = "m" | "f";
type Kind = "muscle" | "bone" | "organ" | "vessel" | "nerve" | "other";
type Name = { fr: string; gender: Gender; kind: Kind; elide?: boolean; sideTemplate?: string };
const names: Record<string, Name> = Object.create(null);

function group(kind: Kind, gender: Gender, entries: Record<string, string>) {
  for (const [en, fr] of Object.entries(entries)) names[en] = { fr, gender, kind };
}

group("muscle", "m", {
  deltoid: "deltoïde", trapezius: "trapèze", "pectoralis major": "grand pectoral", "pectoralis minor": "petit pectoral",
  "biceps brachii": "biceps brachial", "triceps brachii": "triceps brachial", brachialis: "brachial", brachioradialis: "brachioradial",
  coracobrachialis: "coracobrachial", anconeus: "anconé", supraspinatus: "supra-épineux", infraspinatus: "infra-épineux",
  subscapularis: "subscapulaire", "teres major": "grand rond", "teres minor": "petit rond", "latissimus dorsi": "grand dorsal",
  "serratus anterior": "dentelé antérieur", "rhomboid major": "grand rhomboïde", "rhomboid minor": "petit rhomboïde",
  "levator scapulae": "élévateur de la scapula", "subclavius": "subclavier", "pronator teres": "rond pronateur",
  "pronator quadratus": "carré pronateur", supinator: "supinateur", "flexor carpi radialis": "fléchisseur radial du carpe",
  "flexor carpi ulnaris": "fléchisseur ulnaire du carpe", "palmaris longus": "long palmaire",
  "flexor digitorum superficialis": "fléchisseur superficiel des doigts", "flexor digitorum profundus": "fléchisseur profond des doigts",
  "flexor pollicis longus": "long fléchisseur du pouce", "extensor carpi radialis longus": "long extenseur radial du carpe",
  "extensor carpi radialis brevis": "court extenseur radial du carpe", "extensor carpi ulnaris": "extenseur ulnaire du carpe",
  "extensor digitorum": "extenseur des doigts", "extensor indicis": "extenseur de l’index", "extensor digiti minimi": "extenseur du petit doigt",
  "abductor pollicis longus": "long abducteur du pouce", "extensor pollicis longus": "long extenseur du pouce",
  "extensor pollicis brevis": "court extenseur du pouce", "abductor pollicis brevis": "court abducteur du pouce",
  "flexor pollicis brevis": "court fléchisseur du pouce", "adductor pollicis": "adducteur du pouce", "opponens pollicis": "opposant du pouce",
  "abductor digiti minimi of hand": "abducteur du petit doigt", "flexor digiti minimi brevis of hand": "court fléchisseur du petit doigt",
  "opponens digiti minimi": "opposant du petit doigt", "palmaris brevis": "court palmaire",
  "rectus abdominis": "droit de l’abdomen", "external oblique": "oblique externe de l’abdomen",
  "internal oblique": "oblique interne de l’abdomen", "transversus abdominis": "transverse de l’abdomen",
  "external abdominal oblique": "oblique externe de l’abdomen", "internal abdominal oblique": "oblique interne de l’abdomen",
  "quadratus lumborum": "carré des lombes", pyramidalis: "pyramidal de l’abdomen", diaphragm: "diaphragme",
  "external intercostal muscle": "intercostal externe", "internal intercostal muscle": "intercostal interne",
  "innermost intercostal muscle": "intercostal intime", "transversus thoracis": "transverse du thorax",
  "serratus posterior superior": "dentelé postérieur supérieur", "serratus posterior inferior": "dentelé postérieur inférieur",
  "erector spinae": "érecteur du rachis", iliocostalis: "iliocostal", longissimus: "longissimus", spinalis: "épineux", multifidus: "multifide",
  "psoas major": "grand psoas", "psoas minor": "petit psoas", iliacus: "iliaque", iliopsoas: "ilio-psoas",
  "gluteus maximus": "grand glutéal", "gluteus medius": "moyen glutéal", "gluteus minimus": "petit glutéal",
  "gluteal muscle": "muscle glutéal", "tensor fasciae latae": "tenseur du fascia lata", "tensor fascia lata": "tenseur du fascia lata",
  sartorius: "sartorius", gracilis: "gracile", pectineus: "pectiné", "adductor longus": "long adducteur",
  "adductor brevis": "court adducteur", "adductor magnus": "grand adducteur", "adductor minimus": "petit adducteur",
  "quadriceps femoris": "quadriceps fémoral", "rectus femoris": "droit fémoral", "vastus lateralis": "vaste latéral",
  "vastus medialis": "vaste médial", "vastus intermedius": "vaste intermédiaire", "articularis genus": "articulaire du genou",
  "biceps femoris": "biceps fémoral", semitendinosus: "semi-tendineux", semimembranosus: "semi-membraneux",
  piriformis: "piriforme", "obturator internus": "obturateur interne", "obturator externus": "obturateur externe",
  "superior gemellus": "jumeau supérieur", "inferior gemellus": "jumeau inférieur", "quadratus femoris": "carré fémoral",
  "tibialis anterior": "tibial antérieur", "tibialis posterior": "tibial postérieur", "fibularis longus": "long fibulaire",
  "fibularis brevis": "court fibulaire", "fibularis tertius": "troisième fibulaire", "peroneus longus": "long fibulaire",
  "peroneus brevis": "court fibulaire", "peroneus tertius": "troisième fibulaire", gastrocnemius: "gastrocnémien", soleus: "soléaire",
  plantaris: "plantaire", popliteus: "poplité", "extensor digitorum longus": "long extenseur des orteils",
  "extensor digitorum brevis": "court extenseur des orteils", "extensor hallucis longus": "long extenseur de l’hallux",
  "extensor hallucis brevis": "court extenseur de l’hallux", "flexor digitorum longus": "long fléchisseur des orteils",
  "flexor digitorum brevis": "court fléchisseur des orteils", "flexor hallucis longus": "long fléchisseur de l’hallux",
  "flexor hallucis brevis": "court fléchisseur de l’hallux", "abductor hallucis": "abducteur de l’hallux",
  "adductor hallucis": "adducteur de l’hallux", "abductor digiti minimi of foot": "abducteur du petit orteil",
  "flexor digiti minimi brevis of foot": "court fléchisseur du petit orteil", "flexor accessorius": "carré plantaire", "quadratus plantae": "carré plantaire",
  sternocleidomastoid: "sterno-cléido-mastoïdien", platysma: "platysma", "scalene muscle": "muscle scalène",
  "anterior scalene": "scalène antérieur", "middle scalene": "scalène moyen", "posterior scalene": "scalène postérieur",
  "scalenus anterior": "scalène antérieur", "scalenus medius": "scalène moyen", "scalenus posterior": "scalène postérieur",
  "longus colli": "long du cou", "longus capitis": "long de la tête", "rectus capitis anterior": "droit antérieur de la tête",
  "rectus capitis lateralis": "droit latéral de la tête", "splenius capitis": "splénius de la tête", "splenius cervicis": "splénius du cou",
  "rectus capitis posterior major": "grand droit postérieur de la tête", "rectus capitis posterior minor": "petit droit postérieur de la tête",
  "obliquus capitis superior": "oblique supérieur de la tête", "obliquus capitis inferior": "oblique inférieur de la tête",
  sternohyoid: "sterno-hyoïdien", sternothyroid: "sterno-thyroïdien", thyrohyoid: "thyro-hyoïdien", omohyoid: "omo-hyoïdien",
  digastric: "digastrique", stylohyoid: "stylo-hyoïdien", mylohyoid: "mylo-hyoïdien", geniohyoid: "génio-hyoïdien",
  masseter: "masséter", temporalis: "temporal", "medial pterygoid": "ptérygoïdien médial", "lateral pterygoid": "ptérygoïdien latéral",
  "orbicularis oculi": "orbiculaire de l’œil", "orbicularis oris": "orbiculaire de la bouche", buccinator: "buccinateur",
  "zygomaticus major": "grand zygomatique", "zygomaticus minor": "petit zygomatique", risorius: "risorius", mentalis: "mentonnier",
  "levator labii superioris": "élévateur de la lèvre supérieure", "levator anguli oris": "élévateur de l’angle de la bouche",
  "depressor labii inferioris": "abaisseur de la lèvre inférieure", "depressor anguli oris": "abaisseur de l’angle de la bouche",
  "corrugator supercilii": "corrugateur du sourcil", procerus: "procérus", nasalis: "nasal", frontalis: "frontal", occipitalis: "occipital",
  "levator palpebrae superioris": "élévateur de la paupière supérieure", "superior rectus": "droit supérieur de l’œil",
  "inferior rectus": "droit inférieur de l’œil", "medial rectus": "droit médial de l’œil", "lateral rectus": "droit latéral de l’œil",
  "superior oblique": "oblique supérieur de l’œil", "inferior oblique": "oblique inférieur de l’œil",
  pubococcygeus: "pubo-coccygien", puborectalis: "pubo-rectal", iliococcygeus: "ilio-coccygien", coccygeus: "coccygien", "levator ani": "élévateur de l’anus",
});

group("bone", "m", {
  humerus: "humérus", radius: "radius", femur: "fémur", tibia: "tibia", sternum: "sternum", sacrum: "sacrum", coccyx: "coccyx",
  skull: "crâne", cranium: "crâne", "frontal bone": "os frontal", "parietal bone": "os pariétal", "occipital bone": "os occipital",
  "temporal bone": "os temporal", "sphenoid bone": "os sphénoïde", ethmoid: "ethmoïde", "ethmoid bone": "os ethmoïde",
  "zygomatic bone": "os zygomatique", "nasal bone": "os nasal", "lacrimal bone": "os lacrymal", "palatine bone": "os palatin",
  vomer: "vomer", maxilla: "maxillaire", "hyoid bone": "os hyoïde", "inferior nasal concha": "cornet nasal inférieur",
  "hip bone": "os coxal", "coxal bone": "os coxal", ilium: "ilium", ischium: "ischium", pubis: "pubis", pelvis: "bassin",
  "bony pelvis": "bassin osseux", manubrium: "manubrium sternal", "xiphoid process": "processus xiphoïde", "costal cartilage": "cartilage costal",
  talus: "talus", calcaneus: "calcanéus", "navicular bone": "os naviculaire", "cuboid bone": "os cuboïde",
  "medial cuneiform bone": "os cunéiforme médial", "intermediate cuneiform bone": "os cunéiforme intermédiaire", "lateral cuneiform bone": "os cunéiforme latéral",
  scaphoid: "scaphoïde", "scaphoid bone": "os scaphoïde", lunate: "lunatum", "lunate bone": "os lunatum",
  triquetrum: "triquétrum", "triquetral bone": "os triquétrum", pisiform: "pisiforme", "pisiform bone": "os pisiforme",
  trapezium: "trapèze du carpe", "trapezium bone": "os trapèze", trapezoid: "trapézoïde", "trapezoid bone": "os trapézoïde",
  capitate: "capitatum", "capitate bone": "os capitatum", hamate: "hamatum", "hamate bone": "os hamatum",
  "metacarpal bone": "métacarpien", "metatarsal bone": "métatarsien", "sesamoid bone": "os sésamoïde",
  "long bone": "os long", "short bone": "os court", "flat bone": "os plat", "irregular bone": "os irrégulier", "pneumatized bone": "os pneumatique",
});
names.humerus!.elide = true;

group("bone", "f", {
  clavicle: "clavicule", scapula: "scapula", ulna: "ulna", fibula: "fibula", patella: "patella", mandible: "mandibule",
  rib: "côte", "true rib": "côte vraie", "false rib": "fausse côte", "floating rib": "côte flottante", "typical rib": "côte typique", "atypical rib": "côte atypique",
  vertebra: "vertèbre", "cervical vertebra": "vertèbre cervicale", "thoracic vertebra": "vertèbre thoracique", "lumbar vertebra": "vertèbre lombaire",
  phalanx: "phalange", "proximal phalanx": "phalange proximale", "middle phalanx": "phalange moyenne", "distal phalanx": "phalange distale",
});

group("organ", "m", {
  brain: "encéphale", cerebrum: "cerveau", cerebellum: "cervelet", brainstem: "tronc cérébral", "brain stem": "tronc cérébral",
  midbrain: "mésencéphale", pons: "pont", thalamus: "thalamus", hypothalamus: "hypothalamus", hippocampus: "hippocampe", caudate: "noyau caudé",
  putamen: "putamen", "globus pallidus": "pallidum", "caudate nucleus": "noyau caudé", "corpus callosum": "corps calleux",
  heart: "cœur", atrium: "atrium", ventricle: "ventricule", lung: "poumon", liver: "foie", stomach: "estomac", pancreas: "pancréas",
  esophagus: "œsophage", oesophagus: "œsophage", duodenum: "duodénum", jejunum: "jéjunum", ileum: "iléon", cecum: "cæcum", caecum: "cæcum",
  colon: "côlon", "ascending colon": "côlon ascendant", "transverse colon": "côlon transverse", "descending colon": "côlon descendant",
  "sigmoid colon": "côlon sigmoïde", rectum: "rectum", appendix: "appendice vermiforme", "vermiform appendix": "appendice vermiforme",
  "small intestine": "intestin grêle", "large intestine": "gros intestin", pharynx: "pharynx", larynx: "larynx", nasopharynx: "nasopharynx",
  oropharynx: "oropharynx", laryngopharynx: "laryngopharynx", kidney: "rein", ureter: "uretère", urethra: "urètre",
  testis: "testicule", epididymis: "épididyme", penis: "pénis", scrotum: "scrotum", "ductus deferens": "conduit déférent", "vas deferens": "conduit déférent",
  uterus: "utérus", ovary: "ovaire", thymus: "thymus", "thyroid cartilage": "cartilage thyroïde", "cricoid cartilage": "cartilage cricoïde",
  "arytenoid cartilage": "cartilage aryténoïde", "corniculate cartilage": "cartilage corniculé", "cuneiform cartilage": "cartilage cunéiforme",
  "pancreatic duct": "conduit pancréatique", "common hepatic duct": "conduit hépatique commun", "cystic duct": "conduit cystique",
  "common bile duct": "conduit cholédoque", "bile duct": "conduit biliaire", "cerebral aqueduct": "aqueduc du mésencéphale",
  eye: "œil", eyeball: "globe oculaire", lens: "cristallin", "optic chiasm": "chiasma optique", "optic tract": "tractus optique",
});
for (const name of ["hypothalamus", "hippocampus"]) names[name]!.elide = true;

group("organ", "f", {
  "spinal cord": "moelle spinale", "medulla oblongata": "moelle allongée", pituitary: "hypophyse", "pituitary gland": "hypophyse",
  amygdala: "amygdale cérébrale", spleen: "rate", gallbladder: "vésicule biliaire", "gall bladder": "vésicule biliaire", trachea: "trachée",
  bronchus: "bronche", "main bronchus": "bronche principale", tongue: "langue", epiglottis: "épiglotte", prostate: "prostate", "urinary bladder": "vessie",
  "aortic valve": "valve aortique", "pulmonary valve": "valve pulmonaire", "tricuspid valve": "valve tricuspide", "mitral valve": "valve mitrale",
  "thyroid gland": "glande thyroïde", "parathyroid gland": "glande parathyroïde", "adrenal gland": "glande surrénale", "suprarenal gland": "glande surrénale",
  "parotid gland": "glande parotide", "submandibular gland": "glande submandibulaire", "sublingual gland": "glande sublinguale", "lacrimal gland": "glande lacrymale",
  "seminal vesicle": "vésicule séminale", "uterine tube": "trompe utérine", "mammary gland": "glande mammaire",
  retina: "rétine", cornea: "cornée", sclera: "sclère", choroid: "choroïde", iris: "iris",
});
// Common French usage treats iris as masculine.
names.iris!.gender = "m";

group("vessel", "f", {
  artery: "artère", aorta: "aorte", "ascending aorta": "aorte ascendante", "arch of aorta": "crosse de l’aorte",
  "descending aorta": "aorte descendante", "thoracic aorta": "aorte thoracique", "abdominal aorta": "aorte abdominale",
  "brachiocephalic artery": "artère brachiocéphalique", "common carotid artery": "artère carotide commune",
  "internal carotid artery": "artère carotide interne", "external carotid artery": "artère carotide externe",
  "subclavian artery": "artère subclavière", "axillary artery": "artère axillaire", "brachial artery": "artère brachiale",
  "deep cervical artery": "artère cervicale profonde", "superficial cervical artery": "artère cervicale superficielle", "transverse cervical artery": "artère transverse du cou",
  "esophageal artery": "artère œsophagienne", "oesophageal artery": "artère œsophagienne", "bronchial artery": "artère bronchique",
  "radial artery": "artère radiale", "ulnar artery": "artère ulnaire", "vertebral artery": "artère vertébrale",
  "internal thoracic artery": "artère thoracique interne", "thoraco-acromial artery": "artère thoraco-acromiale",
  "thoracoacromial artery": "artère thoraco-acromiale", "lateral thoracic artery": "artère thoracique latérale",
  "thoracodorsal artery": "artère thoracodorsale", "dorsal scapular artery": "artère dorsale de la scapula",
  "suprascapular artery": "artère suprascapulaire", "deep brachial artery": "artère profonde du bras",
  "common iliac artery": "artère iliaque commune", "external iliac artery": "artère iliaque externe", "internal iliac artery": "artère iliaque interne",
  "femoral artery": "artère fémorale", "deep femoral artery": "artère profonde de la cuisse", "popliteal artery": "artère poplitée",
  "anterior tibial artery": "artère tibiale antérieure", "posterior tibial artery": "artère tibiale postérieure",
  "fibular artery": "artère fibulaire", "peroneal artery": "artère fibulaire", "dorsalis pedis artery": "artère dorsale du pied",
  "medial plantar artery": "artère plantaire médiale", "lateral plantar artery": "artère plantaire latérale",
  "superior gluteal artery": "artère glutéale supérieure", "inferior gluteal artery": "artère glutéale inférieure", "obturator artery": "artère obturatrice",
  "renal artery": "artère rénale", "splenic artery": "artère splénique", "common hepatic artery": "artère hépatique commune",
  "proper hepatic artery": "artère hépatique propre", "left gastric artery": "artère gastrique gauche", "right gastric artery": "artère gastrique droite",
  "superior mesenteric artery": "artère mésentérique supérieure", "inferior mesenteric artery": "artère mésentérique inférieure",
  "pulmonary artery": "artère pulmonaire", "coronary artery": "artère coronaire", "anterior interventricular artery": "artère interventriculaire antérieure",
  "posterior interventricular artery": "artère interventriculaire postérieure", "middle cerebral artery": "artère cérébrale moyenne",
  "anterior cerebral artery": "artère cérébrale antérieure", "posterior cerebral artery": "artère cérébrale postérieure",
  "basilar artery": "artère basilaire", "anterior communicating artery": "artère communicante antérieure", "posterior communicating artery": "artère communicante postérieure",
  "posterior inferior cerebellar artery": "artère cérébelleuse postéro-inférieure", "anterior inferior cerebellar artery": "artère cérébelleuse antéro-inférieure",
  "superior cerebellar artery": "artère cérébelleuse supérieure", "superior thyroid artery": "artère thyroïdienne supérieure",
  "inferior thyroid artery": "artère thyroïdienne inférieure", "superficial temporal artery": "artère temporale superficielle",
  "facial artery": "artère faciale", "lingual artery": "artère linguale", "maxillary artery": "artère maxillaire",
  "posterior intercostal artery": "artère intercostale postérieure", "anterior intercostal artery": "artère intercostale antérieure",
  "subcostal artery": "artère subcostale", "superior intercostal artery": "artère intercostale suprême",
  "superior epigastric artery": "artère épigastrique supérieure", "inferior epigastric artery": "artère épigastrique inférieure",
  "musculophrenic artery": "artère musculophrénique", "lumbar artery": "artère lombaire", "testicular artery": "artère testiculaire",
  vein: "veine", "superior vena cava": "veine cave supérieure", "inferior vena cava": "veine cave inférieure",
  "brachiocephalic vein": "veine brachiocéphalique", "internal jugular vein": "veine jugulaire interne", "external jugular vein": "veine jugulaire externe",
  "subclavian vein": "veine subclavière", "axillary vein": "veine axillaire", "brachial vein": "veine brachiale", "cephalic vein": "veine céphalique",
  "basilic vein": "veine basilique", "median cubital vein": "veine médiane du coude", "radial vein": "veine radiale", "ulnar vein": "veine ulnaire",
  "common iliac vein": "veine iliaque commune", "external iliac vein": "veine iliaque externe", "internal iliac vein": "veine iliaque interne",
  "femoral vein": "veine fémorale", "deep femoral vein": "veine profonde de la cuisse", "popliteal vein": "veine poplitée",
  "great saphenous vein": "grande veine saphène", "small saphenous vein": "petite veine saphène",
  "anterior tibial vein": "veine tibiale antérieure", "posterior tibial vein": "veine tibiale postérieure", "fibular vein": "veine fibulaire",
  "renal vein": "veine rénale", "hepatic vein": "veine hépatique", "hepatic portal vein": "veine porte hépatique",
  "splenic vein": "veine splénique", "superior mesenteric vein": "veine mésentérique supérieure", "inferior mesenteric vein": "veine mésentérique inférieure",
  "azygos vein": "veine azygos", "hemiazygos vein": "veine hémi-azygos", "accessory hemiazygos vein": "veine hémi-azygos accessoire",
  "pulmonary vein": "veine pulmonaire", "great cardiac vein": "grande veine du cœur", "middle cardiac vein": "veine moyenne du cœur",
  "small cardiac vein": "petite veine du cœur", "internal thoracic vein": "veine thoracique interne", "musculophrenic vein": "veine musculophrénique",
  "superior epigastric vein": "veine épigastrique supérieure", "inferior epigastric vein": "veine épigastrique inférieure",
  "superior intercostal vein": "veine intercostale supérieure", "subcostal vein": "veine subcostale", "ascending lumbar vein": "veine lombaire ascendante",
  "superior gluteal vein": "veine glutéale supérieure", "inferior gluteal vein": "veine glutéale inférieure", "testicular vein": "veine testiculaire",
});
group("vessel", "m", { "pulmonary trunk": "tronc pulmonaire", "pulmonary arterial trunk": "tronc artériel pulmonaire", "celiac artery": "tronc cœliaque", "celiac trunk": "tronc cœliaque", "coronary sinus": "sinus coronaire", "thyrocervical trunk": "tronc thyrocervical", "costocervical trunk": "tronc costocervical" });

group("nerve", "m", {
  nerve: "nerf", "olfactory nerve": "nerf olfactif", "optic nerve": "nerf optique", "oculomotor nerve": "nerf oculomoteur",
  "trochlear nerve": "nerf trochléaire", "trigeminal nerve": "nerf trijumeau", "abducens nerve": "nerf abducens", "facial nerve": "nerf facial",
  "vestibulocochlear nerve": "nerf vestibulocochléaire", "glossopharyngeal nerve": "nerf glossopharyngien", "vagus nerve": "nerf vague",
  "accessory nerve": "nerf accessoire", "hypoglossal nerve": "nerf hypoglosse", "ophthalmic nerve": "nerf ophtalmique",
  "maxillary nerve": "nerf maxillaire", "mandibular nerve": "nerf mandibulaire", "lacrimal nerve": "nerf lacrymal",
  "frontal nerve": "nerf frontal", "supra-orbital nerve": "nerf supra-orbitaire", "supraorbital nerve": "nerf supra-orbitaire",
  "supratrochlear nerve": "nerf supratrochléaire", "infratrochlear nerve": "nerf infratrochléaire", "nasociliary nerve": "nerf nasociliaire",
  "anterior ethmoidal nerve": "nerf ethmoïdal antérieur", "posterior ethmoidal nerve": "nerf ethmoïdal postérieur", "ciliary ganglion": "ganglion ciliaire",
  "median nerve": "nerf médian", "ulnar nerve": "nerf ulnaire", "radial nerve": "nerf radial", "musculocutaneous nerve": "nerf musculocutané",
  "axillary nerve": "nerf axillaire", "suprascapular nerve": "nerf suprascapulaire", "phrenic nerve": "nerf phrénique", "brachial plexus": "plexus brachial",
  "sciatic nerve": "nerf sciatique", "femoral nerve": "nerf fémoral", "obturator nerve": "nerf obturateur", "tibial nerve": "nerf tibial",
  "common fibular nerve": "nerf fibulaire commun", "deep fibular nerve": "nerf fibulaire profond", "superficial fibular nerve": "nerf fibulaire superficiel",
  "sural nerve": "nerf sural", "saphenous nerve": "nerf saphène", "lumbosacral plexus": "plexus lombo-sacral",
});

group("other", "f", {
  musculature: "musculature", "linea alba": "ligne blanche", "iliotibial tract": "bandelette iliotibiale", skin: "peau",
  "interosseous membrane": "membrane interosseuse", "thyrohyoid membrane": "membrane thyro-hyoïdienne", pleura: "plèvre",
  decussation: "décussation", "ileocecal junction": "jonction iléocæcale",
});
group("other", "m", {
  tendon: "tendon", "calcaneal tendon": "tendon calcanéen", "intermediate tendon": "tendon intermédiaire",
  "intervertebral disk": "disque intervertébral", "intervertebral disc": "disque intervertébral",
  ligament: "ligament", "long plantar ligament": "ligament plantaire long", "patellar ligament": "ligament patellaire",
  "anterior cruciate ligament": "ligament croisé antérieur", "posterior cruciate ligament": "ligament croisé postérieur",
  "vocal ligament": "ligament vocal", "stylohyoid ligament": "ligament stylo-hyoïdien", "thyrohyoid ligament": "ligament thyro-hyoïdien",
  "skeletal system": "système squelettique", "nervous system": "système nerveux", "cardiovascular system": "système cardiovasculaire",
  "respiratory system": "système respiratoire", "alimentary system": "système digestif", "urinary system": "système urinaire",
  "genital system": "système génital", "endocrine system": "système endocrinien", "integumentary system": "système tégumentaire",
  thumb: "pouce", "index finger": "index", "middle finger": "majeur", "ring finger": "annulaire", "little finger": "petit doigt", hallux: "hallux",
});

// These are full, checked organ labels: the side belongs to the lobe, not the liver.
group("organ", "m", { "right lobe of liver": "lobe droit du foie", "left lobe of liver": "lobe gauche du foie", "caudate lobe of liver": "lobe caudé du foie", "quadrate lobe of liver": "lobe carré du foie" });

const ordinals: [string, string][] = [
  ["first", "première"], ["second", "deuxième"], ["third", "troisième"], ["fourth", "quatrième"],
  ["fifth", "cinquième"], ["sixth", "sixième"], ["seventh", "septième"], ["eighth", "huitième"],
  ["ninth", "neuvième"], ["tenth", "dixième"], ["eleventh", "onzième"], ["twelfth", "douzième"],
];
ordinals.forEach(([en, fr], index) => {
  names[`${en} rib`] = { fr: `${fr} côte`, gender: "f", kind: "bone" };
  names[`${en} costal cartilage`] = { fr: `${index === 0 ? "premier" : fr} cartilage costal`, gender: "m", kind: "bone" };
  names[`${en} posterior intercostal artery`] = { fr: `${fr} artère intercostale postérieure`, gender: "f", kind: "vessel" };
  names[`${en} thoracic vertebra`] = { fr: `${fr} vertèbre thoracique (T${index + 1})`, gender: "f", kind: "bone" };
  if (index < 7) names[`${en} cervical vertebra`] = { fr: `${fr} vertèbre cervicale (C${index + 1})`, gender: "f", kind: "bone" };
  if (index < 5) {
    names[`${en} lumbar vertebra`] = { fr: `${fr} vertèbre lombaire (L${index + 1})`, gender: "f", kind: "bone" };
    names[`${en} metacarpal bone`] = { fr: `${index + 1}${index === 0 ? "er" : "e"} métacarpien`, gender: "m", kind: "bone" };
    names[`${en} metatarsal bone`] = { fr: `${index + 1}${index === 0 ? "er" : "e"} métatarsien`, gender: "m", kind: "bone" };
  }
});
group("bone", "m", { atlas: "atlas (C1)", axis: "axis (C2)" });

const muscleParts: Record<string, string> = {
  clavicular: "claviculaire", acromial: "acromiale", spinal: "spinale", sternocostal: "sternocostale", abdominal: "abdominale",
  ascending: "ascendante", transverse: "transverse", descending: "descendante", sternal: "sternale", costal: "costale", lumbar: "lombaire",
  superior: "supérieure", inferior: "inférieure", medial: "médiale", lateral: "latérale", anterior: "antérieure", posterior: "postérieure",
  superficial: "superficielle", deep: "profonde", vertical: "verticale", "superior oblique": "oblique supérieure", "inferior oblique": "oblique inférieure",
};
const muscleHeads: Record<string, string> = {
  long: "long", short: "court", medial: "médial", lateral: "latéral", superior: "supérieur", inferior: "inférieur",
  oblique: "oblique", transverse: "transverse", superficial: "superficiel", deep: "profond",
  anterolateral: "antérolatéral", posteromedial: "postéromédial",
};

function genitive(name: Name): string {
  if (name.elide || /^[aeiouyàâéèêëîïôùûüœ]/i.test(name.fr)) return `de l’${name.fr}`;
  return `${name.gender === "f" ? "de la" : "du"} ${name.fr}`;
}
function compound(fr: string, gender: Gender, kind: Kind, child: Name): Name {
  const complement = genitive(child);
  return { fr: `${fr} ${complement}`, gender, kind, sideTemplate: `${fr} {side} ${complement}` };
}

function frenchName(key: string, depth = 0): Name | undefined {
  if (depth > 4) return undefined;
  const exact = names[key];
  if (exact) return exact;
  const sided = /^(right|left) (.+)$/.exec(key);
  if (sided) {
    const base = frenchName(sided[2]!, depth + 1);
    if (!base) return undefined;
    const side = sided[1] === "left" ? "gauche" : base.gender === "f" ? "droite" : "droit";
    return { ...base, fr: base.sideTemplate ? base.sideTemplate.replace("{side}", side) : `${base.fr} ${side}`, sideTemplate: undefined };
  }
  const part = /^(.+) part of (.+)$/.exec(key);
  if (part) {
    const child = frenchName(part[2]!, depth + 1);
    const adjective = muscleParts[part[1]!];
    if (child?.kind === "muscle" && typeof adjective === "string") return compound(`partie ${adjective}`, "f", "muscle", child);
  }
  const head = /^(?:(.+) )?head of (.+)$/.exec(key);
  if (head) {
    const child = frenchName(head[2]!, depth + 1);
    const adjective = head[1] ? muscleHeads[head[1]] : "";
    if (child?.kind === "muscle" && typeof adjective === "string") return compound(`chef${adjective ? ` ${adjective}` : ""}`, "m", "muscle", child);
    if (child?.kind === "bone" && !head[1]) return compound("tête", "f", "bone", child);
  }
  const zone = /^zone of (.+)$/.exec(key);
  if (zone) {
    const child = frenchName(zone[1]!, depth + 1);
    if (child?.kind === "muscle") return compound("zone", "f", "muscle", child);
  }
  const papillary = /^(anterior|posterior|septal|lateral) papillary muscle of (.+)$/.exec(key);
  if (papillary) {
    const child = frenchName(papillary[2]!, depth + 1);
    const adjective: Record<string, string> = { anterior: "antérieur", posterior: "postérieur", septal: "septal", lateral: "latéral" };
    if (child?.kind === "organ") return compound(`muscle papillaire ${adjective[papillary[1]!]}`, "m", "muscle", child);
  }
  const leaflet = /^(anterior|posterior|septal|left anterior|right anterior|left posterior|right posterior) (leaflet|cusp) of (.+)$/.exec(key);
  if (leaflet) {
    const child = frenchName(leaflet[3]!, depth + 1);
    const female = leaflet[2] === "cusp";
    const adjectives: Record<string, string> = female
      ? { anterior: "antérieure", posterior: "postérieure", septal: "septale", "left anterior": "antérieure gauche", "right anterior": "antérieure droite", "left posterior": "postérieure gauche", "right posterior": "postérieure droite" }
      : { anterior: "antérieur", posterior: "postérieur", septal: "septal", "left anterior": "antérieur gauche", "right anterior": "antérieur droit", "left posterior": "postérieur gauche", "right posterior": "postérieur droit" };
    if (child?.kind === "organ") return compound(`${female ? "valvule" : "feuillet"} ${adjectives[leaflet[1]!]}`, female ? "f" : "m", "organ", child);
  }
  const lobar = /^(upper|middle|lower|superior|inferior) lobe of (.+)$/.exec(key);
  if (lobar) {
    const child = frenchName(lobar[2]!, depth + 1);
    const adjectives: Record<string, string> = { upper: "supérieur", middle: "moyen", lower: "inférieur", superior: "supérieur", inferior: "inférieur" };
    if (child?.kind === "organ") return compound(`lobe ${adjectives[lobar[1]!]}`, "m", "organ", child);
  }
  for (const [en, fr, gender, allowed] of [
    ["tendon of ", "tendon", "m", ["muscle"]],
    ["wall of ", "paroi", "f", ["organ", "vessel"]],
    ["cavity of ", "cavité", "f", ["organ"]],
    ["body of ", "corps", "m", ["organ", "bone"]],
    ["neck of ", "col", "m", ["organ", "bone"]],
    ["trunk of ", "tronc", "m", ["vessel", "nerve"]],
    ["branch of ", "branche", "f", ["vessel", "nerve"]],
    ["intervertebral disk of ", "disque intervertébral", "m", ["bone"]],
    ["intervertebral disc of ", "disque intervertébral", "m", ["bone"]],
  ] as [string, string, Gender, Kind[]][]) {
    if (key.startsWith(en)) {
      const child = frenchName(key.slice(en.length), depth + 1);
      if (child && allowed.includes(child.kind)) return compound(fr, gender, child.kind, child);
    }
  }
  return undefined;
}

function normalized(sourceName: string): string {
  return sourceName.trim().toLowerCase().replace(/\s+/g, " ");
}

export function anatomyNameHasFrench(sourceName: string): boolean {
  return !!frenchName(normalized(sourceName));
}

export function localizeAnatomyName(sourceName: string, language: Language): string {
  if (language === "en") return sourceName;
  const translated = frenchName(normalized(sourceName));
  if (!translated) return sourceName;
  return translated.fr.charAt(0).toUpperCase() + translated.fr.slice(1);
}
