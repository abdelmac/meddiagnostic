import test from "node:test";
import assert from "node:assert/strict";
import { anatomyNameHasFrench, localizeAnatomyName } from "../src/data/anatomy-nomenclature";

test("la traduction conserve le côté anatomique avec l’accord du nom", () => {
  const entries = [
    ["right humerus", "Humérus droit"], ["left clavicle", "Clavicule gauche"],
    ["right renal artery", "Artère rénale droite"], ["left optic nerve", "Nerf optique gauche"],
    ["right first rib", "Première côte droite"], ["left vastus medialis", "Vaste médial gauche"],
  ];
  for (const [source, expected] of entries) {
    assert.equal(localizeAnatomyName(source!, "fr"), expected);
    assert.equal(localizeAnatomyName(source!, "en"), source);
    assert.equal(anatomyNameHasFrench(source!), true);
  }
});

test("les noms réels FMA distinguent chefs musculaires, parties et têtes osseuses", () => {
  const entries = [
    ["long head of right biceps brachii", "Chef long du biceps brachial droit"],
    ["medial head of left triceps brachii", "Chef médial du triceps brachial gauche"],
    ["acromial part of right deltoid", "Partie acromiale du deltoïde droit"],
    ["sternocostal part of left pectoralis major", "Partie sternocostale du grand pectoral gauche"],
    ["descending part of right trapezius", "Partie descendante du trapèze droit"],
    ["head of right humerus", "Tête de l’humérus droit"],
    ["tendon of left levator palpebrae superioris", "Tendon de l’élévateur de la paupière supérieure gauche"],
    ["right lobe of liver", "Lobe droit du foie"],
    ["right third costal cartilage", "Troisième cartilage costal droit"],
    ["intervertebral disk of third thoracic vertebra", "Disque intervertébral de la troisième vertèbre thoracique (T3)"],
    ["anterior papillary muscle of right ventricle", "Muscle papillaire antérieur du ventricule droit"],
    ["upper lobe of left lung", "Lobe supérieur du poumon gauche"],
  ];
  for (const [source, expected] of entries) {
    assert.equal(localizeAnatomyName(source!, "fr"), expected);
    assert.equal(anatomyNameHasFrench(source!), true);
  }
  assert.equal(localizeAnatomyName("wall of right atrium", "fr"), "Paroi de l’atrium droit");
  assert.equal(localizeAnatomyName("first thoracic vertebra", "fr"), "Première vertèbre thoracique (T1)");
});

test("les noms inconnus ne subissent aucune traduction partielle ou transformation d’identifiant", () => {
  for (const source of ["FMA999999", "right unfamiliar structure", "long head of unknown muscle", "clavicular part of renal artery", "constructor part of deltoid", "toString head of deltoid", "ambiguous right muscle division", "  unsupported label  "]) {
    assert.equal(anatomyNameHasFrench(source), false);
    assert.equal(localizeAnatomyName(source, "fr"), source);
    assert.equal(localizeAnatomyName(source, "en"), source);
  }
});

test("le lexique couvre les familles de structures sans inventer de description", () => {
  const sources = ["sternocleidomastoid", "orbicularis oculi", "zygomaticus major", "sartorius", "gracilis", "gluteus maximus", "gastrocnemius", "tibialis anterior", "soleus", "frontal bone", "scaphoid bone", "calcaneus", "urinary bladder", "spinal cord", "inferior vena cava", "common carotid artery", "vagus nerve"];
  for (const source of sources) {
    assert.ok(anatomyNameHasFrench(source), source);
    assert.ok(localizeAnatomyName(source, "fr").length > 2);
    assert.equal(localizeAnatomyName(source, "en"), source);
  }
  assert.equal(localizeAnatomyName("  RIGHT   HUMERUS ", "fr"), "Humérus droit");
  assert.equal(localizeAnatomyName("  RIGHT   HUMERUS ", "en"), "  RIGHT   HUMERUS ");
});
