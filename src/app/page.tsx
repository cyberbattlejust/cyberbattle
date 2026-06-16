'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';

import { useSocket } from '@/hooks/useSocket';
import { useGameMusic } from '@/hooks/useGameMusic';

import type {
  BattleRole,
  GameView,
  RoomInfo,
  TeamId,
} from '@/components/game/types';

import MusicPlayer from '@/components/game/MusicPlayer';
import ScanlineOverlay from '@/components/game/ScanlineOverlay';
import ConnectionStatus from '@/components/game/ConnectionStatus';
import LiveEventsFeed from '@/components/game/LiveEventsFeed';

import IntroScreen from '@/components/game/screens/IntroScreen';
import RegisterScreen from '@/components/game/screens/RegisterScreen';
import LoginScreen from '@/components/game/screens/LoginScreen';
import RoomScreen from '@/components/game/screens/RoomScreen';
import TeamScreen from '@/components/game/screens/TeamScreen';
import TeamSetupScreen from '@/components/game/screens/TeamSetupScreen';
import LobbyScreen from '@/components/game/screens/LobbyScreen';
import RoleScreen from '@/components/game/screens/RoleScreen';
import AttackScreen from '@/components/game/screens/AttackScreen';
import DefenseScreen from '@/components/game/screens/DefenseScreen';
import ScoreboardScreen from '@/components/game/screens/ScoreboardScreen';
import LogsScreen from '@/components/game/screens/LogsScreen';
import MissionsScreen from '@/components/game/screens/MissionsScreen';
import SupervisorScreen from '@/components/game/screens/SupervisorScreen';

type RoomActionResult = {
  ok: boolean;
  room?: RoomInfo;
  accessToken?: string;
  error?: string;
};

type SocketWithRoomActions = ReturnType<typeof useSocket> & {
  createRoom: (data: {
    roomCode: string;
    roomName: string;
    password: string;
    maxPlayersPerTeam?: number;
    winScore?: number;
  }) => Promise<RoomActionResult>;
  joinRoom: (data: {
    roomCode: string;
    password: string;
  }) => Promise<RoomActionResult>;
  restoreRoomAccess: (data: {
    roomCode: string;
    accessToken: string;
  }) => Promise<RoomActionResult>;
  joinSupervisor: (username: string, roomCode?: string) => void;
  emitRoomSettingsUpdated: (
    roomCode: string,
    settings: { maxPlayersPerTeam: number; winScore: number },
  ) => void;
};

type PersistedGameSession = {
  view: GameView;
  battleView: BattleRole | null;
  team: TeamId | null;
  username: string;
  userEmail: string;
  accountRole: string;
  activeRoom: RoomInfo | null;
  supervisorRooms: RoomInfo[];
  roomAccessToken: string;
  supervisorRoomAccessTokens: Record<string, string>;
};

const SESSION_STORAGE_KEY = 'cyber-battle-tab-session:v2';

const RESTORABLE_VIEWS: GameView[] = [
  'intro',
  'register',
  'login',
  'room',
  'supervisor',
  'team',
  'team-setup',
  'lobby',
  'role',
  'attack',
  'defense',
  'score',
  'logs',
  'missions',
];

function isSupervisorRole(role: string) {
  return role === 'admin' || role === 'supervisor';
}

function isGameView(value: unknown): value is GameView {
  return typeof value === 'string' && RESTORABLE_VIEWS.includes(value as GameView);
}

function isBattleRole(value: unknown): value is BattleRole {
  return value === 'attack' || value === 'defense';
}

function isTeamId(value: unknown): value is TeamId {
  return value === 'teamA' || value === 'teamB';
}

