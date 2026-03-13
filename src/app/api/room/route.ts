import { NextRequest, NextResponse } from "next/server";
import { getSql, getRoomWithPlayers } from "@/lib/db";
import { pusher, roomChannel, EVENTS } from "@/lib/pusher-server";
import { getRandomConcept, getRandomTargetAngle } from "@/lib/concepts";
import { TEAM_COLORS } from "@/lib/store";

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// POST /api/room — create a new room
export async function POST(req: NextRequest) {
  try {
    const sql = getSql();
    const { hostName, maxRounds = 8 } = await req.json();
    if (!hostName?.trim()) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }

    const roomId = generateRoomCode();
    const hostPlayerId = crypto.randomUUID();
    const hostColor = TEAM_COLORS[0];

    await sql`
      INSERT INTO rooms (id, host_player_id, max_rounds, used_concept_indices)
      VALUES (${roomId}, ${hostPlayerId}, ${maxRounds}, '[]')
    `;

    await sql`
      INSERT INTO players (id, room_id, name, color, team_index)
      VALUES (${hostPlayerId}, ${roomId}, ${hostName.trim()}, ${hostColor}, 0)
    `;

    const room = await getRoomWithPlayers(roomId);
    return NextResponse.json({ room, playerId: hostPlayerId });
  } catch (err) {
    console.error("POST /api/room error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/room?roomId=XXXX — fetch room state
export async function GET(req: NextRequest) {
  try {
    const roomId = req.nextUrl.searchParams.get("roomId");
    if (!roomId) return NextResponse.json({ error: "roomId required" }, { status: 400 });

    const room = await getRoomWithPlayers(roomId);
    if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

    return NextResponse.json({ room });
  } catch (err) {
    console.error("GET /api/room error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
