"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useOnlineStore } from "@/lib/online-store";

interface OnlineLobbyScreenProps {
  onBack: () => void;
}

export default function OnlineLobbyScreen({ onBack }: OnlineLobbyScreenProps) {
  const searchParams = useSearchParams();
  const prefilledCode = searchParams.get("join")?.toUpperCase() ?? "";

  const [tab, setTab] = useState<"create" | "join">(prefilledCode ? "join" : "create");
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState(prefilledCode);
  const [maxRounds, setMaxRounds] = useState(8);
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const { room, playerId, isConnecting, error, createRoom, joinRoom, startGame, leaveRoom, clearError } =
    useOnlineStore();

  useEffect(() => {
    if (prefilledCode) {
      setTab("join");
      setRoomCode(prefilledCode);
    }
  }, [prefilledCode]);

  const isInRoom = !!room;
  const isHost = room?.hostPlayerId === playerId;
  const canStart = isHost && (room?.players.length ?? 0) >= 2;

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createRoom(name.trim(), maxRounds);
  };

  const handleJoin = async () => {
    if (!name.trim() || !roomCode.trim()) return;
    await joinRoom(roomCode.trim(), name.trim());
  };

  const copyCode = async () => {
    if (!room) return;
    await navigator.clipboard.writeText(room.id);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const copyInviteLink = async () => {
    if (!room) return;
    const url = `${window.location.origin}/online?join=${room.id}`;
    await navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // ─── In-room lobby ─────────────────────────────────────────────────────────
  if (isInRoom && room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ color: "var(--fg)" }}>
        <div className="w-full max-w-sm space-y-5">

          {/* Wordmark */}
          <div className="text-center mb-2">
            <p className="text-xs tracking-[0.3em] uppercase font-mono mb-1" style={{ color: "var(--fg-faint)" }}>
              Online Game
            </p>
            <h1 className="text-4xl font-black tracking-tighter leading-none">
              WAVE<span style={{ color: "var(--accent)" }}>LENGTH</span>
            </h1>
          </div>

          {/* Room code card */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="px-5 pt-5 pb-4 text-center">
              <p className="text-xs font-mono uppercase tracking-[0.2em] mb-3" style={{ color: "var(--fg-muted)" }}>
                Room Code
              </p>
              {/* Glowing code */}
              <div
                className="font-mono font-black tracking-[0.25em] text-5xl mb-4 leading-none"
                style={{
                  color: "var(--accent)",
                  textShadow: "0 0 32px rgba(46,196,182,0.35), 0 0 8px rgba(46,196,182,0.2)",
                }}
              >
                {room.id}
              </div>
              {/* Share row */}
              <div className="flex gap-2">
                <button
                  onClick={copyCode}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200"
                  style={{
                    background: codeCopied ? "var(--accent)" : "rgba(255,255,255,0.07)",
                    border: `1px solid ${codeCopied ? "var(--accent)" : "var(--border)"}`,
                    color: codeCopied ? "#000" : "var(--fg-muted)",
                  }}
                >
                  {codeCopied ? (
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="4.5" y="4.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M2.5 9.5V2.5A1 1 0 0 1 3.5 1.5H9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                  )}
                  {codeCopied ? "Copied!" : "Copy Code"}
                </button>
                <button
                  onClick={copyInviteLink}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200"
                  style={{
                    background: linkCopied ? "var(--accent)" : "rgba(255,255,255,0.07)",
                    border: `1px solid ${linkCopied ? "var(--accent)" : "var(--border)"}`,
                    color: linkCopied ? "#000" : "var(--fg-muted)",
                  }}
                >
                  {linkCopied ? (
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 7l3.5 3.5L12 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M7.5 1h4v4M8 5.5 11.5 2M5.5 3.5H2A1 1 0 0 0 1 4.5v7A1 1 0 0 0 2 12.5h7a1 1 0 0 0 1-1V8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  )}
                  {linkCopied ? "Copied!" : "Invite Link"}
                </button>
              </div>
            </div>
          </div>

          {/* Players */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--fg-muted)" }}>
                Players
              </span>
              <span className="text-xs font-mono" style={{ color: "var(--fg-faint)" }}>
                {room.players.length} / 6
              </span>
            </div>
            <ul>
              {room.players.map((player, i) => (
                <li
                  key={player.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={i < room.players.length - 1 ? { borderBottom: "1px solid var(--border)" } : {}}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: player.color,
                      boxShadow: `0 0 6px ${player.color}80`,
                    }}
                  />
                  <span className="flex-1 text-sm font-medium">
                    {player.name}
                    {player.id === playerId && (
                      <span className="ml-2 text-xs" style={{ color: "var(--fg-muted)" }}>you</span>
                    )}
                  </span>
                  {player.id === room.hostPlayerId && (
                    <span
                      className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{
                        background: "rgba(46,196,182,0.12)",
                        color: "var(--accent)",
                        border: "1px solid rgba(46,196,182,0.25)",
                      }}
                    >
                      host
                    </span>
                  )}
                </li>
              ))}
              {room.players.length === 1 && (
                <li className="px-4 py-4 text-xs text-center font-mono" style={{ color: "var(--fg-faint)" }}>
                  Waiting for players to join...
                </li>
              )}
            </ul>
          </div>

          {/* Error */}
          {error && (
            <div
              className="rounded-xl px-4 py-3 text-sm flex items-center gap-2"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}
            >
              <span className="flex-1">{error}</span>
              <button onClick={clearError} className="text-base leading-none opacity-60 hover:opacity-100">×</button>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2.5">
            {isHost ? (
              <button
                disabled={!canStart || isConnecting}
                onClick={startGame}
                className="w-full py-4 rounded-xl font-black text-base tracking-[0.08em] uppercase transition-all active:scale-[0.98] disabled:cursor-not-allowed"
                style={{
                  background: canStart && !isConnecting ? "var(--accent)" : "var(--surface)",
                  color: canStart && !isConnecting ? "#000" : "var(--fg-faint)",
                  border: canStart && !isConnecting ? "none" : "1px solid var(--border)",
                  opacity: isConnecting ? 0.6 : 1,
                }}
              >
                {isConnecting ? "Starting..." : canStart ? "Start Game" : "Need 2+ players"}
              </button>
            ) : (
              <div
                className="w-full py-4 rounded-xl text-base text-center font-semibold select-none"
                style={{ background: "var(--surface)", color: "var(--fg-muted)", border: "1px solid var(--border)" }}
              >
                Waiting for host...
              </div>
            )}
            <button
              onClick={leaveRoom}
              className="w-full py-3 rounded-xl text-sm font-medium transition-all"
              style={{ border: "1px solid var(--border)", color: "var(--fg-muted)" }}
            >
              Leave Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Create / Join ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ color: "var(--fg)" }}>
      <div className="w-full max-w-sm space-y-6">

        {/* Back */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest transition-opacity hover:opacity-80"
          style={{ color: "var(--fg-muted)" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 11.5L4.5 7 9 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back
        </button>

        {/* Header */}
        <div>
          <p className="text-xs tracking-[0.3em] uppercase font-mono mb-2" style={{ color: "var(--fg-faint)" }}>
            Party Game
          </p>
          <h1 className="text-5xl font-black tracking-tighter leading-none mb-3">
            WAVE<span style={{ color: "var(--accent)" }}>LENGTH</span>
          </h1>
          <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
            Play online with friends, anywhere.
          </p>
        </div>

        {/* Mode toggle */}
        <div
          className="flex rounded-xl p-1 gap-1"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          {(["create", "join"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold tracking-wide transition-all duration-200"
              style={
                tab === t
                  ? { background: "var(--accent)", color: "#000" }
                  : { color: "var(--fg-muted)" }
              }
            >
              {t === "create" ? "Create Room" : "Join Room"}
            </button>
          ))}
        </div>

        {/* Form card */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="p-5 space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-widest block" style={{ color: "var(--fg-muted)" }}>
                Your Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 20))}
                onKeyDown={(e) => e.key === "Enter" && (tab === "create" ? handleCreate() : handleJoin())}
                placeholder="Enter your name"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors"
                style={{
                  background: "var(--input-bg)",
                  border: "1px solid var(--border)",
                  color: "var(--fg)",
                }}
                autoFocus
              />
            </div>

            {/* Room code (join) */}
            {tab === "join" && (
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-widest block" style={{ color: "var(--fg-muted)" }}>
                  Room Code
                </label>
                <input
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 6))}
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                  placeholder="XXXXXX"
                  className="w-full rounded-xl px-4 py-3 text-2xl font-mono font-bold tracking-[0.35em] text-center outline-none transition-colors"
                  style={{
                    background: "var(--input-bg)",
                    border: "1px solid var(--border)",
                    color: roomCode.length === 6 ? "var(--accent)" : "var(--fg)",
                  }}
                />
              </div>
            )}

            {/* Rounds (create) */}
            {tab === "create" && (
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-widest block" style={{ color: "var(--fg-muted)" }}>
                  Rounds
                </label>
                <div className="flex gap-1.5">
                  {[4, 6, 8, 10, 12].map((r) => (
                    <button
                      key={r}
                      onClick={() => setMaxRounds(r)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-mono font-bold transition-all duration-200"
                      style={
                        maxRounds === r
                          ? { background: "var(--accent)", color: "#000" }
                          : { background: "rgba(255,255,255,0.05)", color: "var(--fg-muted)", border: "1px solid var(--border)" }
                      }
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            className="rounded-xl px-4 py-3 text-sm flex items-center gap-2"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}
          >
            <span className="flex-1">{error}</span>
            <button onClick={clearError} className="text-base leading-none opacity-60 hover:opacity-100">×</button>
          </div>
        )}

        {/* CTA */}
        <button
          disabled={isConnecting || !name.trim() || (tab === "join" && roomCode.trim().length < 6)}
          onClick={tab === "create" ? handleCreate : handleJoin}
          className="w-full py-4 rounded-xl font-black text-base tracking-[0.08em] uppercase transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          {isConnecting
            ? "Connecting..."
            : tab === "create"
            ? "Create Room"
            : "Join Game"}
        </button>
      </div>
    </div>
  );
}
