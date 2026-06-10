import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

type TeamData = {
  id: string;
  name: string;
  ssid: string;
  displayName: string;
  attackScore: number;
  defenseScore: number;
  gameStateId: string;
};

function serializeTeam(team: TeamData) {
  return {
    id: team.id,
    name: team.name,
    ssid: team.ssid,
    displayName: team.displayName,
    attackScore: team.attackScore,
    defenseScore: team.defenseScore,
    totalScore: team.attackScore + team.defenseScore,
    gameStateId: team.gameStateId,
    passwordProtected: true,
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userEmail } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Team id is required' },
        { status: 400 }
      );
    }

    if (!userEmail || typeof userEmail !== 'string') {
      return NextResponse.json(
        { error: 'userEmail is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = userEmail.trim().toLowerCase();
    const normalizedTeamId = id.trim();

    const team = await db.team.findFirst({
      where: {
        OR: [
          { id: normalizedTeamId },
          { name: normalizedTeamId },
        ],
      },
    });

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        team: team.name,
      },
    });

    await db.gameLog.create({
      data: {
        type: 'team',
        team: team.name,
        username: normalizedEmail,
        action: 'Joined Team',
        detail: `${normalizedEmail} joined ${team.displayName}.`,
        success: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${updatedUser.email} joined ${team.displayName}.`,
      user: {
        email: updatedUser.email,
        role: updatedUser.role,
        team: updatedUser.team,
      },
      team: serializeTeam(team),
    });
  } catch (error) {
    console.error('Error joining team:', error);

    return NextResponse.json(
      { error: 'Failed to join team' },
      { status: 500 }
    );
  }
}