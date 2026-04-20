"use client";

import { useGameStore } from "@/lib/store";
import Scoreboard from "./Scoreboard";
import DialWheel from "./DialWheel";

export default function GameBoardScreen() {
  const {
    phase,
    teams,
    currentTeamIndex,
    currentConcept,
    targetAngle,
    dialAngle,
    setDialAngle,
    isScreenOpen,
    startGuessing,
    revealAndScore,
    nextTurn,
    skipTarget,
    lastScore,
  } = useGameStore();

  const currentTeam = teams[currentTeamIndex];

  return (
    <div className="min-h-screen flex flex-col px-4 py-6">
      <Scoreboard />

      <div className="flex-1 flex flex-col items-center justify-center gap-8 mt-6">
        
        {/* Concept Card */}
        {currentConcept && (
          <div className="w-full max-w-sm rounded-2xl border p-6 flex items-stretch shadow-lg"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="flex-1 flex flex-col items-center text-center">
              <span className="text-[10px] font-mono uppercase tracking-widest opacity-40 mb-2">Left</span>
              <span className="text-xl font-bold leading-tight">{currentConcept.left}</span>
            </div>
            
            <div className="flex flex-col items-center justify-center px-4">
              <div className="w-px h-8" style={{ background: "var(--divider)" }} />
              <div className="text-lg my-1 font-mono" style={{ color: "var(--fg-muted)" }}>↔</div>
              <div className="w-px h-8" style={{ background: "var(--divider)" }} />
            </div>

            <div className="flex-1 flex flex-col items-center text-center">
              <span className="text-[10px] font-mono uppercase tracking-widest opacity-40 mb-2">Right</span>
              <span className="text-xl font-bold leading-tight">{currentConcept.right}</span>
            </div>
          </div>
        )}

        {/* Board Toy */}
        <div className="w-full max-w-md relative flex flex-col items-center">
          
          <DialWheel
            dialAngle={dialAngle}
            targetAngle={targetAngle}
            isScreenOpen={isScreenOpen}
            onAngleChange={phase === "guessing" ? setDialAngle : undefined}
            disabled={phase !== "guessing"}
            teamColor={currentTeam.color}
          />

          {/* Controls based on Phase */}
          <div className="w-full mt-8 flex flex-col gap-4">
            
            {phase === "psychic" && (
              <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="rounded-xl p-4 text-center border"
                  style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                  <p className="text-xs font-mono uppercase tracking-widest opacity-50 mb-1">Psychic Phase</p>
                  <p className="text-sm opacity-80 leading-relaxed">
                    Look at the target position. Think of a clue, say it out loud, then hide the target from your team!
                  </p>
                </div>
                <button
                  onClick={startGuessing}
                  className="w-full py-4 rounded-xl text-lg font-black text-black active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:opacity-90"
                  style={{ backgroundColor: currentTeam.color }}
                >
                  HIDE TARGET & GUESS
                </button>
                <button
                  onClick={skipTarget}
                  className="w-full py-4 rounded-xl text-lg font-black active:scale-[0.98] transition-all border"
                  style={{ background: "var(--surface-hover)", borderColor: "var(--border)", color: "var(--fg)" }}
                >
                  SKIP TARGET
                </button>
              </div>
            )}

            {phase === "guessing" && (
              <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="rounded-xl p-4 text-center border"
                  style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                  <p className="text-xs font-mono uppercase tracking-widest opacity-50 mb-1">Guessing Phase</p>
                  <p className="text-sm opacity-80 leading-relaxed">
                    Team, drag the needle to where you think the target is hidden!
                  </p>
                </div>
                <button
                  onClick={revealAndScore}
                  className="w-full py-4 rounded-xl text-lg font-black text-black active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:opacity-90"
                  style={{ backgroundColor: currentTeam.color }}
                >
                  LOCK GUESS & REVEAL
                </button>
              </div>
            )}

            {phase === "revealed" && (
              <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
                <div className="text-center w-full rounded-xl border py-6"
                  style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                  <div className="text-6xl font-black tracking-tighter" style={{ color: currentTeam.color }}>
                    +{lastScore}
                  </div>
                  <div className="text-sm opacity-50 uppercase tracking-widest font-mono mt-1">Points</div>
                  {lastScore === 4 && <div className="text-sm font-bold mt-2">🎯 BULLSEYE!</div>}
                  {lastScore === 0 && <div className="text-sm font-bold mt-2 opacity-60">Complete miss...</div>}
                </div>
                <button
                  onClick={nextTurn}
                  className="w-full py-4 rounded-xl text-lg font-black active:scale-[0.98] transition-all mt-2 border"
                  style={{ background: "var(--surface-hover)", borderColor: "var(--border)", color: "var(--fg)" }}
                >
                  NEXT ROUND →
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
