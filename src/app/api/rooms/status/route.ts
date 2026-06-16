import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { normalizeRoomCode } from '@/lib/room-data';

function serializeTeam(team: {
  slot: string;
  displayName: string;
  ssid: string;
  configured: boolean;
  configuredBy: string;
  leaderUsername: string;
  attackScore: number;
  defenseScore: number;
}) {
  return {
    name: team.slot,
    displayName: team.displayName,
    network: {
      ssid: team.ssid,
      password: '********',
      passwordProtected: true,
    },
    configured: team.configured,
    configuredBy: team.configuredBy,
    leaderUsername: team.leaderUsername,
    score: {
      attack: team.attackScore,
      defense: team.defenseScore,
      total: team.attackScore + team.defenseScore,
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomCode = normalizeRoomCode(searchParams.get('roomCode'));

    if (!roomCode) {
      return NextResponse.json(
        { error: 'Room code is required.' },
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

    const teamA = room.teams.find((team) => team.slot === 'teamA');
    const teamB = room.teams.find((team) => team.slot === 'teamB');

    return NextResponse.json({
      success: true,
      room: {
        code: room.code,
        name: room.name,
        status: room.status,
        winScore: room.winScore,
        maxPlayersPerTeam: room.maxPlayersPerTeam,
        supervisorEmail: room.supervisorEmail,
      },
      teamA: teamA ? serializeTeam(teamA) : null,
      teamB: teamB ? serializeTeam(teamB) : null,
    });
  } catch (error) {
    console.error('Error fetching room status:', error);

    return NextResponse.json(
      { error: 'Failed to fetch room status.' },
      { status: 500 },
    );
  }
}
