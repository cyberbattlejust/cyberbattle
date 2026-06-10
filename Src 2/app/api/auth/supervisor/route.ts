import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email } = body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { error: 'Email is required.' },
        { status: 400 },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found.' },
        { status: 404 },
      );
    }

    if (user.role === 'supervisor' || user.role === 'admin') {
      return NextResponse.json({
        success: true,
        user: {
          email: user.email,
          role: user.role,
        },
      });
    }

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: { role: 'supervisor' },
      select: {
        email: true,
        role: true,
      },
    });

    await db.gameLog.create({
      data: {
        type: 'system',
        team: 'system',
        username: normalizedEmail,
        action: 'Supervisor Assigned',
        detail: `${normalizedEmail} created a game room and became the supervisor.`,
        success: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'Supervisor role assigned.',
    });
  } catch (error) {
    console.error('Error assigning supervisor role:', error);

    return NextResponse.json(
      { error: 'Failed to assign supervisor role.' },
      { status: 500 },
    );
  }
}
