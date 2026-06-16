import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logRoomEvent, normalizeRoomCode } from '@/lib/room-data';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { missionId, adminEmail } = body;
    const roomCode = normalizeRoomCode(body.roomCode);

    if (!missionId || typeof missionId !== 'string' || !missionId.trim()) {
      return NextResponse.json(
        { error: 'Mission ID is required' },
        { status: 400 }
      );
    }

    if (!adminEmail || typeof adminEmail !== 'string' || !adminEmail.trim()) {
      return NextResponse.json(
        { error: 'Admin email is required' },
        { status: 400 }
      );
    }

    const normalizedMissionId = missionId.trim();
    const normalizedAdminEmail = adminEmail.trim().toLowerCase();

    const user = await db.user.findUnique({
      where: { email: normalizedAdminEmail },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.role !== 'admin' && user.role !== 'supervisor') {
      return NextResponse.json(
        { error: 'Unauthorized. Supervisor access required.' },
        { status: 403 }
      );
    }

    const room = roomCode
      ? await db.gameRoom.findUnique({
          where: { code: roomCode },
          select: { id: true, name: true, status: true },
        })
      : null;

    if (roomCode && !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room && room.status !== 'playing') {
      return NextResponse.json(
        { error: 'Start or resume the game before activating missions.' },
        { status: 400 },
      );
    }

    const mission = room
      ? await db.roomMission.findFirst({
          where: { id: normalizedMissionId, roomId: room.id },
          select: {
            id: true,
            title: true,
            active: true,
          },
        })
      : await db.mission.findUnique({
          where: { id: normalizedMissionId },
          select: {
            id: true,
            title: true,
            active: true,
          },
        });

    if (!mission) {
      return NextResponse.json(
        { error: 'Mission not found' },
        { status: 404 }
      );
    }

    if (mission.active) {
      return NextResponse.json(
        {
          success: true,
          message: `Mission "${mission.title}" is already active.`,
        },
        { status: 200 }
      );
    }

    if (room) {
      await db.roomMission.update({
        where: { id: normalizedMissionId },
        data: {
          active: true,
          activatedBy: normalizedAdminEmail,
        },
      });

      await logRoomEvent({
        roomId: room.id,
        type: 'system',
        team: 'system',
        username: normalizedAdminEmail,
        action: 'Mission Activated',
        detail: `Admin activated mission "${mission.title}".`,
        success: true,
      });
    } else {
      await db.mission.update({
        where: { id: normalizedMissionId },
        data: {
          active: true,
          activatedBy: normalizedAdminEmail,
        },
      });

      await db.gameLog.create({
        data: {
          type: 'system',
          team: 'system',
          username: normalizedAdminEmail,
          action: 'Mission Activated',
          detail: `Admin activated mission "${mission.title}".`,
          success: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Mission "${mission.title}" has been activated.`,
    });
  } catch (error) {
    console.error('Error activating mission:', error);

    return NextResponse.json(
      { error: 'Failed to activate mission' },
      { status: 500 }
    );
  }
}
