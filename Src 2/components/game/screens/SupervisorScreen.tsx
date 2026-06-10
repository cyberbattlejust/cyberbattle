'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

import CyberParticles from '@/components/game/CyberParticles';
import type {
  ChatMessage,
  GameLogEntry,
  LiveGameEvent,
  MissionEntry,
  PlayerInfo,
  RoomInfo,
  ScoreData,
  TeamId,
} from '@/components/game/types';
import { MISSION_GUIDES } from '@/lib/mission-guides';

type SupervisorScreenProps = {
  username: string;
  userEmail: string;
  connected: boolean;
  activeRoom: RoomInfo | null;
  supervisorRooms: RoomInfo[];
  roomLoading: boolean;
  roomError: string | null;
  allPlayers: PlayerInfo[];
  chatMessages: ChatMessage[];
  gameEvents: LiveGameEvent[];
  onCreateRoom: (data: {
    roomCode: string;
    roomName: string;
    password: string;
    maxPlayersPerTeam?: number;
    winScore?: number;
  }) => void | Promise<void>;
  onJoinRoom: (data: {
    roomCode: string;
    password: string;
  }) => void | Promise<void>;
  onSelectRoom: (room: RoomInfo) => void;
  onOpenRoomManager: () => void;
  onRoomSettingsUpdated: (
    roomCode: string,
    settings: { maxPlayersPerTeam: number; winScore: number },
  ) => void;
  onSendTeamMessage: (team: TeamId, message: string) => void;
  onLogout: () => void;
  onOpenSettings: () => void;
};

const TEAMS: { id: TeamId; name: string; accent: string }[] = [
  { id: 'teamA', name: 'AL-SHLOOL', accent: 'cyan' },
  { id: 'teamB', name: 'BANI YASSEN', accent: 'rose' },
];

const WIN_SCORE = 100;

function makeRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'ROOM-';

  for (let index = 0; index < 4; index += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code;
}

function getTeamName(team: TeamId) {
  return team === 'teamA' ? 'AL-SHLOOL' : 'BANI YASSEN';
}

function parseCompletedBy(value: string | undefined): TeamId[] {
  if (!value || value === 'none') return [];
  if (value === 'both') return ['teamA', 'teamB'];

  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item): item is TeamId => item === 'teamA' || item === 'teamB');
}

