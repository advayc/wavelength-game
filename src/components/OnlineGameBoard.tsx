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
    skipTurn,
    resetGame,
    refreshRoom,
    getActiveTeam,
    isMyTeamActive,
    isMyTurnAsPsychic,
    canDragDial,
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

  // Throttle dial updates to ~20/sec for smooth but not spammy sync
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

  const {
    phase,
    teams,
    players,
    currentTeamId,
    currentPsychicId,
    currentConceptLeft,
    currentConceptRight,
    targetAngle,
    dialAngle,
    isScreenOpen,
    lastScore,
    round,
    maxRounds,
  } = room;

  const activeTeam = getActiveTeam();
  const isPsychic = isMyTurnAsPsychic();
  const myTeamIsActive = isMyTeamActive();
  const canDrag = canDragDial();
  const isHost = room.hostPlayerId === playerId;

  // The psychic gets to see the target; everyone else sees a closed screen
  // (unless it's already revealed phase)
  const showTarget = isPsychic || phase === "revealed";
  const effectiveScreenOpen = isPsychic ? isScreenOpen : phase === "revealed" ? true : false;

  const psychic = players.find((p) => p.id === currentPsychicId);
  const teamColor = activeTeam?.color ?? "#2EC4B6";

  // ── Game Over ────────────────────────────────────────────────────────────────
  if (phase === "game-over") {
    const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
    const topScore = sortedTeams[0]?.score ?? 0;
    const winners = sortedTeams.filter((t) => t.score === topScore);
    const isTie = winners.length > 1;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ color: "var(--fg)" }}>
        <div className="w-full max-w-sm space-y-6 text-center">

          {error && (
            <div className="rounded-xl p-3 text-sm flex items-center gap-2 text-left"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
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

          {/* Final scores */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            {sortedTeams.map((team, i) => (
              <div
                key={team.id}
                className="flex items-center gap-3 px-4 py-3.5"
                style={{
                  borderBottom: i < sortedTeams.length - 1 ? "1px solid var(--border)" : "none",
                  background: i === 0 ? `${team.color}18` : "transparent",
                }}
              >
                <span className="text-sm font-mono w-5 font-bold" style={{ color: "var(--fg-faint)" }}>#{i + 1}</span>
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />
                <div className="flex-1 text-left">
                  <div className="text-sm font-bold">{team.name}</div>
                  <div className="text-xs" style={{ color: "var(--fg-faint)" }}>
                    {team.players.map((p) => p.name).join(", ")}
                  </div>
                </div>
                <span className="text-2xl font-black font-mono" style={{ color: team.color }}>{team.score}</span>
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

  // ── Main Board ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col px-4 py-5" style={{ color: "var(--fg)" }}>

      {/* Error banner */}
      {error && (
        <div className="mb-4 rounded-xl p-3 text-sm flex items-center gap-2"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
          <span className="flex-1">{error}</span>
          <button onClick={clearError} className="text-lg leading-none hover:opacity-80">×</button>
        </div>
      )}

      {/* ── Scoreboard ─────────────────────────────────────────────────────── */}
      <div className="space-y-3 mb-4">

        {/* Round progress */}
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

        {/* Team score pills */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {teams.map((team) => {
            const isActive = team.id === currentTeamId;
            return (
              <div
                key={team.id}
                className="flex-shrink-0 rounded-xl px-3 py-2 transition-all"
                style={
                  isActive
                    ? { background: `${team.color}22`, border: `1.5px solid ${team.color}80` }
                    : { background: "var(--surface)", border: "1px solid var(--border)" }
                }
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: team.color }} />
                  <span className="text-sm font-bold">{team.name}</span>
                  {isActive && (
                    <span
                      className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                      style={{ background: `${team.color}30`, color: team.color }}
                    >
                      {phase === "psychic" ? "PSYCHIC" : phase === "guessing" ? "GUESSING" : "ACTIVE"}
                    </span>
                  )}
                  <span className="text-base font-black font-mono ml-1" style={{ color: team.color }}>
                    {team.score}
                  </span>
                </div>
                {/* Show team member names compactly */}
                <div className="mt-1 flex flex-wrap gap-1">
                  {team.players.map((p) => (
                    <span
                      key={p.id}
                      className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{
                        background: p.id === currentPsychicId && isActive
                          ? `${team.color}40`
                          : "rgba(255,255,255,0.05)",
                        color: p.id === currentPsychicId && isActive ? team.color : "var(--fg-faint)",
                        border: p.id === currentPsychicId && isActive
                          ? `1px solid ${team.color}60`
                          : "1px solid transparent",
                        fontWeight: p.id === currentPsychicId && isActive ? 700 : 400,
                      }}
                    >
                      {p.id === playerId ? "you" : p.name}
                      {p.id === currentPsychicId && isActive ? " (psychic)" : ""}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Game Area ──────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-5">

        {/* Concept Card */}
        {currentConceptLeft && currentConceptRight && (
          <div
            className="w-full max-w-sm rounded-2xl p-5 flex items-stretch shadow-lg"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="flex-1 flex flex-col items-center text-center">
              <span className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: "var(--fg-faint)" }}>Left</span>
              <span className="text-xl font-bold leading-tight">{currentConceptLeft}</span>
            </div>
            <div className="flex flex-col items-center justify-center px-4">
              <div className="w-px h-6" style={{ background: "var(--divider)" }} />
              <div className="text-lg my-1 font-mono" style={{ color: "var(--fg-muted)" }}>↔</div>
              <div className="w-px h-6" style={{ background: "var(--divider)" }} />
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
            targetAngle={showTarget ? targetAngle : undefined}
            isScreenOpen={effectiveScreenOpen}
            onAngleChange={canDrag ? handleDialChange : undefined}
            disabled={!canDrag}
            teamColor={teamColor}
          />

          {/* Phase controls */}
          <div className="w-full mt-6 flex flex-col gap-3">

            {/* ── PSYCHIC phase ── */}
            {phase === "psychic" && (
              <div className="flex flex-col gap-3">
                <div
                  className="rounded-xl p-4 text-center"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  {isPsychic ? (
                    <>
                      <p className="text-xs font-mono uppercase tracking-widest mb-1.5" style={{ color: teamColor }}>
                        You are the Psychic
                      </p>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--fg-muted)" }}>
                        The target is shown on the dial. Give your team a clue using the spectrum above,
                        then hide the target and let them guess.
                      </p>
                    </>
                  ) : myTeamIsActive ? (
                    <>
                      <p className="text-xs font-mono uppercase tracking-widest mb-1.5" style={{ color: "var(--fg-muted)" }}>
                        Your Psychic is thinking
                      </p>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--fg-muted)" }}>
                        <strong style={{ color: teamColor }}>{psychic?.name}</strong> is choosing a clue.
                        Get ready to guess!
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-mono uppercase tracking-widest mb-1.5" style={{ color: "var(--fg-muted)" }}>
                        {activeTeam?.name}&apos;s turn
                      </p>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--fg-muted)" }}>
                        <strong style={{ color: teamColor }}>{psychic?.name}</strong> is the psychic. Listen for their clue!
                      </p>
                    </>
                  )}
                </div>

                {/* Psychic action */}
                {isPsychic && (
                  <button
                    onClick={startGuessing}
                    className="w-full py-4 rounded-xl text-base font-black active:scale-[0.98] transition-all hover:opacity-90"
                    style={{ backgroundColor: teamColor, color: "#000" }}
                  >
                    HIDE TARGET &amp; START GUESSING
                  </button>
                )}

                {/* Skip button — psychic or host can skip */}
                {(isPsychic || isHost) && (
                  <button
                    onClick={skipTurn}
                    className="w-full py-3 rounded-xl text-sm font-medium transition-all"
                    style={{ border: "1px solid var(--border)", color: "var(--fg-muted)" }}
                  >
                    Skip Turn (no points)
                  </button>
                )}
              </div>
            )}

            {/* ── GUESSING phase ── */}
            {phase === "guessing" && (
              <div className="flex flex-col gap-3">
                <div
                  className="rounded-xl p-4 text-center"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  {isPsychic ? (
                    <>
                      <p className="text-xs font-mono uppercase tracking-widest mb-1.5" style={{ color: "var(--fg-muted)" }}>
                        You are the Psychic
                      </p>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--fg-muted)" }}>
                        Watch your team move the needle. Lock in the guess when they&apos;re ready.
                      </p>
                    </>
                  ) : myTeamIsActive ? (
                    <>
                      <p className="text-xs font-mono uppercase tracking-widest mb-1.5" style={{ color: teamColor }}>
                        Your Turn to Guess!
                      </p>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--fg-muted)" }}>
                        Drag the needle to where you think the target is. Anyone on your team can lock the guess.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-mono uppercase tracking-widest mb-1.5" style={{ color: "var(--fg-muted)" }}>
                        {activeTeam?.name} is guessing
                      </p>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--fg-muted)" }}>
                        Sit tight while the other team guesses. You&apos;ll see the result when they lock in.
                      </p>
                    </>
                  )}
                </div>

                {/* Only active team non-psychic can lock */}
                {myTeamIsActive && !isPsychic && (
                  <button
                    onClick={revealAndScore}
                    className="w-full py-4 rounded-xl text-base font-black active:scale-[0.98] transition-all hover:opacity-90"
                    style={{ backgroundColor: teamColor, color: "#000" }}
                  >
                    LOCK GUESS &amp; REVEAL
                  </button>
                )}

                {/* Psychic can also lock (they agreed) */}
                {isPsychic && (
                  <button
                    onClick={revealAndScore}
                    className="w-full py-4 rounded-xl text-base font-black active:scale-[0.98] transition-all hover:opacity-90"
                    style={{ backgroundColor: teamColor, color: "#000" }}
                  >
                    LOCK GUESS &amp; REVEAL
                  </button>
                )}
              </div>
            )}

            {/* ── REVEALED phase ── */}
            {phase === "revealed" && (
              <div className="flex flex-col items-center gap-4">
                <div
                  className="text-center w-full rounded-xl py-6"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  <div className="text-6xl font-black tracking-tighter" style={{ color: teamColor }}>
                    +{lastScore}
                  </div>
                  <div className="text-sm uppercase tracking-widest font-mono mt-1" style={{ color: "var(--fg-muted)" }}>
                    {activeTeam?.name} scored {lastScore} point{lastScore !== 1 ? "s" : ""}
                  </div>
                  {lastScore === 4 && (
                    <div className="text-sm font-black mt-2" style={{ color: "#3b82f6" }}>BULLSEYE!</div>
                  )}
                  {lastScore === 3 && (
                    <div className="text-sm font-bold mt-2" style={{ color: "#f97316" }}>Inner zone!</div>
                  )}
                  {lastScore === 2 && (
                    <div className="text-sm font-bold mt-2" style={{ color: "#facc15" }}>Outer zone</div>
                  )}
                  {lastScore === 0 && (
                    <div className="text-sm font-bold mt-2" style={{ color: "var(--fg-muted)" }}>Complete miss...</div>
                  )}
                </div>

                <button
                  onClick={nextTurn}
                  className="w-full py-4 rounded-xl text-base font-black active:scale-[0.98] transition-all"
                  style={{ background: "var(--surface)", color: "var(--fg)", border: "1px solid var(--border)" }}
                >
                  NEXT TURN →
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
