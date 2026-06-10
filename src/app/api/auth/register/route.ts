import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

const HASH_PREFIX = 'scrypt';
const KEY_LENGTH = 64;

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');

  const hash = crypto
    .scryptSync(password, salt, KEY_LENGTH)
    .toString('hex');

  return `${HASH_PREFIX}$${salt}$${hash}`;
}

async function ensureGameInit() {
  const existingState = await db.gameState.findFirst({
    include: { teams: true },
  });

  if (existingState && existingState.teams.length === 2) {
    return existingState;
  }

  if (existingState) {
    await db.team.deleteMany({ where: { gameStateId: existingState.id } });
    await db.gameState.delete({ where: { id: existingState.id } });
  }

  const gameState = await db.gameState.create({
    data: {
      phase: 'DEFENSE',
      vulnerabilities: 3,
      teams: {
        create: [
          {
            name: 'teamA',
            ssid: 'Shlool_WiFi',
            displayName: 'AL-SHLOOL',
            password: 'S1234',
            attackScore: 0,
            defenseScore: 0,
          },
          {
            name: 'teamB',
            ssid: 'Yassen_WiFi',
            displayName: 'BANI YASSEN',
            password: 'Y1234',
            attackScore: 0,
            defenseScore: 0,
          },
        ],
      },
    },
    include: { teams: true },
  });

  return gameState;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 4) {
      return NextResponse.json(
        { error: 'Password is required (minimum 4 characters)' },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    await ensureGameInit();

    const hashedPassword = hashPassword(password);

    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        role: 'player',
        team: '',
      },
    });

    await db.gameLog.create({
      data: {
        type: 'auth',
        team: '',
        username: normalizedEmail,
        action: 'User Registered',
        detail: `New player registered: ${normalizedEmail}`,
        success: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          email: user.email,
          role: user.role,
        },
        message: 'Registration successful! Welcome to Cyber Arena.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error registering user:', error);

    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    );
  }
}