import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logRoomEvent, normalizeRoomCode } from '@/lib/room-data';

const SCAN_PORTS = [
  { port: 22, state: 'open', service: 'SSH', version: 'OpenSSH 8.9' },
  { port: 80, state: 'open', service: 'HTTP', version: 'Apache 2.4.52' },
  { port: 443, state: 'open', service: 'HTTPS', version: 'Apache 2.4.52' },
  { port: 3306, state: 'open', service: 'MySQL', version: 'MySQL 8.0.32' },
  { port: 8080, state: 'filtered', service: 'HTTP-Proxy', version: 'Squid 5.2' },
];

const SCAN_VULNERABILITIES = [
  { name: 'SSH Weak Credentials', severity: 'HIGH', description: 'Default credentials detected', port: 22 },
  { name: 'SQL Injection', severity: 'CRITICAL', description: 'Login form vulnerable', port: 80 },
  { name: 'Outdated TLS', severity: 'MEDIUM', description: 'TLS 1.0 in use', port: 443 },
];

async function ensureGameInit() {
  const existingState = await db.gameState.findFirst({
    include: { teams: true },
  });

  if (existingState && existingState.teams.length === 2) {
    return { gameState: existingState, teams: existingState.teams };
  }

  // Clean up and recreate
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

  return { gameState, teams: gameState.teams };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { team } = body;
    const roomCode = normalizeRoomCode(body.roomCode);

    if (!team || (team !== 'teamA' && team !== 'teamB')) {
      return NextResponse.json(
        { error: 'Invalid team. Must be teamA or teamB.' },
        { status: 400 }
      );
    }

    const room = roomCode
      ? await db.gameRoom.findUnique({
          where: { code: roomCode },
          include: { teams: true },
        })
      : null;

    if (roomCode && !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room && room.status !== 'playing') {
      return NextResponse.json(
        { error: `Game is ${room.status}. Tools are available only while playing.` },
        { status: 400 },
      );
    }

    const legacyState = room ? null : await ensureGameInit();
    const teams = room?.teams || legacyState?.teams || [];

    const attackingTeam = teams.find((t) =>
      'slot' in t ? t.slot === team : t.name === team,
    );
    const enemyTeam = teams.find((t) =>
      'slot' in t ? t.slot !== team : t.name !== team,
    );

    if (!attackingTeam || !enemyTeam) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    const ipSuffix = team === 'teamA' ? '1' : '2';
    const enemyPassword = enemyTeam.password;

    const scanResult = {
      hostUp: true,
      target: enemyTeam.ssid,
      ip: `192.168.${ipSuffix}.1`,
      ports: SCAN_PORTS,
      vulnerabilities: SCAN_VULNERABILITIES,
      passwordHint: `Password starts with '${enemyPassword.charAt(0)}' and has ${enemyPassword.length} characters`,
    };

    if (room) {
      await logRoomEvent({
        roomId: room.id,
        type: 'tool',
        team,
        username: attackingTeam.displayName,
        action: 'Network Scan',
        detail: `Scanned enemy network ${enemyTeam.displayName}`,
        success: true,
      });
    } else {
      await db.gameLog.create({
        data: {
          type: 'tool',
          team,
          username: attackingTeam.displayName,
          action: 'Network Scan',
          detail: `Scanned enemy network ${enemyTeam.displayName}`,
          success: true,
        },
      });
    }

    return NextResponse.json(scanResult);
  } catch (error) {
    console.error('Error scanning network:', error);
    return NextResponse.json(
      { error: 'Failed to perform network scan' },
      { status: 500 }
    );
  }
}
