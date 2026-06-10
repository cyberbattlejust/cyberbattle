'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

type SimulationModule = {
  name: string;
  payload: string;
  port: number;
  risk: 'Critical' | 'High' | 'Medium';
  recommendation: string;
};

const SIMULATION_MODULES: SimulationModule[] = [
  {
    name: 'SMB Exposure Assessment',
    payload: 'payload/windows/x64/meterpreter/reverse_tcp',
    port: 445,
    risk: 'Critical',
    recommendation: 'Disable legacy SMB protocols and apply current security updates.',
  },
  {
    name: 'Web Framework Exposure Review',
    payload: 'java/meterpreter/reverse_tcp',
    port: 8080,
    risk: 'High',
    recommendation: 'Patch the web framework and restrict administrative endpoints.',
  },
  {
    name: 'SSH Authentication Policy Check',
    payload: 'scanner/ssh/auth_policy_check',
    port: 22,
    risk: 'Medium',
    recommendation: 'Disable password-based login where possible and enforce MFA.',
  },
  {
    name: 'FTP Anonymous Access Review',
    payload: 'scanner/ftp/anonymous_access_check',
    port: 21,
    risk: 'Medium',
    recommendation: 'Disable anonymous FTP access and use secure file transfer.',
  },
];

function isLikelyIpAddress(value: string) {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(value.trim());
}

function getRiskColor(risk: SimulationModule['risk']) {
  if (risk === 'Critical') {
    return 'text-red-300';
  }

  if (risk === 'High') {
    return 'text-orange-300';
  }

  return 'text-yellow-300';
}

export default function MetasploitTool() {
  const [target, setTarget] = useState('192.168.2.1');
  const [selectedModuleName, setSelectedModuleName] = useState('');
  const [output, setOutput] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const selectedModule = SIMULATION_MODULES.find(
    (module) => module.name === selectedModuleName,
  );

  const runSimulation = async () => {
    if (!selectedModule) {
      toast.error('Select a simulation module');
      return;
    }

    const normalizedTarget = target.trim();

    if (!normalizedTarget || !isLikelyIpAddress(normalizedTarget)) {
      toast.error('Enter a valid simulated target IP');
      return;
    }

    setRunning(true);
    setOutput([]);

    const lines = [
      'msf6 > workspace cyberarena-lab',
      '[*] Running controlled training simulation only.',
      `[*] Target host: ${normalizedTarget}`,
      `[*] Selected module: ${selectedModule.name}`,
      `[*] Checking service exposure on port ${selectedModule.port}/tcp...`,
      `[*] Lab reference payload path: ${selectedModule.payload}`,
      '[*] No real exploit code is executed in this environment.',
      '[*] Collecting simulated risk evidence...',
    ];

    for (const line of lines) {
      await new Promise((resolve) => setTimeout(resolve, 450));
      setOutput((previous) => [...previous, line]);
    }

    await new Promise((resolve) => setTimeout(resolve, 800));

    setOutput((previous) => [
      ...previous,
      `[+] Simulation complete: ${selectedModule.risk} risk condition identified.`,
      `[+] Affected service: port ${selectedModule.port}/tcp`,
      `[+] Recommended action: ${selectedModule.recommendation}`,
      '[*] Report saved to Cyber Arena training console.',
    ]);

    toast.success('🎯 Simulation complete!');
    setRunning(false);
  };

  const clearOutput = () => {
    setOutput([]);
  };

  return (
    <div className="space-y-3">
      <h3
        className="text-sm font-bold text-red-400"
        style={{ fontFamily: 'Orbitron, sans-serif' }}
      >
        🎯 Metasploit - Training Console
      </h3>

      <div className="rounded border border-red-900/20 bg-red-950/10 p-2 text-[10px] text-slate-400">
        This is a controlled Cyber Arena simulation. It produces training output
        only and does not run real exploitation commands.
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          placeholder="Target IP"
          className="flex-1 rounded border border-slate-700 bg-black px-2.5 py-1.5 font-mono text-xs text-green-400 placeholder:text-slate-600 focus:border-red-500 focus:outline-none"
        />

        <select
          value={selectedModuleName}
          onChange={(event) => setSelectedModuleName(event.target.value)}
          className="flex-1 rounded border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none"
        >
          <option value="">Select Module...</option>

          {SIMULATION_MODULES.map((module) => (
            <option key={module.name} value={module.name}>
              {module.name}
            </option>
          ))}
        </select>
      </div>

      {selectedModule && (
        <div className="rounded border border-slate-800 bg-slate-950/60 p-2 text-[10px]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-500">Risk:</span>
            <span className={`font-bold ${getRiskColor(selectedModule.risk)}`}>
              {selectedModule.risk}
            </span>
          </div>

          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="text-slate-500">Service port:</span>
            <span className="font-mono text-cyan-300">
              {selectedModule.port}/tcp
            </span>
          </div>

          <div className="mt-1 text-slate-500">
            Lab payload reference:{' '}
            <span className="font-mono text-slate-300">
              {selectedModule.payload}
            </span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={runSimulation}
          disabled={running || !selectedModule}
          className="flex-1 cursor-pointer rounded border-none bg-gradient-to-r from-red-600 to-orange-600 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          {running ? '⏳ Running Simulation...' : '🎯 Run Simulation'}
        </motion.button>

        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={clearOutput}
          disabled={running || output.length === 0}
          className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300 disabled:opacity-50"
        >
          Clear
        </motion.button>
      </div>

      <div className="max-h-[190px] overflow-y-auto rounded-lg border border-slate-800 bg-black p-2.5 font-mono text-[10px] text-green-400">
        {output.length === 0 ? (
          <p className="text-slate-600">{'msf6 >'} Waiting for simulation...</p>
        ) : (
          output.map((line, index) => (
            <p
              key={`${line}-${index}`}
              className={
                line.startsWith('[+]')
                  ? 'text-green-300'
                  : line.startsWith('[-]')
                    ? 'text-red-400'
                    : line.includes('No real exploit')
                      ? 'text-yellow-300'
                      : 'text-green-400'
              }
            >
              {line}
            </p>
          ))
        )}

        {running && <span className="animate-pulse">█</span>}
      </div>
    </div>
  );
}