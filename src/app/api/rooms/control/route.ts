import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { logRoomEvent, normalizeRoomCode } from '@/lib/room-data';

const ACTION_STATUS: Record<string, string> = {
  start: 'playing',
  pause: 'paused',
  resume: 'playing',
  finish: 'finished',
  setup: 'setup',
};

function getActionLabel(action: string) {
  if (action === 'start') return 'Game Started';
  if (action === 'pause') return 'Game Paused';
  if (action === 'resume') return 'Game Resumed';
  if (action === 'finish') return 'Game Finished';
  return 'Game Updated';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const roomCode = normalizeRoomCode(body.roomCode);
    const action = typeof body.action === 'string' ? body.action.trim() : '';
    const adminEmail =
      typeof body.adminEmail === 'string'
        ? body.adminEmail.trim().toLowerCase()
        : '';

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

    if (!ACTION_STATUS[action]) {
      return NextResponse.json(
        { error: 'Invalid room control action.' },
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
      include: { teams: true },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found.' }, { status: 404 });
    }

    if (action === 'start') {
      const missingSetup = room.teams.filter((team) => !team.configured);

      if (missingSetup.length > 0) {
        return NextResponse.json(
          { error: 'Both teams must finish setup before the game starts.' },
          { status: 400 },
        );
      }

      if (room.status === 'finished') {
        return NextResponse.json(
          { error: 'Finished games cannot be restarted. Reset the room first.' },
          { status: 400 },
        );
      }
    }

    if (action === 'pause' && room.status !== 'playing') {
      return NextResponse.json(
        { error: 'Only a playing game can be paused.' },
        { status: 400 },
      );
    }

    if (action === 'resume' && room.status !== 'paused') {
      return NextResponse.json(
        { error: 'Only a paused game can be resumed.' },
        { status: 400 },
      );
    }

    if (action === 'finish' && !['playing', 'paused'].includes(room.status)) {
      return NextResponse.json(
        { error: 'Only active games can be finished.' },
        { status: 400 },
      );
    }

    const nextStatus = ACTION_STATUS[action];
    const updatedRoom = await db.gameRoom.update({
      where: { id: room.id },
      data: { status: nextStatus },
    });

    await db.gameSession.updateMany({
      where: { id: roomCode },
      data: { status: nextStatus },
    });

    await logRoomEvent({
      roomId: room.id,
      type: 'system',
      team: 'system',
      username: adminEmail,
      action: getActionLabel(action),
      detail: `Supervisor changed room "${room.name}" status to ${nextStatus}.`,
      success: true,
    });

    return NextResponse.json({
      success: true,
      room: {
        code: updatedRoom.code,
        name: updatedRoom.name,
        status: updatedRoom.status,
      },
      message: `Room status changed to ${nextStatus}.`,
    });
  } catch (error) {
    console.error('Error controlling room:', error);

    return NextResponse.json(
      { error: 'Failed to control room.' },
      { status: 500 },
    );
  }
}
