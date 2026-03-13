// Run this ONCE to set up the Neon database schema.
// Usage: DATABASE_URL="postgres://..." npx tsx src/lib/db-setup.ts

import { getSql } from "./db";

async function setup() {
  const sql = getSql();
  console.log("Creating schema...");

  await sql`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      host_player_id TEXT NOT NULL,
      phase TEXT NOT NULL DEFAULT 'lobby',
      current_team_index INT NOT NULL DEFAULT 0,
      round INT NOT NULL DEFAULT 1,
      max_rounds INT NOT NULL DEFAULT 8,
      target_angle FLOAT NOT NULL DEFAULT 90,
      dial_angle FLOAT NOT NULL DEFAULT 90,
      is_screen_open BOOLEAN NOT NULL DEFAULT true,
      last_score INT NOT NULL DEFAULT 0,
      current_concept_left TEXT,
      current_concept_right TEXT,
      used_concept_indices TEXT NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT NOT NULL,
      room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      score INT NOT NULL DEFAULT 0,
      team_index INT NOT NULL DEFAULT 0,
      is_connected BOOLEAN NOT NULL DEFAULT true,
      joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (id, room_id)
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_players_room_id ON players(room_id)
  `;

  console.log("Schema ready!");
}

setup().catch(console.error);
