import { NextRequest, NextResponse } from "next/server";
import { getSql, getRoomWithPlayers } from "@/lib/db";
import { pusher, roomChannel, EVENTS } from "@/lib/pusher-server";
import { getRandomConcept, getRandomTargetAngle } from "@/lib/concepts";
import { calcScore } from "@/lib/store";

type Action =
  | { type: "start_game"; playerId: string; maxRounds?: number }
  | { type: "start_guessing"; playerId: string }
  | { type: "set_dial"; playerId: string; angle: number }
  | { type: "reveal_and_score"; playerId: string }
  | { type: "next_turn"; playerId: string }
  | { type: "reset_game"; playerId: string };

// POST /api/room/action — perform a game action
export async function POST(req: NextRequest) {
  try {
    const sql = getSql();
    const body = await req.json();
    const { roomId, action }: { roomId: string; action: Action } = body;

    if (!roomId || !action) {
      return NextResponse.json({ error: "roomId and action required" }, { status: 400 });
    }

    const room = await getRoomWithPlayers(roomId);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    switch (action.type) {
      case "start_game": {
        if (action.playerId !== room.hostPlayerId) {
          return NextResponse.json({ error: "Only the host can start the game" }, { status: 403 });
        }
        if (room.players.length < 2) {
          return NextResponse.json({ error: "Need at least 2 players to start" }, { status: 400 });
        }

        const usedSet = new Set(room.usedConceptIndices);
        const result = getRandomConcept(usedSet);
        if (!result) return NextResponse.json({ error: "No concepts left" }, { status: 500 });

        const newUsed = [...room.usedConceptIndices, result.index];
        const targetAngle = getRandomTargetAngle();

        await sql`
          UPDATE rooms SET
            phase = 'psychic',
            round = 1,
            current_team_index = 0,
            target_angle = ${targetAngle},
            dial_angle = 90,
            is_screen_open = true,
            last_score = 0,
            current_concept_left = ${result.pair.left},
            current_concept_right = ${result.pair.right},
            used_concept_indices = ${JSON.stringify(newUsed)},
            updated_at = now()
          WHERE id = ${roomId}
        `;

        await sql`UPDATE players SET score = 0 WHERE room_id = ${roomId}`;
        break;
      }

      case "start_guessing": {
        if (room.phase !== "psychic") {
          return NextResponse.json({ error: "Wrong phase" }, { status: 400 });
        }
        const activePlayer = room.players[room.currentTeamIndex];
        if (!activePlayer || action.playerId !== activePlayer.id) {
          return NextResponse.json({ error: "Only the active psychic can hide the target" }, { status: 403 });
        }

        await sql`
          UPDATE rooms SET phase = 'guessing', is_screen_open = false, updated_at = now()
          WHERE id = ${roomId}
        `;
        break;
      }

      case "set_dial": {
        if (room.phase !== "guessing") {
          return NextResponse.json({ error: "Wrong phase" }, { status: 400 });
        }
        const angle = Math.max(0, Math.min(180, action.angle));
        await sql`
          UPDATE rooms SET dial_angle = ${angle}, updated_at = now()
          WHERE id = ${roomId}
        `;
        await pusher.trigger(roomChannel(roomId), "dial-moved", { angle });
        return NextResponse.json({ ok: true });
      }

      case "reveal_and_score": {
        if (room.phase !== "guessing") {
          return NextResponse.json({ error: "Wrong phase" }, { status: 400 });
        }
        const score = calcScore(room.targetAngle, room.dialAngle);
        const activePlayer = room.players[room.currentTeamIndex];
        if (!activePlayer) return NextResponse.json({ error: "No active player" }, { status: 400 });

        await sql`
          UPDATE rooms SET
            phase = 'revealed',
            is_screen_open = true,
            last_score = ${score},
            updated_at = now()
          WHERE id = ${roomId}
        `;
        await sql`
          UPDATE players SET score = score + ${score}
          WHERE room_id = ${roomId} AND team_index = ${room.currentTeamIndex}
        `;
        break;
      }

      case "next_turn": {
        if (room.phase !== "revealed") {
          return NextResponse.json({ error: "Wrong phase" }, { status: 400 });
        }

        const nextTeamIndex = (room.currentTeamIndex + 1) % room.players.length;
        const nextRound = nextTeamIndex === 0 ? room.round + 1 : room.round;

        if (nextRound > room.maxRounds) {
          await sql`
            UPDATE rooms SET phase = 'game-over', updated_at = now() WHERE id = ${roomId}
          `;
          break;
        }

        const usedSet = new Set(room.usedConceptIndices);
        const result = getRandomConcept(usedSet);
        const newUsed = result
          ? [...room.usedConceptIndices, result.index]
          : room.usedConceptIndices;

        const targetAngle = getRandomTargetAngle();

        await sql`
          UPDATE rooms SET
            phase = 'psychic',
            current_team_index = ${nextTeamIndex},
            round = ${nextRound},
            target_angle = ${targetAngle},
            dial_angle = 90,
            is_screen_open = true,
            last_score = 0,
            current_concept_left = ${result?.pair.left ?? room.currentConceptLeft},
            current_concept_right = ${result?.pair.right ?? room.currentConceptRight},
            used_concept_indices = ${JSON.stringify(newUsed)},
            updated_at = now()
          WHERE id = ${roomId}
        `;
        break;
      }

      case "reset_game": {
        if (action.playerId !== room.hostPlayerId) {
          return NextResponse.json({ error: "Only the host can reset the game" }, { status: 403 });
        }

        await sql`
          UPDATE rooms SET
            phase = 'lobby',
            round = 1,
            current_team_index = 0,
            target_angle = 90,
            dial_angle = 90,
            is_screen_open = true,
            last_score = 0,
            current_concept_left = NULL,
            current_concept_right = NULL,
            used_concept_indices = '[]',
            updated_at = now()
          WHERE id = ${roomId}
        `;
        await sql`UPDATE players SET score = 0 WHERE room_id = ${roomId}`;
        break;
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const updatedRoom = await getRoomWithPlayers(roomId);
    await pusher.trigger(roomChannel(roomId), EVENTS.ROOM_UPDATED, { room: updatedRoom });

    return NextResponse.json({ room: updatedRoom });
  } catch (err) {
    console.error("POST /api/room/action error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
