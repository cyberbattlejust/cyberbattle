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

function isHashedPassword(value: string): boolean {
  return value.startsWith(`${HASH_PREFIX}$`);
}

function verifyPassword(password: string, storedPassword: string): boolean {
  if (!isHashedPassword(storedPassword)) {
    return password === storedPassword;
  }

  const parts = storedPassword.split('$');

  if (parts.length !== 3) {
    return false;
  }

  const [, salt, storedHash] = parts;

  const hash = crypto
    .scryptSync(password, salt, KEY_LENGTH)
    .toString('hex');

  return crypto.timingSafeEqual(
    Buffer.from(hash, 'hex'),
    Buffer.from(storedHash, 'hex')
  );
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

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const isPasswordValid = verifyPassword(password, user.password);

    if (!isPasswordValid) {
      await db.gameLog.create({
        data: {
          type: 'auth',
          team: user.team || '',
          username: normalizedEmail,
          action: 'Login Failed',
          detail: `Failed login attempt for ${normalizedEmail}`,
          success: false,
        },
      });

      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 401 }
      );
    }

    if (!isHashedPassword(user.password)) {
      await db.user.update({
        where: { id: user.id },
        data: {
          password: hashPassword(password),
        },
      });
    }

    await db.gameLog.create({
      data: {
        type: 'auth',
        team: user.team || '',
        username: normalizedEmail,
        action: 'Login Success',
        detail: `${normalizedEmail} logged in successfully`,
        success: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        email: user.email,
        role: user.role,
        team: user.team,
      },
      message: `Welcome back, ${user.email}!`,
    });
  } catch (error) {
    console.error('Error logging in:', error);

    return NextResponse.json(
      { error: 'Failed to log in' },
      { status: 500 }
    );
  }
}