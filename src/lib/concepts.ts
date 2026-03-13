import conceptsData from "@/data/concepts.json";

export type ConceptPair = {
  left: string;
  right: string;
};

export const CONCEPTS: ConceptPair[] = conceptsData;

// --- Persistent history (localStorage) ---
// Tracks which concept indices have been seen across sessions so repeats are
// deprioritised even after the page refreshes.

const HISTORY_KEY = "wavelength_concept_history";

function loadHistory(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as number[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(indices: number[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(indices));
  } catch {
    // ignore storage errors (e.g. private browsing quota)
  }
}

/** Mark an index as seen in the persistent history. */
export function recordConceptSeen(index: number): void {
  const history = loadHistory();
  if (!history.includes(index)) {
    history.push(index);
    // Once every concept has been seen, start the cycle over so the game
    // never runs dry — but keep the most-recently-used half out of the pool
    // until the rest have been exhausted again.
    if (history.length >= CONCEPTS.length) {
      // Keep only the second half of the history (the most recently seen ones)
      // as the "cooling-off" set to avoid immediate repeats.
      const coolOff = history.slice(Math.floor(history.length / 2));
      saveHistory(coolOff);
    } else {
      saveHistory(history);
    }
  }
}

/** Clear the persistent history (useful for testing / reset). */
export function clearConceptHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(HISTORY_KEY);
}

/**
 * Pick a random concept that hasn't been used this session.
 * Among those, concepts that also haven't been seen in previous sessions
 * (i.e. not in localStorage history) are preferred (3× weight).
 */
export function getRandomConcept(usedIndices: Set<number>): { pair: ConceptPair; index: number } | null {
  const history = new Set(loadHistory());
  const available = CONCEPTS.map((_, i) => i).filter((i) => !usedIndices.has(i));
  if (available.length === 0) return null;

  // Split into fresh (never seen across sessions) vs. seen-before
  const fresh = available.filter((i) => !history.has(i));
  const seen = available.filter((i) => history.has(i));

  // Build a weighted pool: fresh entries appear 3× more likely
  const pool: number[] = [
    ...fresh, ...fresh, ...fresh,
    ...seen,
  ];

  // Fall back to seen-only if nothing fresh is left
  const source = pool.length > 0 ? pool : seen;
  if (source.length === 0) return null;

  const index = source[Math.floor(Math.random() * source.length)];
  return { pair: CONCEPTS[index], index };
}

// Target angle is a random position on the dial arc (0-180 degrees)
export function getRandomTargetAngle(): number {
  // Wedges span up to 26 degrees from the center, so we keep the target
  // center between 30 and 150 to ensure no scoring zone bleeds out the sides
  return 30 + Math.random() * 120;
}
