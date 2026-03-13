"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useOnlineStore } from "@/lib/online-store";
import type { OnlineTeam, OnlinePlayer } from "@/lib/db";

interface OnlineLobbyScreenProps {
  onBack: () => void;
}

// ─── Team Column ─────────────────────────────────────────────────────────────

function TeamColumn({
  team,
  players,
  isHost,
  onAssign,
  onDelete,
  onRename,
}: {
  team: OnlineTeam;
  players: OnlinePlayer[];
  isHost: boolean;
  onAssign: (playerId: string, teamId: string) => void;
  onDelete: (teamId: string) => void;
  onRename: (teamId: string, name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(team.name);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const playerId = e.dataTransfer.getData("playerId");
    if (playerId) onAssign(playerId, team.id);
  };

  const commitRename = () => {
    if (draftName.trim() && draftName.trim() !== team.name) {
      onRename(team.id, draftName.trim());
    }
    setEditing(false);
  };

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden min-w-[140px] flex-shrink-0"
      style={{
        background: dragOver ? `${team.color}18` : "var(--surface)",
        border: `1px solid ${dragOver ? team.color : "var(--border)"}`,
        transition: "border-color 0.15s, background 0.15s",
      }}
      onDragOver={isHost ? (e) => { e.preventDefault(); setDragOver(true); } : undefined}
      onDragLeave={isHost ? () => setDragOver(false) : undefined}
      onDrop={isHost ? handleDrop : undefined}
    >
      {/* Team header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5"
        style={{ borderBottom: "1px solid var(--border)", background: `${team.color}15` }}
      >
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />
        {editing && isHost ? (
          <input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value.slice(0, 20))}
            onBlur={commitRename}
            onKeyDown={(e) => e.key === "Enter" && commitRename()}
            className="flex-1 bg-transparent outline-none text-xs font-bold min-w-0"
            style={{ color: team.color }}
          />
        ) : (
          <span
            className="flex-1 text-xs font-bold truncate cursor-pointer"
            style={{ color: team.color }}
            onClick={isHost ? () => { setDraftName(team.name); setEditing(true); } : undefined}
          >
            {team.name}
          </span>
        )}
        {isHost && !editing && (
          <button
            onClick={() => onDelete(team.id)}
            className="text-[10px] opacity-40 hover:opacity-80 flex-shrink-0 leading-none"
            style={{ color: "var(--fg)" }}
            title="Remove team"
          >
            ✕
          </button>
        )}
      </div>

      {/* Players in this team */}
      <div className="flex-1 p-2 space-y-1.5 min-h-[60px]">
        {players.map((player) => (
          <PlayerChip
            key={player.id}
            player={player}
            draggable={isHost}
            onUnassign={isHost ? () => onAssign(player.id, "") : undefined}
          />
        ))}
        {players.length === 0 && (
          <p className="text-[10px] text-center py-2 font-mono" style={{ color: "var(--fg-faint)" }}>
            {isHost ? "Drop players here" : "Empty"}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Player Chip ─────────────────────────────────────────────────────────────

function PlayerChip({
  player,
  draggable,
  onUnassign,
  dimmed,
}: {
  player: OnlinePlayer;
  draggable?: boolean;
  onUnassign?: () => void;
  dimmed?: boolean;
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={(e) => e.dataTransfer.setData("playerId", player.id)}
      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium select-none"
      style={{
        background: "var(--surface-hover)",
        border: "1px solid var(--border)",
        cursor: draggable ? "grab" : "default",
        opacity: dimmed ? 0.4 : 1,
        transition: "opacity 0.15s",
      }}
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: player.color, boxShadow: `0 0 4px ${player.color}80` }}
      />
      <span className="flex-1 truncate" style={{ color: "var(--fg)" }}>{player.name}</span>
      {onUnassign && (
        <button
          onClick={onUnassign}
          className="opacity-30 hover:opacity-80 leading-none ml-0.5"
          style={{ color: "var(--fg)" }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OnlineLobbyScreen({ onBack }: OnlineLobbyScreenProps) {
  const searchParams = useSearchParams();
  const prefilledCode = searchParams.get("join")?.toUpperCase() ?? "";

  const [tab, setTab] = useState<"create" | "join">(prefilledCode ? "join" : "create");
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState(prefilledCode);
  const [maxRounds, setMaxRounds] = useState(8);
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");

  const {
    room, playerId, isConnecting, error,
    createRoom, joinRoom, startGame, leaveRoom, clearError,
    createTeam, deleteTeam, renameTeam, assignPlayer,
  } = useOnlineStore();

  useEffect(() => {
    if (prefilledCode) {
      setTab("join");
      setRoomCode(prefilledCode);
    }
  }, [prefilledCode]);

  const isInRoom = !!room;
  const isHost = room?.hostPlayerId === playerId;

  // Validation for start game
  const unassignedPlayers = room?.players.filter((p) => !p.teamId) ?? [];
  const emptyTeams = room?.teams.filter((t) => t.players.length === 0) ?? [];
  const canStart =
    isHost &&
    (room?.teams.length ?? 0) >= 2 &&
    unassignedPlayers.length === 0 &&
    emptyTeams.length === 0 &&
    (room?.players.length ?? 0) >= 2;

  const startDisabledReason = isHost
    ? (room?.teams.length ?? 0) < 2
      ? "Create at least 2 teams"
      : unassignedPlayers.length > 0
      ? `${unassignedPlayers.length} player(s) unassigned`
      : emptyTeams.length > 0
      ? `"${emptyTeams[0].name}" is empty`
      : (room?.players.length ?? 0) < 2
      ? "Need 2+ players"
      : null
    : null;

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

  const handleAssign = async (targetPlayerId: string, teamId: string) => {
    await assignPlayer(targetPlayerId, teamId || null);
  };

  const handleCreateTeam = async () => {
    const n = newTeamName.trim() || `Team ${(room?.teams.length ?? 0) + 1}`;
    await createTeam(n);
    setNewTeamName("");
  };

  // ─── In-room lobby ──────────────────────────────────────────────────────────
  if (isInRoom && room) {
    const unassigned = room.players.filter((p) => !p.teamId);

    return (
      <div className="min-h-screen flex flex-col items-center px-4 py-8" style={{ color: "var(--fg)" }}>
        <div className="w-full max-w-2xl space-y-5">

          {/* Header */}
          <div className="text-center">
            <p className="text-xs tracking-[0.3em] uppercase font-mono mb-1" style={{ color: "var(--fg-faint)" }}>
              Online Game
            </p>
            <h1 className="text-4xl font-black tracking-tighter leading-none">
              WAVE<span style={{ color: "var(--accent)" }}>LENGTH</span>
            </h1>
          </div>

          {/* Room code + share */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="px-5 pt-4 pb-4 flex items-center gap-4">
              <div className="flex-1">
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] mb-1" style={{ color: "var(--fg-muted)" }}>
                  Room Code
                </p>
                <div
                  className="font-mono font-black tracking-[0.2em] text-3xl leading-none"
                  style={{
                    color: "var(--accent)",
                    textShadow: "0 0 24px rgba(46,196,182,0.3)",
                  }}
                >
                  {room.id}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={copyCode}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all"
                  style={{
                    background: codeCopied ? "var(--accent)" : "rgba(255,255,255,0.07)",
                    border: `1px solid ${codeCopied ? "var(--accent)" : "var(--border)"}`,
                    color: codeCopied ? "#000" : "var(--fg-muted)",
                  }}
                >
                  {codeCopied ? "✓ Copied" : "Copy Code"}
                </button>
                <button
                  onClick={copyInviteLink}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all"
                  style={{
                    background: linkCopied ? "var(--accent)" : "rgba(255,255,255,0.07)",
                    border: `1px solid ${linkCopied ? "var(--accent)" : "var(--border)"}`,
                    color: linkCopied ? "#000" : "var(--fg-muted)",
                  }}
                >
                  {linkCopied ? "✓ Copied" : "Invite Link"}
                </button>
              </div>
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

          {/* Team Assignment Section */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--fg-muted)" }}>
                Team Assignment
              </span>
              <span className="text-xs font-mono" style={{ color: "var(--fg-faint)" }}>
                {room.players.length} players · {room.teams.length} teams
              </span>
            </div>

            <div className="p-4 space-y-4">
              {/* Unassigned players pool */}
              {(unassigned.length > 0 || room.teams.length === 0) && (
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: "var(--fg-faint)" }}>
                    {unassigned.length > 0 ? `Unassigned (${unassigned.length})` : "All players assigned"}
                  </p>
                  {unassigned.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {unassigned.map((player) => (
                        <PlayerChip
                          key={player.id}
                          player={player}
                          draggable={isHost}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs" style={{ color: "var(--fg-muted)" }}>
                      All players are assigned to teams.
                    </p>
                  )}
                </div>
              )}

              {/* Teams */}
              {room.teams.length > 0 ? (
                <div className="overflow-x-auto">
                  <div className="flex gap-3 pb-1" style={{ minWidth: "max-content" }}>
                    {room.teams.map((team) => (
                      <TeamColumn
                        key={team.id}
                        team={team}
                        players={team.players}
                        isHost={!!isHost}
                        onAssign={handleAssign}
                        onDelete={deleteTeam}
                        onRename={renameTeam}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-center py-2" style={{ color: "var(--fg-faint)" }}>
                  {isHost ? "Create teams below, then drag players into them." : "Waiting for host to create teams..."}
                </p>
              )}

              {/* Add team (host only) */}
              {isHost && (
                <div className="flex gap-2">
                  <input
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value.slice(0, 20))}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
                    placeholder={`Team ${(room.teams.length) + 1}`}
                    className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                    style={{
                      background: "var(--input-bg)",
                      border: "1px solid var(--border)",
                      color: "var(--fg)",
                    }}
                  />
                  <button
                    onClick={handleCreateTeam}
                    className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                    style={{ background: "var(--accent)", color: "#000" }}
                  >
                    + Add Team
                  </button>
                </div>
              )}

              {/* Instructions for non-host */}
              {!isHost && (
                <p className="text-xs text-center" style={{ color: "var(--fg-faint)" }}>
                  The host is arranging teams. You&apos;ll be notified when it&apos;s time to play.
                </p>
              )}
            </div>
          </div>

          {/* Round settings (host only, shown as info otherwise) */}
          <div
            className="rounded-xl px-4 py-3 flex items-center justify-between"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--fg-muted)" }}>
              Rounds
            </span>
            <span className="text-sm font-bold font-mono" style={{ color: "var(--accent)" }}>
              {room.maxRounds}
            </span>
          </div>

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
                {isConnecting
                  ? "Starting..."
                  : canStart
                  ? "Start Game"
                  : startDisabledReason ?? "Set up teams first"}
              </button>
            ) : (
              <div
                className="w-full py-4 rounded-xl text-base text-center font-semibold select-none"
                style={{ background: "var(--surface)", color: "var(--fg-muted)", border: "1px solid var(--border)" }}
              >
                Waiting for host to start...
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
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 11.5L4.5 7 9 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
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
