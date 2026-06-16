import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

type TeamData = {
  id: string;
  name: string;
  ssid: string;
  displayName: string;
  attackScore: number;
  defenseScore: number;
  gameStateId: string;
};

function serializeTeam(team: TeamData) {
  return {
    id: team.id,
    name: team.name,
    ssid: team.ssid,
    displayName: team.displayName,
    attackScore: team.attackScore,
    defenseScore: team.defenseScore,
    totalScore: team.attackScore + team.defenseScore,
    gameStateId: team.gameStateId,
    passwordProtected: true,
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
    await db.team.deleteMany({
      where: { gameStateId: existingState.id },
    });

    await db.gameState.delete({
      where: { id: existingState.id },
    });
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
    const teamName = searchParams.get('team');

    if (teamName && teamName !== 'teamA' && teamName !== 'teamB') {
      return NextResponse.json(
        { error: 'Invalid team. Must be teamA or teamB.' },
        { status: 400 }
      );
    }

    const gameState = await ensureGameInit();

    const teams = gameState.teams
      .filter((team) => !teamName || team.name === teamName)
      .map(serializeTeam);

    return NextResponse.json({
      success: true,
      gameState: {
        id: gameState.id,
        phase: gameState.phase,
        vulnerabilities: gameState.vulnerabilities,
      },
      teams,
    });
  } catch (error) {
    console.error('Error fetching teams:', error);

    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    {
      error:
        'Dynamic team creation is no longer supported. Cyber Arena uses the fixed teams teamA and teamB.',
    },
    { status: 405 }
  );
}