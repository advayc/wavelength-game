import { NextRequest, NextResponse } from "next/server";
import { getSql, getRoomWithPlayers } from "@/lib/db";
import { pusher, roomChannel, EVENTS } from "@/lib/pusher-server";
import { TEAM_COLORS } from "@/lib/store";

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
    if (existingPlayers.length >= 6) {
      return NextResponse.json({ error: "Room is full (max 6 players)." }, { status: 409 });
    }

    const playerId = crypto.randomUUID();
    const teamIndex = existingPlayers.length;
    const color = TEAM_COLORS[teamIndex % TEAM_COLORS.length];

    await sql`
      INSERT INTO players (id, room_id, name, color, team_index)
      VALUES (${playerId}, ${upperRoomId}, ${playerName.trim()}, ${color}, ${teamIndex})
    `;

    const room = await getRoomWithPlayers(upperRoomId);

    await pusher.trigger(roomChannel(upperRoomId), EVENTS.ROOM_UPDATED, { room });

    return NextResponse.json({ room, playerId });
  } catch (err) {
    console.error("POST /api/room/join error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
