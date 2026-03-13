"use client";

import { useGameStore } from "@/lib/store";

export default function GameOverScreen() {
  const { teams, resetGame } = useGameStore();

  const sorted = [...teams].sort((a, b) => b.score - a.score);
  const winner = sorted[0];
  const isTie = sorted.length > 1 && sorted[0].score === sorted[1].score;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="text-center mb-10">
        <p className="text-xs font-mono uppercase tracking-[0.3em] opacity-40 mb-3">Game Over</p>
        {isTie ? (
          <>
            <h1 className="text-5xl font-black tracking-tighter">IT'S A TIE!</h1>
            <p className="text-sm opacity-50 mt-3">Great minds think alike</p>
          </>
        ) : (
          <>
            <h1 className="text-5xl font-black tracking-tighter">
              <span style={{ color: winner.color }}>{winner.name}</span>
              <br />
              WINS!
            </h1>
            <p className="text-sm opacity-50 mt-3">Psychic abilities confirmed</p>
          </>
        )}
      </div>

      {/* Final scores */}
      <div className="w-full max-w-sm space-y-3 mb-10">
        {sorted.map((team, i) => (
          <div
            key={team.id}
            className="flex items-center gap-4 rounded-xl px-5 py-4 border"
            style={{
              borderColor: i === 0 && !isTie ? `${team.color}60` : "rgba(255,255,255,0.08)",
              backgroundColor: i === 0 && !isTie ? `${team.color}10` : "rgba(255,255,255,0.03)",
            }}
          >
            <div className="text-2xl font-black opacity-30 w-6 text-center">
              {i === 0 ? (isTie ? "=" : "1") : i + 1}
            </div>
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: team.color, boxShadow: `0 0 8px ${team.color}` }}
            />
            <div className="flex-1 font-semibold">{team.name}</div>
            <div
              className="text-3xl font-black tabular-nums"
              style={{ color: i === 0 && !isTie ? team.color : "inherit" }}
            >
              {team.score}
            </div>
          </div>
        ))}
      </div>

      <div className="w-full max-w-sm space-y-3">
        <button
          onClick={resetGame}
          className="w-full py-4 bg-wavelength-accent text-black font-black text-lg tracking-wide rounded-xl hover:opacity-90 active:scale-[0.98] transition-all"
        >
          PLAY AGAIN
        </button>
      </div>
    </div>
  );
}
