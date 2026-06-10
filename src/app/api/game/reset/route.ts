import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logRoomEvent, normalizeRoomCode } from '@/lib/room-data';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { adminEmail } = body;
    const roomCode = normalizeRoomCode(body.roomCode);

    if (!adminEmail || typeof adminEmail !== 'string' || !adminEmail.trim()) {
      return NextResponse.json(
        { error: 'Admin email is required.' },
        { status: 400 }
      );
    }

    const normalizedAdminEmail = adminEmail.trim().toLowerCase();

    const adminUser = await db.user.findUnique({
      where: { email: normalizedAdminEmail },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!adminUser) {
      return NextResponse.json(
        { error: 'Admin user not found.' },
        { status: 404 }
      );
    }

    if (adminUser.role !== 'admin' && adminUser.role !== 'supervisor') {
      return NextResponse.json(
        { error: 'Unauthorized. Supervisor access required.' },
        { status: 403 }
      );
    }

    if (roomCode) {
      const room = await db.gameRoom.findUnique({
        where: { code: roomCode },
        include: { teams: true, missions: true },
      });

      if (!room) {
        return NextResponse.json({ error: 'Room not found.' }, { status: 404 });
      }

      for (const team of room.teams) {
        await db.roomTeam.update({
          where: { id: team.id },
          data: {
            attackScore: 0,
            defenseScore: 0,
            configured: false,
            configuredBy: '',
            displayName: team.slot === 'teamA' ? 'AL-SHLOOL' : 'BANI YASSEN',
            ssid: team.slot === 'teamA' ? 'Shlool_WiFi' : 'Yassen_WiFi',
            password: team.slot === 'teamA' ? 'S1234' : 'Y1234',
          },
        });
      }

      await db.roomMission.updateMany({
        where: { roomId: room.id },
        data: {
          active: false,
          completedBy: 'none',
          activatedBy: '',
        },
      });

      await db.gameRoom.update({
        where: { id: room.id },
        data: { status: 'waiting' },
      });

      await db.roomLog.deleteMany({ where: { roomId: room.id } });

      await logRoomEvent({
        roomId: room.id,
        type: 'system',
        team: 'system',
        username: normalizedAdminEmail,
        action: 'Game Reset',
        detail: `Room "${room.name}" has been reset.`,
        success: true,
      });

      return NextResponse.json({
        success: true,
        message: 'Room reset successfully.',
      });
    }

    await db.gameLog.deleteMany();
    await db.team.deleteMany();
    await db.gameState.deleteMany();

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
        username: normalizedAdminEmail,
        action: 'Game Reset',
        detail:
          'Cyber Arena has been reset. AL-SHLOOL vs BANI YASSEN - New battle begins!',
        success: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Game reset successfully.',
      gameState: {
        id: gameState.id,
        phase: gameState.phase,
        vulnerabilities: gameState.vulnerabilities,
      },
      teams: gameState.teams.map(serializeTeam),
    });
  } catch (error) {
    console.error('Error resetting game:', error);

    return NextResponse.json(
      { error: 'Failed to reset game' },
      { status: 500 }
    );
  }
}