function readPersistedSession(): PersistedGameSession | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PersistedGameSession>;

    const supervisorRooms = Array.isArray(parsed.supervisorRooms)
      ? parsed.supervisorRooms.filter(
          (room): room is RoomInfo =>
            Boolean(
              room &&
                typeof room.code === 'string' &&
                typeof room.name === 'string',
            ),
        )
      : [];
    const activeRoom =
      parsed.activeRoom &&
      typeof parsed.activeRoom.code === 'string' &&
      typeof parsed.activeRoom.name === 'string'
        ? parsed.activeRoom
        : null;
    const restoredView = isGameView(parsed.view) ? parsed.view : 'login';
    const view =
      restoredView === 'supervisor' && !activeRoom && supervisorRooms.length === 0
        ? 'room'
        : restoredView;

    return {
      view,
      battleView: isBattleRole(parsed.battleView) ? parsed.battleView : null,
      team: isTeamId(parsed.team) ? parsed.team : null,
      username:
        typeof parsed.username === 'string' && parsed.username.trim()
          ? parsed.username
          : 'Agent',
      userEmail:
        typeof parsed.userEmail === 'string' ? parsed.userEmail : '',
      accountRole:
        typeof parsed.accountRole === 'string' && parsed.accountRole.trim()
          ? parsed.accountRole
          : 'player',
      activeRoom,
      supervisorRooms,
      roomAccessToken:
        typeof parsed.roomAccessToken === 'string' ? parsed.roomAccessToken : '',
      supervisorRoomAccessTokens:
        parsed.supervisorRoomAccessTokens &&
        typeof parsed.supervisorRoomAccessTokens === 'object' &&
        !Array.isArray(parsed.supervisorRoomAccessTokens)
          ? Object.fromEntries(
              Object.entries(parsed.supervisorRoomAccessTokens).filter(
                (entry): entry is [string, string] =>
                  typeof entry[0] === 'string' && typeof entry[1] === 'string',
              ),
            )
          : {},
    };
  } catch (error) {
    console.warn('Failed to restore game session:', error);
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

function writePersistedSession(session: PersistedGameSession) {
  if (typeof window === 'undefined') return;

  window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function clearPersistedSession() {
  if (typeof window === 'undefined') return;

  window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

export default function CyberGamePage() {
  const [view, setView] = useState<GameView>('intro');
  const [battleView, setBattleView] = useState<BattleRole | null>(null);

  const [team, setTeam] = useState<TeamId | null>(null);
  const [username, setUsername] = useState('Agent');
  const [userEmail, setUserEmail] = useState('');
  const [accountRole, setAccountRole] = useState('player');

  const [activeRoom, setActiveRoom] = useState<RoomInfo | null>(null);
  const [supervisorRooms, setSupervisorRooms] = useState<RoomInfo[]>([]);
  const [roomAccessToken, setRoomAccessToken] = useState('');
  const [supervisorRoomAccessTokens, setSupervisorRoomAccessTokens] = useState<
    Record<string, string>
  >({});
  const [roomAccessReady, setRoomAccessReady] = useState(false);
  const [roomLoading, setRoomLoading] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [sessionHydrated, setSessionHydrated] = useState(false);

  const socket = useSocket() as SocketWithRoomActions;
  const activeRoomCode = activeRoom?.code;
  const music = useGameMusic({
    view,
    authenticated: Boolean(userEmail),
    roomCode: activeRoomCode,
  });
  const roomAccessKeyRef = useRef('');

  const currentTeam: TeamId = team || 'teamA';

  useEffect(() => {
    const saved = readPersistedSession();

    if (saved?.userEmail) {
      setView(saved.view);
      setBattleView(saved.battleView);
      setTeam(saved.team);
      setUsername(saved.username);
      setUserEmail(saved.userEmail);
      setAccountRole(saved.accountRole);
      setActiveRoom(saved.activeRoom);
      setSupervisorRooms(saved.supervisorRooms);
      setRoomAccessToken(saved.roomAccessToken);
      setSupervisorRoomAccessTokens(saved.supervisorRoomAccessTokens);
    }

    setSessionHydrated(true);
  }, []);

  useEffect(() => {
    if (!sessionHydrated) return;

    if (!userEmail) {
      clearPersistedSession();
      return;
    }

    writePersistedSession({
      view,
      battleView,
      team,
      username,
      userEmail,
      accountRole,
      activeRoom,
      supervisorRooms,
      roomAccessToken,
      supervisorRoomAccessTokens,
    });
  }, [
    accountRole,
    activeRoom,
    battleView,
    roomAccessToken,
    supervisorRoomAccessTokens,
    supervisorRooms,
    team,
    userEmail,
    username,
    view,
    sessionHydrated,
  ]);

  useEffect(() => {
    if (!activeRoomCode) {
      setRoomAccessReady(false);
      roomAccessKeyRef.current = '';
      return;
    }

    if (!socket.connected) {
      setRoomAccessReady(false);
      roomAccessKeyRef.current = '';
      return;
    }

    if (!roomAccessToken) {
      setRoomAccessReady(false);
      return;
    }

    const accessKey = `${activeRoomCode}:${roomAccessToken}`;
    if (roomAccessKeyRef.current === accessKey && roomAccessReady) return;

    let cancelled = false;
    setRoomAccessReady(false);

    socket
      .restoreRoomAccess({
        roomCode: activeRoomCode,
        accessToken: roomAccessToken,
      })
      .then((result) => {
        if (cancelled) return;

        if (result.ok) {
          roomAccessKeyRef.current = accessKey;
          if (result.accessToken && result.accessToken !== roomAccessToken) {
            setRoomAccessToken(result.accessToken);
          }
          setRoomAccessReady(true);
          setRoomError(null);
          return;
        }

        setRoomError(result.error || 'Failed to restore room access.');
      })
      .catch((error) => {
        if (cancelled) return;

        console.error('Failed to restore room access:', error);
        setRoomError('Failed to restore room access.');
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeRoomCode,
    roomAccessReady,
    roomAccessToken,
    socket,
    socket.connected,
  ]);

  useEffect(() => {
    if (!socket.connected || !team || !activeRoomCode || !roomAccessReady) return;

    socket.joinTeam(username, team, battleView || 'lobby', activeRoomCode);
  }, [
    socket.connected,
    socket.joinTeam,
    username,
    team,
    battleView,
    activeRoomCode,
    roomAccessReady,
  ]);

  useEffect(() => {
    if (
      !socket.connected ||
      view !== 'supervisor' ||
      !activeRoomCode ||
      !roomAccessReady
    ) {
      return;
    }

    socket.joinSupervisor(username, activeRoomCode);
  }, [
    socket.connected,
    socket.joinSupervisor,
    username,
    view,
    activeRoomCode,
    roomAccessReady,
  ]);

  const goToAttack = useCallback(() => {
    setBattleView('attack');
    setView('attack');
  }, []);

  const goToDefense = useCallback(() => {
    setBattleView('defense');
    setView('defense');
  }, []);

  const handleLogin = useCallback((email: string, role: string) => {
    setUsername(email.split('@')[0] || 'Agent');
    setUserEmail(email);
    setAccountRole(role);
    setTeam(null);
    setBattleView(null);
    setActiveRoom(null);
    setSupervisorRooms([]);
    setRoomAccessToken('');
    setSupervisorRoomAccessTokens({});
    setRoomAccessReady(false);
    roomAccessKeyRef.current = '';
    setRoomError(null);
    setShowSettings(false);
    setView('room');
  }, []);

  const handleSkipIntro = useCallback(() => {
    setView('login');
  }, []);

  const handleGoToRegister = useCallback(() => {
    setView('register');
  }, []);

  const handleGoToLogin = useCallback(() => {
    setView('login');
  }, []);

  const handleBackFromRoom = useCallback(() => {
    setRoomError(null);
    setActiveRoom(null);
    setRoomAccessToken('');
    setRoomAccessReady(false);
    roomAccessKeyRef.current = '';
    setView('login');
  }, []);

  const handleCreateRoom = useCallback(
    async (data: {
      roomCode: string;
      roomName: string;
      password: string;
      maxPlayersPerTeam?: number;
      winScore?: number;
    }) => {
      setRoomLoading(true);
      setRoomError(null);

      try {
        const result = await socket.createRoom(data);

        if (!result.ok || !result.room) {
          setRoomError(result.error || 'Failed to create room.');
          return;
        }

        const createdRoom = result.room;
        const accessToken = result.accessToken || '';

        if (!accessToken) {
          setRoomError('Room was created, but secure room access was not issued.');
          return;
        }

        setActiveRoom(createdRoom);
        setSupervisorRooms((previous) => {
          const withoutRoom = previous.filter(
            (room) => room.code !== createdRoom.code,
          );
          return [...withoutRoom, createdRoom];
        });
        setRoomAccessToken(accessToken);
        setSupervisorRoomAccessTokens((previous) => ({
          ...previous,
          [createdRoom.code]: accessToken,
        }));
        setRoomAccessReady(true);
        roomAccessKeyRef.current = `${createdRoom.code}:${accessToken}`;
        setTeam(null);
        setBattleView(null);
        setAccountRole('supervisor');

        await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomCode: createdRoom.code,
            name: createdRoom.name,
            creator: userEmail,
            status: 'waiting',
            maxPlayersPerTeam: data.maxPlayersPerTeam,
            winScore: data.winScore,
          }),
        }).catch((error) => {
          console.error('Failed to persist room session:', error);
        });

        if (userEmail) {
          const supervisorResponse = await fetch('/api/auth/supervisor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail }),
          });

          if (!supervisorResponse.ok) {
            console.warn('Failed to persist supervisor role.');
          }
        }

        setView('supervisor');
      } catch (error) {
        console.error('Failed to create room:', error);
        setRoomError('Failed to create room.');
      } finally {
        setRoomLoading(false);
      }
    },
    [socket, userEmail],
  );

  const joinRoomWithDestination = useCallback(
    async (
      data: { roomCode: string; password: string },
      destination: 'player' | 'supervisor',
    ) => {
      setRoomLoading(true);
      setRoomError(null);

      try {
        const result = await socket.joinRoom(data);

        if (!result.ok || !result.room) {
          setRoomError(result.error || 'Failed to join room.');
          return;
        }

        const joinedRoom = result.room;
        const accessToken = result.accessToken || '';

        if (!accessToken) {
          setRoomError('Room joined, but secure room access was not issued.');
          return;
        }

        setActiveRoom(joinedRoom);
        setRoomAccessToken(accessToken);
        if (destination === 'supervisor') {
          setSupervisorRooms((previous) => {
            const withoutRoom = previous.filter(
              (room) => room.code !== joinedRoom.code,
            );
            return [...withoutRoom, joinedRoom];
          });
          setSupervisorRoomAccessTokens((previous) => ({
            ...previous,
            [joinedRoom.code]: accessToken,
          }));
        }
        setRoomAccessReady(true);
        roomAccessKeyRef.current = `${joinedRoom.code}:${accessToken}`;
        setTeam(null);
        setBattleView(null);
        setView(destination === 'supervisor' ? 'supervisor' : 'team');
      } catch (error) {
        console.error('Failed to join room:', error);
        setRoomError('Failed to join room.');
      } finally {
        setRoomLoading(false);
      }
    },
    [socket],
  );

  const handleJoinRoomAsPlayer = useCallback(
    (data: { roomCode: string; password: string }) =>
      joinRoomWithDestination(data, 'player'),
    [joinRoomWithDestination],
  );

  const handleJoinRoomAsSupervisor = useCallback(
    (data: { roomCode: string; password: string }) =>
      joinRoomWithDestination(data, 'supervisor'),
    [joinRoomWithDestination],
  );

  const handleSelectTeam = useCallback(
    async (selectedTeam: TeamId) => {
      setTeam(selectedTeam);
      setBattleView(null);

      if (!activeRoomCode) {
        setView('team-setup');
        return;
      }

      try {
        const leaderResponse = await fetch('/api/rooms/team-leader', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomCode: activeRoomCode,
            team: selectedTeam,
            username,
          }),
        });
        const leaderData = await leaderResponse.json().catch(() => ({}));

        const response = await fetch(
          `/api/score?roomCode=${encodeURIComponent(activeRoomCode)}`,
        );
        const data = await response.json();
        const selectedTeamData =
          selectedTeam === 'teamA' ? data?.teamA : data?.teamB;

        const isLeader =
          leaderResponse.ok &&
          leaderData?.isLeader !== false &&
          (!selectedTeamData?.leaderUsername ||
            selectedTeamData.leaderUsername.toLowerCase() ===
              username.toLowerCase());

        setView(
          selectedTeamData?.configured || !isLeader ? 'lobby' : 'team-setup',
        );
      } catch (error) {
        console.error('Failed to check team setup status:', error);
        setView('team-setup');
      }
    },
    [activeRoomCode, username],
  );

  const handleSelectRole = useCallback(
    (role: BattleRole) => {
      if (role === 'attack') {
        goToAttack();
        return;
      }

      goToDefense();
    },
    [goToAttack, goToDefense],
  );

  const handleLogout = useCallback(() => {
    if (!confirm('Logout?')) return;

    socket.leaveCurrentRoom();
    setTeam(null);
    setUsername('Agent');
    setUserEmail('');
    setAccountRole('player');
    setBattleView(null);
    setActiveRoom(null);
    setSupervisorRooms([]);
    setRoomAccessToken('');
    setSupervisorRoomAccessTokens({});
    setRoomAccessReady(false);
    roomAccessKeyRef.current = '';
    setRoomError(null);
    setShowSettings(false);
    clearPersistedSession();
    setView('login');
  }, [socket]);

  const handleBackToBattle = useCallback(() => {
    if (battleView === 'defense') {
      setView('defense');
      return;
    }

    if (battleView === 'attack') {
      setView('attack');
      return;
    }

    setView(activeRoom ? 'team' : 'login');
  }, [battleView, activeRoom]);

  const handleUpdateUsername = useCallback((nextUsername: string) => {
    const normalized = nextUsername.trim().slice(0, 40);
    setUsername(normalized || 'Agent');
  }, []);

  const handleSelectSupervisorRoom = useCallback(
    (room: RoomInfo) => {
      setActiveRoom(room);
      setRoomAccessToken(supervisorRoomAccessTokens[room.code] || '');
      setRoomAccessReady(false);
      roomAccessKeyRef.current = '';
      setTeam(null);
      setBattleView(null);
      setRoomError(null);
      setView('supervisor');
    },
    [supervisorRoomAccessTokens],
  );

  const handleOpenSupervisorRoomManager = useCallback(() => {
    setActiveRoom(null);
    setRoomAccessToken('');
    setRoomAccessReady(false);
    roomAccessKeyRef.current = '';
    setTeam(null);
    setBattleView(null);
    setRoomError(null);
    setView('supervisor');
  }, []);

  const commonProps = {
    connected: socket.connected,
    chatMessages: socket.chatMessages,
    systemMessages: socket.systemMessages,
    typingUsers: socket.typingUsers,
    onSendMessage: (message: string) =>
      socket.sendChatMessage(message, currentTeam, activeRoomCode),
    onTyping: (value: boolean) =>
      socket.sendTyping(value, currentTeam, activeRoomCode),
    onEmitTool: (tool: string) =>
      socket.emitToolLaunched(tool, currentTeam, activeRoomCode),
  };

  const showConnectionStatus =
    view !== 'intro' &&
    view !== 'register' &&
    view !== 'login' &&
    view !== 'room' &&
    view !== 'supervisor';

  const showLiveEvents = view === 'attack' || view === 'defense';

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950 text-white">
      <ScanlineOverlay />

      {showConnectionStatus && (
        <ConnectionStatus
          connected={socket.connected}
          allPlayers={socket.allPlayers}
        />
      )}

      {showLiveEvents && (
        <LiveEventsFeed
          events={socket.gameEvents}
          globalSystemMessages={socket.globalSystemMessages}
        />
      )}

      {showSettings && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-cyan-400/20 bg-slate-900 p-6 shadow-2xl shadow-cyan-950/60">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-cyan-300">Settings</h2>

              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="rounded-lg border border-slate-700 px-3 py-1 text-sm text-slate-300 hover:bg-slate-800"
              >
                Close
              </button>
            </div>

            <div className="space-y-5">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="mb-2 text-sm font-semibold text-slate-200">
                  Audio
                </div>

                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-400">
                    Background music
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      if (!music.initialized) {
                        music.init();
                        return;
                      }

                      music.setMuted(!music.muted);
                    }}
                    className="rounded-lg border border-cyan-400/30 px-3 py-1.5 text-sm text-cyan-300 hover:bg-slate-800"
                  >
                    {!music.initialized
                      ? 'Start'
                      : music.muted
                        ? 'Unmute'
                        : 'Mute'}
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm text-slate-400">
                    Volume: {Math.round(music.volume * 100)}%
                  </label>

                  <input
                    type="range"
                    min={0}
                    max={0.6}
                    step={0.01}
                    value={music.volume}
                    onChange={(event) =>
                      music.setVolume(Number(event.target.value))
                    }
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div className="mt-3 text-xs text-slate-500">
                  Music starts after the first user interaction because browsers
                  usually block autoplay.
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="mb-2 text-sm font-semibold text-slate-200">
                  Session
                </div>

                <div className="space-y-1 text-sm text-slate-400">
                  <div>
                    Display name
                    <input
                      type="text"
                      value={username}
                      onChange={(event) =>
                        handleUpdateUsername(event.target.value)
                      }
                      maxLength={40}
                      className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    Email:{' '}
                    <span className="text-slate-200">
                      {userEmail || '-'}
                    </span>
                  </div>

                  <div>
                    Room:{' '}
                    <span className="text-slate-200">
                      {activeRoom
                        ? `${activeRoom.name} (${activeRoom.code})`
                        : '-'}
                    </span>
                  </div>

                  <div>
                    Team:{' '}
                    <span className="text-slate-200">{team || '-'}</span>
                  </div>

                  <div>
                    Battle mode:{' '}
                    <span className="text-slate-200">
                      {battleView || '-'}
                    </span>
                  </div>

                  <div>
                    Account role:{' '}
                    <span className="text-slate-200">{accountRole}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {view === 'intro' && (
          <IntroScreen key="intro" onSkip={handleSkipIntro} />
        )}

        {view === 'register' && (
          <RegisterScreen key="register" onGoToLogin={handleGoToLogin} />
        )}

        {view === 'login' && (
          <LoginScreen
            key="login"
            onLogin={handleLogin}
            onGoToRegister={handleGoToRegister}
          />
        )}

        {view === 'supervisor' && (
          <SupervisorScreen
            key="supervisor"
            username={username}
            userEmail={userEmail}
            connected={socket.connected}
            activeRoom={activeRoom}
            supervisorRooms={supervisorRooms}
            roomLoading={roomLoading}
            roomError={roomError}
            allPlayers={socket.allPlayers}
            chatMessages={socket.chatMessages}
            gameEvents={socket.gameEvents}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoomAsSupervisor}
            onSelectRoom={handleSelectSupervisorRoom}
            onOpenRoomManager={handleOpenSupervisorRoomManager}
            onRoomSettingsUpdated={socket.emitRoomSettingsUpdated}
            onSendTeamMessage={(targetTeam, message) =>
              socket.sendChatMessage(message, targetTeam, activeRoomCode)
            }
            onLogout={handleLogout}
            onOpenSettings={() => setShowSettings(true)}
          />
        )}

        {view === 'room' && (
          <RoomScreen
            key="room"
            username={username}
            userEmail={userEmail}
            accountRole={accountRole}
            onUsernameChange={handleUpdateUsername}
            loading={roomLoading}
            error={roomError}
            onBack={handleBackFromRoom}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoomAsPlayer}
            onJoinSupervisorRoom={handleJoinRoomAsSupervisor}
          />
        )}

        {view === 'team' && (
          <TeamScreen
            key="team"
            onSelectTeam={handleSelectTeam}
            connected={socket.connected}
            allPlayers={socket.allPlayers}
            activeRoom={activeRoom}
            onBackToRoom={() => setView('room')}
          />
        )}

        {view === 'team-setup' && team && (
          <TeamSetupScreen
            key="team-setup"
            team={team}
            username={username}
            onUsernameChange={handleUpdateUsername}
            activeRoom={activeRoom}
            onBack={() => setView('team')}
            onContinue={() => setView('lobby')}
          />
        )}

        {view === 'lobby' && team && activeRoom && (
          <LobbyScreen
            key="lobby"
            username={username}
            team={team}
            activeRoom={activeRoom}
            allPlayers={socket.allPlayers}
            onBackToTeamSetup={() => setView('team-setup')}
            onGameStarted={() => setView('role')}
          />
        )}

        {view === 'role' && team && (
          <RoleScreen
            key="role"
            team={team}
            activeRoom={activeRoom}
            onSelectRole={handleSelectRole}
            onBack={() => setView('team')}
          />
        )}

        {view === 'attack' && team && (
          <AttackScreen
            key="attack"
            team={team}
            username={username}
            activeRoom={activeRoom}
            onSwitchToDefense={goToDefense}
            onViewScore={() => setView('score')}
            onLogout={handleLogout}
            onGoToLogs={() => setView('logs')}
            onGoToMissions={() => setView('missions')}
            onOpenSettings={() => setShowSettings(true)}
            onEmitAttack={(selectedTeam, success, targetTeam) =>
              socket.emitAttackEvent(
                selectedTeam,
                success,
                targetTeam,
                activeRoomCode,
              )
            }
            {...commonProps}
          />
        )}

        {view === 'defense' && team && (
          <DefenseScreen
            key="defense"
            team={team}
            username={username}
            activeRoom={activeRoom}
            onSwitchToAttack={goToAttack}
            onViewScore={() => setView('score')}
            onLogout={handleLogout}
            onGoToLogs={() => setView('logs')}
            onGoToMissions={() => setView('missions')}
            onOpenSettings={() => setShowSettings(true)}
            onEmitDefense={(selectedTeam) =>
              socket.emitDefenseEvent(selectedTeam, activeRoomCode)
            }
            {...commonProps}
          />
        )}

        {view === 'score' && (
          <ScoreboardScreen
            key="score"
            onBack={handleBackToBattle}
            connected={socket.connected}
            allPlayers={socket.allPlayers}
            userRole={accountRole}
            userEmail={userEmail}
            roomCode={activeRoomCode}
          />
        )}

        {view === 'logs' && (
          <LogsScreen
            key="logs"
            roomCode={activeRoomCode}
            onBack={handleBackToBattle}
          />
        )}

        {view === 'missions' && team && (
          <MissionsScreen
            key="missions"
            team={team}
            userEmail={userEmail}
            username={username}
            userRole={accountRole}
            roomCode={activeRoomCode}
            onBack={handleBackToBattle}
          />
        )}
      </AnimatePresence>

      <MusicPlayer
        active={music.active}
        initialized={music.initialized}
        phase={music.phase}
        muted={music.muted}
        volume={music.volume}
        onInit={music.init}
        onToggleMute={() => music.setMuted(!music.muted)}
        onVolumeChange={music.setVolume}
      />
    </div>
  );
}
