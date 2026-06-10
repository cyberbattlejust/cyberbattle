'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

import type { TeamId } from '@/components/game/types';

type PacketEntry = {
  no: number;
  time: string;
  source: string;
  destination: string;
  protocol: string;
  info: string;
  suspicious: boolean;
};

type PacketResponse = {
  packets: PacketEntry[];
  totalPackets: number;
  suspiciousCount: number;
  analysis?: {
    summary?: string;
  };
  error?: string;
};

function normalizeTeamId(team: string): TeamId {
  if (team === 'teamA' || team === 'A') {
    return 'teamA';
  }

  return 'teamB';
}

function sanitizePacketInfo(info: string) {
  return info
    .replace(
      /Authorization:\s*Basic\s+[A-Za-z0-9+/=]+/gi,
      'Authorization: Basic [REDACTED]',
    )
    .replace(
      /(password|pass|pwd|new_password)\s*[:=]\s*[^,\s;}\]]+/gi,
      '$1=[REDACTED]',
    )
    .replace(/admin:[^,\s;}\]]+/gi, 'admin:[REDACTED]');
}

export default function WiresharkTool({
  team,
  roomCode,
}: {
  team: string;
  roomCode?: string;
}) {
  const [packets, setPackets] = useState<PacketEntry[]>([]);
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);

  const teamId = useMemo(() => normalizeTeamId(team), [team]);

  const startCapture = async () => {
    if (loading) {
      return;
    }

    setLoading(true);
    setPackets([]);
    setAnalysis('');

    try {
      const response = await fetch('/api/game/packets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team: teamId, roomCode }),
      });

      const data = (await response.json()) as PacketResponse;

      if (!response.ok) {
        toast.error(data.error || 'Packet capture failed.');
        return;
      }

      const safePackets = (data.packets || []).map((packet) => ({
        ...packet,
        info: sanitizePacketInfo(packet.info),
      }));

      setPackets(safePackets);
      setAnalysis(data.analysis?.summary || '');

      if ((data.suspiciousCount || 0) > 0) {
        toast.success(
          `🦈 Captured ${data.totalPackets || safePackets.length} packets (${data.suspiciousCount} suspicious!)`,
        );
      } else {
        toast.success(
          `🦈 Captured ${data.totalPackets || safePackets.length} packets`,
        );
      }
    } catch (error) {
      console.error('Packet capture failed:', error);
      toast.error('Capture failed - check connection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3
          className="text-sm font-bold text-cyan-400"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          🦈 Wireshark - Packet Capture
        </h3>

        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={startCapture}
          disabled={loading}
          className="cursor-pointer rounded border-none bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
        >
          {loading ? '⏳ Capturing...' : '▶ Start Capture'}
        </motion.button>
      </div>

      {loading && (
        <div className="space-y-1">
          <div className="h-1 overflow-hidden rounded bg-slate-800">
            <motion.div
              className="h-full rounded bg-cyan-500"
              animate={{ width: ['0%', '35%', '70%', '100%'] }}
              transition={{ duration: 2 }}
            />
          </div>

          <p className="animate-pulse text-[10px] text-cyan-400">
            Capturing simulated network traffic...
          </p>
        </div>
      )}

      {analysis && (
        <p className="rounded border border-yellow-800/20 bg-yellow-900/20 px-2.5 py-1.5 text-[10px] text-yellow-300">
          {analysis}
        </p>
      )}

      {packets.length > 0 && (
        <div className="max-h-[250px] overflow-y-auto rounded-lg border border-slate-700">
          <table className="w-full text-[10px]">
            <thead className="sticky top-0 bg-slate-800">
              <tr>
                <th className="px-2 py-1.5 text-left font-semibold text-slate-400">
                  No.
                </th>
                <th className="px-2 py-1.5 text-left font-semibold text-slate-400">
                  Time
                </th>
                <th className="px-2 py-1.5 text-left font-semibold text-slate-400">
                  Source
                </th>
                <th className="px-2 py-1.5 text-left font-semibold text-slate-400">
                  Dest
                </th>
                <th className="px-2 py-1.5 text-left font-semibold text-slate-400">
                  Protocol
                </th>
                <th className="px-2 py-1.5 text-left font-semibold text-slate-400">
                  Info
                </th>
              </tr>
            </thead>

            <tbody className="font-mono">
              {packets.map((packet) => (
                <tr
                  key={`${packet.no}-${packet.time}`}
                  className={`border-t border-slate-800/50 ${
                    packet.suspicious
                      ? 'bg-red-900/20'
                      : 'hover:bg-slate-800/30'
                  }`}
                >
                  <td className="px-2 py-1 text-slate-500">{packet.no}</td>
                  <td className="px-2 py-1 text-slate-400">{packet.time}</td>
                  <td className="px-2 py-1 text-cyan-400">
                    {packet.source}
                  </td>
                  <td className="px-2 py-1 text-purple-400">
                    {packet.destination}
                  </td>
                  <td className="px-2 py-1 font-bold text-yellow-400">
                    {packet.protocol}
                  </td>
                  <td
                    className={`px-2 py-1 ${
                      packet.suspicious
                        ? 'font-bold text-red-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {packet.info}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && packets.length === 0 && (
        <div className="rounded border border-slate-800 bg-slate-950/60 p-3 text-[10px] text-slate-500">
          Start a capture to inspect simulated traffic for suspicious packets.
        </div>
      )}
    </div>
  );
}
