'use client';

import { motion } from 'framer-motion';

export default function LiveEventsFeed({ events, globalSystemMessages }: {
  events: { type: string; player: { username: string; team: string }; targetTeam?: string; success?: boolean; timestamp: number }[];
  globalSystemMessages: { message: string; timestamp: number }[];
}) {
  const all = [
    ...events.map(e => ({ id: `e-${e.timestamp}`, message: e.type === 'attack' ? (e.success ? `🔥 ${e.player.username} attacked Team ${e.targetTeam} - SUCCESS!` : `❌ ${e.player.username} failed attacking Team ${e.targetTeam}`) : `🛡️ ${e.player.username} changed WiFi password`, type: e.type, timestamp: e.timestamp })),
    ...globalSystemMessages.map(m => ({ id: `s-${m.timestamp}`, message: m.message, type: 'system', timestamp: m.timestamp })),
  ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 6);

  if (all.length === 0) return null;
  return (
    <div className="fixed top-8 right-4 z-[9989] w-[260px] space-y-1.5 pointer-events-none">
      {all.map((evt, i) => (
        <motion.div key={evt.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
          className={`px-2.5 py-1.5 rounded-lg text-[10px] backdrop-blur-sm ${
            evt.type === 'attack' ? 'bg-red-950/50 border border-red-800/20 text-red-300' :
            evt.type === 'defense' ? 'bg-blue-950/50 border border-blue-800/20 text-blue-300' :
            'bg-yellow-950/30 border border-yellow-800/10 text-yellow-300'}`}>
          {evt.message}
        </motion.div>
      ))}
    </div>
  );
}
