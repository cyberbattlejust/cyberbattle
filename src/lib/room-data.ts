import { db } from '@/lib/db';
import { TRAINING_MISSIONS } from '@/lib/mission-seed-data';

export type RoomTeamSlot = 'teamA' | 'teamB';

export function normalizeRoomCode(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toUpperCase();
}

export function normalizeTeamSlot(value: unknown): RoomTeamSlot | null {
  if (value === 'teamA' || value === 'A') {
    return 'teamA';
  }

  if (value === 'teamB' || value === 'B') {
    return 'teamB';
  }

  return null;
}

export async function createRoomData(params: {
  code: string;
  name: string;
  supervisorEmail?: string;
  status?: string;
  maxTime?: number;
  winScore?: number;
  maxPlayersPerTeam?: number;
}) {
  const code = normalizeRoomCode(params.code);

  return db.gameRoom.create({
    data: {
      code,
      name: params.name.trim(),
      supervisorEmail: params.supervisorEmail?.trim().toLowerCase() || '',
      status: params.status || 'waiting',
      maxTime: params.maxTime || 600,
      winScore: params.winScore || 100,
      maxPlayersPerTeam: params.maxPlayersPerTeam || 2,
      teams: {
        create: [
          {
            slot: 'teamA',
            ssid: 'Shlool_WiFi',
            displayName: 'AL-SHLOOL',
            password: 'S1234',
          },
          {
            slot: 'teamB',
            ssid: 'Yassen_WiFi',
            displayName: 'BANI YASSEN',
            password: 'Y1234',
          },
        ],
      },
      missions: {
        create: TRAINING_MISSIONS.map((mission) => ({
          sourceMissionId: mission.title,
          title: mission.title,
          description: mission.description,
          type: mission.type,
          difficulty: mission.difficulty,
          points: mission.points,
          durationSec: mission.durationSec,
          answer: mission.answer,
          active: false,
          completedBy: 'none',
        })),
      },
    },
    include: {
      teams: true,
      missions: true,
    },
  });
}

export async function getRoomByCode(code: string) {
  const normalizedCode = normalizeRoomCode(code);

  if (!normalizedCode) {
    return null;
  }

  return db.gameRoom.findUnique({
    where: { code: normalizedCode },
    include: {
      teams: true,
    },
  });
}

export async function logRoomEvent(params: {
  roomId: string;
  type: string;
  team: string;
  username: string;
  action: string;
  detail: string;
  success?: boolean;
  points?: number;
}) {
  return db.roomLog.create({
    data: {
      roomId: params.roomId,
      type: params.type,
      team: params.team,
      username: params.username,
      action: params.action,
      detail: params.detail,
      success: params.success ?? false,
      points: params.points ?? 0,
    },
  });
}
