'use client';

import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

import CyberParticles from '@/components/game/CyberParticles';

type LoginScreenProps = {
  onLogin: (email: string, role: string) => void;
  onGoToRegister: () => void;
};

export default function LoginScreen({
  onLogin,
  onGoToRegister,
}: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      const message = 'Please enter both email and password.';
      setErrorMessage(message);
      toast.error(message);
      return;
    }

    setErrorMessage('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
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
        const message = data.error || data.message || 'Invalid credentials.';
        setErrorMessage(message);
        toast.error(message);
        return;
      }

      const userRole =
        typeof data.user?.role === 'string' && data.user.role
          ? data.user.role
          : 'player';

      const userEmail =
        typeof data.user?.email === 'string' && data.user.email
          ? data.user.email
          : normalizedEmail;

      toast.success(data.message || 'Welcome, Agent!');
      onLogin(userEmail, userRole);
    } catch (error) {
      console.error('Login failed:', error);
      const message = 'Connection error. Please try again.';
      setErrorMessage(message);
      toast.error(message);
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
        <div className="rounded-2xl border border-cyan-500/50 bg-black/70 p-8 shadow-[0_0_30px_rgba(0,255,234,0.15)] backdrop-blur-xl">
          <div className="mb-8 text-center">
            <img
              src="/images/logo.png"
              alt="Logo"
              className="mx-auto mb-4 h-20 w-20 drop-shadow-[0_0_15px_rgba(0,255,234,0.4)]"
            />

            <h2
              className="text-2xl font-bold text-cyan-400"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              AGENT LOGIN
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Access the Cyber Arena
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="mb-1.5 block text-sm font-semibold text-cyan-300"
              >
                Email
              </label>

              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setErrorMessage('');
                }}
                placeholder="agent@cyber.game"
                autoComplete="email"
                disabled={loading}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-4 py-3 font-mono text-green-400 placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="mb-1.5 block text-sm font-semibold text-cyan-300"
              >
                Password
              </label>

              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setErrorMessage('');
                }}
                placeholder="Access code"
                autoComplete="current-password"
                disabled={loading}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-4 py-3 font-mono text-green-400 placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none disabled:opacity-60"
              />
            </div>

            {errorMessage && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-200">
                {errorMessage}
              </div>
            )}

            <motion.button
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full cursor-pointer rounded-lg border-none bg-gradient-to-r from-cyan-500 to-teal-500 py-3 text-lg font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              {loading ? '⏳ Authenticating...' : '🚀 ACCESS SYSTEM'}
            </motion.button>
          </form>

          <div className="mt-5 text-center">
            <p className="text-sm text-slate-500">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={onGoToRegister}
                disabled={loading}
                className="cursor-pointer border-none bg-transparent text-sm font-semibold text-cyan-400 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Register
              </button>
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
