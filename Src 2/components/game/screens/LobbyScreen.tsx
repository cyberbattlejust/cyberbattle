'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

import CyberParticles from '@/components/game/CyberParticles';
import type { PlayerInfo, TeamId } from '@/components/game/types';

type TeamStatus = {
  displayName?: string;
  configured?: boolean;
  configuredBy?: string;
  network?: {
    ssid: string;
  };
};

type LobbyScreenProps = {
  username: string;
  team: TeamId;
  activeRoom: {
    code: string;
    name: string;
    maxPlayersPerTeam?: number;
    winScore?: number;
  };
  allPlayers: PlayerInfo[];
  onBackToTeamSetup: () => void;
  onGameStarted: () => void;
};

function getTeamName(team: TeamId) {
  return team === 'teamA' ? 'Team A' : 'Team B';
}

export default function LobbyScreen({
  username,
  team,
  activeRoom,
  allPlayers,
  onBackToTeamSetup,
  onGameStarted,
}: LobbyScreenProps) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('waiting');
  const [teamA, setTeamA] = useState<TeamStatus | null>(null);
  const [teamB, setTeamB] = useState<TeamStatus | null>(null);
  const [roomSettings, setRoomSettings] = useState({
    maxPlayersPerTeam: activeRoom.maxPlayersPerTeam || 2,
    winScore: activeRoom.winScore || 100,
  });

  const teamPlayers = useMemo(
    () => allPlayers.filter((player) => player.team === team),
    [allPlayers, team],
  );

  useEffect(() => {
    let cancelled = false;

    const fetchStatus = async () => {
      try {
        const response = await fetch(
          `/api/rooms/status?roomCode=${encodeURIComponent(activeRoom.code)}`,
        );
        const data = await response.json();

        if (!response.ok || !data.success || cancelled) return;

        setStatus(data.room.status);
        setTeamA(data.teamA);
        setTeamB(data.teamB);
        setRoomSettings({
          maxPlayersPerTeam: data.room.maxPlayersPerTeam || 2,
          winScore: data.room.winScore || 100,
        });

        if (data.room.status === 'playing') {
          onGameStarted();
        }
      } catch (error) {
        console.error('Failed to refresh lobby:', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchStatus();
    const intervalId = window.setInterval(fetchStatus, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activeRoom.code, onGameStarted]);

  const currentTeamStatus = team === 'teamA' ? teamA : teamB;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white"
    >
      <CyberParticles count={24} />

      <div className="relative z-10 w-full max-w-5xl">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
              <span>{activeRoom.name}</span>
              <span className="text-slate-500">|</span>
              <span>{activeRoom.code}</span>
            </div>

            <h1
              className="text-3xl font-black uppercase tracking-[0.12em] md:text-5xl"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              Waiting Lobby
            </h1>
            <p className="mt-3 text-sm text-slate-400">
              {username}, your team is ready. The supervisor will start the
              game when both teams are configured.
            </p>
          </div>

          <button
            type="button"
            onClick={onBackToTeamSetup}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 hover:border-cyan-400/30 hover:text-white"
          >
            Edit Setup
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-300">
                  {getTeamName(team)} Status
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {currentTeamStatus?.displayName || getTeamName(team)}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  status === 'playing'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-amber-500/15 text-amber-200'
                }`}
              >
                {status === 'playing' ? 'STARTED' : 'WAITING'}
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <LobbyMetric
                label="Team Setup"
                value={currentTeamStatus?.configured ? 'Ready' : 'Missing'}
              />
              <LobbyMetric
                label="SSID"
                value={currentTeamStatus?.network?.ssid || '-'}
              />
              <LobbyMetric label="Players" value={String(teamPlayers.length)} />
              <LobbyMetric
                label="Team Limit"
                value={`${teamPlayers.length}/${roomSettings.maxPlayersPerTeam}`}
              />
            </div>

            <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                Your Team
              </h3>
              {teamPlayers.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-600">
                  Syncing team presence...
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {teamPlayers.map((player) => (
                    <div
                      key={player.id || player.username}
                      className="rounded-xl border border-slate-800 bg-slate-900 p-3"
                    >
                      <div className="truncate text-sm font-bold text-white">
                        {player.username || 'Agent'}
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                        {player.role || 'lobby'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <aside className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-purple-300">
              Match Readiness
            </h2>

            <div className="space-y-3">
              <ReadyRow label="Team A" team={teamA} />
              <ReadyRow label="Team B" team={teamB} />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <LobbyMetric
                label="Win Target"
                value={`${roomSettings.winScore} pts`}
              />
              <LobbyMetric
                label="Team Limit"
                value={String(roomSettings.maxPlayersPerTeam)}
              />
            </div>

            <div className="mt-5 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3 text-xs leading-5 text-cyan-100/80">
              Attack and Defense screens stay locked until the supervisor
              starts the room.
            </div>

            {loading && (
              <p className="mt-4 animate-pulse text-center text-xs text-slate-500">
                Loading lobby...
              </p>
            )}
          </aside>
        </div>
      </div>
    </motion.div>
  );
}

function LobbyMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 truncate text-lg font-black text-white">{value}</p>
    </div>
  );
}

function ReadyRow({ label, team }: { label: string; team: TeamStatus | null }) {
  const ready = Boolean(team?.configured);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-white">
            {team?.displayName || label}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            SSID: {team?.network?.ssid || '-'}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-[10px] font-bold ${
            ready
              ? 'bg-emerald-500/15 text-emerald-300'
              : 'bg-slate-800 text-slate-500'
          }`}
        >
          {ready ? 'READY' : 'PENDING'}
        </span>
      </div>
    </div>
  );
}
