'use client';

import { useState, useSyncExternalStore } from 'react';

export default function CyberParticles({ count = 30 }: { count?: number }) {
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [particles] = useState(() =>
    Array.from({ length: count }).map((_, i) => ({
      id: i,
      w: 2 + Math.random() * 3,
      h: 2 + Math.random() * 3,
      left: Math.random() * 100,
      top: Math.random() * 100,
      opacity: 0.2 + Math.random() * 0.4,
      dur: 3 + Math.random() * 5,
      delay: Math.random() * 5,
    }))
  );
  if (!mounted) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {particles.map(p => (
        <div key={p.id} className="absolute rounded-full bg-cyan-400" style={{
          width: `${p.w}px`, height: `${p.h}px`,
          left: `${p.left}%`, top: `${p.top}%`,
          opacity: p.opacity,
          animation: `cyberFloat ${p.dur}s linear infinite`,
          animationDelay: `${p.delay}s`,
        }} />
      ))}
    </div>
  );
}
