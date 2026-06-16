import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { normalizeRoomCode } from '@/lib/room-data';

function sanitizeDetail(detail: string | null) {
  if (!detail) {
    return '';
  }

  return detail
    // Remove old logs like: changed network password from "old" to "new"
    .replace(
      /changed network password from\s+"[^"]*"\s+to\s+"[^"]*"/gi,
      'changed network password'
    )

    // Remove old logs like: Password "secret" matched
    .replace(
      /Password\s+"[^"]*"\s+matched/gi,
      'Password [REDACTED] matched'
    )

    // Remove old logs like: "secret" did not match
    .replace(
      /"[^"]*"\s+did not match/gi,
      '[REDACTED] did not match'
    )

    // Remove Basic Auth values
    .replace(
      /Authorization:\s*Basic\s+[A-Za-z0-9+/=]+/gi,
      'Authorization: Basic [REDACTED]'
    )

    // Remove common password key/value patterns
    .replace(
      /(password|pass|pwd)\s*[:=]\s*[^,\s;]+/gi,
      '$1=[REDACTED]'
    )

    // Remove admin:password patterns
    .replace(
      /admin:[^,\s;]+/gi,
      'admin:[REDACTED]'
    );
}

function serializeLog(log: {
  id: string;
  type: string;
  team: string;
  username: string;
  action: string;
  detail: string;
  success: boolean;
  points: number;
  createdAt: Date;
}) {
  return {
    id: log.id,
    type: log.type,
    team: log.team,
    username: log.username,
    action: log.action,
    detail: sanitizeDetail(log.detail),
    success: log.success,
    points: log.points,
    createdAt: log.createdAt,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomCode = normalizeRoomCode(searchParams.get('roomCode'));

    if (roomCode) {
      const room = await db.gameRoom.findUnique({
        where: { code: roomCode },
        select: { id: true },
      });

      if (!room) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }

      const logs = await db.roomLog.findMany({
        where: { roomId: room.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      return NextResponse.json({
        success: true,
        logs: logs.map(serializeLog),
      });
    }

    const logs = await db.gameLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      logs: logs.map(serializeLog),
    });
  } catch (error) {
    console.error('Error fetching logs:', error);

    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}
