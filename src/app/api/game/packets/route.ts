import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logRoomEvent, normalizeRoomCode } from '@/lib/room-data';

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomIP() {
  return `192.168.${randomInt(0, 255)}.${randomInt(1, 254)}`;
}

function maskValue(value: string) {
  if (!value) {
    return '********';
  }

  if (value.length <= 2) {
    return '*'.repeat(value.length);
  }

  return `${value.charAt(0)}${'*'.repeat(Math.max(value.length - 2, 1))}${value.charAt(value.length - 1)}`;
}

const PROTOCOLS = ['TCP', 'UDP', 'HTTP', 'DNS', 'HTTPS', 'SSH', 'FTP'];

const NORMAL_INFOS = [
  'SYN → 80 [SYN, ACK] → established',
  'GET /index.html HTTP/1.1 200 OK',
  'DNS query for google.com → 142.250.80.46',
  'SSH connection established - key exchange',
  'TLS handshake completed - TLS 1.3',
  'FTP 220 Welcome to FTP server',
  'ACK data transfer 1460 bytes',
  'UDP datagram sent to port 53',
  'HTTP POST /api/data 201 Created',
  'DNS response for cdn.example.com',
  'TCP keep-alive packet',
  'HTTP/2 stream opened',
  'NTP time sync request',
  'ICMP echo request 64 bytes',
  'ARP who-has 192.168.1.1 tell 192.168.1.100',
];

type PacketEntry = {
  no: number;
  time: string;
  source: string;
  destination: string;
  protocol: string;
  info: string;
  suspicious: boolean;
};

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

    const gameState = room
      ? null
      : await db.gameState.findFirst({
          include: { teams: true },
        });

    if (!room && !gameState) {
      return NextResponse.json(
        { error: 'Game not initialized' },
        { status: 404 },
      );
    }

    const teams = room?.teams || gameState?.teams || [];

    const enemyTeam = teams.find((t) =>
      'slot' in t ? t.slot !== team : t.name !== team,
    );
    const myTeam = teams.find((t) =>
      'slot' in t ? t.slot === team : t.name === team,
    );

    if (!enemyTeam || !myTeam) {
      return NextResponse.json(
        { error: 'Team data not found' },
        { status: 404 }
      );
    }

    const suspiciousIndex = randomInt(3, 17);
    const maskedPassword = maskValue(enemyTeam.password);

    const redactedCredentials = Buffer.from(`admin:${maskedPassword}`).toString('base64');

    const suspiciousInfo =
      `POST /admin/login HTTP/1.1 Authorization: Basic ${redactedCredentials} ` +
      `Host: ${enemyTeam.ssid}.local Content-Type: application/x-www-form-urlencoded ` +
      `X-CyberArena-Flag: FLAG{p4ck3t_m4st3r} ` +
      `[credentials partially redacted]`;

    const packets: PacketEntry[] = [];

    for (let i = 0; i < 20; i++) {
      const isSuspicious = i === suspiciousIndex;

      const time =
        `00:${String(randomInt(0, 5)).padStart(2, '0')}:` +
        `${String(randomInt(0, 59)).padStart(2, '0')}.` +
        `${String(randomInt(0, 999)).padStart(3, '0')}`;

      packets.push({
        no: i + 1,
        time,
        source: isSuspicious
          ? `192.168.${randomInt(0, 255)}.${randomInt(1, 10)}`
          : randomIP(),
        destination: isSuspicious
          ? `192.168.${randomInt(0, 255)}.1`
          : randomIP(),
        protocol: isSuspicious
          ? 'HTTP'
          : PROTOCOLS[randomInt(0, PROTOCOLS.length - 1)],
        info: isSuspicious
          ? suspiciousInfo
          : NORMAL_INFOS[randomInt(0, NORMAL_INFOS.length - 1)],
        suspicious: isSuspicious,
      });
    }

    packets.sort((a, b) => a.time.localeCompare(b.time));

    packets.forEach((packet, index) => {
      packet.no = index + 1;
    });

    const suspiciousCount = 1;

    const analysis = {
      summary:
        `⚠️ ALERT: ${suspiciousCount} suspicious packet(s) detected targeting ` +
        `${enemyTeam.displayName}'s admin login endpoint. The captured traffic ` +
        `suggests a weak or exposed authentication flow, but sensitive credentials ` +
        `were redacted from the packet capture. Recommend investigation and password rotation.`,
    };

    if (room) {
      await logRoomEvent({
        roomId: room.id,
        type: 'tool',
        team,
        username: myTeam.displayName,
        action: 'Packet Capture',
        detail:
          `Captured 20 packets, ${suspiciousCount} suspicious activity detected ` +
          `on ${enemyTeam.displayName} network. Sensitive credential values were redacted.`,
        success: true,
      });
    } else {
      await db.gameLog.create({
        data: {
          type: 'tool',
          team,
          username: myTeam.displayName,
          action: 'Packet Capture',
          detail:
            `Captured 20 packets, ${suspiciousCount} suspicious activity detected ` +
            `on ${enemyTeam.displayName} network. Sensitive credential values were redacted.`,
          success: true,
        },
      });
    }

    return NextResponse.json({
      packets,
      totalPackets: 20,
      suspiciousCount,
      analysis,
    });
  } catch (error) {
    console.error('Error generating packets:', error);

    return NextResponse.json(
      { error: 'Failed to generate packet capture' },
      { status: 500 }
    );
  }
}
