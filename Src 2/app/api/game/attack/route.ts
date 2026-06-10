import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

import { db } from '@/lib/db';
import { logRoomEvent, normalizeRoomCode } from '@/lib/room-data';

function safeCompare(input: string, storedValue: string): boolean {
  const inputBuffer = Buffer.from(input);
  const storedBuffer = Buffer.from(storedValue);

  if (inputBuffer.length !== storedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(inputBuffer, storedBuffer);
}

async function ensureGameInit() {
  const existingState = await db.gameState.findFirst({
    include: { teams: true },
  });

  if (existingState && existingState.teams.length === 2) {
    return { gameState: existingState, teams: existingState.teams };
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

  return { gameState, teams: gameState.teams };
}

function getTeamKey(team: { name?: string; slot?: string }) {
  return team.slot || team.name || 'teamA';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { team, password, userEmail } = body;
    const roomCode = normalizeRoomCode(body.roomCode);

    if (!team || (team !== 'teamA' && team !== 'teamB')) {
      return NextResponse.json(
        { error: 'Invalid team. Must be teamA or teamB.' },
        { status: 400 },
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 },
      );
    }

    const submittedPassword = password.trim();

    if (!submittedPassword) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 },
      );
    }

    const room = roomCode
      ? await db.gameRoom.findUnique({
          where: { code: roomCode },
          include: { teams: true },
        })
      : null;

    if (roomCode && !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room && room.status !== 'playing') {
      return NextResponse.json(
        { error: `Game is ${room.status}. Actions are available only while playing.` },
        { status: 400 },
      );
    }

    const legacyState = room ? null : await ensureGameInit();
    const teams = room?.teams || legacyState?.teams || [];

    const attackingTeam = teams.find((item) => getTeamKey(item) === team);
    const enemyTeam = teams.find((item) => getTeamKey(item) !== team);

    if (!attackingTeam || !enemyTeam) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const username =
      typeof userEmail === 'string' && userEmail.trim()
        ? userEmail.trim().toLowerCase()
        : attackingTeam.displayName;

    const success = safeCompare(submittedPassword, enemyTeam.password);

    if (success) {
      if (room) {
        await db.roomTeam.update({
          where: { id: attackingTeam.id },
          data: { attackScore: { increment: 1 } },
        });
      } else {
        await db.team.update({
          where: { id: attackingTeam.id },
          data: { attackScore: { increment: 1 } },
        });
      }
    } else if (room) {
      await db.roomTeam.update({
        where: { id: enemyTeam.id },
        data: { defenseScore: { increment: 1 } },
      });
    } else {
      await db.team.update({
        where: { id: enemyTeam.id },
        data: { defenseScore: { increment: 1 } },
      });
    }

    const message = success
      ? `${attackingTeam.displayName} successfully breached ${enemyTeam.displayName}'s network!`
      : `Attack failed! ${enemyTeam.displayName}'s defense was strengthened.`;

    const updatedAttacker = room
      ? await db.roomTeam.findUnique({ where: { id: attackingTeam.id } })
      : await db.team.findUnique({ where: { id: attackingTeam.id } });

    const updatedEnemy = room
      ? await db.roomTeam.findUnique({ where: { id: enemyTeam.id } })
      : await db.team.findUnique({ where: { id: enemyTeam.id } });

    const logData = {
      type: 'attack',
      team: getTeamKey(attackingTeam),
      username,
      action: success ? 'Successful Attack' : 'Failed Attack',
      detail: success
        ? `${attackingTeam.displayName} successfully breached ${enemyTeam.displayName}'s network.`
        : `${attackingTeam.displayName} failed to breach ${enemyTeam.displayName}'s network.`,
      success,
      points: success ? 1 : 0,
    };

    if (room) {
      await logRoomEvent({ roomId: room.id, ...logData });
    } else {
      await db.gameLog.create({ data: logData });
    }

    return NextResponse.json({
      success,
      message,
      scores: {
        attacker: {
          team: getTeamKey(attackingTeam),
          displayName: attackingTeam.displayName,
          attackScore: updatedAttacker?.attackScore ?? 0,
          defenseScore: updatedAttacker?.defenseScore ?? 0,
        },
        enemy: {
          team: getTeamKey(enemyTeam),
          displayName: enemyTeam.displayName,
          attackScore: updatedEnemy?.attackScore ?? 0,
          defenseScore: updatedEnemy?.defenseScore ?? 0,
        },
      },
    });
  } catch (error) {
    console.error('Error processing attack:', error);

    return NextResponse.json(
      { error: 'Failed to process attack' },
      { status: 500 },
    );
  }
}
