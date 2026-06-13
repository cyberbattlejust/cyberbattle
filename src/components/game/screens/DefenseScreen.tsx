'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

import type {
  ScoreData,
  ToolView,
  ChatMessage,
  SystemMessage,
  TypingUser,
  RoomInfo,
  TeamId,
} from '@/components/game/types';
import TeamChatPanel from '@/components/game/TeamChatPanel';
import ToolWindow from '@/components/game/tools/ToolWindow';

type DefenseScreenProps = {
  team: string;
  username: string;
  onSwitchToAttack: () => void;
  onViewScore: () => void;
  onLogout: () => void;
  onGoToLogs: () => void;
  onGoToMissions: () => void;
  onOpenSettings: () => void;
  connected: boolean;
  chatMessages: ChatMessage[];
  systemMessages: SystemMessage[];
  typingUsers: TypingUser[];
  onSendMessage: (msg: string) => void;
  onTyping: (v: boolean) => void;
  onEmitDefense: (teamId: string) => void;
  onEmitTool: (tool: string) => void;
  activeRoom?: RoomInfo | null;
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

export default function DefenseScreen({
  team,
  username,
  onSwitchToAttack,
  onViewScore,
  onLogout,
  onGoToLogs,
  onGoToMissions,
  onOpenSettings,
  connected,
  chatMessages,
  systemMessages,
  typingUsers,
  onSendMessage,
  onTyping,
  onEmitDefense,
  onEmitTool,
  activeRoom = null,
}: DefenseScreenProps) {
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showNetwork, setShowNetwork] = useState(false);
  const [showInternet, setShowInternet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);
  const [teamData, setTeamData] = useState<{ ssid: string } | null>(null);
  const [activeTool, setActiveTool] = useState<ToolView>('none');
  const [gameStatus, setGameStatus] = useState(activeRoom?.status || 'playing');

  const apiTeamId = useMemo(() => normalizeTeamId(team), [team]);
  const teamName = getTeamDisplayName(apiTeamId);
  const gameIsPlayable = !activeRoom?.code || gameStatus === 'playing';

  useEffect(() => {
    if (!activeRoom?.code) return;

    let cancelled = false;

    const fetchStatus = async () => {
      try {
        const response = await fetch(
          `/api/rooms/status?roomCode=${encodeURIComponent(activeRoom.code)}`,
        );
        const data = await response.json();

        if (!cancelled && response.ok && data?.success) {
          setGameStatus(data.room.status);
        }
      } catch (error) {
        console.error('Failed to refresh game status:', error);
      }
    };

    fetchStatus();
    const intervalId = window.setInterval(fetchStatus, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activeRoom?.code]);

  useEffect(() => {
    const query = activeRoom?.code
      ? `?roomCode=${encodeURIComponent(activeRoom.code)}`
      : '';

    fetch(`/api/score${query}`)
      .then(async (response) => {
        const data = (await response.json()) as ScoreData;

        if (!response.ok || !data.teamA || !data.teamB) {
          throw new Error('Failed to load score data');
        }

        const selectedTeamData =
          apiTeamId === 'teamA' ? data.teamA : data.teamB;

        setTeamData({
          ssid: selectedTeamData.network.ssid,
        });
      })
      .catch((error) => {
        console.error('Failed to load team network data:', error);
        setTeamData(null);
      });
  }, [activeRoom?.code, apiTeamId]);

  const handlePassword = async () => {
    if (loading) return;

    if (!gameIsPlayable) {
      toast.error(`Game is ${gameStatus}. Defense actions are locked.`);
      return;
    }

    const normalizedNewPass = newPass.trim();
    const normalizedConfirmPass = confirmPass.trim();

    if (!normalizedNewPass || !normalizedConfirmPass) {
      toast.error('Fill all fields');
      return;
    }

    if (normalizedNewPass !== normalizedConfirmPass) {
      toast.error('Passwords do not match');
      return;
    }

    if (normalizedNewPass.length < 8) {
      toast.error('Min 8 characters');
      return;
    }

    setLoading(true);
    setMsg(null);

    try {
      const response = await fetch('/api/game/defense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team: apiTeamId,
          newPassword: normalizedNewPass,
          roomCode: activeRoom?.code,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setMsg({ text: data.error || data.message || 'Error', type: 'error' });
        toast.error(data.error || 'Update failed');
        return;
      }

      setMsg({ text: data.message, type: 'success' });
      toast.success('🛡️ Password changed!');
      onEmitDefense(apiTeamId);
      window.dispatchEvent(new Event('cyber:score-changed'));

      setNewPass('');
      setConfirmPass('');

      setTimeout(() => {
        setShowInternet(false);
        setShowNetwork(false);
        setMsg(null);
      }, 2000);
    } catch (error) {
      console.error('Password update failed:', error);
      setMsg({ text: 'Connection error', type: 'error' });
      toast.error('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const openNetworkSettings = () => {
    if (!gameIsPlayable) {
      toast.error(`Game is ${gameStatus}. Settings are locked.`);
      return;
    }

    setMsg(null);
    setShowNetwork(true);
  };

  const defenseTools = [
    {
      name: 'Nessus',
      icon: '🔍',
      tool: 'nessus' as ToolView,
      desc: 'Vulnerability scan',
    },
    {
      name: 'Malwarebytes',
      icon: '🛡️',
      tool: 'malwarebytes' as ToolView,
      desc: 'Threat scanner',
    },
    {
      name: 'Wireshark',
      icon: '🦈',
      tool: 'wireshark' as ToolView,
      desc: 'Capture packets',
    },
    {
      name: 'Nmap',
      icon: '🗺️',
      tool: 'nmap' as ToolView,
      desc: 'Scan ports',
    },
    {
      name: 'CMD',
      icon: '💻',
      tool: 'cmd' as ToolView,
      desc: 'Terminal',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-screen flex-col bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950"
    >
      <div className="relative flex-1 overflow-hidden pt-7">
        <div className="absolute inset-0 bg-[url('https://wallpaperaccess.com/full/317501.jpg')] bg-cover bg-center opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 to-slate-950/50" />

        <div className="relative z-10 p-4">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-blue-500 animate-pulse" />

              <span
                className="font-bold text-blue-400"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                DEFENSE MODE
              </span>

              {activeRoom && (
                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-300">
                  {activeRoom.name} • {activeRoom.code}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-sm">
              <span className="text-slate-400">{username}</span>

              <span className="rounded bg-blue-900/50 px-2 py-1 text-xs text-blue-400">
                {teamName}
              </span>

              <span
                className={`rounded px-2 py-1 text-xs ${
                  connected
                    ? 'bg-emerald-900/40 text-emerald-400'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {connected ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
          </div>

          <div className="mx-auto mb-5 max-w-3xl rounded-2xl border border-blue-900/30 bg-slate-950/45 px-4 py-3 backdrop-blur-sm">
            <div className="flex flex-col gap-2 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <div>
                Defensive unit:
                <span className="ml-2 font-semibold text-blue-300">
                  {teamName}
                </span>
              </div>

              <div>
                SSID:
                <span className="ml-2 font-mono font-semibold text-cyan-300">
                  {teamData?.ssid || '...'}
                </span>
              </div>
            </div>
          </div>

          {!gameIsPlayable && (
            <div className="mx-auto mb-5 max-w-3xl rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-100">
              Game is {gameStatus.toUpperCase()}. Tools, missions, and defense
              changes are locked until the supervisor resumes play.
            </div>
          )}

          <div className="relative z-10 mx-auto grid max-w-3xl grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-5">
            {defenseTools.map((toolItem, index) => (
              <motion.button
                key={toolItem.name}
                type="button"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 * index }}
                whileHover={{ scale: 1.05, y: -5 }}
                onClick={() => {
                  if (!gameIsPlayable) {
                    toast.error(`Game is ${gameStatus}. Tools are locked.`);
                    return;
                  }

                  setActiveTool(toolItem.tool);
                  onEmitTool(toolItem.name);
                }}
                disabled={!gameIsPlayable}
                className="group flex cursor-pointer flex-col items-center rounded-xl border border-slate-800 bg-slate-900/80 p-3 hover:border-blue-500/50 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <span className="mb-1.5 text-3xl transition-transform group-hover:scale-110">
                  {toolItem.icon}
                </span>

                <span className="text-xs font-semibold text-white">
                  {toolItem.name}
                </span>

                <span className="text-[10px] text-slate-500">
                  {toolItem.desc}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showNetwork && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
            onClick={() => {
              setShowNetwork(false);
              setShowInternet(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md rounded-2xl border border-blue-800/50 bg-slate-900 p-6 shadow-[0_0_30px_rgba(59,130,246,0.2)]"
              onClick={(event) => event.stopPropagation()}
            >
              <h3
                className="mb-4 text-lg font-bold text-blue-400"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                🌐 Network Settings
              </h3>

              <button
                type="button"
                onClick={() => {
                  setShowNetwork(false);
                  setShowInternet(true);
                }}
                className="flex w-full cursor-pointer items-center gap-3 rounded-lg bg-slate-800 p-3 text-left hover:bg-slate-700"
              >
                <span>🌐</span>
                <span className="text-white">Internet Settings</span>
                <span className="ml-auto text-slate-500">→</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInternet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setShowInternet(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md rounded-2xl border border-blue-800/50 bg-slate-900 p-6 shadow-[0_0_30px_rgba(59,130,246,0.2)]"
              onClick={(event) => event.stopPropagation()}
            >
              <h3
                className="mb-4 border-b border-blue-800/50 pb-3 text-lg font-bold text-blue-400"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
              >
                🌐 Internet Settings
              </h3>

              <div className="mb-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Team:</span>
                  <span className="text-white">{teamName}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">SSID:</span>
                  <span className="font-mono text-cyan-400">
                    {teamData?.ssid || '...'}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400">
                    New Password:
                  </label>

                  <input
                    type="password"
                    value={newPass}
                    onChange={(event) => setNewPass(event.target.value)}
                    placeholder="Min 8 chars"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-sm text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        handlePassword();
                      }
                    }}
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400">Confirm:</label>

                  <input
                    type="password"
                    value={confirmPass}
                    onChange={(event) => setConfirmPass(event.target.value)}
                    placeholder="Confirm"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-sm text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        handlePassword();
                      }
                    }}
                  />
                </div>

                {msg && (
                  <div
                    className={`rounded-lg p-2.5 text-xs font-semibold ${
                      msg.type === 'success'
                        ? 'border border-green-700 bg-green-900/30 text-green-400'
                        : 'border border-red-700 bg-red-900/30 text-red-400'
                    }`}
                  >
                    {msg.text}
                  </div>
                )}

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handlePassword}
                  disabled={loading}
                  className="w-full rounded-lg border-none bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  {loading ? '⏳ Updating...' : '💾 Change Password'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeTool !== 'none' && (
          <ToolWindow
            tool={activeTool}
            team={apiTeamId}
            roomCode={activeRoom?.code}
            onClose={() => setActiveTool('none')}
            onEmitTool={onEmitTool}
          />
        )}
      </AnimatePresence>

      <TeamChatPanel
        team={apiTeamId}
        username={username}
        connected={connected}
        chatMessages={chatMessages}
        systemMessages={systemMessages}
        typingUsers={typingUsers}
        onSendMessage={onSendMessage}
        onTyping={onTyping}
      />

      <div className="relative z-30 flex flex-wrap items-center gap-2 border-t border-slate-800 bg-slate-950/95 px-4 py-2.5 backdrop-blur-xl">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={openNetworkSettings}
          disabled={!gameIsPlayable}
          className="cursor-pointer rounded-lg border-none bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
        >
          ⚙️ Settings
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onSwitchToAttack}
          className="cursor-pointer rounded-lg border-none bg-gradient-to-r from-red-600 to-orange-600 px-3 py-1.5 text-xs font-semibold text-white"
        >
          ⚔️ Attack
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onViewScore}
          className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white"
        >
          📊 Score
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onGoToMissions}
          disabled={!gameIsPlayable}
          className="cursor-pointer rounded-lg border-none bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
        >
          🎯 Missions
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onGoToLogs}
          className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white"
        >
          📜 Logs
        </motion.button>

        <div className="ml-auto flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onOpenSettings}
            className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:border-cyan-500 hover:text-cyan-200"
            title="Settings"
          >
            ⚙️
          </motion.button>

          <div data-music-player-slot />

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onLogout}
            className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:border-red-500 hover:text-red-400"
            title="Logout"
          >
            🚪
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
