import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logRoomEvent, normalizeRoomCode } from '@/lib/room-data';

function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().slice(0, maxLength);
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

  return db.gameState.create({
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
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { team, displayName, ssid, password, username } = body;
    const roomCode = normalizeRoomCode(body.roomCode);

    if (!team || (team !== 'teamA' && team !== 'teamB')) {
      return NextResponse.json(
        { error: 'Invalid team. Must be teamA or teamB.' },
        { status: 400 },
      );
    }

    const normalizedDisplayName = normalizeText(displayName, 32);
    const normalizedSsid = normalizeText(ssid, 32);
    const normalizedPassword = normalizeText(password, 64);
    const normalizedUsername =
      normalizeText(username, 80) || `${team} player`;

    if (normalizedDisplayName.length < 2) {
      return NextResponse.json(
        { error: 'Team name must be at least 2 characters.' },
        { status: 400 },
      );
    }

    if (normalizedSsid.length < 3) {
      return NextResponse.json(
        { error: 'Network name must be at least 3 characters.' },
        { status: 400 },
      );
    }

    if (normalizedPassword.length < 4) {
      return NextResponse.json(
        { error: 'Network password must be at least 4 characters.' },
        { status: 400 },
      );
    }

    if (roomCode) {
      const room = await db.gameRoom.findUnique({
        where: { code: roomCode },
        include: { teams: true },
      });

      if (!room) {
        return NextResponse.json({ error: 'Room not found.' }, { status: 404 });
      }

      if (room.status !== 'waiting' && room.status !== 'setup') {
        return NextResponse.json(
          { error: 'Team setup is locked after the game starts.' },
          { status: 400 },
        );
      }

      const teamRecord = room.teams.find((item) => item.slot === team);

      if (!teamRecord) {
        return NextResponse.json(
          { error: 'Team not found.' },
          { status: 404 },
        );
      }

      const leaderUsername = teamRecord.leaderUsername || normalizedUsername;

      if (
        teamRecord.leaderUsername &&
        teamRecord.leaderUsername.toLowerCase() !==
          normalizedUsername.toLowerCase()
      ) {
        return NextResponse.json(
          {
            error: `Only the team leader (${teamRecord.leaderUsername}) can edit team setup.`,
          },
          { status: 403 },
        );
      }

      const updatedTeam = await db.roomTeam.update({
        where: { id: teamRecord.id },
        data: {
          displayName: normalizedDisplayName,
          ssid: normalizedSsid,
          password: normalizedPassword,
          configured: true,
          configuredBy: normalizedUsername,
          leaderUsername,
        },
        select: {
          slot: true,
          displayName: true,
          ssid: true,
          attackScore: true,
          defenseScore: true,
          configured: true,
        },
      });

      if (room.status === 'waiting') {
        await db.gameRoom.update({
          where: { id: room.id },
          data: { status: 'setup' },
        });

        await db.gameSession.updateMany({
          where: { id: roomCode },
          data: { status: 'setup' },
        });
      }

      await logRoomEvent({
        roomId: room.id,
        type: 'system',
        team,
        username: normalizedUsername,
        action: 'Team Configured',
        detail: `${normalizedUsername} configured ${normalizedDisplayName} network settings.`,
        success: true,
      });

      return NextResponse.json({
        success: true,
        team: {
          name: updatedTeam.slot,
          displayName: updatedTeam.displayName,
          ssid: updatedTeam.ssid,
          attackScore: updatedTeam.attackScore,
          defenseScore: updatedTeam.defenseScore,
          configured: updatedTeam.configured,
          passwordProtected: true,
        },
        message: 'Team setup saved.',
      });
    }

    await ensureGameInit();

    const teamRecord = await db.team.findFirst({
      where: { name: team },
    });

    if (!teamRecord) {
      return NextResponse.json(
        { error: 'Team not found.' },
        { status: 404 },
      );
    }

    const updatedTeam = await db.team.update({
      where: { id: teamRecord.id },
      data: {
        displayName: normalizedDisplayName,
        ssid: normalizedSsid,
        password: normalizedPassword,
      },
      select: {
        name: true,
        displayName: true,
        ssid: true,
        attackScore: true,
        defenseScore: true,
      },
    });

    await db.gameLog.create({
      data: {
        type: 'system',
        team,
        username: normalizedUsername,
        action: 'Team Configured',
        detail: `${normalizedUsername} configured ${normalizedDisplayName} network settings.`,
        success: true,
      },
    });

    return NextResponse.json({
      success: true,
      team: {
        ...updatedTeam,
        passwordProtected: true,
      },
      message: 'Team setup saved.',
    });
  } catch (error) {
    console.error('Error updating team configuration:', error);

    return NextResponse.json(
      { error: 'Failed to update team configuration.' },
      { status: 500 },
    );
  }
}
