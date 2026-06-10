'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

import type { TeamId } from '@/components/game/types';

type ScanPort = {
  port: number;
  state: string;
  service: string;
  version: string;
};

type ScanVulnerability = {
  name: string;
  severity: string;
  description: string;
  port: number;
};

type ScanResult = {
  hostUp: boolean;
  target: string;
  ip: string;
  ports: ScanPort[];
  vulnerabilities: ScanVulnerability[];
  passwordHint?: string;
};

function normalizeTeamId(team: string): TeamId {
  if (team === 'teamA' || team === 'A') {
    return 'teamA';
  }

  return 'teamB';
}

export default function NmapTool({
  team,
  roomCode,
}: {
  team: string;
  roomCode?: string;
}) {
  const [results, setResults] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

  const teamId = useMemo(() => normalizeTeamId(team), [team]);

  const startScan = async () => {
    if (loading) {
      return;
    }

    setScanning(true);
    setLoading(true);
    setResults(null);

    try {
      const response = await fetch('/api/game/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team: teamId, roomCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Scan failed.');
        setResults(null);
        return;
      }

      setResults(data as ScanResult);

      toast.success(
        `🗺️ Scan complete! ${data.vulnerabilities?.length || 0} vulnerabilities found`
      );
    } catch (error) {
      console.error('Nmap scan failed:', error);
      toast.error('Scan failed - check connection');
      setResults(null);
    } finally {
      setScanning(false);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3
          className="text-sm font-bold text-orange-400"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          🗺️ Nmap - Network Scanner
        </h3>

        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={startScan}
          disabled={loading}
          className="cursor-pointer rounded border-none bg-orange-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
        >
          {scanning ? '⏳ Scanning...' : '▶ Start Scan'}
        </motion.button>
      </div>

      {scanning && (
        <div className="space-y-1">
          <div className="h-1 overflow-hidden rounded bg-slate-800">
            <motion.div
              className="h-full rounded bg-orange-500"
              animate={{ width: ['0%', '30%', '60%', '100%'] }}
              transition={{ duration: 2 }}
            />
          </div>

          <p className="animate-pulse text-[10px] text-orange-400">
            Scanning simulated network ports...
          </p>
        </div>
      )}

      {results && !scanning && (
        <div className="space-y-3">
          <div className="space-y-1 rounded bg-slate-800/50 p-2.5 text-[10px]">
            <p className="font-bold text-green-400">
              Host is up: {results.hostUp ? 'Yes' : 'No'}
            </p>

            <p className="text-slate-400">
              Target:{' '}
              <span className="font-mono text-white">{results.target}</span>
            </p>

            <p className="text-slate-400">
              IP:{' '}
              <span className="font-mono text-white">{results.ip}</span>
            </p>
          </div>

          <div className="max-h-[180px] overflow-y-auto rounded-lg border border-slate-700">
            <table className="w-full text-[10px]">
              <thead className="sticky top-0 bg-slate-800">
                <tr>
                  <th className="px-2 py-1.5 text-left font-semibold text-slate-400">
                    Port
                  </th>
                  <th className="px-2 py-1.5 text-left font-semibold text-slate-400">
                    State
                  </th>
                  <th className="px-2 py-1.5 text-left font-semibold text-slate-400">
                    Service
                  </th>
                  <th className="px-2 py-1.5 text-left font-semibold text-slate-400">
                    Version
                  </th>
                </tr>
              </thead>

              <tbody className="font-mono">
                {results.ports.map((port) => (
                  <tr
                    key={port.port}
                    className={`border-t border-slate-800/50 ${
                      port.state === 'open' ? 'bg-green-900/10' : ''
                    }`}
                  >
                    <td className="px-2 py-1 font-bold text-white">
                      {port.port}
                    </td>

                    <td
                      className={`px-2 py-1 font-bold ${
                        port.state === 'open'
                          ? 'text-green-400'
                          : port.state === 'filtered'
                            ? 'text-yellow-400'
                            : 'text-slate-400'
                      }`}
                    >
                      {port.state}
                    </td>

                    <td className="px-2 py-1 text-cyan-400">
                      {port.service}
                    </td>

                    <td className="px-2 py-1 text-slate-400">
                      {port.version}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {results.vulnerabilities.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-red-400">
                ⚠️ Vulnerabilities Found ({results.vulnerabilities.length})
              </h4>

              {results.vulnerabilities.map((vulnerability) => (
                <div
                  key={`${vulnerability.name}-${vulnerability.port}`}
                  className="rounded border border-red-800/20 bg-red-950/30 p-2 text-[10px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-red-400">
                      {vulnerability.name}
                    </span>

                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                        vulnerability.severity === 'CRITICAL'
                          ? 'bg-red-600 text-white'
                          : vulnerability.severity === 'HIGH'
                            ? 'bg-orange-600 text-white'
                            : 'bg-yellow-600 text-black'
                      }`}
                    >
                      {vulnerability.severity}
                    </span>
                  </div>

                  <p className="mt-1 text-slate-400">
                    {vulnerability.description}
                  </p>

                  <p className="mt-1 text-yellow-300">
                    Port: {vulnerability.port}
                  </p>
                </div>
              ))}
            </div>
          )}

          {results.passwordHint && (
            <div className="rounded border border-yellow-800/20 bg-yellow-900/20 p-2.5">
              <p className="text-[10px] font-bold text-yellow-300">
                {results.passwordHint}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
