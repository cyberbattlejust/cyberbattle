'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

import type { ScoreData, TeamId } from '@/components/game/types';
import CyberParticles from '@/components/game/CyberParticles';

const WIN_SCORE = 100;

type ScoreboardScreenProps = {
  onBack: () => void;
  connected: boolean;
  allPlayers: { team: string }[];
  userRole?: string;
  userEmail?: string;
  roomCode?: string;
};

function normalizeTeamId(team: string): TeamId | null {
  if (team === 'teamA' || team === 'A') {
    return 'teamA';
  }

  if (team === 'teamB' || team === 'B') {
    return 'teamB';
  }

  return null;
}

export default function ScoreboardScreen({
  onBack,
  connected,
  allPlayers,
  userRole = 'player',
  userEmail = '',
  roomCode,
}: ScoreboardScreenProps) {
  const [scores, setScores] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpd, setLastUpd] = useState('--:--:--');
  const targetScore = scores?.winScore || WIN_SCORE;

  const isAdmin = userRole === 'admin' || userRole === 'supervisor';

  const fetchScores = useCallback(async () => {
    try {
      const query = roomCode ? `?roomCode=${encodeURIComponent(roomCode)}` : '';
      const response = await fetch(`/api/score${query}`);
      const data = await response.json();

      if (!response.ok) {
        console.warn('Score request failed:', data);
        return;
      }

      if (data && data.success && data.teamA && data.teamB) {
        setScores(data as ScoreData);
        setLastUpd(new Date().toLocaleTimeString());
        return;
      }

      console.warn('Invalid score data:', data);
    } catch (error) {
      console.error('Failed to fetch scores:', error);
    } finally {
      setLoading(false);
    }
  }, [roomCode]);

  useEffect(() => {
    fetchScores();

    const intervalId = window.setInterval(fetchScores, 5000);

    return () => window.clearInterval(intervalId);
  }, [fetchScores]);

  useEffect(() => {
    const handleScoreChanged = () => fetchScores();

    window.addEventListener('cyber:score-changed', handleScoreChanged);

    return () => {
      window.removeEventListener('cyber:score-changed', handleScoreChanged);
    };
  }, [fetchScores]);

  const handleReset = async () => {
    if (!isAdmin) {
      toast.error('Only admins can reset the game.');
      return;
    }

    if (!userEmail) {
      toast.error('Admin email is missing. Please log in again.');
      return;
    }

    if (!confirm('Reset all game scores, logs, and team passwords?')) {
      return;
    }

    try {
      const response = await fetch('/api/game/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminEmail: userEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        toast.error(data.error || 'Failed to reset game.');
        return;
      }

      toast.success(data.message || 'Game reset!');
      window.dispatchEvent(new Event('cyber:score-changed'));
      fetchScores();
    } catch (error) {
      console.error('Failed to reset game:', error);
      toast.error('Failed to reset game.');
    }
  };

  const normalizedPlayers = allPlayers
    .map((player) => normalizeTeamId(player.team))
    .filter((team): team is TeamId => Boolean(team));

  const teamAPlayers = normalizedPlayers.filter((team) => team === 'teamA').length;
  const teamBPlayers = normalizedPlayers.filter((team) => team === 'teamB').length;
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8"
    >
      <CyberParticles count={20} />

      <div className="relative z-10 mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <h1
            className="mb-2 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-2xl font-bold text-transparent md:text-4xl"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            🎯 SCOREBOARD
          </h1>

          <div className="flex items-center justify-center gap-3">
            <span className="animate-pulse rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
              LIVE
            </span>

            <span className="text-xs text-slate-500">{lastUpd}</span>

            {connected && (
              <span className="text-xs text-cyan-500">🟢 Real-time</span>
            )}
          </div>

          <div className="mx-auto mt-4 max-w-md rounded-2xl border border-cyan-400/20 bg-slate-900/70 px-4 py-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Win target</span>
          <span className="font-bold text-cyan-300">{targetScore} pts</span>
            </div>

            {winner && (
              <div className="mt-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-sm font-bold text-emerald-200">
                Winner: {winner}
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin text-4xl">⏳</div>
          </div>
        ) : scores ? (
          <>
            <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
              {([
                {
                  key: 'teamA',
                  label: '🔵',
                  name: scores.teamA.displayName || 'AL-SHLOOL',
                  data: scores.teamA,
                  onlinePlayers: teamAPlayers,
                  border: 'border-blue-500/30',
                  borderB: 'border-blue-800/50',
                  color: 'text-blue-400',
                },
                {
                  key: 'teamB',
                  label: '🔴',
                  name: scores.teamB.displayName || 'BANI YASSEN',
                  data: scores.teamB,
                  onlinePlayers: teamBPlayers,
                  border: 'border-pink-500/30',
                  borderB: 'border-pink-800/50',
                  color: 'text-pink-400',
                },
              ] as const).map((teamData, index) => {
                const attackScore = teamData.data.score.attack || 0;
                const defenseScore = teamData.data.score.defense || 0;
                const totalScore =
                  teamData.data.score.total ?? attackScore + defenseScore;
                const progress = Math.min(
                  100,
                  Math.round((totalScore / targetScore) * 100),
                );

                return (
                  <motion.div
                    key={teamData.key}
                    initial={{ x: index === 0 ? -30 : 30, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    whileHover={{ y: -5 }}
                    className={`rounded-2xl border ${teamData.border} bg-slate-900/80 p-6`}
                  >
                    <div
                      className={`mb-6 flex items-center justify-between border-b ${teamData.borderB} pb-4`}
                    >
                      <div>
                        <h2
                          className="text-lg font-bold text-white"
                          style={{ fontFamily: 'Orbitron, sans-serif' }}
                        >
                          {teamData.label} {teamData.name}
                        </h2>

                        <div className="mt-1 text-xs text-slate-500">
                          SSID:{' '}
                          <span className="text-slate-300">
                            {teamData.data.network.ssid}
                          </span>
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          Online players:{' '}
                          <span className="text-slate-300">
                            {teamData.onlinePlayers}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`rounded-xl bg-slate-800 px-4 py-2 text-2xl font-bold ${teamData.color}`}
                      >
                        {totalScore}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4 text-center">
                        <div className="mb-1 text-xs text-slate-400">
                          ⚔️ ATTACK
                        </div>

                        <div className="text-2xl font-bold text-red-400">
                          {attackScore}
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4 text-center">
                        <div className="mb-1 text-xs text-slate-400">
                          🛡️ DEFENSE
                        </div>

                        <div className="text-2xl font-bold text-blue-400">
                          {defenseScore}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
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
                  </motion.div>
                );
              })}
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={fetchScores}
                className="cursor-pointer rounded-xl border-none bg-gradient-to-r from-cyan-500 to-teal-500 px-5 py-2.5 text-sm font-bold text-slate-950"
              >
                🔄 Refresh
              </motion.button>

              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onBack}
                className="cursor-pointer rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-bold text-white"
              >
                🎮 Back
              </motion.button>

              {isAdmin && (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleReset}
                  className="cursor-pointer rounded-xl border-none bg-gradient-to-r from-red-600 to-orange-600 px-5 py-2.5 text-sm font-bold text-white"
                >
                  🔄 Reset
                </motion.button>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-red-500/30 bg-slate-900/80 p-8 text-center text-slate-300">
            Failed to load scoreboard.
          </div>
        )}
      </div>
    </motion.div>
  );
}
