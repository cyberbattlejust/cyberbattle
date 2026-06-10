import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const VALID_STATUSES = [
  'waiting',
  'setup',
  'playing',
  'paused',
  'finished',
  'cancelled',
];

type SessionUpdateData = {
  name?: string;
  creator?: string;
  status?: string;
  maxTime?: number;
  teamAScore?: number;
  teamBScore?: number;
};

function toPositiveInt(value: unknown, fallback?: number) {
  const numberValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : NaN;

  if (!Number.isInteger(numberValue) || numberValue < 0) {
    return fallback;
  }

  return numberValue;
}

function serializeSession(session: {
  id: string;
  name: string;
  creator: string;
  status: string;
  maxTime: number;
  teamAScore: number;
  teamBScore: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: session.id,
    name: session.name,
    creator: session.creator,
    status: session.status,
    maxTime: session.maxTime,
    scores: {
      teamA: session.teamAScore,
      teamB: session.teamBScore,
      total: session.teamAScore + session.teamBScore,
    },
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const rawName = body.name || body.missionTitle || 'Cyber Arena Session';
    const rawCreator = body.creator || body.userEmail || body.teamId || '';

    if (typeof rawName !== 'string' || !rawName.trim()) {
      return NextResponse.json(
        { error: 'Session name is required' },
        { status: 400 }
      );
    }

    const maxTime = toPositiveInt(body.maxTime ?? body.timeLimit, 600);
    const normalizedRoomCode =
      typeof body.roomCode === 'string' && body.roomCode.trim()
        ? body.roomCode.trim().toUpperCase()
        : '';

    if (normalizedRoomCode) {
      const existingSession = await db.gameSession.findUnique({
        where: { id: normalizedRoomCode },
      });

      if (existingSession) {
        return NextResponse.json(
          { error: 'A room with this code already exists' },
          { status: 409 }
        );
      }
    }

    const status =
      typeof body.status === 'string' && VALID_STATUSES.includes(body.status)
        ? body.status
        : 'waiting';

    const session = await db.gameSession.create({
      data: {
        ...(normalizedRoomCode ? { id: normalizedRoomCode } : {}),
        name: rawName.trim(),
        creator: typeof rawCreator === 'string' ? rawCreator.trim() : '',
        status,
        maxTime: maxTime ?? 600,
        teamAScore: 0,
        teamBScore: 0,
      },
    });

    await db.gameLog.create({
      data: {
        type: 'session',
        team: 'system',
        username: session.creator || 'system',
        action: 'Session Created',
        detail: `Game session "${session.name}" was created.`,
        success: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        session: serializeSession(session),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating session:', error);

    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const existingSession = await db.gameSession.findUnique({
      where: { id },
    });

    if (!existingSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const updateData: SessionUpdateData = {};

    if (typeof body.name === 'string' && body.name.trim()) {
      updateData.name = body.name.trim();
    }

    if (typeof body.creator === 'string') {
      updateData.creator = body.creator.trim();
    }

    if (typeof body.status === 'string') {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json(
          { error: 'Invalid session status' },
          { status: 400 }
        );
      }

      updateData.status = body.status;
    }

    const maxTime = toPositiveInt(body.maxTime);
    if (maxTime !== undefined) {
      updateData.maxTime = maxTime;
    }

    const teamAScore = toPositiveInt(body.teamAScore ?? body.attackerScore);
    if (teamAScore !== undefined) {
      updateData.teamAScore = teamAScore;
    }

    const teamBScore = toPositiveInt(body.teamBScore ?? body.defenderScore);
    if (teamBScore !== undefined) {
      updateData.teamBScore = teamBScore;
    }

    const session = await db.gameSession.update({
      where: { id },
      data: updateData,
    });

    await db.gameLog.create({
      data: {
        type: 'session',
        team: 'system',
        username: session.creator || 'system',
        action: 'Session Updated',
        detail: `Game session "${session.name}" was updated.`,
        success: true,
      },
    });

    return NextResponse.json({
      success: true,
      session: serializeSession(session),
    });
  } catch (error) {
    console.error('Error updating session:', error);

    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const id = searchParams.get('id');
    const status = searchParams.get('status');
    const creator = searchParams.get('creator');

    if (id) {
      const session = await db.gameSession.findUnique({
        where: { id },
      });

      if (!session) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        session: serializeSession(session),
      });
    }

    const sessions = await db.gameSession.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(creator ? { creator } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      sessions: sessions.map(serializeSession),
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);

    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