export default function SupervisorScreen({
  username,
  userEmail,
  connected,
  activeRoom,
  supervisorRooms,
  roomLoading,
  roomError,
  allPlayers,
  chatMessages,
  gameEvents,
  onCreateRoom,
  onJoinRoom,
  onSelectRoom,
  onOpenRoomManager,
  onRoomSettingsUpdated,
  onSendTeamMessage,
  onLogout,
  onOpenSettings,
}: SupervisorScreenProps) {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [roomCode, setRoomCode] = useState(makeRoomCode);
  const [roomName, setRoomName] = useState('Cyber Battle Session');
  const [roomPassword, setRoomPassword] = useState('');
  const [maxPlayersPerTeam, setMaxPlayersPerTeam] = useState('2');
  const [winScore, setWinScore] = useState('100');
  const [scores, setScores] = useState<ScoreData | null>(null);
  const [missions, setMissions] = useState<MissionEntry[]>([]);
  const [logs, setLogs] = useState<GameLogEntry[]>([]);
  const [scoreLoading, setScoreLoading] = useState(true);
  const [missionLoading, setMissionLoading] = useState(true);
  const [activating, setActivating] = useState<Record<string, boolean>>({});
  const [bulkActivating, setBulkActivating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [roomStatus, setRoomStatus] = useState('waiting');
  const [monitorTeam, setMonitorTeam] = useState<TeamId>('teamA');
  const [monitorMode, setMonitorMode] = useState<'attack' | 'defense'>(
    'attack',
  );

  const normalizedRoomCode = roomCode.trim().toUpperCase();
  const canSubmitRoom =
    normalizedRoomCode.length >= 3 &&
    roomPassword.trim().length >= 3 &&
    Number(maxPlayersPerTeam) >= 1 &&
    Number(winScore) >= 10 &&
    (mode === 'join' || roomName.trim().length >= 3);

  const fetchScores = useCallback(async () => {
    try {
      const query = activeRoom?.code
        ? `?roomCode=${encodeURIComponent(activeRoom.code)}`
        : '';
      const response = await fetch(`/api/score${query}`);
      const data = await response.json();

      if (response.ok && data?.success) {
        setScores(data);
        setRoomStatus(data.status || 'waiting');
      }
    } catch (error) {
      console.error('Supervisor score refresh failed:', error);
    } finally {
      setScoreLoading(false);
    }
  }, [activeRoom?.code]);

  const fetchMissions = useCallback(async () => {
    try {
      const query = activeRoom?.code
        ? `?roomCode=${encodeURIComponent(activeRoom.code)}`
        : '';
      const response = await fetch(`/api/missions${query}`);
      const data = await response.json();

      if (response.ok && Array.isArray(data?.missions)) {
        setMissions(data.missions);
      }
    } catch (error) {
      console.error('Supervisor mission refresh failed:', error);
      toast.error('Failed to load missions.');
    } finally {
      setMissionLoading(false);
    }
  }, [activeRoom?.code]);

  const fetchLogs = useCallback(async () => {
    try {
      const query = activeRoom?.code
        ? `?roomCode=${encodeURIComponent(activeRoom.code)}`
        : '';
      const response = await fetch(`/api/logs${query}`);
      const data = await response.json();

      if (response.ok && Array.isArray(data?.logs)) {
        setLogs(data.logs.slice(0, 8));
      }
    } catch (error) {
      console.error('Supervisor logs refresh failed:', error);
    }
  }, [activeRoom?.code]);

  const refreshAll = useCallback(() => {
    fetchScores();
    fetchMissions();
    fetchLogs();
  }, [fetchLogs, fetchMissions, fetchScores]);

  useEffect(() => {
    refreshAll();

    const intervalId = window.setInterval(refreshAll, 5000);
    const handleScoreChanged = () => refreshAll();

    window.addEventListener('cyber:score-changed', handleScoreChanged);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('cyber:score-changed', handleScoreChanged);
    };
  }, [refreshAll]);

  const missionStats = useMemo(() => {
    const active = missions.filter((mission) => mission.active).length;
    const locked = missions.length - active;
    const completedA = missions.filter((mission) =>
      parseCompletedBy(mission.completedBy).includes('teamA'),
    ).length;
    const completedB = missions.filter((mission) =>
      parseCompletedBy(mission.completedBy).includes('teamB'),
    ).length;

    return { active, locked, completedA, completedB };
  }, [missions]);

  const activateMission = async (missionId: string) => {
    if (roomStatus !== 'playing') {
      toast.error('Start the game before activating missions.');
      return;
    }

    if (!userEmail) {
      toast.error('Supervisor email is missing.');
      return;
    }

    setActivating((prev) => ({ ...prev, [missionId]: true }));

    try {
      const response = await fetch('/api/missions/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          missionId,
          adminEmail: userEmail,
          roomCode: activeRoom?.code,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        toast.error(data.error || 'Failed to activate mission.');
        return;
      }

      toast.success(data.message || 'Mission activated.');
      fetchMissions();
      fetchLogs();
    } catch (error) {
      console.error('Mission activation failed:', error);
      toast.error('Failed to activate mission.');
    } finally {
      setActivating((prev) => ({ ...prev, [missionId]: false }));
    }
  };

  const activateMissionBatch = async (
    filter: 'all' | 'easy' | 'medium' | 'hard' | 'random',
  ) => {
    if (roomStatus !== 'playing') {
      toast.error('Start the game before activating missions.');
      return;
    }

    const lockedMissions = missions.filter((mission) => {
      if (mission.active) return false;
      if (filter === 'all' || filter === 'random') return true;

      return mission.difficulty === filter;
    });

    if (lockedMissions.length === 0) {
      toast.info('No locked missions match this batch.');
      return;
    }

    const missionsToActivate =
      filter === 'random'
        ? [lockedMissions[Math.floor(Math.random() * lockedMissions.length)]]
        : lockedMissions;

    setBulkActivating(true);

    try {
      const failures: string[] = [];
      let activatedCount = 0;

      for (const mission of missionsToActivate) {
        const response = await fetch('/api/missions/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            missionId: mission.id,
            adminEmail: userEmail,
            roomCode: activeRoom?.code,
          }),
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok || data.success === false) {
          failures.push(data.error || mission.title);
          continue;
        }

        activatedCount += 1;
      }

      if (activatedCount > 0) {
        toast.success(`Activated ${activatedCount} mission(s).`);
      }

      if (failures.length > 0) {
        toast.error(`Skipped ${failures.length} mission(s). ${failures[0]}`);
      }

      fetchMissions();
      fetchLogs();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to activate all missions.',
      );
    } finally {
      setBulkActivating(false);
    }
  };

  const activateAllMissions = () => activateMissionBatch('all');

  const resetGame = async () => {
    if (!confirm('Reset all scores, logs, team passwords, and game state?')) {
      return;
    }

    setResetting(true);

    try {
      const response = await fetch('/api/game/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminEmail: userEmail, roomCode: activeRoom?.code }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        toast.error(data.error || 'Failed to reset game.');
        return;
      }

      toast.success(data.message || 'Game reset.');
      window.dispatchEvent(new Event('cyber:score-changed'));
      refreshAll();
    } catch (error) {
      console.error('Supervisor reset failed:', error);
      toast.error('Failed to reset game.');
    } finally {
      setResetting(false);
    }
  };

  const updateRoomStatus = async (
    action: 'start' | 'pause' | 'resume' | 'finish',
  ) => {
    if (!activeRoom?.code || statusUpdating) return;

    setStatusUpdating(true);

    try {
      const response = await fetch('/api/rooms/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: activeRoom.code,
          adminEmail: userEmail,
          action,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        toast.error(data.error || 'Failed to update game status.');
        return;
      }

      const nextStatus = data.room?.status || 'waiting';

      toast.success(data.message || `Game is now ${nextStatus}.`);
      setRoomStatus(nextStatus);
      refreshAll();
      window.dispatchEvent(new Event('cyber:score-changed'));
    } catch (error) {
      console.error('Supervisor status update failed:', error);
      toast.error('Failed to update game status.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const startGame = () => updateRoomStatus('start');

  const submitRoom = async () => {
    if (!canSubmitRoom || roomLoading) return;

    if (mode === 'create') {
      await onCreateRoom({
        roomCode: normalizedRoomCode,
        roomName: roomName.trim(),
        password: roomPassword.trim(),
        maxPlayersPerTeam: Math.max(1, Math.min(10, Number(maxPlayersPerTeam))),
        winScore: Math.max(10, Math.min(1000, Number(winScore))),
      });
      return;
    }

    await onJoinRoom({
      roomCode: normalizedRoomCode,
      password: roomPassword.trim(),
    });
  };

  if (!activeRoom) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen bg-slate-950 p-4 text-white md:p-8"
      >
        <CyberParticles count={18} />

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center">
          <div className="grid w-full gap-6 lg:grid-cols-[1fr_380px]">
            <section className="flex flex-col justify-center">
              <div className="mb-4 inline-flex w-fit rounded-full border border-cyan-400/25 bg-cyan-400/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                Supervisor Console
              </div>

              <h1
                className="max-w-2xl text-4xl font-black uppercase tracking-[0.12em] text-white md:text-6xl"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                Game Control Room
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-400 md:text-base">
                Create the game room, share the code with players, monitor the
                scoreboard, activate missions, and coordinate with both teams
                from one place.
              </p>

              <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
                <Metric label="Scoreboard" value="Live" />
                <Metric label="Team Chats" value="2" />
                <Metric label="Mission Control" value="Admin" />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl shadow-cyan-950/20">
              {supervisorRooms.length > 0 && (
                <div className="mb-5 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <div className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    Open Supervisor Rooms
                  </div>
                  <div className="space-y-2">
                    {supervisorRooms.map((room) => (
                      <button
                        key={room.code}
                        type="button"
                        onClick={() => onSelectRoom(room)}
                        className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-left text-xs text-slate-300 transition hover:border-cyan-400/30 hover:text-white"
                      >
                        <span className="truncate">{room.name}</span>
                        <span className="ml-2 font-mono text-cyan-300">
                          {room.code}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-5 flex rounded-xl border border-slate-800 bg-slate-950 p-1">
                {(['create', 'join'] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setMode(item)}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold capitalize transition ${
                      mode === item
                        ? 'bg-cyan-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <InputField
                  label="Room Code"
                  value={roomCode}
                  onChange={(value) => setRoomCode(value.toUpperCase())}
                  action={
                    mode === 'create' ? (
                      <button
                        type="button"
                        onClick={() => setRoomCode(makeRoomCode())}
                        className="text-xs font-semibold text-cyan-300"
                      >
                        Generate
                      </button>
                    ) : null
                  }
                />

                {mode === 'create' && (
                  <InputField
                    label="Room Name"
                    value={roomName}
                    onChange={setRoomName}
                  />
                )}

                {mode === 'create' && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InputField
                      label="Players / Team"
                      type="number"
                      value={maxPlayersPerTeam}
                      onChange={setMaxPlayersPerTeam}
                    />
                    <InputField
                      label="Win Target"
                      type="number"
                      value={winScore}
                      onChange={setWinScore}
                    />
                  </div>
                )}

                <InputField
                  label="Room Password"
                  type="password"
                  value={roomPassword}
                  onChange={setRoomPassword}
                />

                {roomError && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {roomError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={submitRoom}
                  disabled={!canSubmitRoom || roomLoading}
                  className="w-full rounded-xl bg-cyan-500 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {roomLoading
                    ? 'Processing...'
                    : mode === 'create'
                      ? 'Create Game'
                      : 'Open Console'}
                </button>

                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:border-red-400 hover:text-red-300"
                >
                  Logout
                </button>
              </div>
            </section>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-slate-950 p-3 text-white md:p-5"
    >
      <CyberParticles count={12} />

      <div className="relative z-10 mx-auto max-w-7xl">
        <header className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span
                className={`h-2 w-2 rounded-full ${
                  connected ? 'bg-emerald-400' : 'bg-red-400'
                }`}
              />
              <span>{connected ? 'Socket online' : 'Socket offline'}</span>
              <span className="text-slate-700">|</span>
              <span>{username}</span>
            </div>

            <h1
              className="text-2xl font-black uppercase tracking-[0.14em] text-cyan-300 md:text-3xl"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              Supervisor Dashboard
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {supervisorRooms.length > 0 && (
              <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-1">
                {supervisorRooms.map((room) => (
                  <button
                    key={room.code}
                    type="button"
                    onClick={() => onSelectRoom(room)}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      activeRoom.code === room.code
                        ? 'bg-cyan-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {room.code}
                  </button>
                ))}
              </div>
            )}
            <RoomBadge label="Room" value={activeRoom.name} />
            <RoomBadge label="Code" value={activeRoom.code} strong />
            <button
              type="button"
              onClick={onOpenRoomManager}
              className="rounded-xl border border-purple-400/25 bg-purple-400/10 px-4 py-2 text-sm font-semibold text-purple-200 hover:bg-purple-400/15"
            >
              New / Join Room
            </button>
            <button
              type="button"
              onClick={refreshAll}
              className="rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-400/15"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white"
            >
              Settings
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-xl border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/10"
            >
              Logout
            </button>
          </div>
        </header>

        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <ScorePanel
              scores={scores}
              loading={scoreLoading}
              roomCode={activeRoom.code}
              adminEmail={userEmail}
              onUpdated={refreshAll}
              onRoomSettingsUpdated={onRoomSettingsUpdated}
            />

            <section className="rounded-2xl border border-slate-800 bg-slate-900/65 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-300">
                    Game Controls
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Manage the current match without joining either team.
                  </p>
                </div>
              </div>

              <div className="mb-3 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-400">
                Room status:{' '}
                <span
                  className={
                    roomStatus === 'playing'
                      ? 'font-bold text-emerald-300'
                      : 'font-bold text-amber-300'
                  }
                >
                  {roomStatus.toUpperCase()}
                </span>
                {roomStatus !== 'playing' && roomStatus !== 'paused' && (
                  <span className="ml-2 text-slate-500">
                    Players remain in lobby until Start Game.
                  </span>
                )}
                {roomStatus === 'paused' && (
                  <span className="ml-2 text-slate-500">
                    Tools and missions are temporarily locked.
                  </span>
                )}
              </div>

              <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                <button
                  type="button"
                  onClick={startGame}
                  disabled={
                    statusUpdating ||
                    roomStatus === 'playing' ||
                    roomStatus === 'paused' ||
                    roomStatus === 'finished'
                  }
                  className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200 hover:bg-emerald-500/15 disabled:opacity-50"
                >
                  {roomStatus === 'playing'
                    ? 'Game Running'
                    : statusUpdating
                      ? 'Updating...'
                      : 'Start Game'}
                </button>

                <button
                  type="button"
                  onClick={() => updateRoomStatus('pause')}
                  disabled={statusUpdating || roomStatus !== 'playing'}
                  className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-200 hover:bg-amber-500/15 disabled:opacity-50"
                >
                  Pause
                </button>

                <button
                  type="button"
                  onClick={() => updateRoomStatus('resume')}
                  disabled={statusUpdating || roomStatus !== 'paused'}
                  className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-3 text-sm font-bold text-cyan-200 hover:bg-cyan-500/15 disabled:opacity-50"
                >
                  Resume
                </button>

                <button
                  type="button"
                  onClick={() => updateRoomStatus('finish')}
                  disabled={
                    statusUpdating ||
                    (roomStatus !== 'playing' && roomStatus !== 'paused')
                  }
                  className="rounded-xl border border-orange-500/25 bg-orange-500/10 px-4 py-3 text-sm font-bold text-orange-200 hover:bg-orange-500/15 disabled:opacity-50"
                >
                  Finish
                </button>

                <button
                  type="button"
                  onClick={resetGame}
                  disabled={resetting}
                  className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200 hover:bg-red-500/15 disabled:opacity-50"
                >
                  {resetting ? 'Resetting...' : 'Reset Game'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard
                      ?.writeText(activeRoom.code)
                      .then(() => toast.success('Room code copied.'))
                      .catch(() => toast.error('Could not copy room code.'));
                  }}
                  className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-3 text-sm font-bold text-cyan-200 hover:bg-cyan-500/15"
                >
                  Copy Room Code
                </button>
              </div>
            </section>

            <TeamMonitor
              team={monitorTeam}
              onTeamChange={setMonitorTeam}
              mode={monitorMode}
              onModeChange={setMonitorMode}
              players={allPlayers}
              events={gameEvents}
              messages={chatMessages}
              logs={logs}
              missions={missions}
            />

            <section className="rounded-2xl border border-slate-800 bg-slate-900/65 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-purple-300">
                    Mission Control
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Active {missionStats.active} | Locked {missionStats.locked}
                    | AL-SHLOOL done {missionStats.completedA} | BANI YASSEN
                    done {missionStats.completedB}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fetchMissions}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Sync Missions
                </button>
              </div>

              <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                <button
                  type="button"
                  onClick={() => activateMissionBatch('easy')}
                  disabled={bulkActivating || roomStatus !== 'playing'}
                  className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-500/15 disabled:opacity-50"
                >
                  Activate Easy Batch
                </button>
                <button
                  type="button"
                  onClick={() => activateMissionBatch('medium')}
                  disabled={bulkActivating || roomStatus !== 'playing'}
                  className="rounded-lg border border-yellow-500/25 bg-yellow-500/10 px-3 py-2 text-xs font-bold text-yellow-200 hover:bg-yellow-500/15 disabled:opacity-50"
                >
                  Activate Medium Batch
                </button>
                <button
                  type="button"
                  onClick={() => activateMissionBatch('hard')}
                  disabled={bulkActivating || roomStatus !== 'playing'}
                  className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200 hover:bg-red-500/15 disabled:opacity-50"
                >
                  Activate Hard Batch
                </button>
                <button
                  type="button"
                  onClick={() => activateMissionBatch('random')}
                  disabled={bulkActivating || roomStatus !== 'playing'}
                  className="rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-500/15 disabled:opacity-50"
                >
                  Activate Random Mission
                </button>
                <button
                  type="button"
                  onClick={activateAllMissions}
                  disabled={bulkActivating || roomStatus !== 'playing'}
                  className="rounded-lg border border-purple-500/25 bg-purple-500/10 px-3 py-2 text-xs font-bold text-purple-200 hover:bg-purple-500/15 disabled:opacity-50"
                >
                  {bulkActivating ? 'Activating...' : 'Activate All'}
                </button>
              </div>

              {missionLoading ? (
                <div className="py-8 text-center text-sm text-slate-500">
                  Loading missions...
                </div>
              ) : (
                <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                  {missions.map((mission) => {
                    const completedTeams = parseCompletedBy(
                      mission.completedBy,
                    );

                    return (
                      <div
                        key={mission.id}
                        className="rounded-xl border border-slate-800 bg-slate-950/55 p-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-sm font-bold text-white">
                                {mission.title}
                              </h3>
                              <Badge>{mission.type}</Badge>
                              <Badge>{mission.difficulty}</Badge>
                              <Badge>{mission.points} pts</Badge>
                            </div>

                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                              {mission.description}
                            </p>

                            <p className="mt-2 text-[11px] text-slate-500">
                              Completed:{' '}
                              <span className="text-slate-300">
                                {completedTeams.length
                                  ? completedTeams.map(getTeamName).join(', ')
                                  : 'None'}
                              </span>
                            </p>

                            <div className="mt-2 rounded-lg border border-cyan-400/15 bg-cyan-400/5 p-2 text-[11px] leading-5 text-cyan-100/75">
                              <span className="font-bold text-cyan-300">
                                Supervisor source:
                              </span>{' '}
                              {MISSION_GUIDES[mission.title]?.tool || 'Game tools'} -{' '}
                              {MISSION_GUIDES[mission.title]?.supervisorHint ||
                                'Verify this mission from the matching in-game tool output.'}
                            </div>
                          </div>

                          {mission.active ? (
                            <span className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-300">
                              ACTIVE
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => activateMission(mission.id)}
                              disabled={
                                activating[mission.id] ||
                                roomStatus !== 'playing'
                              }
                              className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                            >
                              {activating[mission.id]
                                ? 'Activating...'
                                : 'Activate'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <SupervisorGuide />

            <section className="rounded-2xl border border-slate-800 bg-slate-900/65 p-4">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-slate-300">
                Recent Events
              </h2>

              <div className="space-y-2">
                {logs.length === 0 ? (
                  <p className="py-4 text-center text-sm text-slate-600">
                    No events yet.
                  </p>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex gap-3 rounded-xl border border-slate-800 bg-slate-950/55 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge>{log.type}</Badge>
                          <span className="text-xs font-bold text-white">
                            {log.action}
                          </span>
                          {log.points > 0 && (
                            <span className="text-[11px] text-yellow-300">
                              +{log.points}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {log.detail}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] text-slate-600">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-1">
            {TEAMS.map((team) => (
              <SupervisorChat
                key={team.id}
                team={team.id}
                teamName={team.name}
                accent={team.accent}
                connected={connected}
                messages={chatMessages.filter(
                  (message) => message.team === team.id,
                )}
                onSend={(message) => onSendTeamMessage(team.id, message)}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-cyan-300">{value}</p>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = 'text',
  action = null,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  action?: ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          {label}
        </span>
        {action}
      </div>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
      />
    </label>
  );
}

function RoomBadge({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
      <span className="mr-2 text-[10px] uppercase tracking-[0.18em] text-slate-500">
        {label}
      </span>
      <span
        className={`text-sm ${strong ? 'font-black text-cyan-300' : 'text-white'}`}
      >
        {value}
      </span>
    </div>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-300">
      {children}
    </span>
  );
}

function ScorePanel({
  scores,
  loading,
  roomCode,
  adminEmail,
  onUpdated,
  onRoomSettingsUpdated,
}: {
  scores: ScoreData | null;
  loading: boolean;
  roomCode: string;
  adminEmail: string;
  onUpdated: () => void;
  onRoomSettingsUpdated: (
    roomCode: string,
    settings: { maxPlayersPerTeam: number; winScore: number },
  ) => void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [draftWinScore, setDraftWinScore] = useState(
    String(scores?.winScore || WIN_SCORE),
  );
  const [draftMaxPlayers, setDraftMaxPlayers] = useState(
    String(scores?.maxPlayersPerTeam || 2),
  );
  const targetScore = scores?.winScore || WIN_SCORE;
  const maxPlayers = scores?.maxPlayersPerTeam || 2;
  const teamATotal = scores
    ? scores.teamA.score.total ??
      (scores.teamA.score.attack || 0) + (scores.teamA.score.defense || 0)
    : 0;
  const teamBTotal = scores
    ? scores.teamB.score.total ??
      (scores.teamB.score.attack || 0) + (scores.teamB.score.defense || 0)
    : 0;
  const winner =
    scores && Math.max(teamATotal, teamBTotal) >= targetScore
      ? teamATotal === teamBTotal
        ? 'Tie'
        : teamATotal > teamBTotal
          ? scores.teamA.displayName || 'AL-SHLOOL'
          : scores.teamB.displayName || 'BANI YASSEN'
      : null;

  useEffect(() => {
    setDraftWinScore(String(scores?.winScore || WIN_SCORE));
    setDraftMaxPlayers(String(scores?.maxPlayersPerTeam || 2));
  }, [scores?.maxPlayersPerTeam, scores?.winScore]);

  const saveSettings = async () => {
    if (settingsSaving) return;

    setSettingsSaving(true);

    try {
      const nextWinScore = Math.max(10, Math.min(1000, Number(draftWinScore)));
      const nextMaxPlayers = Math.max(
        1,
        Math.min(10, Number(draftMaxPlayers)),
      );

      const response = await fetch('/api/rooms/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode,
          adminEmail,
          winScore: nextWinScore,
          maxPlayersPerTeam: nextMaxPlayers,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        toast.error(data.error || 'Failed to update room settings.');
        return;
      }

      toast.success(data.message || 'Room settings updated.');
      onRoomSettingsUpdated(roomCode, {
        maxPlayersPerTeam: nextMaxPlayers,
        winScore: nextWinScore,
      });
      setSettingsOpen(false);
      window.dispatchEvent(new Event('cyber:score-changed'));
      onUpdated();
    } catch (error) {
      console.error('Failed to update room settings:', error);
      toast.error('Failed to update room settings.');
    } finally {
      setSettingsSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/65 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-300">
          Live Scoreboard
        </h2>
        <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
          LIVE
        </span>
      </div>

      <div className="mb-3 rounded-xl border border-cyan-400/20 bg-slate-950/60 px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex flex-wrap gap-4">
            <span>
              Win target:{' '}
              <span className="font-bold text-cyan-300">
                {targetScore} pts
              </span>
            </span>
            <span>
              Players / team:{' '}
              <span className="font-bold text-cyan-300">{maxPlayers}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen((value) => !value)}
            className="rounded-lg border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-[11px] font-bold text-cyan-200 hover:bg-cyan-400/15"
          >
            Edit
          </button>
        </div>

        {settingsOpen && (
          <div className="mt-3 grid gap-3 border-t border-slate-800 pt-3 sm:grid-cols-[1fr_1fr_auto]">
            <InputField
              label="Win Target"
              type="number"
              value={draftWinScore}
              onChange={setDraftWinScore}
            />
            <InputField
              label="Players / Team"
              type="number"
              value={draftMaxPlayers}
              onChange={setDraftMaxPlayers}
            />
            <button
              type="button"
              onClick={saveSettings}
              disabled={settingsSaving}
              className="self-end rounded-xl bg-cyan-500 px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
            >
              {settingsSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}

        {winner && (
          <div className="mt-2 rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-200">
            Winner: {winner}
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-slate-500">
          Loading scores...
        </div>
      ) : !scores ? (
        <div className="py-10 text-center text-sm text-red-300">
          Scoreboard unavailable.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {([
            { key: 'teamA', name: 'AL-SHLOOL', data: scores.teamA },
            { key: 'teamB', name: 'BANI YASSEN', data: scores.teamB },
          ] as const).map((team) => {
            const attack = team.data.score.attack || 0;
            const defense = team.data.score.defense || 0;
            const total = team.data.score.total ?? attack + defense;
            const progress = Math.min(
              100,
              Math.round((total / targetScore) * 100),
            );

            return (
              <div
                key={team.key}
                className="rounded-2xl border border-slate-800 bg-slate-950/65 p-4"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-white">
                      {team.data.displayName || team.name}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      SSID: {team.data.network.ssid}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-900 px-4 py-2 text-2xl font-black text-cyan-300">
                    {total}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <ScoreMini label="Attack" value={attack} color="text-red-300" />
                  <ScoreMini
                    label="Defense"
                    value={defense}
                    color="text-blue-300"
                  />
                </div>

                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-[10px] text-slate-500">
                    <span>Race to {targetScore}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ScoreMini({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-center">
      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className={`mt-1 text-xl font-black ${color}`}>{value}</p>
    </div>
  );
}

function SupervisorGuide() {
  const steps = [
    {
      title: 'Create Room',
      text: 'Set room code, password, team size limit, and win target before players join.',
    },
    {
      title: 'Lobby Check',
      text: 'Wait until both teams finish name, SSID, and password setup. Players stay locked in lobby.',
    },
    {
      title: 'Start Control',
      text: 'Use Start, Pause, Resume, and Finish to control when tools and missions are available.',
    },
    {
      title: 'Mission Flow',
      text: 'Activate batches by difficulty or open random missions. Attempts are logged without revealing answers.',
    },
    {
      title: 'Monitor Teams',
      text: 'Use the read-only monitor to inspect team presence, tool activity, chat, and recent attempts.',
    },
  ];

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/65 p-4">
      <div className="mb-3">
        <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-sky-300">
          Supervisor Guide
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Quick operating checklist for running a match cleanly.
        </p>
      </div>

      <div className="grid gap-2 md:grid-cols-5">
        {steps.map((step, index) => (
          <div
            key={step.title}
            className="rounded-xl border border-slate-800 bg-slate-950/55 p-3"
          >
            <div className="mb-2 flex h-6 w-6 items-center justify-center rounded-lg bg-sky-500/15 text-xs font-black text-sky-300">
              {index + 1}
            </div>
            <h3 className="text-xs font-bold text-white">{step.title}</h3>
            <p className="mt-1 text-[11px] leading-5 text-slate-500">
              {step.text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TeamMonitor({
  team,
  onTeamChange,
  mode,
  onModeChange,
  players,
  events,
  messages,
  logs,
  missions,
}: {
  team: TeamId;
  onTeamChange: (team: TeamId) => void;
  mode: 'attack' | 'defense';
  onModeChange: (mode: 'attack' | 'defense') => void;
  players: PlayerInfo[];
  events: LiveGameEvent[];
  messages: ChatMessage[];
  logs: GameLogEntry[];
  missions: MissionEntry[];
}) {
  const teamPlayers = players.filter((player) => player.team === team);
  const visibleTools =
    mode === 'attack'
      ? ['Wireshark', 'Nmap', 'Metasploit', 'Burp Suite', 'CMD']
      : ['Nessus', 'Malwarebytes', 'Wireshark', 'Nmap', 'CMD'];
  const teamEvents = events
    .filter(
      (event) =>
        event.player.team === team ||
        event.targetTeam === team,
    )
    .slice(-6)
    .reverse();
  const teamMessages = messages
    .filter((message) => message.team === team)
    .slice(-5)
    .reverse();
  const teamLogs = logs
    .filter((log) => log.team === team)
    .slice(0, 5);
  const teamAttempts = logs
    .filter((log) => log.team === team && log.type === 'attempt')
    .slice(0, 6);
  const teamMissionProgress = missions.reduce(
    (stats, mission) => {
      const completedTeams = parseCompletedBy(mission.completedBy);
      if (completedTeams.includes(team)) {
        stats.completed += 1;
        stats.points += mission.points;
      }

      if (mission.active) {
        stats.active += 1;
      }

      return stats;
    },
    { active: 0, completed: 0, points: 0 },
  );

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/65 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-300">
            Team Monitor
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Observe team presence, actions, and chat without becoming a player.
          </p>
        </div>

        <div className="flex rounded-xl border border-slate-800 bg-slate-950 p-1">
          {TEAMS.map((teamItem) => (
            <button
              key={teamItem.id}
              type="button"
              onClick={() => onTeamChange(teamItem.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                team === teamItem.id
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {teamItem.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 grid gap-2 md:grid-cols-4">
        <MonitorMetric label="View" value={mode.toUpperCase()} />
        <MonitorMetric label="Players" value={String(teamPlayers.length)} />
        <MonitorMetric
          label="Active Missions"
          value={String(teamMissionProgress.active)}
        />
        <MonitorMetric
          label="Earned"
          value={`${teamMissionProgress.points} pts`}
        />
      </div>

      <div className="mb-3 flex rounded-xl border border-slate-800 bg-slate-950 p-1">
        {(['attack', 'defense'] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onModeChange(item)}
            className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-bold uppercase transition ${
              mode === item
                ? 'bg-emerald-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {item} View
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        <MonitorColumn title="Players">
          {teamPlayers.length === 0 ? (
            <EmptyMonitorText>No players joined this team yet.</EmptyMonitorText>
          ) : (
            teamPlayers.map((player) => (
              <div
                key={player.id || `${player.username}-${player.role}`}
                className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-bold text-white">
                    {player.username || 'Agent'}
                  </span>
                  <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-300">
                    {player.role || 'player'}
                  </span>
                </div>
              </div>
            ))
          )}
        </MonitorColumn>

        <MonitorColumn title="Read-Only Tools">
          {visibleTools.map((tool) => (
            <div
              key={tool}
              className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"
            >
              <div className="text-xs font-bold text-white">{tool}</div>
              <p className="mt-1 text-[10px] leading-4 text-slate-500">
                Supervisor can observe usage and related logs. Actions stay
                locked from this panel.
              </p>
            </div>
          ))}
        </MonitorColumn>

        <MonitorColumn title="Live Actions">
          {teamEvents.length === 0 && teamLogs.length === 0 ? (
            <EmptyMonitorText>No team actions yet.</EmptyMonitorText>
          ) : (
            <>
              {teamEvents.map((event) => (
                <div
                  key={event.id || `${event.timestamp}-${event.type}`}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase text-emerald-300">
                      {event.type}
                    </span>
                    <span className="text-[10px] text-slate-600">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {event.player.username} {event.success === false
                      ? 'failed'
                      : event.success === true
                        ? 'succeeded'
                        : 'acted'}
                    {event.targetTeam ? ` vs ${getTeamName(event.targetTeam as TeamId)}` : ''}
                  </p>
                </div>
              ))}

              {teamLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"
                >
                  <div className="flex items-center gap-2">
                    <Badge>{log.type}</Badge>
                    <span className="truncate text-xs font-bold text-white">
                      {log.action}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {log.detail}
                  </p>
                </div>
              ))}
            </>
          )}
        </MonitorColumn>

        <MonitorColumn title="Attempts">
          {teamAttempts.length === 0 ? (
            <EmptyMonitorText>No mission attempts yet.</EmptyMonitorText>
          ) : (
            teamAttempts.map((attempt) => (
              <div
                key={attempt.id}
                className={`rounded-xl border p-3 ${
                  attempt.success
                    ? 'border-emerald-500/20 bg-emerald-500/5'
                    : 'border-red-500/20 bg-red-500/5'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs font-bold ${
                      attempt.success ? 'text-emerald-300' : 'text-red-300'
                    }`}
                  >
                    {attempt.success ? 'CORRECT' : 'WRONG'}
                  </span>
                  <span className="text-[10px] text-slate-600">
                    {new Date(attempt.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                  {attempt.detail}
                </p>
              </div>
            ))
          )}
        </MonitorColumn>
      </div>

      <div className="mt-3">
        <MonitorColumn title="Recent Chat">
          {teamMessages.length === 0 ? (
            <EmptyMonitorText>No recent messages.</EmptyMonitorText>
          ) : (
            teamMessages.map((message) => (
              <div
                key={message.id}
                className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`truncate text-xs font-bold ${
                      message.role === 'supervisor'
                        ? 'text-yellow-300'
                        : 'text-white'
                    }`}
                  >
                    {message.role === 'supervisor'
                      ? 'SUPERVISOR'
                      : message.username}
                  </span>
                  <span className="text-[10px] text-slate-600">
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                  {message.message}
                </p>
              </div>
            ))
          )}
        </MonitorColumn>
      </div>
    </section>
  );
}

function MonitorMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-emerald-300">{value}</p>
    </div>
  );
}

function MonitorColumn({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
        {title}
      </h3>
      <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
        {children}
      </div>
    </div>
  );
}

function EmptyMonitorText({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-xs text-slate-600">{children}</p>;
}

function SupervisorChat({
  team,
  teamName,
  accent,
  connected,
  messages,
  onSend,
}: {
  team: TeamId;
  teamName: string;
  accent: string;
  connected: boolean;
  messages: ChatMessage[];
  onSend: (message: string) => void;
}) {
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const send = () => {
    const message = input.trim();
    if (!message || !connected) return;

    onSend(message.slice(0, 600));
    setInput('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      send();
    }
  };

  const borderClass =
    accent === 'cyan' ? 'border-cyan-500/25' : 'border-rose-500/25';
  const titleClass = accent === 'cyan' ? 'text-cyan-300' : 'text-rose-300';
  const buttonClass =
    accent === 'cyan'
      ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
      : 'bg-rose-500 text-white hover:bg-rose-400';

  return (
    <section
      className={`flex min-h-[420px] flex-col rounded-2xl border ${borderClass} bg-slate-900/65`}
    >
      <div className="border-b border-slate-800 p-4">
        <h2
          className={`text-sm font-bold uppercase tracking-[0.16em] ${titleClass}`}
        >
          Chat with {teamName}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Private supervisor channel for {teamName}
        </p>
      </div>

      <div className="max-h-[300px] flex-1 space-y-2 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-600">
            No messages in this team channel yet.
          </div>
        ) : (
          messages.map((message) => {
            const fromSupervisor = message.role === 'supervisor';

            return (
              <div
                key={message.id}
                className={`rounded-xl border px-3 py-2 text-sm ${
                  fromSupervisor
                    ? 'ml-6 border-cyan-500/20 bg-cyan-500/10'
                    : 'mr-6 border-slate-800 bg-slate-950/70'
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span
                    className={`text-xs font-bold ${
                      fromSupervisor ? 'text-cyan-300' : 'text-slate-300'
                    }`}
                  >
                    {fromSupervisor ? 'Supervisor' : message.username}
                  </span>
                  <span className="text-[10px] text-slate-600">
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="break-words leading-5 text-slate-300">
                  {message.message}
                </p>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-slate-800 p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!connected}
            maxLength={600}
            placeholder={connected ? `Message ${teamName}` : 'Connecting...'}
            className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={send}
            disabled={!connected || !input.trim()}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${buttonClass}`}
          >
            Send
          </button>
        </div>
      </div>
    </section>
  );
}
