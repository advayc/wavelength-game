import { neon, NeonQueryFunction } from "@neondatabase/serverless";

// This module is server-side only (API routes / Server Actions).
// Call getSql() inside request handlers — NOT at module top level —
// to avoid build-time errors when DATABASE_URL is absent.
export function getSql(): NeonQueryFunction<false, false> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set. See README for setup instructions.");
  }
  return neon(process.env.DATABASE_URL);
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type OnlinePhase = "lobby" | "psychic" | "guessing" | "revealed" | "game-over";

export interface OnlinePlayer {
  id: string;
  roomId: string;
  name: string;
  color: string;
  teamId: string | null;
  psychicOrder: number;
}

export interface OnlineTeam {
  id: string;
  roomId: string;
  name: string;
  color: string;
  score: number;
  teamOrder: number;
  psychicRotationIndex: number;
  /** Players assigned to this team (populated by getRoomWithPlayers) */
  players: OnlinePlayer[];
}

export interface OnlineRoom {
  id: string;
  hostPlayerId: string;
  phase: OnlinePhase;
  currentTeamId: string | null;
  currentPsychicId: string | null;
  round: number;
  maxRounds: number;
  targetAngle: number;
  dialAngle: number;
  isScreenOpen: boolean;
  lastScore: number;
  currentConceptLeft: string | null;
  currentConceptRight: string | null;
  usedConceptIndices: number[];
  /** All teams in the room, sorted by team_order */
  teams: OnlineTeam[];
  /** All players in the room (flat list) */
  players: OnlinePlayer[];
}

// ─── DB helpers ──────────────────────────────────────────────────────────────

export async function getRoomWithPlayers(roomId: string): Promise<OnlineRoom | null> {
  const sql = getSql();
  const [roomRow] = await sql`SELECT * FROM rooms WHERE id = ${roomId}`;
  if (!roomRow) return null;

  const teamRows = await sql`
    SELECT * FROM teams WHERE room_id = ${roomId} ORDER BY team_order ASC
  `;

  const playerRows = await sql`
    SELECT * FROM players WHERE room_id = ${roomId} ORDER BY joined_at ASC
  `;

  return rowsToRoom(roomRow, teamRows, playerRows);
}

export function rowsToRoom(
  room: Record<string, unknown>,
  teams: Record<string, unknown>[],
  players: Record<string, unknown>[]
): OnlineRoom {
  const mappedPlayers: OnlinePlayer[] = players.map((p) => ({
    id: p.id as string,
    roomId: p.room_id as string,
    name: p.name as string,
    color: p.color as string,
    teamId: p.team_id as string | null,
    psychicOrder: p.psychic_order as number,
  }));

  const mappedTeams: OnlineTeam[] = teams.map((t) => ({
    id: t.id as string,
    roomId: t.room_id as string,
    name: t.name as string,
    color: t.color as string,
    score: t.score as number,
    teamOrder: t.team_order as number,
    psychicRotationIndex: t.psychic_rotation_index as number,
    players: mappedPlayers.filter((p) => p.teamId === (t.id as string)),
  }));

  return {
    id: room.id as string,
    hostPlayerId: room.host_player_id as string,
    phase: room.phase as OnlinePhase,
    currentTeamId: room.current_team_id as string | null,
    currentPsychicId: room.current_psychic_id as string | null,
    round: room.round as number,
    maxRounds: room.max_rounds as number,
    targetAngle: parseFloat(room.target_angle as string),
    dialAngle: parseFloat(room.dial_angle as string),
    isScreenOpen: room.is_screen_open as boolean,
    lastScore: room.last_score as number,
    currentConceptLeft: room.current_concept_left as string | null,
    currentConceptRight: room.current_concept_right as string | null,
    usedConceptIndices: JSON.parse((room.used_concept_indices as string) || "[]"),
    teams: mappedTeams,
    players: mappedPlayers,
  };
}
