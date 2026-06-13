'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

import type { RoomAccessForm } from '@/components/game/types';

type RoomMode = 'join' | 'create';

type ListedRoom = {
  code: string;
  name: string;
  status: string;
  winScore: number;
  maxPlayersPerTeam: number;
  teamAConfigured: boolean;
  teamBConfigured: boolean;
};

interface RoomScreenProps {
  username?: string;
  onUsernameChange?: (username: string) => void;
  loading?: boolean;
  error?: string | null;
  defaultMode?: RoomMode;
  onBack: () => void;
  onCreateRoom: (
    data: Required<Pick<RoomAccessForm, 'roomCode' | 'password' | 'roomName'>> &
      Pick<RoomAccessForm, 'maxPlayersPerTeam' | 'winScore'>,
  ) => void | Promise<void>;
  onJoinRoom: (data: Pick<RoomAccessForm, 'roomCode' | 'password'>) => void | Promise<void>;
}

export default function RoomScreen({
  username = 'Agent',
  onUsernameChange,
  loading = false,
  error = null,
  defaultMode = 'join',
  onBack,
  onCreateRoom,
  onJoinRoom,
}: RoomScreenProps) {
  const [mode, setMode] = useState<RoomMode>(defaultMode);
  const [roomCode, setRoomCode] = useState('');
  const [roomName, setRoomName] = useState('');
  const [password, setPassword] = useState('');
  const [maxPlayersPerTeam, setMaxPlayersPerTeam] = useState('2');
  const [winScore, setWinScore] = useState('100');
  const [rooms, setRooms] = useState<ListedRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);

  const normalizedRoomCode = useMemo(() => {
    return roomCode.trim().toUpperCase();
  }, [roomCode]);

  const canJoin = normalizedRoomCode.length >= 3 && password.trim().length >= 3;
  const canCreate =
    normalizedRoomCode.length >= 3 &&
    roomName.trim().length >= 3 &&
    password.trim().length >= 3 &&
    Number(maxPlayersPerTeam) >= 1 &&
    Number(winScore) >= 10;

  const fetchRooms = async () => {
    setRoomsLoading(true);

    try {
      const response = await fetch('/api/rooms');
      const data = await response.json();

      if (response.ok && Array.isArray(data.rooms)) {
        setRooms(data.rooms);
      }
    } catch (error) {
      console.error('Failed to load rooms:', error);
    } finally {
      setRoomsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleSubmit = async () => {
    if (loading) return;

    if (mode === 'join') {
      if (!canJoin) return;

      await onJoinRoom({
        roomCode: normalizedRoomCode,
        password: password.trim(),
      });

      return;
    }

    if (!canCreate) return;

    await onCreateRoom({
      roomCode: normalizedRoomCode,
      roomName: roomName.trim(),
      password: password.trim(),
      maxPlayersPerTeam: Math.max(1, Math.min(10, Number(maxPlayersPerTeam))),
      winScore: Math.max(10, Math.min(1000, Number(winScore))),
    });
  };

  return (
    <motion.div
      key="room-screen"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      transition={{ duration: 0.35 }}
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10"
    >
      <div className="pointer-events-none absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.16),transparent_30%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.12),transparent_35%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(56,189,248,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(56,189,248,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <div className="relative z-10 w-full max-w-3xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.28 }}
          className="overflow-hidden rounded-3xl border border-cyan-400/20 bg-slate-950/85 shadow-[0_0_60px_rgba(8,145,178,0.12)] backdrop-blur-xl"
        >
          <div className="border-b border-cyan-400/10 bg-slate-900/80 px-6 py-5 md:px-8">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-300">
                  Secure Session Gateway
                </div>

                <h1
                  className="text-3xl font-black uppercase tracking-[0.14em] text-white md:text-4xl"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  Room Access
                </h1>

                <p className="mt-2 text-sm text-slate-400 md:text-base">
                  Welcome, <span className="font-semibold text-cyan-300">{username}</span>.
                  Create a private battle room or join an existing one using room code and password.
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <div data-music-player-slot />
                <button
                  type="button"
                  onClick={onBack}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-cyan-400/30 hover:text-white"
                >
                  Back
                </button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <ModeButton
                active={mode === 'join'}
                title="Join as Player"
                description="Use a code from the supervisor"
                onClick={() => setMode('join')}
              />

              <ModeButton
                active={mode === 'create'}
                title="Create as Supervisor"
                description="Create the game and share the code"
                onClick={() => setMode('create')}
              />
            </div>
          </div>

          <div className="grid gap-0 md:grid-cols-[1.2fr_0.8fr]">
            <div className="px-6 py-6 md:px-8 md:py-8">
              <div className="space-y-5">
                <InputBlock
                  label="Your Display Name"
                  hint="This name appears in chat, lobby, logs, and supervisor monitor"
                >
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => onUsernameChange?.(e.target.value)}
                    placeholder="ENTER YOUR NAME"
                    maxLength={40}
                    autoComplete="nickname"
                    className="w-full rounded-2xl border border-cyan-400/15 bg-slate-900/80 px-4 py-3 text-sm tracking-[0.06em] text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40 focus:bg-slate-900"
                  />
                </InputBlock>

                <InputBlock
                  label="Room Code"
                  hint="Example: ALPHA / RED01 / TEAMX"
                >
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="ENTER ROOM CODE"
                    maxLength={16}
                    autoComplete="off"
                    className="w-full rounded-2xl border border-cyan-400/15 bg-slate-900/80 px-4 py-3 text-sm uppercase tracking-[0.14em] text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40 focus:bg-slate-900"
                  />
                </InputBlock>

                {mode === 'create' && (
                  <InputBlock
                    label="Room Name"
                    hint="Visible title for this room"
                  >
                    <input
                      type="text"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      placeholder="ENTER ROOM NAME"
                      maxLength={40}
                      autoComplete="off"
                      className="w-full rounded-2xl border border-cyan-400/15 bg-slate-900/80 px-4 py-3 text-sm tracking-[0.06em] text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40 focus:bg-slate-900"
                    />
                  </InputBlock>
                )}

                {mode === 'create' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <InputBlock label="Players / Team" hint="1-10">
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={maxPlayersPerTeam}
                        onChange={(e) => setMaxPlayersPerTeam(e.target.value)}
                        placeholder="2"
                        autoComplete="off"
                        className="w-full rounded-2xl border border-cyan-400/15 bg-slate-900/80 px-4 py-3 text-sm tracking-[0.06em] text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40 focus:bg-slate-900"
                      />
                    </InputBlock>

                    <InputBlock label="Win Target" hint="10-1000">
                      <input
                        type="number"
                        min={10}
                        max={1000}
                        value={winScore}
                        onChange={(e) => setWinScore(e.target.value)}
                        placeholder="100"
                        autoComplete="off"
                        className="w-full rounded-2xl border border-cyan-400/15 bg-slate-900/80 px-4 py-3 text-sm tracking-[0.06em] text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40 focus:bg-slate-900"
                      />
                    </InputBlock>
                  </div>
                )}

                <InputBlock
                  label="Room Password"
                  hint={mode === 'create' ? 'Set a password for players' : 'Enter the room password'}
                >
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="ENTER PASSWORD"
                    maxLength={40}
                    autoComplete="off"
                    className="w-full rounded-2xl border border-cyan-400/15 bg-slate-900/80 px-4 py-3 text-sm tracking-[0.12em] text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40 focus:bg-slate-900"
                  />
                </InputBlock>

                {error && (
                  <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error}
                  </div>
                )}

                <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading || (mode === 'join' ? !canJoin : !canCreate)}
                    className="inline-flex min-w-[180px] items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-cyan-300 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading
                      ? 'Processing...'
                      : mode === 'join'
                        ? 'Join as Player'
                        : 'Create as Supervisor'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRoomCode('');
                      setRoomName('');
                      setPassword('');
                      setMaxPlayersPerTeam('2');
                      setWinScore('100');
                    }}
                    disabled={loading}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-slate-300 transition hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-cyan-400/10 bg-slate-900/55 px-6 py-6 md:border-l md:border-t-0 md:px-6 md:py-8">
              <div className="space-y-5">
                <SideInfoCard
                  title={mode === 'join' ? 'Join Flow' : 'Create Flow'}
                  items={
                    mode === 'join'
                      ? [
                          'Enter the room code exactly.',
                          'Use the correct password for access.',
                          'After access is granted, continue to team selection as a player.',
                        ]
                      : [
                          'Choose a unique room code.',
                          'Set a room name, password, team limit, and win target.',
                          'You become the supervisor and share the code with players.',
                        ]
                  }
                />

                <div className="rounded-2xl border border-cyan-400/15 bg-slate-950/70 p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                      Open Rooms
                    </div>
                    <button
                      type="button"
                      onClick={fetchRooms}
                      className="rounded-lg border border-slate-700 px-2 py-1 text-[10px] font-bold text-slate-300 hover:text-white"
                    >
                      {roomsLoading ? '...' : 'Refresh'}
                    </button>
                  </div>

                  <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
                    {rooms.length === 0 ? (
                      <p className="py-4 text-center text-xs text-slate-600">
                        No rooms created yet.
                      </p>
                    ) : (
                      rooms.map((room) => (
                        <button
                          key={room.code}
                          type="button"
                          onClick={() => {
                            setMode('join');
                            setRoomCode(room.code);
                          }}
                          className="w-full rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-left transition hover:border-cyan-400/35"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-bold text-white">
                              {room.name}
                            </span>
                            <span className="font-mono text-xs text-cyan-300">
                              {room.code}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-slate-500">
                            <span>{room.status.toUpperCase()}</span>
                            <span>{room.winScore} pts</span>
                            <span>{room.maxPlayersPerTeam}/team</span>
                            <span>
                              A:{room.teamAConfigured ? 'ready' : 'setup'}
                            </span>
                            <span>
                              B:{room.teamBConfigured ? 'ready' : 'setup'}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-cyan-400/15 bg-slate-950/70 p-4">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                    Preview
                  </div>

                  <div className="space-y-2 text-sm text-slate-400">
                    <PreviewRow
                      label="Mode"
                      value={mode === 'join' ? 'Join existing room' : 'Create new room'}
                    />
                    <PreviewRow
                      label="Code"
                      value={normalizedRoomCode || '—'}
                    />
                    {mode === 'create' && (
                      <PreviewRow
                        label="Name"
                        value={roomName.trim() || '—'}
                      />
                    )}
                    {mode === 'create' && (
                      <>
                        <PreviewRow
                          label="Players / Team"
                          value={maxPlayersPerTeam || '---'}
                        />
                        <PreviewRow
                          label="Win Target"
                          value={`${winScore || '---'} pts`}
                        />
                      </>
                    )}
                    <PreviewRow
                      label="Password"
                      value={password ? '••••••••' : '—'}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-400/15 bg-amber-400/5 p-4 text-sm text-amber-100/90">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                    Security Note
                  </div>
                  Room access is isolated. Chat, live events, and player presence should stay inside the selected room.
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function ModeButton({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-4 text-left transition ${
        active
          ? 'border-cyan-400/35 bg-cyan-400/10 shadow-[0_0_24px_rgba(34,211,238,0.08)]'
          : 'border-slate-700 bg-slate-950/60 hover:border-slate-500'
      }`}
    >
      <div className="mb-1 text-sm font-semibold uppercase tracking-[0.14em] text-white">
        {title}
      </div>
      <div className="text-xs text-slate-400">{description}</div>
    </button>
  );
}

function InputBlock({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
          {label}
        </label>
        {hint && <span className="text-[11px] text-slate-500">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function SideInfoCard({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-2xl border border-cyan-400/15 bg-slate-950/70 p-4">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
        {title}
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={`${title}-${index}`} className="flex gap-3">
            <div className="mt-1 h-2 w-2 rounded-full bg-cyan-400/80" />
            <p className="text-sm leading-6 text-slate-300">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2">
      <span className="text-xs uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      <span className="max-w-[65%] truncate text-right text-sm text-slate-200">
        {value}
      </span>
    </div>
  );
}
