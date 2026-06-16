import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { Server, type Socket } from 'socket.io';

const PORT = Number(process.env.CHAT_SERVICE_PORT || 3003);
const DEFAULT_ROOM_CODE = 'MAIN';

type TeamId = 'teamA' | 'teamB';

const io = new Server(PORT, {
  cors: {
    origin: process.env.CHAT_SERVICE_CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
});

interface RoomMeta {
  code: string;
  name: string;
  passwordHash: string;
  accessTokenHash: string;
  maxPlayersPerTeam: number;
  winScore: number;
  createdAt: number;
}

interface Player {
  id: string;
  username: string;
  team: TeamId;
  role: string;
  roomCode: string;
  socketId: string;
  joinedAt: number;
}

type JoinTeamPayload = {
  username: string;
  team: string;
  role: string;
  roomCode?: string;
};

type CreateRoomPayload = {
  roomCode: string;
  roomName?: string;
  password: string;
  maxPlayersPerTeam?: number;
  winScore?: number;
};

type JoinRoomPayload = {
  roomCode: string;
  password: string;
};

type RestoreRoomAccessPayload = {
  roomCode: string;
  accessToken: string;
};

type ChatPayload = {
  message: string;
  team: string;
  roomCode?: string;
};

type TypingPayload = {
  team: string;
  isTyping: boolean;
  roomCode?: string;
};

type ToolPayload = {
  tool: string;
  team: string;
  roomCode?: string;
};

type AttackPayload = {
  team: string;
  success: boolean;
  targetTeam: string;
  roomCode?: string;
};

type DefensePayload = {
  team: string;
  roomCode?: string;
};

type JoinSupervisorPayload = {
  username: string;
  roomCode?: string;
};

type RoomSettingsPayload = {
  roomCode?: string;
  maxPlayersPerTeam?: number;
  winScore?: number;
};

const gameRooms = new Map<string, RoomMeta>();
const players = new Map<string, Player>();
const roomAccess = new Map<string, Set<string>>();
const roomAccessTokens = new Map<string, string>();

function sanitizeText(value: unknown, fallback = '', maxLength = 500) {
  if (typeof value !== 'string') {
    return fallback;
  }

  return value.trim().slice(0, maxLength);
}

function normalizeRoomCode(value?: string) {
  const code = sanitizeText(value || DEFAULT_ROOM_CODE, DEFAULT_ROOM_CODE, 24)
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '');

  return code || DEFAULT_ROOM_CODE;
}

function normalizeTeam(value?: string): TeamId {
  const team = sanitizeText(value, 'teamA', 16);

  if (team === 'teamA' || team === 'A') {
    return 'teamA';
  }

  if (team === 'teamB' || team === 'B') {
    return 'teamB';
  }

  return 'teamA';
}

function getTeamDisplayName(team: string) {
  const normalizedTeam = normalizeTeam(team);
  return normalizedTeam === 'teamA' ? 'AL-SHLOOL' : 'BANI YASSEN';
}

function hashSecret(secret: string) {
  return createHash('sha256').update(secret).digest('hex');
}

function createRoomAccessToken() {
  return randomBytes(32).toString('hex');
}

