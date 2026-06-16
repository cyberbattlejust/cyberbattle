import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supervisorEmail = searchParams.get('supervisorEmail')?.trim().toLowerCase();

    const rooms = await db.gameRoom.findMany({
      where: supervisorEmail ? { supervisorEmail } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { teams: true },
    });

    return NextResponse.json({
      success: true,
      rooms: rooms.map((room) => ({
        code: room.code,
        name: room.name,
        status: room.status,
        supervisorEmail: room.supervisorEmail,
        winScore: room.winScore,
        maxPlayersPerTeam: room.maxPlayersPerTeam,
        createdAt: room.createdAt,
        teamAConfigured: Boolean(
          room.teams.find((team) => team.slot === 'teamA')?.configured,
        ),
        teamBConfigured: Boolean(
          room.teams.find((team) => team.slot === 'teamB')?.configured,
        ),
      })),
    });
  } catch (error) {
    console.error('Error listing rooms:', error);

    return NextResponse.json(
      { error: 'Failed to list rooms.' },
      { status: 500 },
    );
  }
}
