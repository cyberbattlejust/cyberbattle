import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { TRAINING_MISSIONS } from '@/lib/mission-seed-data';


export async function POST(request: Request) {
  try {
    const seedSecret = process.env.MISSION_SEED_SECRET;

    if (!seedSecret) {
      return NextResponse.json(
        {
          error:
            'Mission seeding is disabled. MISSION_SEED_SECRET is not configured.',
        },
        { status: 403 }
      );
    }

    const providedSecret = request.headers.get('x-seed-secret');

    if (!providedSecret || providedSecret !== seedSecret) {
      return NextResponse.json(
        {
          error: 'Unauthorized mission seed request.',
        },
        { status: 401 }
      );
    }

    await db.mission.deleteMany({});

    for (const mission of TRAINING_MISSIONS) {
      await db.mission.create({
        data: {
          title: mission.title,
          description: mission.description,
          type: mission.type,
          difficulty: mission.difficulty,
          points: mission.points,
          durationSec: mission.durationSec,
          answer: mission.answer,
          active: false,
          completedBy: 'none',
          activatedBy: '',
        },
      });
    }

    const count = await db.mission.count();

    await db.gameLog.create({
      data: {
        type: 'system',
        team: 'system',
        username: 'system',
        action: 'Missions Seeded',
        detail: `${count} missions were seeded successfully.`,
        success: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Seeded ${count} missions successfully.`,
      count,
    });
  } catch (error) {
    console.error('Error seeding missions:', error);

    return NextResponse.json(
      { error: 'Failed to seed missions' },
      { status: 500 }
    );
  }
}
