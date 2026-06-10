import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { normalizeRoomCode } from '@/lib/room-data';

type MissionData = {
  id: string;
  title: string;
  description: string;
  type: string;
  difficulty: string;
  points: number;
  durationSec: number;
  active: boolean;
  completedBy: string;
  activatedBy: string;
  createdAt: Date;
  updatedAt: Date;
};

function serializeMission(mission: MissionData) {
  return {
    id: mission.id,
    title: mission.title,
    description: mission.description,
    type: mission.type,
    difficulty: mission.difficulty,
    points: mission.points,
    durationSec: mission.durationSec,
    active: mission.active,
    completedBy: mission.completedBy,
    activatedBy: mission.activatedBy,
    createdAt: mission.createdAt,
    updatedAt: mission.updatedAt,
    answerProtected: true,
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

      const missions = await db.roomMission.findMany({
        where: { roomId: room.id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          difficulty: true,
          points: true,
          durationSec: true,
          active: true,
          completedBy: true,
          activatedBy: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return NextResponse.json({
        success: true,
        missions: missions.map(serializeMission),
      });
    }

    const missions = await db.mission.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        difficulty: true,
        points: true,
        durationSec: true,
        active: true,
        completedBy: true,
        activatedBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      missions: missions.map(serializeMission),
    });
  } catch (error) {
    console.error('Error fetching missions:', error);

    return NextResponse.json(
      { error: 'Failed to fetch missions' },
      { status: 500 }
    );
  }
}
