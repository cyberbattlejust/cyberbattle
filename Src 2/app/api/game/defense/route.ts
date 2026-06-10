import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logRoomEvent, normalizeRoomCode } from '@/lib/room-data';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { team, newPassword } = body;
    const roomCode = normalizeRoomCode(body.roomCode);

    if (!team || (team !== 'teamA' && team !== 'teamB')) {
      return NextResponse.json(
        { error: 'Invalid team. Must be teamA or teamB.' },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json(
        { error: 'New password is required' },
        { status: 400 }
      );
    }

    const normalizedNewPassword = newPassword.trim();

    if (normalizedNewPassword.length < 4) {
      return NextResponse.json(
        { error: 'New password is required (minimum 4 characters)' },
        { status: 400 }
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

    const defendingTeam = teams.find((t) =>
      'slot' in t ? t.slot === team : t.name === team,
    );

    if (!defendingTeam) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    if (defendingTeam.password === normalizedNewPassword) {
      return NextResponse.json(
        { error: 'New password must be different from the current password' },
        { status: 400 }
      );
    }

    if (room) {
      await db.roomTeam.update({
        where: { id: defendingTeam.id },
        data: {
          password: normalizedNewPassword,
          defenseScore: { increment: 1 },
        },
      });

      await logRoomEvent({
        roomId: room.id,
        type: 'defense',
        team,
        username: defendingTeam.displayName,
        action: 'Password Changed',
        detail: `${defendingTeam.displayName} changed their network password.`,
        success: true,
        points: 1,
      });
    } else {
      await db.team.update({
        where: { id: defendingTeam.id },
        data: {
          password: normalizedNewPassword,
          defenseScore: { increment: 1 },
        },
      });

      await db.gameLog.create({
        data: {
          type: 'defense',
          team,
          username: defendingTeam.displayName,
          action: 'Password Changed',
          detail: `${defendingTeam.displayName} changed their network password.`,
          success: true,
          points: 1,
        },
      });
    }

    const allTeams = room
      ? await db.roomTeam.findMany({ where: { roomId: room.id } })
      : await db.team.findMany();

    return NextResponse.json({
      success: true,
      message: `🛡️ ${defendingTeam.displayName} updated their network password. Defense strengthened!`,
      newScores: {
        teamA: {
          name:
            allTeams.find((t) => ('slot' in t ? t.slot : t.name) === 'teamA')
              ?.displayName || 'AL-SHLOOL',
          attackScore:
            allTeams.find((t) => ('slot' in t ? t.slot : t.name) === 'teamA')
              ?.attackScore ?? 0,
          defenseScore:
            allTeams.find((t) => ('slot' in t ? t.slot : t.name) === 'teamA')
              ?.defenseScore ?? 0,
        },
        teamB: {
          name:
            allTeams.find((t) => ('slot' in t ? t.slot : t.name) === 'teamB')
              ?.displayName || 'BANI YASSEN',
          attackScore:
            allTeams.find((t) => ('slot' in t ? t.slot : t.name) === 'teamB')
              ?.attackScore ?? 0,
          defenseScore:
            allTeams.find((t) => ('slot' in t ? t.slot : t.name) === 'teamB')
              ?.defenseScore ?? 0,
        },
      },
    });
  } catch (error) {
    console.error('Error updating defense:', error);

    return NextResponse.json(
      { error: 'Failed to update defense' },
      { status: 500 }
    );
  }
}
