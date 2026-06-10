import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logRoomEvent, normalizeRoomCode } from '@/lib/room-data';

type TeamName = 'teamA' | 'teamB';

function normalizeAnswer(value: string) {
  return value.trim().toLowerCase();
}

function parseCompletedBy(value: string) {
  if (!value || value === 'none') {
    return [];
  }

  return value
    .split(',')
    .map((team) => team.trim())
    .filter((team) => team === 'teamA' || team === 'teamB');
}

function buildCompletedBy(teams: string[]) {
  const uniqueTeams = Array.from(new Set(teams));

  if (uniqueTeams.length === 0) {
    return 'none';
  }

  return uniqueTeams.join(',');
}

function isMissionAnswerCorrect(params: {
  missionTitle: string;
  storedAnswer: string;
  submittedAnswer: string;
  team: TeamName;
}) {
  const { missionTitle, storedAnswer, submittedAnswer, team } = params;

  const normalizedSubmittedAnswer = normalizeAnswer(submittedAnswer);
  const normalizedStoredAnswer = normalizeAnswer(storedAnswer);

  if (normalizedSubmittedAnswer === normalizedStoredAnswer) {
    return true;
  }

  const teamSpecificAnswers: Record<string, Record<TeamName, string>> = {
    'Network Gateway': {
      teamA: '192.168.1.1',
      teamB: '192.168.2.1',
    },
    'CMD Gateway': {
      teamA: '192.168.1.1',
      teamB: '192.168.2.1',
    },
    'System Hostname': {
      teamA: 'DESKTOP-AL-SHLOOL-001',
      teamB: 'DESKTOP-BANI-YASSEN-001',
    },
  };

  const missionSpecificAnswer = teamSpecificAnswers[missionTitle]?.[team];

  if (!missionSpecificAnswer) {
    return false;
  }

  return normalizedSubmittedAnswer === normalizeAnswer(missionSpecificAnswer);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { missionId, team, answer, userEmail } = body;
    const roomCode = normalizeRoomCode(body.roomCode);

    if (!missionId || typeof missionId !== 'string') {
      return NextResponse.json(
        { error: 'Mission ID is required' },
        { status: 400 }
      );
    }

    if (!team || (team !== 'teamA' && team !== 'teamB')) {
      return NextResponse.json(
        { error: 'Invalid team. Must be teamA or teamB.' },
        { status: 400 }
      );
    }

    if (!answer || typeof answer !== 'string' || !answer.trim()) {
      return NextResponse.json(
        { error: 'Answer is required' },
        { status: 400 }
      );
    }

    const normalizedMissionId = missionId.trim();
    const normalizedAnswer = answer.trim();

    const username =
      typeof userEmail === 'string' && userEmail.trim()
        ? userEmail.trim().toLowerCase()
        : team;

    const room = roomCode
      ? await db.gameRoom.findUnique({
          where: { code: roomCode },
          select: { id: true, status: true },
        })
      : null;

    if (roomCode && !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room && room.status !== 'playing') {
      return NextResponse.json(
        { error: `Game is ${room.status}. Missions are available only while playing.` },
        { status: 400 },
      );
    }

    const mission = room
      ? await db.roomMission.findFirst({
          where: { id: normalizedMissionId, roomId: room.id },
        })
      : await db.mission.findUnique({
          where: { id: normalizedMissionId },
        });

    if (!mission) {
      return NextResponse.json(
        { error: 'Mission not found' },
        { status: 404 }
      );
    }

    if (!mission.active) {
      return NextResponse.json(
        { error: 'Mission is not active' },
        { status: 400 }
      );
    }

    const completedTeams = parseCompletedBy(mission.completedBy);

    if (completedTeams.includes(team)) {
      return NextResponse.json(
        { error: `${team} has already completed this mission` },
        { status: 400 }
      );
    }

    const isCorrect = isMissionAnswerCorrect({
      missionTitle: mission.title,
      storedAnswer: mission.answer,
      submittedAnswer: normalizedAnswer,
      team,
    });

    const attemptDetail = `${username} submitted an answer for "${mission.title}" (${mission.type}/${mission.difficulty}). Result: ${
      isCorrect ? 'correct' : 'incorrect'
    }. Submitted value is hidden.`;

    if (room) {
      await logRoomEvent({
        roomId: room.id,
        type: 'attempt',
        team,
        username,
        action: isCorrect ? 'Correct Mission Attempt' : 'Wrong Mission Attempt',
        detail: attemptDetail,
        success: isCorrect,
        points: isCorrect ? mission.points : 0,
      });
    } else {
      await db.gameLog.create({
        data: {
          type: 'attempt',
          team,
          username,
          action: isCorrect ? 'Correct Mission Attempt' : 'Wrong Mission Attempt',
          detail: attemptDetail,
          success: isCorrect,
          points: isCorrect ? mission.points : 0,
        },
      });
    }

    if (!isCorrect) {

      return NextResponse.json({
        success: true,
        correct: false,
        points: 0,
        message: `❌ Incorrect answer. Try again for "${mission.title}".`,
      });
    }

    const points = mission.points;
    const updatedCompletedTeams = [...completedTeams, team];
    const newCompletedBy = buildCompletedBy(updatedCompletedTeams);
    const bothCompleted =
      updatedCompletedTeams.includes('teamA') &&
      updatedCompletedTeams.includes('teamB');

    const teamRecord = room
      ? await db.roomTeam.findFirst({
          where: { roomId: room.id, slot: team },
        })
      : await db.team.findFirst({
          where: { name: team },
        });

    if (!teamRecord) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    if (mission.type === 'attack') {
      if (room) {
        await db.roomTeam.update({
          where: { id: teamRecord.id },
          data: {
            attackScore: { increment: points },
          },
        });
      } else {
        await db.team.update({
          where: { id: teamRecord.id },
          data: {
            attackScore: { increment: points },
          },
        });
      }
    } else if (mission.type === 'defense') {
      if (room) {
        await db.roomTeam.update({
          where: { id: teamRecord.id },
          data: {
            defenseScore: { increment: points },
          },
        });
      } else {
        await db.team.update({
          where: { id: teamRecord.id },
          data: {
            defenseScore: { increment: points },
          },
        });
      }
    }

    if (room) {
      await db.roomMission.update({
        where: { id: normalizedMissionId },
        data: {
          completedBy: newCompletedBy,
          active: !bothCompleted,
        },
      });

      await logRoomEvent({
        roomId: room.id,
        type: 'mission',
        team,
        username,
        action: 'Mission Completed',
        detail: `Completed mission "${mission.title}" for ${points} points.`,
        success: true,
        points,
      });
    } else {
      await db.mission.update({
        where: { id: normalizedMissionId },
        data: {
          completedBy: newCompletedBy,
          active: !bothCompleted,
        },
      });

      await db.gameLog.create({
        data: {
          type: 'mission',
          team,
          username,
          action: 'Mission Completed',
          detail: `Completed mission "${mission.title}" for ${points} points.`,
          success: true,
          points,
        },
      });
    }

    return NextResponse.json({
      success: true,
      correct: true,
      points,
      message: `✅ Correct! You earned ${points} points for completing "${mission.title}"!`,
    });
  } catch (error) {
    console.error('Error completing mission:', error);

    return NextResponse.json(
      { error: 'Failed to complete mission' },
      { status: 500 }
    );
  }
}
