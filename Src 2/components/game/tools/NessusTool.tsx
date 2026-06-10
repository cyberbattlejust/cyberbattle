'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

import type { TeamId } from '@/components/game/types';

type NessusFinding = {
  plugin: number;
  name: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
  description: string;
  solution: string;
  port: number;
};

function normalizeTeamId(team: string): TeamId {
  if (team === 'teamA' || team === 'A') {
    return 'teamA';
  }

  return 'teamB';
}

function getDefaultTargetRange(teamId: TeamId) {
  return teamId === 'teamA' ? '192.168.1.0/24' : '192.168.2.0/24';
}

const VULNERABILITY_DATABASE: NessusFinding[] = [
  {
    plugin: 110095,
    name: 'SSL Certificate Expired',
    severity: 'High',
    description: 'The SSL certificate for this service has expired.',
    solution: 'Renew the SSL certificate and enable certificate monitoring.',
    port: 443,
  },
  {
    plugin: 19506,
    name: 'DNS Server Cache Snooping',
    severity: 'Medium',
    description: 'The remote DNS server may allow cache snooping.',
    solution: 'Restrict DNS recursion to trusted internal clients only.',
    port: 53,
  },
  {
    plugin: 11219,
    name: 'Default Administrative Credentials Detected',
    severity: 'Critical',
    description: 'A web administration service appears to use unsafe default credentials.',
    solution: 'Change default credentials and enforce unique strong passwords.',
    port: 8080,
  },
  {
    plugin: 34220,
    name: 'SMB Signing Not Required',
    severity: 'Medium',
    description: 'SMB signing is not required for remote connections.',
    solution: 'Enable SMB signing through security policy.',
    port: 445,
  },
  {
    plugin: 104710,
    name: 'Legacy SMB Protocol Enabled',
    severity: 'Critical',
    description: 'A legacy SMB protocol is enabled and increases exposure to known risks.',
    solution: 'Disable legacy SMB protocols and apply current security updates.',
    port: 445,
  },
  {
    plugin: 21745,
    name: 'FTP Anonymous Login',
    severity: 'Medium',
    description: 'FTP service appears to allow anonymous login.',
    solution: 'Disable anonymous FTP access and use authenticated secure file transfer.',
    port: 21,
  },
  {
    plugin: 42873,
    name: 'Unsupported PHP Version',
    severity: 'High',
    description: 'The detected PHP version is no longer supported.',
    solution: 'Upgrade PHP to a supported version and remove obsolete packages.',
    port: 80,
  },
  {
    plugin: 102950,
    name: 'OpenSSH Security Update Recommended',
    severity: 'High',
    description: 'The detected OpenSSH version should be reviewed for available security updates.',
    solution: 'Upgrade OpenSSH to a currently supported release.',
    port: 22,
  },
  {
    plugin: 20075,
    name: 'Database Weak Authentication Policy',
    severity: 'Critical',
    description: 'The database service appears to allow weak authentication controls.',
    solution: 'Enforce strong authentication and restrict database network exposure.',
    port: 3306,
  },
  {
    plugin: 100000,
    name: 'Nessus SYN Scanner',
    severity: 'Info',
    description: 'This plugin was used to perform a simulated SYN scan.',
    solution: 'N/A',
    port: 0,
  },
];

const SEVERITY_COLORS: Record<NessusFinding['severity'], string> = {
  Critical: 'bg-red-600 text-white',
  High: 'bg-orange-600 text-white',
  Medium: 'bg-yellow-600 text-black',
  Low: 'bg-blue-600 text-white',
  Info: 'bg-slate-600 text-white',
};

function pickFindings() {
  return VULNERABILITY_DATABASE.filter((finding) =>
    [
      11219,
      104710,
      19506,
      34220,
      102950,
      100000,
    ].includes(finding.plugin),
  );
}

