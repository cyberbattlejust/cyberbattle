import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { logRoomEvent, normalizeRoomCode, normalizeTeamSlot } from '@/lib/room-data';

function normalizeText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const roomCode = normalizeRoomCode(body.roomCode);
    const team = normalizeTeamSlot(body.team);
    const username = normalizeText(body.username, 80);

    if (!roomCode || !team || !username) {
      return NextResponse.json(
        { error: 'Room, team, and username are required.' },
        { status: 400 },
      );
    }

    const room = await db.gameRoom.findUnique({
      where: { code: roomCode },
      include: { teams: true },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found.' }, { status: 404 });
    }

    const teamRecord = room.teams.find((item) => item.slot === team);

    if (!teamRecord) {
      return NextResponse.json({ error: 'Team not found.' }, { status: 404 });
    }

    let leaderUsername = teamRecord.leaderUsername;

    if (!leaderUsername) {
      const updatedTeam = await db.roomTeam.update({
        where: { id: teamRecord.id },
        data: { leaderUsername: username },
      });
      leaderUsername = updatedTeam.leaderUsername;

      await logRoomEvent({
        roomId: room.id,
        type: 'system',
        team,
        username,
        action: 'Team Leader Assigned',
        detail: `${username} became ${team} leader.`,
        success: true,
      });
    }

    return NextResponse.json({
      success: true,
      team,
      leaderUsername,
      isLeader: leaderUsername.toLowerCase() === username.toLowerCase(),
    });
  } catch (error) {
    console.error('Error assigning team leader:', error);

    return NextResponse.json(
      { error: 'Failed to assign team leader.' },
      { status: 500 },
    );
  }
}
