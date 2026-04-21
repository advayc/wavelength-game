import { create } from "zustand";
import { ConceptPair, getRandomConcept, getRandomTargetAngle, recordConceptSeen } from "./concepts";

export type Phase = "setup" | "psychic" | "guessing" | "revealed" | "game-over";

export interface Team {
  id: string;
  name: string;
  score: number;
  color: string;
}

export interface GameState {
  phase: Phase;
  teams: Team[];
  currentTeamIndex: number;
  round: number;
  maxRounds: number;
  currentConcept: ConceptPair | null;
  targetAngle: number; // 0-180
  dialAngle: number;   // 0-180
  usedConceptIndices: Set<number>;
  isDarkMode: boolean;
  isScreenOpen: boolean;
  lastScore: number;

  // Actions
  setTeams: (teams: Team[]) => void;
  startGame: () => void;
  setDialAngle: (angle: number) => void;
  startGuessing: () => void;
  revealAndScore: () => void;
  nextTurn: () => void;
  skipTurn: () => void;
  skipTarget: () => void;
  toggleDarkMode: () => void;
  resetGame: () => void;
}

const TEAM_COLORS = [
  "#E63946", // red
  "#2EC4B6", // teal
  "#FF9F1C", // orange
  "#9B5DE5", // purple
  "#06D6A0", // green
  "#F72585", // pink
];

// 5pt = Bullseye (±6°), 3pt = Inner (±16°), 2pt = Outer (±26°)
function calcScore(targetAngle: number, dialAngle: number): number {
  const diff = Math.abs(targetAngle - dialAngle);
  if (diff <= 6) return 5;
  if (diff <= 16) return 3;
  if (diff <= 26) return 2;
  return 0;
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: "setup",
  teams: [
    { id: "1", name: "Team 1", score: 0, color: TEAM_COLORS[0] },
    { id: "2", name: "Team 2", score: 0, color: TEAM_COLORS[1] },
  ],
  currentTeamIndex: 0,
  round: 1,
  maxRounds: 8,
  currentConcept: null,
  targetAngle: 90,
  dialAngle: 90,
  usedConceptIndices: new Set(),
  isDarkMode: true,
  isScreenOpen: true,
  lastScore: 0,

  setTeams: (teams) => set({ teams }),

  startGame: () => {
    const state = get();
    const result = getRandomConcept(state.usedConceptIndices);
    if (!result) return;
    const newUsed = new Set(state.usedConceptIndices);
    newUsed.add(result.index);
    recordConceptSeen(result.index);
    set({
      phase: "psychic",
      round: 1,
      currentTeamIndex: 0,
      usedConceptIndices: newUsed,
      currentConcept: result.pair,
      targetAngle: getRandomTargetAngle(),
      dialAngle: 90, // reset needle to center
      isScreenOpen: true, // open so psychic can see immediately
      teams: state.teams.map((t) => ({ ...t, score: 0 })),
    });
  },

  setDialAngle: (angle) => set({ dialAngle: angle }),

  startGuessing: () => set({ phase: "guessing", isScreenOpen: false }),

  revealAndScore: () => {
    const state = get();
    if (state.phase === "revealed") return;
    
    const score = calcScore(state.targetAngle, state.dialAngle);
    const newTeams = state.teams.map((t, i) =>
      i === state.currentTeamIndex ? { ...t, score: t.score + score } : t
    );

    set({
      phase: "revealed",
      teams: newTeams,
      isScreenOpen: true,
      lastScore: score,
    });
  },

  nextTurn: () => {
    const state = get();
    const nextTeamIndex = (state.currentTeamIndex + 1) % state.teams.length;
    const nextRound = nextTeamIndex === 0 ? state.round + 1 : state.round;

    if (nextRound > state.maxRounds) {
      set({ phase: "game-over" });
      return;
    }

    const result = getRandomConcept(state.usedConceptIndices);
    const newUsed = new Set(state.usedConceptIndices);
    if (result) {
      newUsed.add(result.index);
      recordConceptSeen(result.index);
    }

    set({
      phase: "psychic",
      currentTeamIndex: nextTeamIndex,
      round: nextRound,
      currentConcept: result?.pair ?? null,
      targetAngle: getRandomTargetAngle(),
      dialAngle: 90,
      isScreenOpen: true, // Open screen for the new psychic
      usedConceptIndices: newUsed,
    });
  },

  skipTurn: () => {
    get().nextTurn();
  },

  skipTarget: () => {
    const state = get();
    
    const result = getRandomConcept(state.usedConceptIndices);
    const newUsed = new Set(state.usedConceptIndices);
    if (result) {
      newUsed.add(result.index);
      recordConceptSeen(result.index);
    }

    set({
      phase: "psychic",
      currentConcept: result?.pair ?? null,
      targetAngle: getRandomTargetAngle(),
      dialAngle: 90,
      isScreenOpen: true,
      usedConceptIndices: newUsed,
    });
  },

  toggleDarkMode: () => set((s) => ({ isDarkMode: !s.isDarkMode })),

  resetGame: () =>
    set({
      phase: "setup",
      teams: [
        { id: "1", name: "Team 1", score: 0, color: TEAM_COLORS[0] },
        { id: "2", name: "Team 2", score: 0, color: TEAM_COLORS[1] },
      ],
      currentTeamIndex: 0,
      round: 1,
      currentConcept: null,
      targetAngle: 90,
      dialAngle: 90,
      isScreenOpen: true,
      usedConceptIndices: new Set(),
      lastScore: 0,
    }),
}));

export { TEAM_COLORS, calcScore };
