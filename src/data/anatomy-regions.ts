export type AnatomyBounds = { min: number[]; max: number[] };

/** Camera bookmarks derived from this model's own bounds, not anatomical landmarks. */
export function anatomyRegions(bounds: AnatomyBounds | undefined) {
  if (!bounds) return [];
  const [left, floor, back] = bounds.min;
  const [right, top, front] = bounds.max;
  if (
    [left, floor, back, right, top, front].some(
      (value) => !Number.isFinite(value),
    )
  )
    return [];
  const height = top! - floor!,
    width = right! - left!,
    center = (left! + right!) / 2;
  const box = (
    bottom: number,
    upper: number,
    halfWidth: number,
  ): AnatomyBounds => ({
    min: [center - width * halfWidth, floor! + height * bottom, back!],
    max: [center + width * halfWidth, floor! + height * upper, front!],
  });
  return [
    {
      id: "head-neck",
      name: { fr: "Tête et cou", en: "Head and neck" },
      bounds: box(0.77, 1, 0.34),
    },
    {
      id: "thorax",
      name: { fr: "Thorax", en: "Thorax" },
      bounds: box(0.54, 0.82, 0.43),
    },
    {
      id: "abdomen-pelvis",
      name: { fr: "Abdomen et bassin", en: "Abdomen and pelvis" },
      bounds: box(0.35, 0.61, 0.4),
    },
    {
      id: "upper-limbs",
      name: { fr: "Bras et mains", en: "Arms and hands" },
      bounds: box(0.34, 0.84, 0.51),
    },
    {
      id: "lower-limbs",
      name: { fr: "Jambes et pieds", en: "Legs and feet" },
      bounds: box(0, 0.51, 0.4),
    },
  ];
}
