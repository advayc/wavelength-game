"use client";

import { useGameStore } from "@/lib/store";
import SetupScreen from "@/components/SetupScreen";
import GameBoardScreen from "@/components/GameBoardScreen";
import GameOverScreen from "@/components/GameOverScreen";

export default function GameController() {
  const phase = useGameStore((s) => s.phase);

  switch (phase) {
    case "setup":
      return <SetupScreen />;
    case "psychic":
    case "guessing":
    case "revealed":
      return <GameBoardScreen />;
    case "game-over":
      return <GameOverScreen />;
    default:
      return <SetupScreen />;
  }
}
