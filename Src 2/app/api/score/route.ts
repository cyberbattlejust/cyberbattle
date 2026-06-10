import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { normalizeRoomCode } from '@/lib/room-data';

type TeamScoreData = {
  name: string;
  displayName: string;
  ssid: string;
  attackScore: number;
  defenseScore: number;
};

type RoomTeamScoreData = {
  slot: string;
  displayName: string;
  ssid: string;
  attackScore: number;
  defenseScore: number;
  configured: boolean;
  configuredBy: string;
  leaderUsername: string;
};

function serializeTeam(team: TeamScoreData | undefined) {
  if (!team) {
    return null;
  }

  return {
    name: team.name,
    displayName: team.displayName,
    network: {
      ssid: team.ssid,
      password: '********',
      passwordProtected: true,
    },
    score: {
      attack: team.attackScore,
      defense: team.defenseScore,
      total: team.attackScore + team.defenseScore,
    },
  };
}

function serializeRoomTeam(team: RoomTeamScoreData | undefined) {
  if (!team) {
    return null;
  }

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

async function ensureGameInit() {
  const existingState = await db.gameState.findFirst({
    include: { teams: true },
  });

  if (existingState && existingState.teams.length === 2) {
    return existingState;
  }

  if (existingState) {
    await db.team.deleteMany({ where: { gameStateId: existingState.id } });
    await db.gameState.delete({ where: { id: existingState.id } });
  }

  const gameState = await db.gameState.create({
    data: {
      phase: 'DEFENSE',
      vulnerabilities: 3,
      teams: {
        create: [
          {
            name: 'teamA',
            ssid: 'Shlool_WiFi',
            displayName: 'AL-SHLOOL',
            password: 'S1234',
            attackScore: 0,
            defenseScore: 0,
          },
          {
            name: 'teamB',
            ssid: 'Yassen_WiFi',
            displayName: 'BANI YASSEN',
            password: 'Y1234',
            attackScore: 0,
            defenseScore: 0,
          },
        ],
      },
    },
    include: { teams: true },
  });

  return gameState;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomCode = normalizeRoomCode(searchParams.get('roomCode'));

    if (roomCode) {
      const room = await db.gameRoom.findUnique({
        where: { code: roomCode },
        include: { teams: true },
      });

      if (!room) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }

      const teamA = room.teams.find((team) => team.slot === 'teamA');
      const teamB = room.teams.find((team) => team.slot === 'teamB');

      return NextResponse.json({
        success: true,
        phase: room.status === 'playing' ? 'BATTLE' : 'LOBBY',
        status: room.status,
        vulnerabilities: 3,
        winScore: room.winScore,
        maxPlayersPerTeam: room.maxPlayersPerTeam,
        teamA: serializeRoomTeam(teamA),
        teamB: serializeRoomTeam(teamB),
      });
    }

    const gameState = await ensureGameInit();

    const teamA = gameState.teams.find((team) => team.name === 'teamA');
    const teamB = gameState.teams.find((team) => team.name === 'teamB');

    return NextResponse.json({
      success: true,
      phase: gameState.phase,
      vulnerabilities: gameState.vulnerabilities,
      teamA: serializeTeam(teamA),
      teamB: serializeTeam(teamB),
    });
  } catch (error) {
    console.error('Error fetching scores:', error);

    return NextResponse.json(
      { error: 'Failed to fetch scores' },
      { status: 500 }
    );
  }
}
