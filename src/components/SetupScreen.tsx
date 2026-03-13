"use client";

import { useState } from "react";
import { useGameStore, Team, TEAM_COLORS } from "@/lib/store";

export default function SetupScreen() {
  const { teams, setTeams, startGame, maxRounds, toggleDarkMode, isDarkMode } = useGameStore();
  const [localTeams, setLocalTeams] = useState<Team[]>(teams);
  const [rounds, setRounds] = useState(maxRounds);

  const updateTeamName = (id: string, name: string) => {
    setLocalTeams((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)));
  };

  const addTeam = () => {
    if (localTeams.length >= 6) return;
    const newId = String(Date.now());
    const color = TEAM_COLORS[localTeams.length % TEAM_COLORS.length];
    setLocalTeams((prev) => [
      ...prev,
      { id: newId, name: `Team ${prev.length + 1}`, score: 0, color },
    ]);
  };

  const removeTeam = (id: string) => {
    if (localTeams.length <= 2) return;
    setLocalTeams((prev) => prev.filter((t) => t.id !== id));
  };

  const handleStart = () => {
    useGameStore.setState({ maxRounds: rounds });
    setTeams(localTeams);
    startGame();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <p className="text-xs tracking-[0.3em] uppercase mb-3 opacity-50 font-mono">Party Game</p>
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none">
          WAVE<span className="text-wavelength-accent">LENGTH</span>
        </h1>
        <p className="mt-4 text-sm opacity-60 max-w-sm mx-auto leading-relaxed">
          Give clues. Read minds. Get on the same wavelength.
        </p>
      </div>

      {/* Setup card */}
      <div className="w-full max-w-md space-y-6">
        {/* Teams */}
        <div className="space-y-3">
          <h2 className="text-xs tracking-widest uppercase opacity-50 font-mono">Teams</h2>
          {localTeams.map((team) => (
            <div key={team.id} className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: team.color, boxShadow: `0 0 8px ${team.color}` }}
              />
              <input
                type="text"
                value={team.name}
                onChange={(e) => updateTeamName(team.id, e.target.value)}
                maxLength={20}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm outline-none focus:border-white/30 transition-colors placeholder-white/20"
                placeholder="Team name"
              />
              {localTeams.length > 2 && (
                <button
                  onClick={() => removeTeam(team.id)}
                  className="w-8 h-8 flex items-center justify-center text-white/30 hover:text-white/70 transition-colors text-lg leading-none"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {localTeams.length < 6 && (
            <button
              onClick={addTeam}
              className="w-full py-3 border border-dashed border-white/20 rounded-lg text-sm text-white/40 hover:text-white/70 hover:border-white/40 transition-all"
            >
              + Add Team
            </button>
          )}
        </div>

        {/* Rounds */}
        <div className="space-y-3">
          <h2 className="text-xs tracking-widest uppercase opacity-50 font-mono">Rounds per team</h2>
          <div className="flex gap-2">
            {[4, 6, 8, 10, 12].map((r) => (
              <button
                key={r}
                onClick={() => setRounds(r)}
                className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all ${
                  rounds === r
                    ? "bg-wavelength-accent text-black"
                    : "bg-white/5 text-white/50 hover:bg-white/10"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Start button */}
        <button
          onClick={handleStart}
          className="w-full py-4 bg-wavelength-accent text-black font-black text-lg tracking-wide rounded-xl hover:opacity-90 active:scale-[0.98] transition-all"
        >
          START GAME
        </button>
      </div>

      {/* Dark mode toggle */}
      <button
        onClick={toggleDarkMode}
        className="mt-8 text-xs opacity-30 hover:opacity-60 transition-opacity font-mono uppercase tracking-widest"
      >
        {isDarkMode ? "☀ Light Mode" : "☾ Dark Mode"}
      </button>
    </div>
  );
}
