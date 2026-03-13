import { NextRequest, NextResponse } from "next/server";
import { getSql, getRoomWithPlayers } from "@/lib/db";
import { pusher, roomChannel, EVENTS } from "@/lib/pusher-server";

// Assign a unique color to a new player from a fixed palette, avoiding duplicates
const PLAYER_COLORS = [
  "#E63946", "#2EC4B6", "#FF9F1C", "#9B5DE5",
  "#06D6A0", "#F72585", "#4361EE", "#F4A261",
  "#E76F51", "#2A9D8F",
];

// POST /api/room/join — join an existing room
export async function POST(req: NextRequest) {
  try {
    const sql = getSql();
    const { roomId, playerName } = await req.json();

    if (!roomId?.trim() || !playerName?.trim()) {
      return NextResponse.json({ error: "roomId and playerName required" }, { status: 400 });
    }

    const upperRoomId = (roomId as string).toUpperCase().trim();

    const [roomRow] = await sql`SELECT * FROM rooms WHERE id = ${upperRoomId}`;
    if (!roomRow) {
      return NextResponse.json({ error: "Room not found. Check the code and try again." }, { status: 404 });
    }
    if (roomRow.phase !== "lobby") {
      return NextResponse.json({ error: "Game already in progress." }, { status: 409 });
    }

    const existingPlayers = await sql`
      SELECT * FROM players WHERE room_id = ${upperRoomId}
    `;

    const playerId = crypto.randomUUID();
    const color = PLAYER_COLORS[existingPlayers.length % PLAYER_COLORS.length];

    await sql`
      INSERT INTO players (id, room_id, name, color, team_id, psychic_order)
      VALUES (${playerId}, ${upperRoomId}, ${playerName.trim()}, ${color}, NULL, 0)
    `;

    const room = await getRoomWithPlayers(upperRoomId);

    await pusher.trigger(roomChannel(upperRoomId), EVENTS.ROOM_UPDATED, { room });

    return NextResponse.json({ room, playerId });
  } catch (err) {
    console.error("POST /api/room/join error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
