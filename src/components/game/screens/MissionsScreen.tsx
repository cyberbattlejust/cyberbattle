'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

import type { MissionEntry } from '@/components/game/types';
import CyberParticles from '@/components/game/CyberParticles';

type MissionFilter =
  | 'all'
  | 'attack'
  | 'defense'
  | 'easy'
  | 'medium'
  | 'hard'
  | 'completed'
  | 'available';

type TeamId = 'teamA' | 'teamB';

const WIN_SCORE = 100;

type MissionsScreenProps = {
  team: string;
  userEmail: string;
  username?: string;
  userRole: string;
  roomCode?: string;
  onBack: () => void;
};

function normalizeTeamId(team: string): TeamId {
  if (team === 'teamA' || team === 'A') {
    return 'teamA';
  }

  return 'teamB';
}

function parseCompletedBy(value: string | undefined) {
  if (!value || value === 'none') {
    return [];
  }

  if (value === 'both') {
    return ['teamA', 'teamB'];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item === 'teamA' || item === 'teamB');
}

export default function MissionsScreen({
  team,
  userEmail,
  username,
  userRole,
  roomCode,
  onBack,
}: MissionsScreenProps) {
  const [missions, setMissions] = useState<MissionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [completing, setCompleting] = useState<Record<string, boolean>>({});
  const [activating, setActivating] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<MissionFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [roomStatus, setRoomStatus] = useState('playing');
  const [winScore, setWinScore] = useState(WIN_SCORE);

  const teamId = useMemo(() => normalizeTeamId(team), [team]);
  const isAdmin = userRole === 'admin' || userRole === 'supervisor';

  const fetchMissions = useCallback((showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    const query = roomCode ? `?roomCode=${encodeURIComponent(roomCode)}` : '';

    fetch(`/api/missions${query}`)
      .then(async (response) => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch missions');
        }

        if (Array.isArray(data)) {
          setMissions(data);
          return;
        }

        if (data && Array.isArray(data.missions)) {
          setMissions(data.missions);
        }
      })
      .catch((error) => {
        console.error('Failed to fetch missions:', error);
        toast.error('Failed to load missions.');
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, [roomCode]);

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  useEffect(() => {
    if (!roomCode) return;

    let cancelled = false;

    const fetchRoomStatus = async () => {
      try {
        const response = await fetch(
          `/api/rooms/status?roomCode=${encodeURIComponent(roomCode)}`,
        );
        const data = await response.json();

        if (!cancelled && response.ok && data?.success) {
          setRoomStatus(data.room.status);
          setWinScore(data.room.winScore || WIN_SCORE);
        }
      } catch (error) {
        console.error('Failed to fetch room status:', error);
      }
    };

    fetchRoomStatus();
    const intervalId = window.setInterval(fetchRoomStatus, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [roomCode]);

  const handleRefresh = () => {
    fetchMissions(false);
  };

  const isCompleted = useCallback(
    (mission: MissionEntry) => {
      const completedTeams = parseCompletedBy(mission.completedBy);
      return completedTeams.includes(teamId);
    },
    [teamId],
  );

  const canComplete = useCallback(
    (mission: MissionEntry) => mission.active && !isCompleted(mission),
    [isCompleted],
  );

  const activateMission = async (id: string) => {
    if (!isAdmin) {
      toast.error('Only admins can activate missions.');
      return;
    }

    if (roomStatus !== 'playing') {
      toast.error('Missions can be activated only while the game is playing.');
      return;
    }

    setActivating((prev) => ({ ...prev, [id]: true }));

    try {
      const response = await fetch('/api/missions/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ missionId: id, adminEmail: userEmail, roomCode }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        toast.error(data.error || 'Failed to activate mission.');
        return;
      }

      toast.success(data.message || 'Mission activated!');
      fetchMissions(false);
    } catch (error) {
      console.error('Failed to activate mission:', error);
      toast.error('Failed to activate mission.');
    } finally {
      setActivating((prev) => ({ ...prev, [id]: false }));
    }
  };

  const completeMission = async (id: string) => {
    const answer = answers[id] || '';

    if (!answer.trim()) {
      toast.error('Enter an answer first.');
      return;
    }

    if (roomStatus !== 'playing') {
      toast.error(`Game is ${roomStatus}. Missions are locked.`);
      return;
    }

    setCompleting((prev) => ({ ...prev, [id]: true }));

    try {
      const response = await fetch('/api/missions/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          missionId: id,
          team: teamId,
          answer,
          userEmail: username || userEmail,
          roomCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || data.message || 'Failed to submit answer.');
        return;
      }

      if (data.success && data.correct) {
        toast.success(data.message || 'Correct answer!');
        setAnswers((prev) => ({ ...prev, [id]: '' }));
        setExpandedId(null);
        fetchMissions(false);
        return;
      }

      toast.error(data.message || 'Incorrect answer.');
    } catch (error) {
      console.error('Failed to complete mission:', error);
      toast.error('Failed to submit answer.');
    } finally {
      setCompleting((prev) => ({ ...prev, [id]: false }));
    }
  };

  const filteredMissions = missions.filter((mission) => {
    if (filter === 'all') return true;
    if (filter === 'attack') return mission.type === 'attack';
    if (filter === 'defense') return mission.type === 'defense';
    if (filter === 'easy') return mission.difficulty === 'easy';
    if (filter === 'medium') return mission.difficulty === 'medium';
    if (filter === 'hard') return mission.difficulty === 'hard';
    if (filter === 'completed') return isCompleted(mission);
    if (filter === 'available') return canComplete(mission);

    return true;
  });

  const stats = {
    total: missions.length,
    completed: missions.filter((mission) => isCompleted(mission)).length,
    available: missions.filter((mission) => canComplete(mission)).length,
    totalPts: missions
      .filter((mission) => isCompleted(mission))
      .reduce((sum, mission) => sum + mission.points, 0),
    maxPts: missions.reduce((sum, mission) => sum + mission.points, 0),
  };
  const pointProgress = Math.min(
    100,
    Math.round((stats.totalPts / winScore) * 100),
  );

  const filterTabs: { key: MissionFilter; label: string; icon: string }[] = [
    { key: 'all', label: 'All', icon: '📋' },
    { key: 'attack', label: 'Attack', icon: '⚔️' },
    { key: 'defense', label: 'Defense', icon: '🛡️' },
    { key: 'easy', label: 'Easy', icon: '🟢' },
    { key: 'medium', label: 'Medium', icon: '🟡' },
    { key: 'hard', label: 'Hard', icon: '🔴' },
    { key: 'completed', label: 'Done', icon: '✅' },
    { key: 'available', label: 'Open', icon: '🔥' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-[#0d1117] p-3 md:p-6"
    >
      <CyberParticles count={15} />

      <div className="relative z-10 mx-auto max-w-3xl pb-8">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-lg">
              🎯
            </div>

            <div>
              <h1
                className="bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-xl font-bold text-transparent md:text-2xl"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                MISSIONS
              </h1>
              <p className="font-mono text-[10px] text-slate-500">
                Complete tasks to earn bonus points
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05, rotate: 180 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleRefresh}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-slate-700/50 bg-slate-800/80 text-white transition-colors hover:border-purple-500/50 disabled:opacity-50"
              disabled={refreshing}
            >
              <motion.span
                animate={refreshing ? { rotate: 360 } : {}}
                transition={
                  refreshing
                    ? { duration: 0.8, repeat: Infinity, ease: 'linear' }
                    : {}
                }
              >
                🔄
              </motion.span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onBack}
              className="cursor-pointer rounded-xl border border-slate-700/50 bg-slate-800/80 px-3 py-2 text-xs font-bold text-white transition-colors hover:border-purple-500/50"
            >
              ← Back
            </motion.button>
          </div>
        </div>

        {!loading && roomStatus !== 'playing' ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-8 text-center"
          >
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-amber-200">
              Missions Locked
            </p>
            <p className="mt-3 text-xs leading-6 text-amber-100/75">
              Game status is {roomStatus.toUpperCase()}. Missions are hidden
              until the supervisor starts or resumes the game.
            </p>
          </motion.div>
        ) : !loading && (
          <div className="mb-5 grid grid-cols-4 gap-2">
            <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 p-2.5 text-center">
              <p
                className="text-lg font-bold text-white md:text-xl"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                {stats.total}
              </p>
              <p className="font-mono text-[9px] text-slate-500">TOTAL</p>
            </div>

            <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 p-2.5 text-center">
              <p
                className="text-lg font-bold text-green-400 md:text-xl"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                {stats.completed}
              </p>
              <p className="font-mono text-[9px] text-slate-500">COMPLETED</p>
            </div>

            <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 p-2.5 text-center">
              <p
                className="text-lg font-bold text-orange-400 md:text-xl"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                {stats.available}
              </p>
              <p className="font-mono text-[9px] text-slate-500">AVAILABLE</p>
            </div>

            <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 p-2.5 text-center">
              <p
                className="text-lg font-bold text-yellow-400 md:text-xl"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                {stats.totalPts}
              </p>
              <p className="font-mono text-[9px] text-slate-500">POINTS</p>
            </div>
          </div>
        )}

        {!loading && roomStatus === 'playing' && (
          <div className="mb-5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="font-mono text-[10px] text-slate-500">
                PROGRESS
              </span>
              <span className="font-mono text-[10px] font-bold text-purple-400">
                {pointProgress}%
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full border border-slate-800/50 bg-slate-900">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-red-500"
                initial={{ width: 0 }}
                animate={{
                  width: `${pointProgress}%`,
                }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>

            <div className="mt-1.5 flex items-center justify-between font-mono text-[9px] text-slate-600">
              <span>
                {stats.totalPts}/{winScore} points to win
              </span>
              <span>{Math.max(winScore - stats.totalPts, 0)} remaining</span>
            </div>
          </div>
        )}

        {!loading && roomStatus === 'playing' && (
          <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1">
            {filterTabs.map((tab) => {
              const count =
                tab.key === 'all'
                  ? stats.total
                  : tab.key === 'attack'
                    ? missions.filter((mission) => mission.type === 'attack').length
                    : tab.key === 'defense'
                      ? missions.filter((mission) => mission.type === 'defense').length
                      : tab.key === 'easy'
                        ? missions.filter((mission) => mission.difficulty === 'easy').length
                        : tab.key === 'medium'
                          ? missions.filter((mission) => mission.difficulty === 'medium').length
                          : tab.key === 'hard'
                            ? missions.filter((mission) => mission.difficulty === 'hard').length
                            : tab.key === 'completed'
                              ? stats.completed
                              : stats.available;

              return (
                <motion.button
                  key={tab.key}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setFilter(tab.key)}
                  className={`shrink-0 cursor-pointer rounded-lg border px-3 py-1.5 text-[10px] font-bold transition-all ${
                    filter === tab.key
                      ? 'border-purple-500/50 bg-purple-600/30 text-purple-300'
                      : 'border-slate-800/50 bg-slate-900/60 text-slate-500 hover:border-slate-700'
                  }`}
                >
                  {tab.icon} {tab.label} ({count})
                </motion.button>
              );
            })}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <div className="animate-spin text-4xl">⏳</div>
            <p className="font-mono text-xs text-slate-600">
              Loading missions...
            </p>
          </div>
        ) : roomStatus !== 'playing' ? null : filteredMissions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-16 text-center"
          >
            <p className="mb-3 text-4xl">📭</p>
            <p className="text-sm text-slate-500">
              No missions found for this filter
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {filteredMissions.map((mission, index) => {
              const completed = isCompleted(mission);
              const canDo = canComplete(mission);
              const isExpanded = expandedId === mission.id;

              return (
                <motion.div
                  key={mission.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03, duration: 0.3 }}
                  className={`overflow-hidden rounded-xl border transition-all ${
                    completed
                      ? 'border-green-800/30 bg-green-950/5'
                      : canDo
                        ? 'border-purple-500/20 bg-purple-950/10 shadow-[0_0_15px_rgba(168,85,247,0.05)]'
                        : 'border-slate-800/60 bg-slate-900/40'
                  }`}
                >
                  <div className="p-3.5 md:p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base ${
                          completed
                            ? 'bg-green-900/30'
                            : canDo
                              ? 'bg-purple-900/30'
                              : 'bg-slate-800/60'
                        }`}
                      >
                        {completed ? '✅' : canDo ? '🔥' : '🔒'}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <h3
                            className={`truncate text-sm font-bold ${
                              completed ? 'text-green-300' : 'text-white'
                            }`}
                          >
                            {mission.title}
                          </h3>
                        </div>

                        <div className="mb-2 flex flex-wrap items-center gap-1.5">
                          <span
                            className={`rounded-md border px-2 py-0.5 text-[9px] font-bold ${
                              mission.difficulty === 'easy'
                                ? 'border-green-700/30 bg-green-900/25 text-green-400'
                                : mission.difficulty === 'medium'
                                  ? 'border-yellow-700/30 bg-yellow-900/25 text-yellow-400'
                                  : 'border-red-700/30 bg-red-900/25 text-red-400'
                            }`}
                          >
                            {mission.difficulty.toUpperCase()}
                          </span>

                          <span
                            className={`rounded-md border px-2 py-0.5 text-[9px] font-bold ${
                              mission.type === 'attack'
                                ? 'border-red-800/30 bg-red-900/20 text-red-300'
                                : 'border-cyan-800/30 bg-cyan-900/20 text-cyan-300'
                            }`}
                          >
                            {mission.type === 'attack'
                              ? '⚔️ ATTACK'
                              : '🛡️ DEFENSE'}
                          </span>

                          <span className="rounded-md border border-yellow-700/30 bg-yellow-900/20 px-2 py-0.5 text-[9px] font-bold text-yellow-400">
                            +{mission.points} pts
                          </span>

                          <span className="font-mono text-[9px] text-slate-600">
                            ⏱️ {mission.durationSec}s
                          </span>
                        </div>

                        <p className="line-clamp-2 text-xs leading-relaxed text-slate-500">
                          {mission.description.split('\n')[0]}
                        </p>

                        {completed && (
                          <div className="mt-2 flex items-center gap-1.5">
                            <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
                            <span className="text-[10px] font-bold text-green-400">
                              Completed by your team!
                            </span>
                          </div>
                        )}

                        {!mission.active && !completed && (
                          <div className="mt-2 flex items-center gap-1.5">
                            <div className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                            <span className="text-[10px] text-slate-600">
                              Mission locked — Waiting for activation
                            </span>
                          </div>
                        )}

                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3 border-t border-slate-800/50 pt-3"
                          >
                            <p className="mb-3 whitespace-pre-line text-xs leading-relaxed text-slate-400">
                              {mission.description}
                            </p>

                            {canDo && (
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={answers[mission.id] || ''}
                                  onChange={(event) =>
                                    setAnswers((prev) => ({
                                      ...prev,
                                      [mission.id]: event.target.value,
                                    }))
                                  }
                                  placeholder="Enter your answer..."
                                  className="flex-1 rounded-lg border border-slate-700/60 bg-black/40 px-3 py-2.5 font-mono text-xs text-green-400 placeholder:text-slate-600 transition-all focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/20"
                                  onKeyDown={(event) => {
                                    if (
                                      event.key === 'Enter' &&
                                      (answers[mission.id] || '').trim()
                                    ) {
                                      completeMission(mission.id);
                                    }
                                  }}
                                />

                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => completeMission(mission.id)}
                                  disabled={
                                    completing[mission.id] ||
                                    !(answers[mission.id] || '').trim()
                                  }
                                  className="cursor-pointer rounded-lg border-none bg-gradient-to-r from-green-500 to-emerald-500 px-5 py-2.5 text-xs font-bold text-white shadow-[0_0_12px_rgba(16,185,129,0.2)] transition-shadow hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-40"
                                >
                                  {completing[mission.id] ? (
                                    <span className="flex items-center gap-1">
                                      <span className="animate-spin">⏳</span>{' '}
                                      Check
                                    </span>
                                  ) : (
                                    'Submit ✓'
                                  )}
                                </motion.button>
                              </div>
                            )}

                            {isAdmin && !mission.active && !completed && (
                              <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => activateMission(mission.id)}
                                disabled={activating[mission.id]}
                                className="mt-3 w-full cursor-pointer rounded-lg border-none bg-gradient-to-r from-purple-600 to-violet-600 py-2.5 text-xs font-bold text-white shadow-[0_0_12px_rgba(147,51,234,0.2)] disabled:opacity-40"
                              >
                                {activating[mission.id]
                                  ? '⏳ Activating...'
                                  : '⚡ Activate Mission'}
                              </motion.button>
                            )}
                          </motion.div>
                        )}
                      </div>

                      <div className="ml-2 shrink-0">
                        {canDo && !isExpanded ? (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setExpandedId(mission.id)}
                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-purple-500/30 bg-purple-600/20 text-xs text-purple-400 transition-colors hover:bg-purple-600/30"
                          >
                            ▶
                          </motion.button>
                        ) : canDo && isExpanded ? (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setExpandedId(null)}
                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-700/50 bg-slate-800/60 text-xs text-slate-400 transition-colors hover:bg-slate-800"
                          >
                            ✕
                          </motion.button>
                        ) : !completed && isAdmin && !mission.active ? (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => activateMission(mission.id)}
                            disabled={activating[mission.id]}
                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-yellow-500/30 bg-yellow-600/20 text-xs text-yellow-400 transition-colors hover:bg-yellow-600/30 disabled:opacity-40"
                          >
                            {activating[mission.id] ? '⏳' : '⚡'}
                          </motion.button>
                        ) : completed ? (
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-900/20 text-sm font-bold text-green-400">
                            +{mission.points}
                          </div>
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/40 text-xs text-slate-700">
                            🔒
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {isAdmin && !loading && roomStatus === 'playing' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 rounded-xl border border-yellow-800/30 bg-yellow-950/10 p-4"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="text-yellow-400">👑</span>
              <h3
                className="text-xs font-bold text-yellow-400"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                ADMIN CONTROLS
              </h3>
            </div>

            <p className="text-[10px] text-yellow-600/60">
              Activate locked missions by clicking the ⚡ icon on any mission
              card. Use the refresh button to sync mission status.
            </p>
          </motion.div>
        )}

        {!loading && roomStatus === 'playing' && (
          <div className="mt-6 text-center">
            <p className="font-mono text-[9px] text-slate-700">
              {missions.filter((mission) => mission.type === 'attack').length}{' '}
              attack missions ·{' '}
              {missions.filter((mission) => mission.type === 'defense').length}{' '}
              defense missions · {stats.maxPts} total points available
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
