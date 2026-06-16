'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';

type TeamId = 'teamA' | 'teamB';

type RoomInfo = {
  code: string;
  name: string;
  maxPlayersPerTeam?: number;
  winScore?: number;
};

type RoomActionResult = {
  ok: boolean;
  room?: RoomInfo;
  accessToken?: string;
  error?: string;
};

type Player = {
  id: string;
  username: string;
  team: string;
  role: string;
  roomCode?: string;
};

type ChatMessage = {
  id: string;
  username: string;
  message: string;
  timestamp: number;
  team?: string;
  role?: string;
  roomCode?: string;
  playerId?: string;
};

type SystemMessage = {
  message: string;
  timestamp: number;
};

type TypingUser = {
  username: string;
  isTyping: boolean;
};

type GameEvent = {
  id: string;
  type: string;
  player: {
    username: string;
    team: string;
    role?: string;
  };
  targetTeam?: string;
  success?: boolean;
  timestamp: number;
};

type JoinTeamPayload = {
  username: string;
  team: string;
  role: string;
  roomCode?: string;
};

type CreateRoomPayload = {
  roomCode: string;
  roomName: string;
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

type JoinSupervisorPayload = {
  username: string;
  roomCode?: string;
};

type RoomSettingsPayload = {
  roomCode?: string;
  maxPlayersPerTeam: number;
  winScore: number;
};

type RoomCreatedEvent = {
  room: RoomInfo;
  accessToken?: string;
  timestamp: number;
};

type RoomJoinedEvent = {
  room: RoomInfo;
  accessToken?: string;
  allPlayers?: Player[];
  timestamp: number;
};

type RoomErrorEvent = {
  message: string;
  timestamp: number;
};

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3003';

const MAX_CHAT_MESSAGES = 200;
const MAX_SYSTEM_MESSAGES = 120;
const MAX_GLOBAL_SYSTEM_MESSAGES = 120;
const MAX_GAME_EVENTS = 150;
const ROOM_ACTION_TIMEOUT_MS = 8000;

function appendLimited<T>(prev: T[], item: T, max: number) {
  const next = [...prev, item];
  return next.length > max ? next.slice(next.length - max) : next;
}

function createEventId(timestamp: number) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `evt-${timestamp}-${crypto.randomUUID()}`;
  }

  return `evt-${timestamp}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeTeamId(team: string): TeamId {
  if (team === 'teamA' || team === 'A') {
    return 'teamA';
  }

  return 'teamB';
}

function normalizeRoomCode(roomCode?: string) {
  const normalized = roomCode?.trim().toUpperCase();
  return normalized || undefined;
}

function normalizePlayer(player: Player): Player {
  return {
    ...player,
    team: normalizeTeamId(player.team),
    roomCode: normalizeRoomCode(player.roomCode),
  };
}

function normalizePlayers(players: Player[]) {
  return players.map(normalizePlayer);
}

function normalizeChatMessage(message: ChatMessage): ChatMessage {
  return {
    ...message,
    team: message.team ? normalizeTeamId(message.team) : undefined,
    roomCode: normalizeRoomCode(message.roomCode),
  };
}

function normalizeGameEvent(event: Omit<GameEvent, 'id'>): Omit<GameEvent, 'id'> {
  return {
    ...event,
    player: {
      ...event.player,
      team: normalizeTeamId(event.player.team),
    },
    targetTeam: event.targetTeam
      ? normalizeTeamId(event.targetTeam)
      : undefined,
  };
}

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [systemMessages, setSystemMessages] = useState<SystemMessage[]>([]);
  const [globalSystemMessages, setGlobalSystemMessages] = useState<
    SystemMessage[]
  >([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [gameEvents, setGameEvents] = useState<GameEvent[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const joinedPayloadRef = useRef<JoinTeamPayload | null>(null);
  const supervisorPayloadRef = useRef<JoinSupervisorPayload | null>(null);

  const resetRoomScopedState = useCallback(() => {
    setAllPlayers([]);
    setChatMessages([]);
    setSystemMessages([]);
    setGlobalSystemMessages([]);
    setTypingUsers([]);
    setGameEvents([]);
    joinedPayloadRef.current = null;
    supervisorPayloadRef.current = null;
  }, []);

  useEffect(() => {
    const socket: Socket = io(SOCKET_URL, {
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    const handleConnect = () => {
      setConnected(true);
      joinedPayloadRef.current = null;
      supervisorPayloadRef.current = null;
    };

    const handleDisconnect = () => {
      setConnected(false);
      joinedPayloadRef.current = null;
      supervisorPayloadRef.current = null;
      setTypingUsers([]);
    };

    const handlePlayersUpdate = (data: { allPlayers?: Player[] } | Player[]) => {
      const players = Array.isArray(data) ? data : data.allPlayers || [];
      setAllPlayers(normalizePlayers(players));
    };

    const handleChatMessage = (data: ChatMessage) => {
      setChatMessages((prev) =>
        appendLimited(
          prev,
          normalizeChatMessage(data),
          MAX_CHAT_MESSAGES,
        ),
      );
    };

    const handleSystemMessage = (data: SystemMessage) => {
      setSystemMessages((prev) =>
        appendLimited(prev, data, MAX_SYSTEM_MESSAGES),
      );
    };

    const handleGlobalSystemMessage = (data: SystemMessage) => {
      setGlobalSystemMessages((prev) =>
        appendLimited(prev, data, MAX_GLOBAL_SYSTEM_MESSAGES),
      );
    };

    const handleTypingUser = (data: TypingUser) => {
      setTypingUsers((prev) => {
        const withoutUser = prev.filter(
          (user) => user.username !== data.username,
        );

        if (!data.isTyping) {
          return withoutUser;
        }

        return [...withoutUser, data];
      });
    };

    const handleGameEvent = (data: Omit<GameEvent, 'id'>) => {
      const normalizedEvent = normalizeGameEvent(data);

      const nextEvent: GameEvent = {
        id: createEventId(normalizedEvent.timestamp),
        ...normalizedEvent,
      };

      setGameEvents((prev) =>
        appendLimited(prev, nextEvent, MAX_GAME_EVENTS),
      );
    };

    const handleScoreChanged = () => {
      window.dispatchEvent(new CustomEvent('cyber:score-changed'));
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('players-update', handlePlayersUpdate);
    socket.on('chat-message', handleChatMessage);
    socket.on('system-message', handleSystemMessage);
    socket.on('global-system-message', handleGlobalSystemMessage);
    socket.on('user-typing', handleTypingUser);
    socket.on('game-event', handleGameEvent);
    socket.on('score-changed', handleScoreChanged);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('players-update', handlePlayersUpdate);
      socket.off('chat-message', handleChatMessage);
      socket.off('system-message', handleSystemMessage);
      socket.off('global-system-message', handleGlobalSystemMessage);
      socket.off('user-typing', handleTypingUser);
      socket.off('game-event', handleGameEvent);
      socket.off('score-changed', handleScoreChanged);

      socket.disconnect();
      socketRef.current = null;
      joinedPayloadRef.current = null;
      supervisorPayloadRef.current = null;
    };
  }, []);

  const waitForRoomResult = useCallback(
    (
      successEvent: 'room-created' | 'room-joined',
    ): Promise<RoomActionResult> => {
      const socket = socketRef.current;

      if (!socket) {
        return Promise.resolve({
          ok: false,
          error: 'Socket connection is not ready.',
        });
      }

      return new Promise<RoomActionResult>((resolve) => {
        let settled = false;

        const cleanup = () => {
          socket.off(successEvent, handleSuccess);
          socket.off('room-error', handleError);
          window.clearTimeout(timeoutId);
        };

        const finish = (result: RoomActionResult) => {
          if (settled) return;

          settled = true;
          cleanup();
          resolve(result);
        };

        const handleSuccess = (data: RoomCreatedEvent | RoomJoinedEvent) => {
          resetRoomScopedState();

          if (successEvent === 'room-joined' && 'allPlayers' in data) {
            setAllPlayers(normalizePlayers(data.allPlayers || []));
          }

          finish({
            ok: true,
            room: {
              code: normalizeRoomCode(data.room.code) || data.room.code,
              name: data.room.name,
              maxPlayersPerTeam: data.room.maxPlayersPerTeam,
              winScore: data.room.winScore,
            },
            accessToken: data.accessToken,
          });
        };

        const handleError = (data: RoomErrorEvent) => {
          finish({
            ok: false,
            error: data.message || 'Room action failed.',
          });
        };

        const timeoutId = window.setTimeout(() => {
          finish({
            ok: false,
            error: 'Room request timed out.',
          });
        }, ROOM_ACTION_TIMEOUT_MS);

        socket.once(successEvent, handleSuccess);
        socket.once('room-error', handleError);
      });
    },
    [resetRoomScopedState],
  );

  const createRoom = useCallback(
    async (data: CreateRoomPayload): Promise<RoomActionResult> => {
      const socket = socketRef.current;

      if (!socket) {
        return {
          ok: false,
          error: 'Socket connection is not ready.',
        };
      }

      const roomCode = normalizeRoomCode(data.roomCode);

      if (!roomCode) {
        return {
          ok: false,
          error: 'Room code is required.',
        };
      }

      if (!data.roomName.trim()) {
        return {
          ok: false,
          error: 'Room name is required.',
        };
      }

      if (!data.password) {
        return {
          ok: false,
          error: 'Room password is required.',
        };
      }

      const resultPromise = waitForRoomResult('room-created');

      socket.emit('create-room', {
        roomCode,
        roomName: data.roomName.trim(),
        password: data.password,
        maxPlayersPerTeam: data.maxPlayersPerTeam,
        winScore: data.winScore,
      });

      return resultPromise;
    },
    [waitForRoomResult],
  );

  const joinRoom = useCallback(
    async (data: JoinRoomPayload): Promise<RoomActionResult> => {
      const socket = socketRef.current;

      if (!socket) {
        return {
          ok: false,
          error: 'Socket connection is not ready.',
        };
      }

      const roomCode = normalizeRoomCode(data.roomCode);

      if (!roomCode) {
        return {
          ok: false,
          error: 'Room code is required.',
        };
      }

      if (!data.password) {
        return {
          ok: false,
          error: 'Room password is required.',
        };
      }

      const resultPromise = waitForRoomResult('room-joined');

      socket.emit('join-room', {
        roomCode,
        password: data.password,
      });

      return resultPromise;
    },
    [waitForRoomResult],
  );

  const restoreRoomAccess = useCallback(
    async (data: RestoreRoomAccessPayload): Promise<RoomActionResult> => {
      const socket = socketRef.current;

      if (!socket) {
        return {
          ok: false,
          error: 'Socket connection is not ready.',
        };
      }

      const roomCode = normalizeRoomCode(data.roomCode);
      const accessToken = data.accessToken.trim();

      if (!roomCode) {
        return {
          ok: false,
          error: 'Room code is required.',
        };
      }

      if (!accessToken) {
        return {
          ok: false,
          error: 'Room access token is required.',
        };
      }

      const resultPromise = waitForRoomResult('room-joined');

      socket.emit('restore-room-access', {
        roomCode,
        accessToken,
      });

      return resultPromise;
    },
    [waitForRoomResult],
  );

  const joinTeam = useCallback(
    (username: string, team: string, role: string, roomCode?: string) => {
      const normalizedUsername = username.trim() || 'Agent';
      const normalizedTeam = normalizeTeamId(team);
      const normalizedRoomCode = normalizeRoomCode(roomCode);

      const nextPayload: JoinTeamPayload = {
        username: normalizedUsername,
        team: normalizedTeam,
        role,
        roomCode: normalizedRoomCode,
      };

      const lastPayload = joinedPayloadRef.current;
      const alreadyJoined =
        lastPayload &&
        lastPayload.username === nextPayload.username &&
        lastPayload.team === nextPayload.team &&
        lastPayload.role === nextPayload.role &&
        lastPayload.roomCode === nextPayload.roomCode;

      if (alreadyJoined) return;

      joinedPayloadRef.current = nextPayload;
      socketRef.current?.emit('join-team', nextPayload);
    },
    [],
  );

  const joinSupervisor = useCallback((username: string, roomCode?: string) => {
    const normalizedUsername = username.trim() || 'Supervisor';
    const normalizedRoomCode = normalizeRoomCode(roomCode);

    const nextPayload: JoinSupervisorPayload = {
      username: normalizedUsername,
      roomCode: normalizedRoomCode,
    };

    const lastPayload = supervisorPayloadRef.current;
    const alreadyJoined =
      lastPayload &&
      lastPayload.username === nextPayload.username &&
      lastPayload.roomCode === nextPayload.roomCode;

    if (alreadyJoined) return;

    supervisorPayloadRef.current = nextPayload;
    joinedPayloadRef.current = null;
    socketRef.current?.emit('join-supervisor', nextPayload);
  }, []);

  const sendChatMessage = useCallback(
    (message: string, team: string, roomCode?: string) => {
      const normalizedMessage = message.trim();

      if (!normalizedMessage) {
        return;
      }

      socketRef.current?.emit('chat-message', {
        message: normalizedMessage,
        team: normalizeTeamId(team),
        roomCode: normalizeRoomCode(roomCode),
      });
    },
    [],
  );

  const sendTyping = useCallback(
    (isTyping: boolean, team: string, roomCode?: string) => {
      socketRef.current?.emit('typing', {
        isTyping,
        team: normalizeTeamId(team),
        roomCode: normalizeRoomCode(roomCode),
      });
    },
    [],
  );

  const emitToolLaunched = useCallback(
    (tool: string, team: string, roomCode?: string) => {
      const normalizedTool = tool.trim();

      if (!normalizedTool) {
        return;
      }

      socketRef.current?.emit('tool-launched', {
        tool: normalizedTool,
        team: normalizeTeamId(team),
        roomCode: normalizeRoomCode(roomCode),
      });
    },
    [],
  );

  const emitAttackEvent = useCallback(
    (team: string, success: boolean, targetTeam: string, roomCode?: string) => {
      socketRef.current?.emit('attack-event', {
        team: normalizeTeamId(team),
        success,
        targetTeam: normalizeTeamId(targetTeam),
        roomCode: normalizeRoomCode(roomCode),
      });
    },
    [],
  );

  const emitDefenseEvent = useCallback((team: string, roomCode?: string) => {
    socketRef.current?.emit('defense-event', {
      team: normalizeTeamId(team),
      roomCode: normalizeRoomCode(roomCode),
    });
  }, []);

  const emitRoomSettingsUpdated = useCallback(
    (roomCode: string, settings: Omit<RoomSettingsPayload, 'roomCode'>) => {
      socketRef.current?.emit('room-settings-updated', {
        roomCode: normalizeRoomCode(roomCode),
        ...settings,
      });
    },
    [],
  );

  const leaveCurrentRoom = useCallback(() => {
    socketRef.current?.emit('leave-room');
    resetRoomScopedState();
  }, [resetRoomScopedState]);

  return {
    connected,
    allPlayers,
    chatMessages,
    systemMessages,
    globalSystemMessages,
    typingUsers,
    gameEvents,
    createRoom,
    joinRoom,
    restoreRoomAccess,
    joinTeam,
    joinSupervisor,
    sendChatMessage,
    sendTyping,
    emitToolLaunched,
    emitAttackEvent,
    emitDefenseEvent,
    emitRoomSettingsUpdated,
    leaveCurrentRoom,
  };
}
