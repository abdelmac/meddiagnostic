import * as THREE from "three";
import type { AnatomySystem } from "../data/anatomy-structures";

export type AnatomyAppearance = "natural" | "study";
type TissueEntry = { name: string; system: AnatomySystem; vascularKind?: "artery" | "vein" | "other" };
type TissueProfile = { id: string; color: string; roughness: number; environment: number };

/** Illustrative tissue colours and optical response; only the source normals
 * describe anatomy. No procedural fibres, normal maps or displacement maps. */
export function anatomyTissueProfile(entry: TissueEntry, appearance: AnatomyAppearance): TissueProfile {
  const name = entry.name.toLowerCase(), study = appearance === "study";
  const profile = (id: string, color: string, roughness: number, environment = 0.32) => ({ id, color, roughness, environment });
  // A muscle named "tensor of fascia lata" is still muscle, not fascia.
  if (/\btendon\b|aponeurosis|retinacul|ligament|^fascia\b|iliotibial tract/.test(name)) return profile("connective", study ? "#d1c7ad" : "#d4cbbc", 0.65, 0.37);
  if (/cartilage|meniscus|intervertebral disc/.test(name)) return profile("cartilage", study ? "#99b4ba" : "#c1c4b9", 0.5, 0.4);
  if (/^skin$|integument/.test(name)) return profile("skin", "#bc9b83", 0.82, 0.25);
  if (entry.system === "skeleton") return profile("bone", study ? "#d0c5af" : "#c8bba3", 0.79, 0.28);
  if (entry.system === "muscles") return profile("muscle", study ? "#943d42" : "#873539", 0.7, 0.28);
  if (entry.system === "nerves") {
    if (/\bnerve\b|plexus|ganglion|\bramus\b|\brami\b|nerve root|sympathetic trunk/.test(name)) return profile("nerve", study ? "#dfc573" : "#d9cfb1", 0.7, 0.3);
    if (/white matter|corpus callosum|commissure|internal capsule|fornix|optic tract|optic chiasm|stria/.test(name)) return profile("central-white-matter", study ? "#d8c9b0" : "#ccc5b5", 0.69, 0.29);
    return profile("central-nervous", study ? "#bea8ae" : "#b7aaa1", 0.66, 0.29);
  }
  // Source ontology takes precedence over translated or ambiguous mesh names.
  if (entry.system === "vessels") return (entry.vascularKind ? entry.vascularKind === "vein" : /vein|venous|vena|sinus/.test(name))
    ? profile("vein", study ? "#597bb5" : "#78505e", 0.49, 0.39)
    : profile("artery", study ? "#b84a50" : "#9c3e43", 0.5, 0.39);
  if (/lung|bronch/.test(name)) return profile("lung", "#af8890", 0.7, 0.28);
  if (/liver|hepatic/.test(name)) return profile("liver", "#78403f", 0.48, 0.42);
  if (/heart|atrium|ventricle|myocard/.test(name)) return profile("cardiac", "#8f3944", 0.57, 0.37);
  if (/kidney|renal/.test(name)) return profile("kidney", "#92454a", 0.5, 0.41);
  if (/spleen/.test(name)) return profile("spleen", "#79505a", 0.53, 0.38);
  if (/stomach|intestin|colon|duoden|esophag|jejun|ileum|cecum/.test(name)) return profile("digestive", "#b08c86", 0.6, 0.35);
  if (/bladder|ureter|uter|ovary|prostate/.test(name)) return profile("pelvic-organ", "#b79c8f", 0.59, 0.35);
  return profile("soft-organ", study ? "#b19aab" : "#aa9292", 0.63, 0.33);
}

/** Reuses the standard PBR shader on phones; appearance changes only uniforms. */
export function applyAnatomyTissueProfile(material: THREE.Material, entry: TissueEntry, appearance: AnatomyAppearance) {
  if (!(material instanceof THREE.MeshStandardMaterial)) return;
  const profile = anatomyTissueProfile(entry, appearance);
  if (material.userData.anatomyAppearance === appearance && material.userData.anatomyTissue === profile.id) return;
  material.color.set(profile.color); material.roughness = profile.roughness;
  material.metalness = 0; material.envMapIntensity = profile.environment;
  material.emissive.set(0x000000); material.emissiveIntensity = 0;
  material.userData.anatomyAppearance = appearance; material.userData.anatomyTissue = profile.id;
}