function safeCompareHash(storedHash: string, providedSecret: string) {
  const providedHash = hashSecret(providedSecret);

  const storedBuffer = Buffer.from(storedHash, 'hex');
  const providedBuffer = Buffer.from(providedHash, 'hex');

  if (storedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(storedBuffer, providedBuffer);
}

function getRoomScope(roomCode: string) {
  return `room:${normalizeRoomCode(roomCode)}`;
}

function getGlobalScope(roomCode: string) {
  return `room:${normalizeRoomCode(roomCode)}:global`;
}

function getTeamScope(roomCode: string, team: string) {
  return `room:${normalizeRoomCode(roomCode)}:team:${normalizeTeam(team)}`;
}

function toBoundedInt(value: unknown, fallback: number, min: number, max: number) {
  const numberValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : NaN;

  if (!Number.isInteger(numberValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, numberValue));
}

function ensureRoomExists(
  code: string,
  name?: string,
  password = '',
  maxPlayersPerTeam = 2,
  winScore = 100,
) {
  const normalizedCode = normalizeRoomCode(code);

  if (!gameRooms.has(normalizedCode)) {
    const accessToken = createRoomAccessToken();

    gameRooms.set(normalizedCode, {
      code: normalizedCode,
      name: sanitizeText(name, `Room ${normalizedCode}`, 60),
      passwordHash: hashSecret(password),
      accessTokenHash: hashSecret(accessToken),
      maxPlayersPerTeam,
      winScore,
      createdAt: Date.now(),
    });
  }

  return gameRooms.get(normalizedCode)!;
}

ensureRoomExists(DEFAULT_ROOM_CODE, 'Main Room', '');

function grantRoomAccess(socketId: string, roomCode: string) {
  const normalizedCode = normalizeRoomCode(roomCode);

  if (!roomAccess.has(socketId)) {
    roomAccess.set(socketId, new Set());
  }

  roomAccess.get(socketId)!.add(normalizedCode);
}

function hasRoomAccess(socketId: string, roomCode: string) {
  const normalizedCode = normalizeRoomCode(roomCode);

  if (normalizedCode === DEFAULT_ROOM_CODE) {
    return true;
  }

  return roomAccess.get(socketId)?.has(normalizedCode) ?? false;
}

function getRoomAccessToken(room: RoomMeta) {
  // Dev-only socket service: keep an opaque room access token in memory so the
  // browser can restore access without saving the room password.
  const existingToken = roomAccessTokens.get(room.code);

  if (existingToken) {
    return existingToken;
  }

  const accessToken = createRoomAccessToken();
  room.accessTokenHash = hashSecret(accessToken);
  roomAccessTokens.set(room.code, accessToken);
  return accessToken;
}

function getRoomPlayers(roomCode: string): Player[] {
  const normalizedCode = normalizeRoomCode(roomCode);

  return Array.from(players.values()).filter(
    (player) =>
      player.roomCode === normalizedCode && player.role !== 'supervisor',
  );
}

function getTeamPlayers(roomCode: string, team: string): Player[] {
  const normalizedCode = normalizeRoomCode(roomCode);
  const normalizedTeam = normalizeTeam(team);

  return Array.from(players.values()).filter(
    (player) =>
      player.roomCode === normalizedCode &&
      player.team === normalizedTeam &&
      player.role !== 'supervisor',
  );
}

function getPublicPlayer(player: Player) {
  return {
    id: player.id,
    username: player.username,
    team: player.team,
    role: player.role,
    roomCode: player.roomCode,
  };
}

function emitPlayersUpdate(roomCode: string) {
  io.to(getGlobalScope(roomCode)).emit('players-update', {
    allPlayers: getRoomPlayers(roomCode).map(getPublicPlayer),
  });
}

function emitRoomError(socket: Socket, message: string) {
  socket.emit('room-error', {
    message,
    timestamp: Date.now(),
  });
}

function broadcastSystemMessage(params: {
  roomCode: string;
  team?: string;
  message: string;
}) {
  const { roomCode, team, message } = params;

  const target = team
    ? getTeamScope(roomCode, team)
    : getGlobalScope(roomCode);

  const event = team ? 'system-message' : 'global-system-message';

  io.to(target).emit(event, {
    message: sanitizeText(message, '', 300),
    timestamp: Date.now(),
  });
}

function leavePlayerScopes(socket: Socket, player: Player) {
  socket.leave(getRoomScope(player.roomCode));
  socket.leave(getGlobalScope(player.roomCode));
  socket.leave(getTeamScope(player.roomCode, player.team));

  if (player.role === 'supervisor') {
    socket.leave(getTeamScope(player.roomCode, 'teamA'));
    socket.leave(getTeamScope(player.roomCode, 'teamB'));
  }
}

function joinPlayerScopes(socket: Socket, player: Player) {
  socket.join(getRoomScope(player.roomCode));
  socket.join(getGlobalScope(player.roomCode));
  socket.join(getTeamScope(player.roomCode, player.team));
}

function removeCurrentPlayer(socket: Socket, reason: string) {
  const player = players.get(socket.id);

  if (!player) {
    return;
  }

  leavePlayerScopes(socket, player);
  players.delete(socket.id);

  io.to(getTeamScope(player.roomCode, player.team)).emit('player-left', {
    playerId: socket.id,
    teamPlayers: getTeamPlayers(player.roomCode, player.team).map(
      getPublicPlayer,
    ),
  });

  emitPlayersUpdate(player.roomCode);

  if (player.role !== 'supervisor') {
    broadcastSystemMessage({
      roomCode: player.roomCode,
      team: player.team,
      message: `${player.username} ${reason}`,
    });
  }

  console.log(`${player.username} ${reason} from Room ${player.roomCode}`);
}

io.on('connection', (socket) => {
  console.log(`🎮 Player connected: ${socket.id}`);

  grantRoomAccess(socket.id, DEFAULT_ROOM_CODE);
  socket.join(getRoomScope(DEFAULT_ROOM_CODE));
  socket.join(getGlobalScope(DEFAULT_ROOM_CODE));

  socket.on('create-room', (data: CreateRoomPayload) => {
    const roomCode = normalizeRoomCode(data.roomCode);
    const roomName = sanitizeText(data.roomName, `Room ${roomCode}`, 60);
    const password = sanitizeText(data.password, '', 100);
    const maxPlayersPerTeam = toBoundedInt(data.maxPlayersPerTeam, 2, 1, 10);
    const winScore = toBoundedInt(data.winScore, 100, 10, 1000);

    if (!roomCode) {
      emitRoomError(socket, 'Room code is required.');
      return;
    }

    if (!password) {
      emitRoomError(socket, 'Room password is required.');
      return;
    }

    if (gameRooms.has(roomCode)) {
      emitRoomError(socket, 'This room code already exists.');
      return;
    }

    const room = ensureRoomExists(
      roomCode,
      roomName,
      password,
      maxPlayersPerTeam,
      winScore,
    );

    grantRoomAccess(socket.id, room.code);
    socket.join(getRoomScope(room.code));
    socket.join(getGlobalScope(room.code));

    socket.emit('room-created', {
      room: {
        code: room.code,
        name: room.name,
        maxPlayersPerTeam: room.maxPlayersPerTeam,
        winScore: room.winScore,
      },
      accessToken: getRoomAccessToken(room),
      timestamp: Date.now(),
    });

    console.log(`🏠 Room created: ${room.code} (${room.name})`);
  });

  socket.on('join-room', (data: JoinRoomPayload) => {
    const roomCode = normalizeRoomCode(data.roomCode);
    const password = sanitizeText(data.password, '', 100);
    const room = gameRooms.get(roomCode);

    if (!room) {
      emitRoomError(socket, 'Room not found.');
      return;
    }

    if (!safeCompareHash(room.passwordHash, password)) {
      emitRoomError(socket, 'Wrong room password.');
      return;
    }

    grantRoomAccess(socket.id, roomCode);
    socket.join(getRoomScope(roomCode));
    socket.join(getGlobalScope(roomCode));

    socket.emit('room-joined', {
      room: {
        code: room.code,
        name: room.name,
        maxPlayersPerTeam: room.maxPlayersPerTeam,
        winScore: room.winScore,
      },
      accessToken: getRoomAccessToken(room),
      allPlayers: getRoomPlayers(roomCode).map(getPublicPlayer),
      timestamp: Date.now(),
    });

    console.log(`🚪 Socket ${socket.id} joined room access: ${room.code}`);
  });

  socket.on('restore-room-access', (data: RestoreRoomAccessPayload) => {
    const roomCode = normalizeRoomCode(data.roomCode);
    const accessToken = sanitizeText(data.accessToken, '', 128);
    const room = gameRooms.get(roomCode);

    if (!room) {
      emitRoomError(socket, 'Room not found.');
      return;
    }

    if (!accessToken || !safeCompareHash(room.accessTokenHash, accessToken)) {
      emitRoomError(socket, 'Room access expired. Enter the room password again.');
      return;
    }

    grantRoomAccess(socket.id, roomCode);
    socket.join(getRoomScope(roomCode));
    socket.join(getGlobalScope(roomCode));

    socket.emit('room-joined', {
      room: {
        code: room.code,
        name: room.name,
        maxPlayersPerTeam: room.maxPlayersPerTeam,
        winScore: room.winScore,
      },
      accessToken,
      allPlayers: getRoomPlayers(roomCode).map(getPublicPlayer),
      timestamp: Date.now(),
    });
  });

  socket.on('join-team', (data: JoinTeamPayload) => {
    const roomCode = normalizeRoomCode(data.roomCode);
    const team = normalizeTeam(data.team);
    const role = sanitizeText(data.role, 'unknown', 30);
    const username =
      sanitizeText(data.username, '', 40) || `Agent-${socket.id.slice(0, 4)}`;

    const room = gameRooms.get(roomCode);

    if (!room) {
      emitRoomError(socket, 'Room not found.');
      return;
    }

    if (!hasRoomAccess(socket.id, roomCode)) {
      emitRoomError(socket, 'You do not have access to this room yet.');
      return;
    }

    const existingPlayer = players.get(socket.id);

    const alreadyJoinedSameScope =
      existingPlayer &&
      existingPlayer.username === username &&
      existingPlayer.team === team &&
      existingPlayer.role === role &&
      existingPlayer.roomCode === roomCode;

    if (alreadyJoinedSameScope) {
      socket.emit('joined', {
        player: getPublicPlayer(existingPlayer),
        teamPlayers: getTeamPlayers(roomCode, team).map(getPublicPlayer),
        allPlayers: getRoomPlayers(roomCode).map(getPublicPlayer),
        room: {
          code: room.code,
          name: room.name,
          maxPlayersPerTeam: room.maxPlayersPerTeam,
          winScore: room.winScore,
        },
      });
      return;
    }

    const currentTeamPlayers = getTeamPlayers(roomCode, team);
    const isChangingTeam =
      existingPlayer &&
      (existingPlayer.roomCode !== roomCode || existingPlayer.team !== team);

    if (
      currentTeamPlayers.length >= room.maxPlayersPerTeam &&
      (!existingPlayer || isChangingTeam)
    ) {
      emitRoomError(
        socket,
        `${getTeamDisplayName(team)} is full (${room.maxPlayersPerTeam}/${room.maxPlayersPerTeam}).`,
      );
      return;
    }

    if (existingPlayer) {
      leavePlayerScopes(socket, existingPlayer);

      emitPlayersUpdate(existingPlayer.roomCode);

      io.to(getTeamScope(existingPlayer.roomCode, existingPlayer.team)).emit(
        'player-left',
        {
          playerId: existingPlayer.id,
          teamPlayers: getTeamPlayers(
            existingPlayer.roomCode,
            existingPlayer.team,
          )
            .filter((player) => player.id !== existingPlayer.id)
            .map(getPublicPlayer),
        },
      );
    }

    const player: Player = {
      id: socket.id,
      username,
      team,
      role,
      roomCode,
      socketId: socket.id,
      joinedAt: Date.now(),
    };

    players.set(socket.id, player);
    joinPlayerScopes(socket, player);

    socket.emit('joined', {
      player: getPublicPlayer(player),
      teamPlayers: getTeamPlayers(roomCode, team).map(getPublicPlayer),
      allPlayers: getRoomPlayers(roomCode).map(getPublicPlayer),
      room: {
        code: room.code,
        name: room.name,
        maxPlayersPerTeam: room.maxPlayersPerTeam,
        winScore: room.winScore,
      },
    });

    socket.to(getTeamScope(roomCode, team)).emit('player-joined', {
      player: getPublicPlayer(player),
      teamPlayers: getTeamPlayers(roomCode, team).map(getPublicPlayer),
    });

    emitPlayersUpdate(roomCode);

    broadcastSystemMessage({
      roomCode,
      team,
      message: `🟢 ${player.username} joined ${getTeamDisplayName(team)} as ${role}`,
    });

    console.log(
      `📌 ${player.username} joined Room ${roomCode} / ${team} (${role})`,
    );
  });

  socket.on('join-supervisor', (data: JoinSupervisorPayload) => {
    const roomCode = normalizeRoomCode(data.roomCode);
    const username =
      sanitizeText(data.username, '', 40) ||
      `Supervisor-${socket.id.slice(0, 4)}`;

    const room = gameRooms.get(roomCode);

    if (!room) {
      emitRoomError(socket, 'Room not found.');
      return;
    }

    if (!hasRoomAccess(socket.id, roomCode)) {
      emitRoomError(socket, 'You do not have access to this room yet.');
      return;
    }

    const existingPlayer = players.get(socket.id);

    if (
      existingPlayer &&
      existingPlayer.username === username &&
      existingPlayer.role === 'supervisor' &&
      existingPlayer.roomCode === roomCode
    ) {
      socket.emit('supervisor-joined', {
        room: {
          code: room.code,
          name: room.name,
          maxPlayersPerTeam: room.maxPlayersPerTeam,
          winScore: room.winScore,
        },
        allPlayers: getRoomPlayers(roomCode).map(getPublicPlayer),
        timestamp: Date.now(),
      });
      return;
    }

    if (existingPlayer) {
      leavePlayerScopes(socket, existingPlayer);
      emitPlayersUpdate(existingPlayer.roomCode);
    }

    const supervisor: Player = {
      id: socket.id,
      username,
      team: 'teamA',
      role: 'supervisor',
      roomCode,
      socketId: socket.id,
      joinedAt: Date.now(),
    };

    players.set(socket.id, supervisor);
    socket.join(getRoomScope(roomCode));
    socket.join(getGlobalScope(roomCode));
    socket.join(getTeamScope(roomCode, 'teamA'));
    socket.join(getTeamScope(roomCode, 'teamB'));

    socket.emit('supervisor-joined', {
      room: {
        code: room.code,
        name: room.name,
        maxPlayersPerTeam: room.maxPlayersPerTeam,
        winScore: room.winScore,
      },
      allPlayers: getRoomPlayers(roomCode).map(getPublicPlayer),
      timestamp: Date.now(),
    });

    emitPlayersUpdate(roomCode);

    io.to(getGlobalScope(roomCode)).emit('global-system-message', {
      message: `Supervisor ${username} is monitoring this room.`,
      timestamp: Date.now(),
    });

    console.log(`Supervisor ${username} joined Room ${roomCode}`);
  });

  socket.on('chat-message', (data: ChatPayload) => {
    const player = players.get(socket.id);
    if (!player) return;

    const roomCode = player.roomCode;
    const message = sanitizeText(data.message, '', 600);

    if (!message) {
      return;
    }

    const team = normalizeTeam(data.team);

    if (player.role !== 'supervisor' && team !== player.team) {
      emitRoomError(socket, 'You can only send messages to your current team.');
      return;
    }

    const chatData = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      playerId: player.id,
      username: player.username,
      team,
      role: player.role,
      roomCode,
      message,
      timestamp: Date.now(),
    };

    io.to(getTeamScope(roomCode, team)).emit('chat-message', chatData);

    console.log(
      `💬 [Room ${roomCode} / ${team}] ${player.username}: ${message}`,
    );
  });

  socket.on('room-settings-updated', (data: RoomSettingsPayload) => {
    const roomCode = normalizeRoomCode(data.roomCode);
    const room = gameRooms.get(roomCode);

    if (!room) {
      emitRoomError(socket, 'Room not found.');
      return;
    }

    if (!hasRoomAccess(socket.id, roomCode)) {
      emitRoomError(socket, 'You do not have access to this room yet.');
      return;
    }

    room.maxPlayersPerTeam = toBoundedInt(
      data.maxPlayersPerTeam,
      room.maxPlayersPerTeam,
      1,
      10,
    );
    room.winScore = toBoundedInt(data.winScore, room.winScore, 10, 1000);

    io.to(getGlobalScope(roomCode)).emit('global-system-message', {
      message: `Room settings updated: ${room.winScore} points to win, ${room.maxPlayersPerTeam} players per team.`,
      timestamp: Date.now(),
    });

    emitPlayersUpdate(roomCode);
  });

  socket.on('global-message', (data: { message: string; roomCode?: string }) => {
    const player = players.get(socket.id);
    if (!player) return;

    const roomCode = player.roomCode;
    const message = sanitizeText(data.message, '', 600);

    if (!message) {
      return;
    }

    const msgData = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      playerId: player.id,
      username: player.username,
      team: player.team,
      role: player.role,
      roomCode,
      message,
      timestamp: Date.now(),
    };

    io.to(getGlobalScope(roomCode)).emit('global-message', msgData);

    console.log(`🌍 [Room ${roomCode}] ${player.username}: ${message}`);
  });

  socket.on('attack-event', (data: AttackPayload) => {
    const player = players.get(socket.id);
    if (!player) return;

    const roomCode = player.roomCode;
    const team = normalizeTeam(data.team);
    const targetTeam = normalizeTeam(data.targetTeam);

    if (team !== player.team) {
      emitRoomError(socket, 'Invalid attack event team.');
      return;
    }

    const eventData = {
      type: 'attack',
      player: {
        username: player.username,
        team: player.team,
        role: player.role,
      },
      targetTeam,
      success: Boolean(data.success),
      timestamp: Date.now(),
    };

    io.to(getTeamScope(roomCode, team)).emit('game-event', eventData);
    io.to(getGlobalScope(roomCode)).emit('score-changed', {
      timestamp: Date.now(),
    });

    const sysMsg = data.success
      ? `🔥 ${player.username} (${getTeamDisplayName(team)}) completed a successful attack simulation against ${getTeamDisplayName(targetTeam)}.`
      : `❌ ${player.username} (${getTeamDisplayName(team)}) failed an attack simulation against ${getTeamDisplayName(targetTeam)}. Defense strengthened.`;

    io.to(getGlobalScope(roomCode)).emit('global-system-message', {
      message: sysMsg,
      timestamp: Date.now(),
    });

    console.log(
      `⚔️ [Room ${roomCode}] ${player.username} attacked ${targetTeam} (${data.success ? 'SUCCESS' : 'FAILED'})`,
    );
  });

  socket.on('defense-event', (data: DefensePayload) => {
    const player = players.get(socket.id);
    if (!player) return;

    const roomCode = player.roomCode;
    const team = normalizeTeam(data.team);

    if (team !== player.team) {
      emitRoomError(socket, 'Invalid defense event team.');
      return;
    }

    const eventData = {
      type: 'defense',
      player: {
        username: player.username,
        team: player.team,
        role: player.role,
      },
      timestamp: Date.now(),
    };

    io.to(getGlobalScope(roomCode)).emit('game-event', eventData);
    io.to(getGlobalScope(roomCode)).emit('score-changed', {
      timestamp: Date.now(),
    });

    io.to(getGlobalScope(roomCode)).emit('global-system-message', {
      message: `🛡️ ${player.username} (${getTeamDisplayName(team)}) updated network defenses.`,
      timestamp: Date.now(),
    });

    console.log(`🛡️ [Room ${roomCode}] ${player.username} updated defenses`);
  });

  socket.on('tool-launched', (data: ToolPayload) => {
    const player = players.get(socket.id);
    if (!player) return;

    const roomCode = player.roomCode;
    const team = normalizeTeam(data.team);
    const tool = sanitizeText(data.tool, 'Unknown Tool', 60);

    if (team !== player.team) {
      emitRoomError(socket, 'Invalid tool event team.');
      return;
    }

    io.to(getTeamScope(roomCode, team)).emit('system-message', {
      message: `🔧 ${player.username} launched ${tool}`,
      timestamp: Date.now(),
    });
  });

  socket.on(
    'phase-change',
    (data: { phase: string; message: string; roomCode?: string }) => {
      const player = players.get(socket.id);
      const roomCode = player?.roomCode || normalizeRoomCode(data.roomCode);
      const phase = sanitizeText(data.phase, 'UNKNOWN', 30);
      const message = sanitizeText(data.message, 'Phase updated.', 300);

      io.to(getGlobalScope(roomCode)).emit('global-system-message', {
        message: `⚡ ${message}`,
        timestamp: Date.now(),
      });

      io.to(getGlobalScope(roomCode)).emit('phase-updated', {
        phase,
        timestamp: Date.now(),
      });
    },
  );

  socket.on('typing', (data: TypingPayload) => {
    const player = players.get(socket.id);
    if (!player) return;

    const roomCode = player.roomCode;
    const team = normalizeTeam(data.team);

    if (player.role !== 'supervisor' && team !== player.team) {
      return;
    }

    socket.to(getTeamScope(roomCode, team)).emit('user-typing', {
      username: player.username,
      isTyping: Boolean(data.isTyping),
    });
  });

  socket.on('leave-room', () => {
    removeCurrentPlayer(socket, 'left the room');
  });

  socket.on('disconnect', () => {
    removeCurrentPlayer(socket, 'disconnected');

    roomAccess.delete(socket.id);
  });
});

console.log(`\n🚀 Cyber Chat Service running on port ${PORT}`);
console.log(`🏠 Default room: ${DEFAULT_ROOM_CODE}`);
console.log(`📡 Real-time events active\n`);
