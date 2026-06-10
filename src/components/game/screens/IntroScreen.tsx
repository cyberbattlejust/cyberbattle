'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { motion } from 'framer-motion';

type IntroScreenProps = {
  onSkip: () => void;
};

export default function IntroScreen({ onSkip }: IntroScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [countdown, setCountdown] = useState(30);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [videoEnded, setVideoEnded] = useState(false);

  useEffect(() => {
    if (!mounted) return;

    timerRef.current = setInterval(() => {
      setCountdown((p) => p - 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mounted]);

  useEffect(() => {
    if (countdown <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      onSkip();
    }
  }, [countdown, onSkip]);

  const handleVideoEnd = () => {
    setVideoEnded(true);
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeout(() => onSkip(), 1500);
  };

  const handleSkip = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    onSkip();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center"
    >
      <video
        ref={videoRef}
        src="/videos/intro.mp4"
        autoPlay
        muted
        playsInline
        onEnded={handleVideoEnd}
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/60" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/50" />

      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,234,0.1) 2px, rgba(0,255,234,0.1) 4px)',
        }}
      />

      {videoEnded && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 text-center"
        >
          <motion.h1
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 mb-4 tracking-wider"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            CYBER GAME
          </motion.h1>

          <p
            className="text-2xl md:text-3xl font-bold mb-2"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            <span className="text-blue-400">AL-SHLOOL</span>
            <span className="text-slate-500 mx-4">vs</span>
            <span className="text-red-400">BANI YASSEN</span>
          </p>

          <p className="text-cyan-500/50 text-sm animate-pulse">Entering Arena...</p>
        </motion.div>
      )}

      <div className="absolute top-4 right-4 z-20 flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-slate-700/50">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span
            className="text-slate-400 text-xs"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            {countdown}s
          </span>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSkip}
          className="px-5 py-2 rounded-lg bg-red-600/80 text-white cursor-pointer border-none text-sm hover:bg-red-500 transition-colors backdrop-blur-sm"
          style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
          Skip ▸
        </motion.button>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20">
        <div className="h-1 bg-slate-800">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500"
            animate={{ width: `${((30 - countdown) / 30) * 100}%` }}
            transition={{ duration: 1, ease: 'linear' }}
          />
        </div>
      </div>
    </motion.div>
  );
}