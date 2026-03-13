"use client";

import { useGameStore } from "@/lib/store";

export default function Scoreboard() {
  const { teams, currentTeamIndex, round, maxRounds } = useGameStore();

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-mono uppercase tracking-widest opacity-40">
          Round {round} / {maxRounds}
        </span>
        <div className="flex gap-1">
          {Array.from({ length: maxRounds }, (_, i) => (
            <div
              key={i}
              className="h-1 w-4 rounded-full transition-all"
              style={{
                background: i < round - 1
                  ? "var(--accent)"
                  : i === round - 1
                  ? "var(--accent)"
                  : "var(--border)",
                opacity: i < round - 1 ? 0.8 : 1,
              }}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-3 mt-3">
        {teams.map((team, i) => (
          <div
            key={team.id}
            className="flex-1 rounded-xl px-4 py-3 transition-all border"
            style={{
              background: i === currentTeamIndex ? "var(--surface-hover)" : "var(--surface)",
              borderColor: i === currentTeamIndex ? "var(--border-focus)" : "var(--border)",
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: team.color, boxShadow: `0 0 6px ${team.color}` }}
              />
              <span className="text-xs font-mono uppercase tracking-wider opacity-60 truncate">
                {team.name}
              </span>
              {i === currentTeamIndex && (
                <span className="ml-auto text-[10px] font-mono uppercase tracking-widest opacity-50">
                  ACTIVE
                </span>
              )}
            </div>
            <div
              className="text-2xl font-black tabular-nums"
              style={{ color: i === currentTeamIndex ? team.color : "inherit" }}
            >
              {team.score}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
