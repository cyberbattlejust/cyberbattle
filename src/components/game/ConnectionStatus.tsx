'use client';

export default function ConnectionStatus({ connected, allPlayers }: { connected: boolean; allPlayers: { team: string }[] }) {
  const teamACount = allPlayers.filter(p => p.team === 'A').length;
  const teamBCount = allPlayers.filter(p => p.team === 'B').length;
  return (
    <div className="fixed top-0 left-0 right-0 z-[9990] flex items-center justify-between px-4 py-1.5 bg-slate-950/90 backdrop-blur-sm border-b border-slate-800/50 text-xs">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className={connected ? 'text-green-400' : 'text-red-400'}>{connected ? 'ONLINE' : 'OFFLINE'}</span>
        </div>
        <span className="text-slate-600">|</span>
        <span className="text-blue-400">🔵 AL-SHLOOL: {teamACount}</span>
        <span className="text-pink-400">🔴 BANI YASSEN: {teamBCount}</span>
      </div>
      <span className="text-slate-600">{allPlayers.length} agents online</span>
    </div>
  );
}
