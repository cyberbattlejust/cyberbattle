'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

import CyberParticles from '@/components/game/CyberParticles';
import type { ScoreData, TeamId } from '@/components/game/types';

type PlayerTeamValue = string;

type TeamScreenProps = {
  onSelectTeam: (team: TeamId) => void;
  connected: boolean;
  allPlayers: { team: PlayerTeamValue }[];
  activeRoom?: {
    code: string;
    name: string;
    maxPlayersPerTeam?: number;
  } | null;
  onBackToRoom?: () => void;
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

export default function TeamScreen({
  onSelectTeam,
  connected,
  allPlayers,
  activeRoom = null,
  onBackToRoom,
}: TeamScreenProps) {
  const normalizedPlayers = allPlayers
    .map((player) => normalizeTeamId(player.team))
    .filter((team): team is TeamId => Boolean(team));

  const teamACount = normalizedPlayers.filter((team) => team === 'teamA').length;
  const teamBCount = normalizedPlayers.filter((team) => team === 'teamB').length;
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);
  const maxPlayersPerTeam =
    activeRoom?.maxPlayersPerTeam || scoreData?.maxPlayersPerTeam || 2;

  useEffect(() => {
    const query = activeRoom?.code
      ? `?roomCode=${encodeURIComponent(activeRoom.code)}`
      : '';

    fetch(`/api/score${query}`)
      .then(async (response) => {
        const data = await response.json();

        if (response.ok && data?.success) {
          setScoreData(data);
        }
      })
      .catch((error) => {
        console.error('Failed to load team data:', error);
      });
  }, [activeRoom?.code]);

  const teams: {
    id: TeamId;
    name: string;
    ssid: string;
    gradient: string;
    shadow: string;
    icon: string;
    desc: string;
    count: number;
  }[] = [
    {
      id: 'teamA',
      name: scoreData?.teamA.displayName || 'AL-SHLOOL',
      ssid: scoreData?.teamA.network.ssid || 'Shlool_WiFi',
      gradient: 'from-blue-500 to-cyan-500',
      shadow: 'rgba(59,130,246,0.4)',
      icon: '🔵',
      desc: 'Blue strategic unit',
      count: teamACount,
    },
    {
      id: 'teamB',
      name: scoreData?.teamB.displayName || 'BANI YASSEN',
      ssid: scoreData?.teamB.network.ssid || 'Yassen_WiFi',
      gradient: 'from-pink-500 to-red-500',
      shadow: 'rgba(244,63,94,0.4)',
      icon: '🔴',
      desc: 'Red tactical unit',
      count: teamBCount,
    },
  ];

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

            <h1
              className="mb-3 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-3xl font-bold text-transparent md:text-5xl"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              🎮 SELECT YOUR TEAM
            </h1>

            <p className="text-lg text-slate-400">Choose your alliance</p>
          </div>

          {onBackToRoom && (
            <button
              type="button"
              onClick={onBackToRoom}
              className="rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-cyan-400/30 hover:text-white"
            >
              Back to Room
            </button>
          )}
        </div>

        {connected && (
          <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-sm text-slate-400 backdrop-blur-sm">
            <span className="text-slate-500">🌐</span>{' '}
            <span className="font-medium text-slate-300">
              {normalizedPlayers.length}
            </span>{' '}
            agents online
            <span className="mx-3 text-slate-700">|</span>
            <span className="text-cyan-300">🔵 AL-SHLOOL: {teamACount}</span>
            <span className="mx-3 text-slate-700">|</span>
            <span className="text-rose-300">🔴 BANI YASSEN: {teamBCount}</span>
          </div>
        )}

        <div className="flex flex-col gap-6 sm:flex-row sm:justify-center">
          {teams.map((teamData, index) => (
            <motion.button
              key={teamData.id}
              type="button"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35 + index * 0.18 }}
              whileHover={{
                scale: 1.05,
                boxShadow: `0 0 30px ${teamData.shadow}`,
              }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                if (teamData.count >= maxPlayersPerTeam) return;
                onSelectTeam(teamData.id);
              }}
              disabled={teamData.count >= maxPlayersPerTeam}
              className="group min-w-[220px] rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 px-10 py-8 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <div className="mb-4 text-5xl">{teamData.icon}</div>

              <h2
                className={`mb-2 bg-gradient-to-r ${teamData.gradient} bg-clip-text text-xl font-bold text-transparent`}
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                {teamData.name}
              </h2>

              <p className="text-sm text-slate-500">{teamData.desc}</p>

              <p className="mt-2 truncate font-mono text-xs text-cyan-300/80">
                SSID: {teamData.ssid}
              </p>

              {connected && (
                <p className="mt-2 text-xs text-slate-600">
                  {teamData.count}/{maxPlayersPerTeam} agent(s) in team
                </p>
              )}

              <div
                className={`mt-4 h-1 rounded-full bg-gradient-to-r ${teamData.gradient} opacity-50 transition-opacity group-hover:opacity-100`}
              />
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
