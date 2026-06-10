'use client';

import { motion } from 'framer-motion';

import type { ToolView } from '@/components/game/types';

import WiresharkTool from './WiresharkTool';
import NmapTool from './NmapTool';
import MetasploitTool from './MetasploitTool';
import BurpSuiteTool from './BurpSuiteTool';
import CMDTool from './CMDTool';
import MalwarebytesTool from './MalwarebytesTool';
import NessusTool from './NessusTool';

type ToolWindowProps = {
  tool: ToolView;
  team: string;
  roomCode?: string;
  onClose: () => void;
  onEmitTool?: (tool: string) => void;
};

const toolNames: Record<ToolView, string> = {
  none: 'Tool',
  wireshark: 'Wireshark',
  nmap: 'Nmap',
  metasploit: 'Metasploit',
  burpsuite: 'Burp Suite',
  cmd: 'Command Prompt',
  malwarebytes: 'Malwarebytes',
  nessus: 'Nessus',
};

const toolColors: Record<ToolView, string> = {
  none: 'text-white',
  wireshark: 'text-cyan-400',
  nmap: 'text-orange-400',
  metasploit: 'text-red-400',
  burpsuite: 'text-orange-300',
  cmd: 'text-green-400',
  malwarebytes: 'text-blue-400',
  nessus: 'text-purple-400',
};

export default function ToolWindow(props: ToolWindowProps) {
  const { tool, team, roomCode, onClose } = props;

  if (tool === 'none') {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-[0_0_30px_rgba(0,0,0,0.5)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
          <h3
            className={`text-sm font-bold ${toolColors[tool] || 'text-white'}`}
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            {toolNames[tool] || 'Tool'}
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-none bg-slate-800 text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {tool === 'wireshark' && <WiresharkTool team={team} roomCode={roomCode} />}
        {tool === 'nmap' && <NmapTool team={team} roomCode={roomCode} />}
        {tool === 'metasploit' && <MetasploitTool />}
        {tool === 'burpsuite' && <BurpSuiteTool />}
        {tool === 'cmd' && <CMDTool team={team} />}
        {tool === 'malwarebytes' && <MalwarebytesTool team={team} />}
        {tool === 'nessus' && <NessusTool team={team} />}
      </motion.div>
    </motion.div>
  );
}
