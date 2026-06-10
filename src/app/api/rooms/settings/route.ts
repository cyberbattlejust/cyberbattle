import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { logRoomEvent, normalizeRoomCode } from '@/lib/room-data';

function toBoundedInt(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, Math.trunc(parsed)));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const roomCode = normalizeRoomCode(body.roomCode);
    const adminEmail =
      typeof body.adminEmail === 'string'
        ? body.adminEmail.trim().toLowerCase()
        : '';
    const winScore = toBoundedInt(body.winScore, 100, 10, 1000);
    const maxPlayersPerTeam = toBoundedInt(body.maxPlayersPerTeam, 2, 1, 10);

    if (!roomCode) {
      return NextResponse.json(
        { error: 'Room code is required.' },
        { status: 400 },
      );
    }

    if (!adminEmail) {
      return NextResponse.json(
        { error: 'Supervisor email is required.' },
        { status: 400 },
      );
    }

    const user = await db.user.findUnique({
      where: { email: adminEmail },
      select: { role: true },
    });

    if (!user || (user.role !== 'admin' && user.role !== 'supervisor')) {
      return NextResponse.json(
        { error: 'Unauthorized. Supervisor access required.' },
        { status: 403 },
      );
    }

    const room = await db.gameRoom.findUnique({
      where: { code: roomCode },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found.' }, { status: 404 });
    }

    const updatedRoom = await db.gameRoom.update({
      where: { id: room.id },
      data: {
        winScore,
        maxPlayersPerTeam,
      },
    });

    await logRoomEvent({
      roomId: room.id,
      type: 'system',
      team: 'system',
      username: adminEmail,
      action: 'Room Settings Updated',
      detail: `Supervisor updated win target to ${winScore} and team limit to ${maxPlayersPerTeam}.`,
      success: true,
    });

    return NextResponse.json({
      success: true,
      room: {
        code: updatedRoom.code,
        name: updatedRoom.name,
        status: updatedRoom.status,
        winScore: updatedRoom.winScore,
        maxPlayersPerTeam: updatedRoom.maxPlayersPerTeam,
      },
      message: 'Room settings updated.',
    });
  } catch (error) {
    console.error('Error updating room settings:', error);

    return NextResponse.json(
      { error: 'Failed to update room settings.' },
      { status: 500 },
    );
  }
}
