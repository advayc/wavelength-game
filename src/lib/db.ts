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
  score: number;
  teamIndex: number;
  isConnected: boolean;
}

export interface OnlineRoom {
  id: string;
  hostPlayerId: string;
  phase: OnlinePhase;
  currentTeamIndex: number;
  round: number;
  maxRounds: number;
  targetAngle: number;
  dialAngle: number;
  isScreenOpen: boolean;
  lastScore: number;
  currentConceptLeft: string | null;
  currentConceptRight: string | null;
  usedConceptIndices: number[];
  players: OnlinePlayer[];
}

// ─── DB helpers ──────────────────────────────────────────────────────────────

export async function getRoomWithPlayers(roomId: string): Promise<OnlineRoom | null> {
  const sql = getSql();
  const [roomRow] = await sql`
    SELECT * FROM rooms WHERE id = ${roomId}
  `;
  if (!roomRow) return null;

  const playerRows = await sql`
    SELECT * FROM players WHERE room_id = ${roomId} ORDER BY team_index ASC, joined_at ASC
  `;

  return rowsToRoom(roomRow, playerRows);
}

export function rowsToRoom(room: Record<string, unknown>, players: Record<string, unknown>[]): OnlineRoom {
  return {
    id: room.id as string,
    hostPlayerId: room.host_player_id as string,
    phase: room.phase as OnlinePhase,
    currentTeamIndex: room.current_team_index as number,
    round: room.round as number,
    maxRounds: room.max_rounds as number,
    targetAngle: parseFloat(room.target_angle as string),
    dialAngle: parseFloat(room.dial_angle as string),
    isScreenOpen: room.is_screen_open as boolean,
    lastScore: room.last_score as number,
    currentConceptLeft: room.current_concept_left as string | null,
    currentConceptRight: room.current_concept_right as string | null,
    usedConceptIndices: JSON.parse((room.used_concept_indices as string) || "[]"),
    players: players.map((p) => ({
      id: p.id as string,
      roomId: p.room_id as string,
      name: p.name as string,
      color: p.color as string,
      score: p.score as number,
      teamIndex: p.team_index as number,
      isConnected: p.is_connected as boolean,
    })),
  };
}
