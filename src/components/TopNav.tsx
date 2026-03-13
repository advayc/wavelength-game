"use client";

import { useGameStore } from "@/lib/store";

export default function TopNav() {
  const { phase, resetGame, toggleDarkMode, isDarkMode, teams, currentTeamIndex } = useGameStore();
  const currentTeam = teams[currentTeamIndex];

  if (phase === "setup") return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 border-b border-white/5 backdrop-blur-sm"
      style={{ background: "rgba(10,11,15,0.85)" }}
    >
      {/* Logo */}
      <button
        onClick={() => {
          if (confirm("Return to setup? Current game will be lost.")) resetGame();
        }}
        className="text-xs font-mono uppercase tracking-widest opacity-40 hover:opacity-80 transition-opacity"
      >
        WAVELENGTH
      </button>

      <div className="flex items-center gap-3">
        {/* Current team pip */}
        {phase !== "game-over" && (
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: currentTeam.color, boxShadow: `0 0 6px ${currentTeam.color}` }}
            />
            <span className="text-xs font-mono opacity-50">{currentTeam.name}</span>
          </div>
        )}

        {/* Theme toggle */}
        <button
          onClick={toggleDarkMode}
          className="text-xs opacity-30 hover:opacity-60 transition-opacity font-mono"
          title="Toggle theme"
        >
          {isDarkMode ? "☀" : "☾"}
        </button>
      </div>
    </div>
  );
}