export default function NessusTool({ team }: { team: string }) {
  const teamId = useMemo(() => normalizeTeamId(team), [team]);

  const [results, setResults] = useState<NessusFinding[]>([]);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hostInput, setHostInput] = useState(getDefaultTargetRange(teamId));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHostInput(getDefaultTargetRange(teamId));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResults([]);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(0);
  }, [teamId]);

  const startScan = async () => {
    if (scanning) {
      return;
    }

    const targetRange = hostInput.trim();

    if (!targetRange) {
      toast.error('Enter a target range first.');
      return;
    }

    setScanning(true);
    setResults([]);
    setProgress(0);

    for (let currentProgress = 0; currentProgress < 100; currentProgress += 8) {
      await new Promise((resolve) => setTimeout(resolve, 140));
      setProgress(Math.min(currentProgress + 8, 96));
    }

    const found = pickFindings();

    setProgress(100);
    setResults(found);

    const criticalCount = found.filter(
      (finding) => finding.severity === 'Critical',
    ).length;

    toast.success(
      `🔍 Nessus scan complete! ${found.length} findings (${criticalCount} critical)`,
    );

    setScanning(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <img
            src="/images/tools/nessus.png"
            alt="Nessus"
            className="h-5 w-5"
          />

          <h3
            className="text-sm font-bold text-purple-400"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            Nessus - Vulnerability Scanner
          </h3>
        </div>

        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={startScan}
          disabled={scanning}
          className="cursor-pointer rounded border-none bg-purple-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
        >
          {scanning ? '⏳ Scanning...' : '▶ Start Scan'}
        </motion.button>
      </div>

      {!scanning && results.length === 0 && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              value={hostInput}
              onChange={(event) => setHostInput(event.target.value)}
              placeholder="Target range, e.g. 192.168.1.0/24"
              className="flex-1 rounded border border-slate-700 bg-black px-2.5 py-1.5 font-mono text-xs text-cyan-400 placeholder:text-slate-600 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <p className="text-[10px] text-slate-600">
            Nessus Professional v10.7.0 — Simulated training scan
          </p>

          <p className="rounded border border-slate-800 bg-slate-950/60 p-2 text-[10px] text-slate-500">
            This scanner shows simulated defensive findings for the selected
            team network. It does not run a real external scan.
          </p>
        </div>
      )}

      {scanning && (
        <div className="space-y-2">
          <div className="h-2 overflow-hidden rounded bg-slate-800">
            <motion.div
              className="h-full rounded bg-gradient-to-r from-purple-500 to-pink-500"
              animate={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex justify-between text-[10px]">
            <span className="animate-pulse text-purple-400">
              🔎 Running simulated vulnerability assessment...
            </span>
            <span className="text-slate-400">{progress}%</span>
          </div>

          <div className="space-y-0.5 font-mono text-[10px] text-slate-600">
            <p>Target range: {hostInput}</p>
            <p>Checking port 22/tcp ssh...</p>
            <p>Checking port 80/tcp http...</p>
            <p>Checking port 443/tcp https...</p>
            <p>Checking port 445/tcp smb...</p>
            <p>Checking port 3306/tcp mysql...</p>
          </div>
        </div>
      )}

      {results.length > 0 && !scanning && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {(['Critical', 'High', 'Medium', 'Low', 'Info'] as const).map(
              (severity) => {
                const count = results.filter(
                  (finding) => finding.severity === severity,
                ).length;

                if (count === 0) {
                  return null;
                }

                return (
                  <span
                    key={severity}
                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${SEVERITY_COLORS[severity]}`}
                  >
                    {count} {severity}
                  </span>
                );
              },
            )}
          </div>

          <div className="rounded border border-slate-800 bg-slate-950/60 p-2 text-[10px] text-slate-500">
            Target range:{' '}
            <span className="font-mono text-cyan-300">{hostInput}</span>
          </div>

          <div className="max-h-[220px] space-y-1.5 overflow-y-auto">
            {results.map((finding) => (
              <div
                key={`${finding.plugin}-${finding.port}`}
                className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-2"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="max-w-[180px] truncate text-[10px] font-bold text-white">
                    {finding.name}
                  </span>

                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${SEVERITY_COLORS[finding.severity]}`}
                  >
                    {finding.severity}
                  </span>
                </div>

                <p className="mb-1 text-[9px] text-slate-400">
                  {finding.description}
                </p>

                <p className="text-[9px] text-green-400">
                  💡 {finding.solution}
                </p>

                <p className="mt-1 text-[9px] text-slate-600">
                  Plugin #{finding.plugin} — Port {finding.port || 'N/A'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
