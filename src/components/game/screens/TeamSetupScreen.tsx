'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

import CyberParticles from '@/components/game/CyberParticles';
import type { ScoreData, TeamId } from '@/components/game/types';

type TeamSetupScreenProps = {
  team: string;
  username: string;
  onUsernameChange?: (username: string) => void;
  activeRoom?: {
    code: string;
    name: string;
  } | null;
  onBack: () => void;
  onContinue: () => void;
};

function normalizeTeamId(team: string): TeamId {
  if (team === 'teamA' || team === 'A') {
    return 'teamA';
  }

  return 'teamB';
}

function getDefaultTeamName(teamId: TeamId) {
  return teamId === 'teamA' ? 'AL-SHLOOL' : 'BANI YASSEN';
}

function getDefaultSsid(teamId: TeamId) {
  return teamId === 'teamA' ? 'Shlool_WiFi' : 'Yassen_WiFi';
}

export default function TeamSetupScreen({
  team,
  username,
  onUsernameChange,
  activeRoom = null,
  onBack,
  onContinue,
}: TeamSetupScreenProps) {
  const teamId = useMemo(() => normalizeTeamId(team), [team]);
  const [displayName, setDisplayName] = useState(getDefaultTeamName(teamId));
  const [ssid, setSsid] = useState(getDefaultSsid(teamId));
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [leaderUsername, setLeaderUsername] = useState('');

  useEffect(() => {
    setFetching(true);

    const query = activeRoom?.code
      ? `?roomCode=${encodeURIComponent(activeRoom.code)}`
      : '';

    fetch(`/api/score${query}`)
      .then(async (response) => {
        const data = (await response.json()) as ScoreData;

        if (!response.ok || !data.teamA || !data.teamB) {
          throw new Error('Failed to load team settings.');
        }

        const teamData = teamId === 'teamA' ? data.teamA : data.teamB;

        setDisplayName(teamData.displayName || getDefaultTeamName(teamId));
        setSsid(teamData.network.ssid || getDefaultSsid(teamId));
        setLeaderUsername(teamData.leaderUsername || username);
      })
      .catch((error) => {
        console.error('Failed to load team setup:', error);
      })
      .finally(() => setFetching(false));
  }, [activeRoom?.code, teamId]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (loading) return;

    if (
      leaderUsername &&
      leaderUsername.toLowerCase() !== username.trim().toLowerCase()
    ) {
      toast.error(`Only ${leaderUsername} can edit this team setup.`);
      return;
    }

    const normalizedDisplayName = displayName.trim();
    const normalizedSsid = ssid.trim();
    const normalizedPassword = password.trim();
    const normalizedConfirmPassword = confirmPassword.trim();

    if (normalizedDisplayName.length < 2) {
      toast.error('Team name must be at least 2 characters.');
      return;
    }

    if (normalizedSsid.length < 3) {
      toast.error('Network name must be at least 3 characters.');
      return;
    }

    if (normalizedPassword.length < 4) {
      toast.error('Network password must be at least 4 characters.');
      return;
    }

    if (normalizedPassword !== normalizedConfirmPassword) {
      toast.error('Network passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/game/teams/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team: teamId,
          displayName: normalizedDisplayName,
          ssid: normalizedSsid,
          password: normalizedPassword,
          username,
          roomCode: activeRoom?.code,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        toast.error(data.error || 'Failed to save team setup.');
        return;
      }

      toast.success(data.message || 'Team setup saved.');
      window.dispatchEvent(new Event('cyber:score-changed'));
      onContinue();
    } catch (error) {
      console.error('Failed to save team setup:', error);
      toast.error('Failed to save team setup.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4"
    >
      <CyberParticles count={28} />

      <div className="relative z-10 w-full max-w-4xl">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            {activeRoom && (
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
                <span>{activeRoom.name}</span>
                <span className="text-slate-500">|</span>
                <span>{activeRoom.code}</span>
              </div>
            )}

            <h1
              className="text-3xl font-black uppercase tracking-[0.12em] text-white md:text-5xl"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              Team Setup
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Set your team identity before entering the game. The network
              password is what the other team will try to discover during
              attack mode.
            </p>
            {leaderUsername && (
              <p className="mt-2 text-xs text-emerald-300">
                Team leader: {leaderUsername}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onBack}
            className="rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm font-semibold text-slate-300 hover:border-cyan-400/30 hover:text-white"
          >
            Back
          </button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-cyan-400/20 bg-slate-900/80 p-5 shadow-2xl shadow-cyan-950/20"
          >
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Selected Team
                </div>
                <div className="mt-1 text-lg font-bold text-cyan-300">
                  {teamId === 'teamA' ? 'Team A' : 'Team B'}
                </div>
              </div>

              {fetching && (
                <span className="animate-pulse text-xs text-slate-500">
                  Loading...
                </span>
              )}
            </div>

            <div className="space-y-4">
              <SetupField
                label="Your Display Name"
                value={username}
                onChange={(value) => onUsernameChange?.(value)}
                placeholder="Example: Mohammad"
                maxLength={40}
              />

              <SetupField
                label="Team Name"
                value={displayName}
                onChange={setDisplayName}
                placeholder="Example: Cyber Knights"
                maxLength={32}
              />

              <SetupField
                label="Network Name (SSID)"
                value={ssid}
                onChange={setSsid}
                placeholder="Example: Knights_WiFi"
                maxLength={32}
              />

              <SetupField
                label="Network Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="Minimum 4 characters"
                maxLength={64}
              />

              <SetupField
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Repeat network password"
                maxLength={64}
              />

              <button
                type="submit"
                disabled={loading || fetching}
                className="w-full rounded-xl bg-cyan-500 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save and Continue'}
              </button>
            </div>
          </form>

          <aside className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-slate-300">
              Preview
            </h2>

            <div className="space-y-3">
              <PreviewRow label="Team" value={displayName || '-'} />
              <PreviewRow label="SSID" value={ssid || '-'} />
              <PreviewRow
                label="Password"
                value={password ? '*'.repeat(Math.min(password.length, 12)) : '-'}
              />
              <PreviewRow label="Configured By" value={username} />
            </div>

            <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100/80">
              Pick something memorable, but not obvious. A weak password gives
              the attacking team an easy point.
            </div>
          </aside>
        </div>
      </div>
    </motion.div>
  );
}

function SetupField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
      />
    </label>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
      <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-white">
        {value}
      </div>
    </div>
  );
}
