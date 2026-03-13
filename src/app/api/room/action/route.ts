import { NextRequest, NextResponse } from "next/server";
import { getSql, getRoomWithPlayers } from "@/lib/db";
import { pusher, roomChannel, EVENTS } from "@/lib/pusher-server";
import { getRandomConcept, getRandomTargetAngle } from "@/lib/concepts";
import { calcScore } from "@/lib/store";

// Team colors for auto-assignment when host creates teams
const TEAM_COLOR_PALETTE = [
  "#E63946", "#2EC4B6", "#FF9F1C", "#9B5DE5",
  "#06D6A0", "#F72585", "#4361EE", "#F4A261",
];

type Action =
  | { type: "create_team"; playerId: string; name: string }
  | { type: "delete_team"; playerId: string; teamId: string }
  | { type: "rename_team"; playerId: string; teamId: string; name: string }
  | { type: "assign_player"; playerId: string; targetPlayerId: string; teamId: string | null }
  | { type: "start_game"; playerId: string }
  | { type: "start_guessing"; playerId: string }
  | { type: "set_dial"; playerId: string; angle: number }
  | { type: "reveal_and_score"; playerId: string }
  | { type: "next_turn"; playerId: string }
  | { type: "skip_turn"; playerId: string }
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

      // ─── Lobby: team management ──────────────────────────────────────────────

      case "create_team": {
        if (action.playerId !== room.hostPlayerId) {
          return NextResponse.json({ error: "Only the host can manage teams" }, { status: 403 });
        }
        if (room.phase !== "lobby") {
          return NextResponse.json({ error: "Can only manage teams in the lobby" }, { status: 400 });
        }
        const teamId = crypto.randomUUID();
        const teamOrder = room.teams.length;
        const color = TEAM_COLOR_PALETTE[teamOrder % TEAM_COLOR_PALETTE.length];
        const teamName = action.name?.trim() || `Team ${teamOrder + 1}`;
        await sql`
          INSERT INTO teams (id, room_id, name, color, score, team_order)
          VALUES (${teamId}, ${roomId}, ${teamName}, ${color}, 0, ${teamOrder})
        `;
        break;
      }

      case "delete_team": {
        if (action.playerId !== room.hostPlayerId) {
          return NextResponse.json({ error: "Only the host can manage teams" }, { status: 403 });
        }
        if (room.phase !== "lobby") {
          return NextResponse.json({ error: "Can only manage teams in the lobby" }, { status: 400 });
        }
        // Unassign all players from this team before deleting
        await sql`UPDATE players SET team_id = NULL WHERE room_id = ${roomId} AND team_id = ${action.teamId}`;
        await sql`DELETE FROM teams WHERE id = ${action.teamId} AND room_id = ${roomId}`;
        // Reorder remaining teams
        const remainingTeams = room.teams.filter((t) => t.id !== action.teamId);
        for (let i = 0; i < remainingTeams.length; i++) {
          await sql`UPDATE teams SET team_order = ${i} WHERE id = ${remainingTeams[i].id}`;
        }
        break;
      }

      case "rename_team": {
        if (action.playerId !== room.hostPlayerId) {
          return NextResponse.json({ error: "Only the host can manage teams" }, { status: 403 });
        }
        if (room.phase !== "lobby") {
          return NextResponse.json({ error: "Can only manage teams in the lobby" }, { status: 400 });
        }
        const newName = action.name?.trim();
        if (!newName) return NextResponse.json({ error: "Team name required" }, { status: 400 });
        await sql`UPDATE teams SET name = ${newName} WHERE id = ${action.teamId} AND room_id = ${roomId}`;
        break;
      }

      case "assign_player": {
        if (action.playerId !== room.hostPlayerId) {
          return NextResponse.json({ error: "Only the host can assign players" }, { status: 403 });
        }
        if (room.phase !== "lobby") {
          return NextResponse.json({ error: "Can only assign players in the lobby" }, { status: 400 });
        }
        // teamId null = unassign
        if (action.teamId === null) {
          await sql`UPDATE players SET team_id = NULL WHERE id = ${action.targetPlayerId} AND room_id = ${roomId}`;
        } else {
          // Verify team exists in this room
          const [team] = await sql`SELECT id FROM teams WHERE id = ${action.teamId} AND room_id = ${roomId}`;
          if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
          await sql`UPDATE players SET team_id = ${action.teamId} WHERE id = ${action.targetPlayerId} AND room_id = ${roomId}`;
        }
        break;
      }

      // ─── Start Game ──────────────────────────────────────────────────────────

      case "start_game": {
        if (action.playerId !== room.hostPlayerId) {
          return NextResponse.json({ error: "Only the host can start the game" }, { status: 403 });
        }

        // Validate: at least 2 teams, each with at least 1 player
        if (room.teams.length < 2) {
          return NextResponse.json({ error: "Need at least 2 teams to start" }, { status: 400 });
        }
        for (const team of room.teams) {
          if (team.players.length === 0) {
            return NextResponse.json({ error: `Team "${team.name}" has no players` }, { status: 400 });
          }
        }
        const unassigned = room.players.filter((p) => !p.teamId);
        if (unassigned.length > 0) {
          return NextResponse.json({ error: `${unassigned.length} player(s) are not assigned to a team` }, { status: 400 });
        }

        // Set psychic_order within each team (by join order)
        for (const team of room.teams) {
          for (let i = 0; i < team.players.length; i++) {
            await sql`
              UPDATE players SET psychic_order = ${i}
              WHERE id = ${team.players[i].id} AND room_id = ${roomId}
            `;
          }
        }

        // Pick concept and target angle
        const usedSet = new Set(room.usedConceptIndices);
        const result = getRandomConcept(usedSet);
        if (!result) return NextResponse.json({ error: "No concepts left" }, { status: 500 });

        const newUsed = [...room.usedConceptIndices, result.index];
        const targetAngle = getRandomTargetAngle();

        // First team = team with team_order = 0; first psychic = player with psychic_order = 0
        const firstTeam = room.teams[0];
        const firstPsychic = firstTeam.players[0];

        await sql`
          UPDATE rooms SET
            phase = 'psychic',
            round = 1,
            current_team_id = ${firstTeam.id},
            current_psychic_id = ${firstPsychic.id},
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

        // Reset all team scores
        await sql`UPDATE teams SET score = 0, psychic_rotation_index = 0 WHERE room_id = ${roomId}`;
        break;
      }

      // ─── Start Guessing (psychic hides target) ───────────────────────────────

      case "start_guessing": {
        if (room.phase !== "psychic") {
          return NextResponse.json({ error: "Wrong phase" }, { status: 400 });
        }
        if (action.playerId !== room.currentPsychicId) {
          return NextResponse.json({ error: "Only the current psychic can hide the target" }, { status: 403 });
        }
        await sql`
          UPDATE rooms SET phase = 'guessing', is_screen_open = false, updated_at = now()
          WHERE id = ${roomId}
        `;
        break;
      }

      // ─── Dial movement ───────────────────────────────────────────────────────

      case "set_dial": {
        if (room.phase !== "guessing") {
          return NextResponse.json({ error: "Wrong phase" }, { status: 400 });
        }

        // Only active team non-psychic members can move the dial
        const currentTeam = room.teams.find((t) => t.id === room.currentTeamId);
        const isOnActiveTeam = currentTeam?.players.some((p) => p.id === action.playerId);
        const isPsychic = action.playerId === room.currentPsychicId;

        if (!isOnActiveTeam || isPsychic) {
          return NextResponse.json({ error: "You cannot move the dial right now" }, { status: 403 });
        }

        const angle = Math.max(0, Math.min(180, action.angle));
        await sql`
          UPDATE rooms SET dial_angle = ${angle}, updated_at = now()
          WHERE id = ${roomId}
        `;
        await pusher.trigger(roomChannel(roomId), "dial-moved", { angle });
        return NextResponse.json({ ok: true });
      }

      // ─── Reveal & Score ──────────────────────────────────────────────────────

      case "reveal_and_score": {
        if (room.phase !== "guessing") {
          return NextResponse.json({ error: "Wrong phase" }, { status: 400 });
        }

        // Only active team non-psychic members can lock the guess
        const currentTeam = room.teams.find((t) => t.id === room.currentTeamId);
        const isOnActiveTeam = currentTeam?.players.some((p) => p.id === action.playerId);
        const isPsychic = action.playerId === room.currentPsychicId;

        if (!isOnActiveTeam || isPsychic) {
          return NextResponse.json({ error: "Only active team members can lock the guess" }, { status: 403 });
        }

        const score = calcScore(room.targetAngle, room.dialAngle);

        await sql`
          UPDATE rooms SET
            phase = 'revealed',
            is_screen_open = true,
            last_score = ${score},
            updated_at = now()
          WHERE id = ${roomId}
        `;

        // Award score to the team (not individual player)
        if (currentTeam) {
          await sql`
            UPDATE teams SET score = score + ${score}
            WHERE id = ${currentTeam.id}
          `;
        }
        break;
      }

      // ─── Next Turn ───────────────────────────────────────────────────────────

      case "next_turn": {
        if (room.phase !== "revealed") {
          return NextResponse.json({ error: "Wrong phase" }, { status: 400 });
        }

        // Advance to next team (wrap around), advance round when we complete a full cycle
        const currentTeamIdx = room.teams.findIndex((t) => t.id === room.currentTeamId);
        const nextTeamIdx = (currentTeamIdx + 1) % room.teams.length;
        const nextTeam = room.teams[nextTeamIdx];
        const nextRound = nextTeamIdx === 0 ? room.round + 1 : room.round;

        if (nextRound > room.maxRounds) {
          await sql`
            UPDATE rooms SET phase = 'game-over', updated_at = now() WHERE id = ${roomId}
          `;
          break;
        }

        // Advance psychic rotation within the next team
        const nextTeamDb = await sql`SELECT * FROM teams WHERE id = ${nextTeam.id}`;
        const currentRotation = nextTeamDb[0]?.psychic_rotation_index ?? 0;
        const nextPsychicOrder = (currentRotation + 1) % nextTeam.players.length;
        // Find the player in that team with this psychic_order
        const nextPsychicResult = await sql`
          SELECT id FROM players
          WHERE room_id = ${roomId} AND team_id = ${nextTeam.id} AND psychic_order = ${nextPsychicOrder}
          LIMIT 1
        `;
        // Fallback to first player in team if not found
        const nextPsychicId = nextPsychicResult[0]?.id ?? nextTeam.players[0].id;

        await sql`
          UPDATE teams SET psychic_rotation_index = ${nextPsychicOrder} WHERE id = ${nextTeam.id}
        `;

        const usedSet = new Set(room.usedConceptIndices);
        const result = getRandomConcept(usedSet);
        const newUsed = result
          ? [...room.usedConceptIndices, result.index]
          : room.usedConceptIndices;
        const targetAngle = getRandomTargetAngle();

        await sql`
          UPDATE rooms SET
            phase = 'psychic',
            current_team_id = ${nextTeam.id},
            current_psychic_id = ${nextPsychicId},
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

      // ─── Skip Turn (psychic skips, no score) ─────────────────────────────────

      case "skip_turn": {
        if (room.phase !== "psychic" && room.phase !== "guessing") {
          return NextResponse.json({ error: "Wrong phase" }, { status: 400 });
        }
        if (action.playerId !== room.currentPsychicId && action.playerId !== room.hostPlayerId) {
          return NextResponse.json({ error: "Only the current psychic or host can skip" }, { status: 403 });
        }

        const currentTeamIdx = room.teams.findIndex((t) => t.id === room.currentTeamId);
        const nextTeamIdx = (currentTeamIdx + 1) % room.teams.length;
        const nextTeam = room.teams[nextTeamIdx];
        const nextRound = nextTeamIdx === 0 ? room.round + 1 : room.round;

        if (nextRound > room.maxRounds) {
          await sql`UPDATE rooms SET phase = 'game-over', updated_at = now() WHERE id = ${roomId}`;
          break;
        }

        const nextTeamDb = await sql`SELECT * FROM teams WHERE id = ${nextTeam.id}`;
        const currentRotation = nextTeamDb[0]?.psychic_rotation_index ?? 0;
        const nextPsychicOrder = (currentRotation + 1) % nextTeam.players.length;
        const nextPsychicResult = await sql`
          SELECT id FROM players
          WHERE room_id = ${roomId} AND team_id = ${nextTeam.id} AND psychic_order = ${nextPsychicOrder}
          LIMIT 1
        `;
        const nextPsychicId = nextPsychicResult[0]?.id ?? nextTeam.players[0].id;

        await sql`
          UPDATE teams SET psychic_rotation_index = ${nextPsychicOrder} WHERE id = ${nextTeam.id}
        `;

        const usedSet = new Set(room.usedConceptIndices);
        const result = getRandomConcept(usedSet);
        const newUsed = result
          ? [...room.usedConceptIndices, result.index]
          : room.usedConceptIndices;
        const targetAngle = getRandomTargetAngle();

        await sql`
          UPDATE rooms SET
            phase = 'psychic',
            current_team_id = ${nextTeam.id},
            current_psychic_id = ${nextPsychicId},
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

      // ─── Reset Game ──────────────────────────────────────────────────────────

      case "reset_game": {
        if (action.playerId !== room.hostPlayerId) {
          return NextResponse.json({ error: "Only the host can reset the game" }, { status: 403 });
        }

        await sql`
          UPDATE rooms SET
            phase = 'lobby',
            round = 1,
            current_team_id = NULL,
            current_psychic_id = NULL,
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
        // Reset team scores and psychic rotation
        await sql`UPDATE teams SET score = 0, psychic_rotation_index = 0 WHERE room_id = ${roomId}`;
        // Unassign all players from teams (go back to lobby assignment stage)
        await sql`UPDATE players SET team_id = NULL WHERE room_id = ${roomId}`;
        // Delete all teams so host can reconfigure
        await sql`DELETE FROM teams WHERE room_id = ${roomId}`;
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
