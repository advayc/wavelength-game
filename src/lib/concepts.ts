import conceptsData from "@/data/concepts.json";

export type ConceptPair = {
  left: string;
  right: string;
};

export const CONCEPTS: ConceptPair[] = conceptsData;

export function getRandomConcept(usedIndices: Set<number>): { pair: ConceptPair; index: number } | null {
  const available = CONCEPTS.map((_, i) => i).filter((i) => !usedIndices.has(i));
  if (available.length === 0) return null;
  const index = available[Math.floor(Math.random() * available.length)];
  return { pair: CONCEPTS[index], index };
}

// Target angle is a random position on the dial arc (0-180 degrees)
export function getRandomTargetAngle(): number {
  // Wedges span up to 26 degrees from the center, so we keep the target
  // center between 30 and 150 to ensure no scoring zone bleeds out the sides
  return 30 + Math.random() * 120;
}
