import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createRoomData } from '@/lib/room-data';

const VALID_STATUSES = [
  'waiting',
  'setup',
  'playing',
  'paused',
  'finished',
  'cancelled',
];

function toPositiveInt(value: unknown, fallback: number) {
  const numberValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : NaN;

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const id = searchParams.get('id');
    const status = searchParams.get('status');
    const creator = searchParams.get('creator');

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid session status' },
        { status: 400 }
      );
    }

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
        ...(creator ? { creator: creator.trim() } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      creator,
      userEmail,
      maxTime,
      status,
      roomCode,
      winScore,
      maxPlayersPerTeam,
    } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Session name is required' },
        { status: 400 }
      );
    }

    const normalizedStatus =
      typeof status === 'string' && VALID_STATUSES.includes(status)
        ? status
        : 'waiting';

    const normalizedCreator =
      typeof creator === 'string' && creator.trim()
        ? creator.trim().toLowerCase()
        : typeof userEmail === 'string' && userEmail.trim()
          ? userEmail.trim().toLowerCase()
          : '';

    const normalizedRoomCode =
      typeof roomCode === 'string' && roomCode.trim()
        ? roomCode.trim().toUpperCase()
        : '';

    if (normalizedRoomCode) {
      const existingSession = await db.gameSession.findUnique({
        where: { id: normalizedRoomCode },
      });
      const existingRoom = await db.gameRoom.findUnique({
        where: { code: normalizedRoomCode },
      });

      if (existingSession || existingRoom) {
        return NextResponse.json(
          { error: 'A room with this code already exists' },
          { status: 409 }
        );
      }
    }

    const session = await db.gameSession.create({
      data: {
        ...(normalizedRoomCode ? { id: normalizedRoomCode } : {}),
        name: name.trim(),
        creator: normalizedCreator,
        maxTime: toPositiveInt(maxTime, 600),
        status: normalizedStatus,
        teamAScore: 0,
        teamBScore: 0,
      },
    });

    if (normalizedRoomCode) {
      await createRoomData({
        code: normalizedRoomCode,
        name: session.name,
        supervisorEmail: normalizedCreator,
        status: normalizedStatus,
        maxTime: session.maxTime,
        winScore: toPositiveInt(winScore, 100),
        maxPlayersPerTeam: toPositiveInt(maxPlayersPerTeam, 2),
      });
    }

    await db.gameLog.create({
      data: {
        type: 'session',
        team: 'system',
        username: normalizedCreator || 'system',
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
