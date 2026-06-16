import { NextResponse } from 'next/server';
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

async function initGame() {
  const existingState = await db.gameState.findFirst({
    include: { teams: true },
  });

  if (existingState && existingState.teams.length === 2) {
    return {
      gameState: {
        id: existingState.id,
        phase: existingState.phase,
        vulnerabilities: existingState.vulnerabilities,
      },
      teams: existingState.teams.map(serializeTeam),
    };
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

  await db.gameLog.create({
    data: {
      type: 'system',
      team: 'system',
      username: 'system',
      action: 'Game Initialized',
      detail: 'Cyber Arena game initialized with AL-SHLOOL vs BANI YASSEN',
      success: true,
    },
  });

  return {
    gameState: {
      id: gameState.id,
      phase: gameState.phase,
      vulnerabilities: gameState.vulnerabilities,
    },
    teams: gameState.teams.map(serializeTeam),
  };
}

export async function POST() {
  try {
    const result = await initGame();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error initializing game:', error);

    return NextResponse.json(
      { error: 'Failed to initialize game' },
      { status: 500 }
    );
  }
}
