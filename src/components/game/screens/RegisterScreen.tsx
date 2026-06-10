'use client';

import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

import CyberParticles from '@/components/game/CyberParticles';

type RegisterScreenProps = {
  onGoToLogin: () => void;
};

export default function RegisterScreen({ onGoToLogin }: RegisterScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password || !confirmPass) {
      toast.error('Fill all fields');
      return;
    }

    if (password !== confirmPass) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 4) {
      toast.error('Password must be at least 4 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        toast.error(data.error || data.message || 'Registration failed');
        return;
      }

      toast.success(data.message || 'Account created! Please login.');
      onGoToLogin();
    } catch (error) {
      console.error('Registration failed:', error);
      toast.error('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4"
    >
      <CyberParticles count={30} />

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl border border-purple-500/50 bg-black/70 p-8 shadow-[0_0_30px_rgba(168,85,247,0.15)] backdrop-blur-xl">
          <div className="mb-8 text-center">
            <img
              src="/images/logo.png"
              alt="Logo"
              className="mx-auto mb-4 h-20 w-20 drop-shadow-[0_0_15px_rgba(0,255,234,0.4)]"
            />

            <h2
              className="text-2xl font-bold text-purple-400"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              CREATE ACCOUNT
            </h2>

            <p className="mt-2 text-sm text-slate-500">Join the Cyber Arena</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="register-email"
                className="mb-1.5 block text-sm font-semibold text-cyan-300"
              >
                Email
              </label>

              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="agent@cyber.game"
                autoComplete="email"
                disabled={loading}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-4 py-3 font-mono text-green-400 placeholder:text-slate-600 focus:border-purple-500 focus:outline-none disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="register-password"
                className="mb-1.5 block text-sm font-semibold text-cyan-300"
              >
                Password
              </label>

              <input
                id="register-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Min 4 characters"
                autoComplete="new-password"
                disabled={loading}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-4 py-3 font-mono text-green-400 placeholder:text-slate-600 focus:border-purple-500 focus:outline-none disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="register-confirm-password"
                className="mb-1.5 block text-sm font-semibold text-cyan-300"
              >
                Confirm Password
              </label>

              <input
                id="register-confirm-password"
                type="password"
                value={confirmPass}
                onChange={(event) => setConfirmPass(event.target.value)}
                placeholder="Confirm password"
                autoComplete="new-password"
                disabled={loading}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-4 py-3 font-mono text-green-400 placeholder:text-slate-600 focus:border-purple-500 focus:outline-none disabled:opacity-60"
              />
            </div>

            <motion.button
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full cursor-pointer rounded-lg border-none bg-gradient-to-r from-purple-500 to-pink-500 py-3 text-lg font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              {loading ? '⏳ Creating...' : '🚀 CREATE ACCOUNT'}
            </motion.button>
          </form>

          <div className="mt-5 text-center">
            <p className="text-sm text-slate-500">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onGoToLogin}
                disabled={loading}
                className="cursor-pointer border-none bg-transparent text-sm font-semibold text-cyan-400 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Login
              </button>
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}