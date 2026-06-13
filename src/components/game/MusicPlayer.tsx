'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Music2, Volume2, VolumeX } from 'lucide-react';

interface MusicPlayerProps {
  active: boolean;
  initialized: boolean;
  phase: 'lobby' | 'battle';
  muted: boolean;
  volume: number;
  onInit: () => void;
  onToggleMute: () => void;
  onVolumeChange: (v: number) => void;
}

export default function MusicPlayer({
  active,
  initialized,
  phase,
  muted,
  volume,
  onInit,
  onToggleMute,
  onVolumeChange,
}: MusicPlayerProps) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const findSlot = () => {
      setSlot(document.querySelector<HTMLElement>('[data-music-player-slot]'));
    };

    findSlot();

    const observer = new MutationObserver(findSlot);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  if (!active) return null;

  const toggleMusic = () => {
    if (!initialized) {
      onInit();
      return;
    }

    onToggleMute();
  };

  const player = (
    <div
      className={
        slot
          ? 'flex shrink-0 items-center gap-2 rounded-lg border border-cyan-400/20 bg-slate-950/70 p-1'
          : 'fixed right-3 top-3 z-[70] flex items-center gap-2 rounded-lg border border-cyan-400/20 bg-slate-950/90 p-2 shadow-xl shadow-black/40 backdrop-blur'
      }
    >
      <div
        className="flex h-8 w-8 items-center justify-center text-cyan-300"
        title={phase === 'battle' ? 'Battle theme' : 'Lobby and victory theme'}
      >
        <Music2 className="h-4 w-4" aria-hidden="true" />
      </div>

      <input
        aria-label="Music volume"
        title="Music volume"
        type="range"
        min={0}
        max={0.6}
        step={0.01}
        value={volume}
        onChange={(event) => onVolumeChange(Number(event.target.value))}
        className="w-20 accent-cyan-400"
      />

      <button
        type="button"
        onClick={toggleMusic}
        aria-label={
          !initialized ? 'Start music' : muted ? 'Unmute music' : 'Mute music'
        }
        title={
          !initialized ? 'Start music' : muted ? 'Unmute music' : 'Mute music'
        }
        className="flex h-8 w-8 items-center justify-center rounded-md border border-cyan-400/20 text-cyan-300 transition hover:bg-cyan-400/10"
      >
        {muted ? (
          <VolumeX className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Volume2 className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );

  return slot ? createPortal(player, slot) : player;
}
