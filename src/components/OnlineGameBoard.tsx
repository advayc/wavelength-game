"use client";

import { useOnlineStore } from "@/lib/online-store";
import DialWheel from "./DialWheel";
import { useCallback, useEffect, useRef } from "react";

export default function OnlineGameBoard() {
  const {
    room,
    playerId,
    error,
    clearError,
    startGuessing,
    setDialAngle,
    revealAndScore,
    nextTurn,
    resetGame,
    refreshRoom,
  } = useOnlineStore();

  const lastDialSend = useRef(0);

  // Re-sync when the tab becomes visible again (in case Pusher missed events)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshRoom();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refreshRoom]);

  const handleDialChange = useCallback(
    async (angle: number) => {
      const now = Date.now();
      if (now - lastDialSend.current < 50) return;
      lastDialSend.current = now;
      await setDialAngle(angle);
    },
    [setDialAngle]
  );

  if (!room) return null;

  const { phase, players, currentTeamIndex, currentConceptLeft, currentConceptRight,
    targetAngle, dialAngle, isScreenOpen, lastScore, round, maxRounds } = room;

  const activePlayer = players[currentTeamIndex];
  const isMyTurn = activePlayer?.id === playerId;
  const isHost = room.hostPlayerId === playerId;
  const teamColor = activePlayer?.color ?? "#2EC4B6";
  const canDrag = phase === "guessing" && !isMyTurn;

  // ── Game Over ──────────────────────────────────────────────────────────────
  if (phase === "game-over") {
    const sorted = [...players].sort((a, b) => b.score - a.score);
    const topScore = sorted[0]?.score ?? 0;
    const winners = sorted.filter((p) => p.score === topScore);
    const isTie = winners.length > 1;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ color: "var(--fg)" }}>
        <div className="w-full max-w-sm space-y-6 text-center">
          {error && (
            <div className="rounded-xl p-3 text-sm flex items-center gap-2 text-left" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
              <span className="flex-1">{error}</span>
              <button onClick={clearError} className="text-lg leading-none hover:opacity-80">×</button>
            </div>
          )}
          <div>
            <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: "var(--fg-muted)" }}>Game Over</p>
            {isTie ? (
              <h2 className="text-4xl font-black">IT&apos;S A TIE!</h2>
            ) : (
              <h2 className="text-4xl font-black" style={{ color: winners[0].color }}>
                {winners[0].name} wins!
              </h2>
            )}
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            {sorted.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{
                  borderBottom: i < sorted.length - 1 ? "1px solid var(--border)" : "none",
                  ...(i === 0 ? { backgroundColor: `${p.color}18` } : {}),
                }}
              >
                <span className="text-sm font-mono w-4" style={{ color: "var(--fg-muted)" }}>#{i + 1}</span>
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                <span className="flex-1 text-sm font-medium">{p.name}</span>
                {p.id === playerId && <span className="text-xs" style={{ color: "var(--fg-muted)" }}>(you)</span>}
                <span className="text-lg font-black font-mono" style={{ color: p.color }}>{p.score}</span>
              </div>
            ))}
          </div>

          {isHost ? (
            <button
              onClick={resetGame}
              className="w-full py-4 rounded-2xl font-bold text-lg transition-all hover:brightness-110 active:scale-[0.98]"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              PLAY AGAIN
            </button>
          ) : (
            <p className="text-sm" style={{ color: "var(--fg-muted)" }}>Waiting for host to start a new game...</p>
          )}
        </div>
      </div>
    );
  }

  // ── Main Board ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col px-4 py-6" style={{ color: "var(--fg)" }}>

      {/* Error banner */}
      {error && (
        <div className="mb-4 rounded-xl p-3 text-sm flex items-center gap-2" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
          <span className="flex-1">{error}</span>
          <button onClick={clearError} className="text-lg leading-none hover:opacity-80">×</button>
        </div>
      )}

      {/* Scoreboard */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--fg-faint)" }}>
            Round {round} / {maxRounds}
          </span>
          <div className="flex gap-1">
            {Array.from({ length: maxRounds }).map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full transition-all"
                style={{
                  backgroundColor:
                    i < round - 1
                      ? "rgba(46,196,182,0.7)"
                      : i === round - 1
                      ? "#2EC4B6"
                      : "var(--surface-hover)",
                }}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {players.map((player, idx) => (
            <div
              key={player.id}
              className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all"
              style={
                idx === currentTeamIndex
                  ? { backgroundColor: `${player.color}20`, border: `1px solid ${player.color}60` }
                  : { backgroundColor: "var(--surface)", border: "1px solid var(--border)" }
              }
            >
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: player.color }} />
              <span className="font-medium">{player.name}</span>
              {player.id === playerId && <span className="text-xs" style={{ color: "var(--fg-muted)" }}>(you)</span>}
              <span className="font-black font-mono ml-1" style={{ color: player.color }}>{player.score}</span>
              {idx === currentTeamIndex && (
                <span className="text-[10px] font-mono uppercase tracking-wider ml-1" style={{ color: "var(--fg-muted)" }}>
                  {phase === "psychic" ? "PSYCHIC" : "ACTIVE"}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6">

        {/* Concept Card */}
        {currentConceptLeft && currentConceptRight && (
          <div
            className="w-full max-w-sm rounded-2xl p-6 flex items-stretch shadow-lg"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="flex-1 flex flex-col items-center text-center">
              <span className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: "var(--fg-faint)" }}>Left</span>
              <span className="text-xl font-bold leading-tight">{currentConceptLeft}</span>
            </div>
            <div className="flex flex-col items-center justify-center px-4">
              <div className="w-px h-8" style={{ background: "var(--divider)" }} />
              <div className="text-lg my-1 font-mono" style={{ color: "var(--fg-muted)" }}>↔</div>
              <div className="w-px h-8" style={{ background: "var(--divider)" }} />
            </div>
            <div className="flex-1 flex flex-col items-center text-center">
              <span className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: "var(--fg-faint)" }}>Right</span>
              <span className="text-xl font-bold leading-tight">{currentConceptRight}</span>
            </div>
          </div>
        )}

        {/* Dial */}
        <div className="w-full max-w-md flex flex-col items-center">
          <DialWheel
            dialAngle={dialAngle}
            targetAngle={targetAngle}
            isScreenOpen={isScreenOpen}
            onAngleChange={canDrag ? handleDialChange : undefined}
            disabled={!canDrag}
            teamColor={teamColor}
          />

          <div className="w-full mt-8 flex flex-col gap-4">

            {/* PSYCHIC phase */}
            {phase === "psychic" && (
              <div className="flex flex-col gap-4">
                <div
                  className="rounded-xl p-4 text-center"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  {isMyTurn ? (
                    <>
                      <p className="text-xs font-mono uppercase tracking-widest mb-1" style={{ color: "var(--fg-muted)" }}>You are the Psychic</p>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--fg-muted)" }}>
                        Look at the target on the dial. Give your team a clue, then press the button to hide it.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-mono uppercase tracking-widest mb-1" style={{ color: "var(--fg-muted)" }}>Psychic Phase</p>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--fg-muted)" }}>
                        <strong style={{ color: teamColor }}>{activePlayer?.name}</strong> is the psychic. Listen for their clue!
                      </p>
                    </>
                  )}
                </div>
                {isMyTurn && (
                  <button
                    onClick={startGuessing}
                    className="w-full py-4 rounded-xl text-lg font-black active:scale-[0.98] transition-all hover:opacity-90"
                    style={{ backgroundColor: teamColor, color: "#000" }}
                  >
                    HIDE TARGET & START GUESSING
                  </button>
                )}
              </div>
            )}

            {/* GUESSING phase */}
            {phase === "guessing" && (
              <div className="flex flex-col gap-4">
                <div
                  className="rounded-xl p-4 text-center"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  {isMyTurn ? (
                    <>
                      <p className="text-xs font-mono uppercase tracking-widest mb-1" style={{ color: "var(--fg-muted)" }}>You are the Psychic</p>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--fg-muted)" }}>
                        Watch your team guess. Lock it in when they&apos;re ready.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-mono uppercase tracking-widest mb-1" style={{ color: "var(--fg-muted)" }}>Your turn to guess!</p>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--fg-muted)" }}>
                        Drag the needle to where you think the target is. Anyone can lock the guess.
                      </p>
                    </>
                  )}
                </div>
                <button
                  onClick={revealAndScore}
                  className="w-full py-4 rounded-xl text-lg font-black active:scale-[0.98] transition-all hover:opacity-90"
                  style={{ backgroundColor: teamColor, color: "#000" }}
                >
                  LOCK GUESS & REVEAL
                </button>
              </div>
            )}

            {/* REVEALED phase */}
            {phase === "revealed" && (
              <div className="flex flex-col items-center gap-4">
                <div
                  className="text-center w-full rounded-xl py-6"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  <div className="text-6xl font-black tracking-tighter" style={{ color: teamColor }}>
                    +{lastScore}
                  </div>
                  <div className="text-sm uppercase tracking-widest font-mono mt-1" style={{ color: "var(--fg-muted)" }}>Points</div>
                  {lastScore === 4 && <div className="text-sm font-bold mt-2">BULLSEYE!</div>}
                  {lastScore === 0 && <div className="text-sm font-bold mt-2" style={{ color: "var(--fg-muted)" }}>Complete miss...</div>}
                </div>
                <button
                  onClick={nextTurn}
                  className="w-full py-4 rounded-xl text-lg font-black active:scale-[0.98] transition-all mt-2"
                  style={{ background: "var(--surface)", color: "var(--fg)", border: "1px solid var(--border)" }}
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
