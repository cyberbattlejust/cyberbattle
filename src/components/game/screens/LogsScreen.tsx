'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

import type { GameLogEntry } from '@/components/game/types';
import CyberParticles from '@/components/game/CyberParticles';

type LogsScreenProps = {
  roomCode?: string;
  onBack: () => void;
};

export default function LogsScreen({ roomCode, onBack }: LogsScreenProps) {
  const [logs, setLogs] = useState<GameLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const query = roomCode ? `?roomCode=${encodeURIComponent(roomCode)}` : '';

    fetch(`/api/logs${query}`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setLogs(d);
        else if (d && Array.isArray(d.logs)) setLogs(d.logs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [roomCode]);

  const typeColors: Record<string, string> = {
    attack: 'text-red-400 bg-red-900/20',
    defense: 'text-blue-400 bg-blue-900/20',
    login: 'text-green-400 bg-green-900/20',
    tool: 'text-orange-400 bg-orange-900/20',
    mission: 'text-purple-400 bg-purple-900/20',
    system: 'text-slate-400 bg-slate-800/50',
  };

  const typeIcons: Record<string, string> = {
    attack: '⚔️',
    defense: '🛡️',
    login: '🔑',
    tool: '🔧',
    mission: '🎯',
    system: '⚙️',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-8"
    >
      <CyberParticles count={20} />

      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1
            className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            📜 Event Log
          </h1>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            className="px-4 py-2 rounded-lg bg-slate-800 text-white font-bold text-xs cursor-pointer border border-slate-700"
          >
            ← Back
          </motion.button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin text-4xl">⏳</div>
          </div>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-2">
            {logs.length === 0 ? (
              <p className="text-center text-slate-600 py-10">No events recorded yet</p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/30 hover:border-slate-600/50 transition-colors"
                >
                  <span className="text-lg">{typeIcons[log.type] || '📝'}</span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          typeColors[log.type] || 'text-slate-400 bg-slate-800'
                        }`}
                      >
                        {log.type.toUpperCase()}
                      </span>

                      <span className="text-white text-xs font-bold">{log.action}</span>

                      {log.points > 0 && (
                        <span className="text-yellow-400 text-[10px]">+{log.points} pts</span>
                      )}
                    </div>

                    <p className="text-slate-400 text-[10px] mt-1">{log.detail}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-slate-600 text-[10px]">{log.team}</span>
                    <p className="text-slate-600 text-[9px]">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
