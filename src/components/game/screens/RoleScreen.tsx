'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

import CyberParticles from '@/components/game/CyberParticles';
import type { BattleRole, ScoreData, TeamId } from '@/components/game/types';

type RoleScreenProps = {
  team: string;
  onSelectRole: (role: BattleRole) => void;
  onBack: () => void;
  activeRoom?: {
    code: string;
    name: string;
  } | null;
};

function normalizeTeamId(team: string): TeamId {
  if (team === 'teamA' || team === 'A') {
    return 'teamA';
  }

  return 'teamB';
}

function getTeamDisplayName(teamId: TeamId) {
  return teamId === 'teamA' ? 'AL-SHLOOL' : 'BANI YASSEN';
}

export default function RoleScreen({
  team,
  onSelectRole,
  onBack,
  activeRoom = null,
}: RoleScreenProps) {
  const teamId = normalizeTeamId(team);
  const [teamName, setTeamName] = useState(getTeamDisplayName(teamId));

  useEffect(() => {
    const query = activeRoom?.code
      ? `?roomCode=${encodeURIComponent(activeRoom.code)}`
      : '';

    fetch(`/api/score${query}`)
      .then(async (response) => {
        const data = (await response.json()) as ScoreData;

        if (!response.ok || !data.teamA || !data.teamB) return;

        setTeamName(
          teamId === 'teamA'
            ? data.teamA.displayName || getTeamDisplayName(teamId)
            : data.teamB.displayName || getTeamDisplayName(teamId),
        );
      })
      .catch(() => {});
  }, [activeRoom?.code, teamId]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4"
    >
      <CyberParticles count={30} />

      <div className="relative z-10 w-full max-w-5xl text-center">
        <div className="mb-6 flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="text-left">
            {activeRoom && (
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
                <span>Room</span>
                <span className="text-white/90">{activeRoom.name}</span>
                <span className="text-slate-500">•</span>
                <span>{activeRoom.code}</span>
              </div>
            )}

            <h2
              className="mb-2 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-2xl font-bold text-transparent md:text-4xl"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              TEAM {teamName}
            </h2>

            <p className="text-slate-400">Choose your role:</p>
          </div>
        </div>

        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:justify-center">
          <motion.button
            type="button"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            whileHover={{
              scale: 1.05,
              boxShadow: '0 0 30px rgba(239,68,68,0.4)',
            }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelectRole('attack')}
            className="group min-w-[220px] rounded-2xl border border-red-800/50 bg-gradient-to-br from-red-950/50 to-slate-900 px-10 py-8 hover:border-red-500"
          >
            <div className="mb-4 text-5xl">⚔️</div>

            <h2
              className="mb-2 text-xl font-bold text-red-400"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              ATTACK
            </h2>

            <p className="text-sm text-slate-500">
              Analyze the opponent&apos;s simulated network
            </p>

            <p className="mt-3 text-xs text-red-600/60">
              Use training tools such as Wireshark, Nmap, and Burp Suite
            </p>

            <div className="mt-4 h-1 rounded-full bg-gradient-to-r from-red-500 to-rose-500 opacity-50 transition-opacity group-hover:opacity-100" />
          </motion.button>

          <motion.button
            type="button"
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            whileHover={{
              scale: 1.05,
              boxShadow: '0 0 30px rgba(59,130,246,0.4)',
            }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelectRole('defense')}
            className="group min-w-[220px] rounded-2xl border border-blue-800/50 bg-gradient-to-br from-blue-950/50 to-slate-900 px-10 py-8 hover:border-blue-500"
          >
            <div className="mb-4 text-5xl">🛡️</div>

            <h2
              className="mb-2 text-xl font-bold text-blue-400"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              DEFENSE
            </h2>

            <p className="text-sm text-slate-500">
              Protect and harden your simulated network
            </p>

            <p className="mt-3 text-xs text-blue-600/60">
              Change passwords, scan exposure, and review threats
            </p>

            <div className="mt-4 h-1 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 opacity-50 transition-opacity group-hover:opacity-100" />
          </motion.button>
        </div>

        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="rounded-lg border border-slate-700 bg-slate-800 px-6 py-2 text-sm text-slate-400 hover:border-cyan-500 hover:text-cyan-400"
        >
          ⬅️ Change Team
        </motion.button>
      </div>
    </motion.div>
  );
}
