'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type MusicPhase = 'lobby' | 'battle';

type UseGameMusicOptions = {
  view: string;
  authenticated: boolean;
  roomCode?: string;
};

const BATTLE_VIEWS = new Set([
  'role',
  'attack',
  'defense',
  'score',
  'logs',
  'missions',
]);
const SILENT_VIEWS = new Set(['intro', 'register', 'login']);
const TRANSITION_DURATION_MS = 900;
const TRANSITION_STEP_MS = 40;
const DEFAULT_VOLUME = 0.02;
const MAX_VOLUME = 0.6;

function clampVolume(value: number) {
  return Math.min(MAX_VOLUME, Math.max(0, value));
}

function createLoopingTrack(src: string) {
  const audio = new Audio(src);
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = 0;
  return audio;
}

function getTeamTotal(team: unknown) {
  if (!team || typeof team !== 'object') return 0;

  const score = (team as { score?: unknown }).score;
  if (!score || typeof score !== 'object') return 0;

  const values = score as {
    total?: unknown;
    attack?: unknown;
    defense?: unknown;
  };

  if (typeof values.total === 'number') return values.total;

  return (
    (typeof values.attack === 'number' ? values.attack : 0) +
    (typeof values.defense === 'number' ? values.defense : 0)
  );
}

export function useGameMusic({
  view,
  authenticated,
  roomCode,
}: UseGameMusicOptions) {
  const [roomStatus, setRoomStatus] = useState<string | null>(null);
  const [winnerReached, setWinnerReached] = useState(false);
  const [phase, setPhase] = useState<MusicPhase>('lobby');
  const [muted, setMuted] = useState(false);
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME);
  const [initialized, setInitialized] = useState(false);

  const lobbyAudioRef = useRef<HTMLAudioElement | null>(null);
  const battleAudioRef = useRef<HTMLAudioElement | null>(null);
  const activePhaseRef = useRef<MusicPhase>('lobby');
  const transitionRef = useRef<number | null>(null);

  const shouldPlayMusic = authenticated && !SILENT_VIEWS.has(view);

  const desiredPhase = useMemo<MusicPhase | null>(() => {
    if (!shouldPlayMusic) return null;

    if (!roomCode) return 'lobby';
    if (winnerReached || roomStatus === 'finished') return 'lobby';
    if (roomStatus === 'paused') return 'lobby';
    if (!BATTLE_VIEWS.has(view) && view !== 'supervisor') return 'lobby';
    if (roomStatus === 'playing' || BATTLE_VIEWS.has(view)) return 'battle';

    return 'lobby';
  }, [roomStatus, shouldPlayMusic, view, winnerReached]);

  const clearTransition = useCallback(() => {
    if (transitionRef.current !== null) {
      window.clearInterval(transitionRef.current);
      transitionRef.current = null;
    }
  }, []);

  const getTargetVolume = useCallback(() => {
    return muted ? 0 : clampVolume(volume);
  }, [muted, volume]);

  const getAudioByPhase = useCallback((targetPhase: MusicPhase) => {
    return targetPhase === 'lobby'
      ? lobbyAudioRef.current
      : battleAudioRef.current;
  }, []);

  const stopTrack = useCallback((audio: HTMLAudioElement | null) => {
    if (!audio) return;
    audio.pause();
    audio.volume = 0;
  }, []);

  const stopAllTracks = useCallback(() => {
    clearTransition();
    stopTrack(lobbyAudioRef.current);
    stopTrack(battleAudioRef.current);
  }, [clearTransition, stopTrack]);

  const safePlay = useCallback(async (audio: HTMLAudioElement | null) => {
    if (!audio) return false;

    try {
      await audio.play();
      return true;
    } catch {
      return false;
    }
  }, []);

  const applyImmediateVolume = useCallback(() => {
    const activeAudio = getAudioByPhase(activePhaseRef.current);
    const inactiveAudio =
      activePhaseRef.current === 'lobby'
        ? battleAudioRef.current
        : lobbyAudioRef.current;

    if (activeAudio) {
      activeAudio.volume = getTargetVolume();
    }

    if (inactiveAudio) {
      inactiveAudio.volume = 0;
    }
  }, [getAudioByPhase, getTargetVolume]);

  const crossfadeToPhase = useCallback(
    async (nextPhase: MusicPhase) => {
      const currentActivePhase = activePhaseRef.current;

      if (currentActivePhase === nextPhase) {
        setPhase(nextPhase);
        applyImmediateVolume();
        await safePlay(getAudioByPhase(nextPhase));
        return;
      }

      const currentAudio = getAudioByPhase(currentActivePhase);
      const nextAudio = getAudioByPhase(nextPhase);

      if (!nextAudio) return;

      clearTransition();
      nextAudio.volume = 0;

      const didStart = await safePlay(nextAudio);
      if (!didStart) return;

      const targetVolume = getTargetVolume();

      if (!currentAudio || currentAudio.paused) {
        nextAudio.volume = targetVolume;
        activePhaseRef.current = nextPhase;
        setPhase(nextPhase);
        return;
      }

      const startedAt = performance.now();

      transitionRef.current = window.setInterval(() => {
        const elapsed = performance.now() - startedAt;
        const progress = Math.min(1, elapsed / TRANSITION_DURATION_MS);

        currentAudio.volume = targetVolume * (1 - progress);
        nextAudio.volume = targetVolume * progress;

        if (progress >= 1) {
          clearTransition();
          currentAudio.pause();
          currentAudio.volume = 0;
          nextAudio.volume = targetVolume;
          activePhaseRef.current = nextPhase;
          setPhase(nextPhase);
        }
      }, TRANSITION_STEP_MS);
    },
    [
      applyImmediateVolume,
      clearTransition,
      getAudioByPhase,
      getTargetVolume,
      safePlay,
    ],
  );

  const init = useCallback(async () => {
    if (!desiredPhase) return;

    if (!lobbyAudioRef.current) {
      lobbyAudioRef.current = createLoopingTrack(
        '/audio/Lobby+Victory.mp3',
      );
    }

    if (!battleAudioRef.current) {
      battleAudioRef.current = createLoopingTrack('/audio/Battle.mp3');
    }

    activePhaseRef.current = desiredPhase;
    setPhase(desiredPhase);

    const activeAudio = getAudioByPhase(desiredPhase);
    const inactiveAudio =
      desiredPhase === 'lobby'
        ? battleAudioRef.current
        : lobbyAudioRef.current;

    stopTrack(inactiveAudio);

    if (activeAudio) {
      activeAudio.volume = getTargetVolume();
      const didStart = await safePlay(activeAudio);
      setInitialized(didStart);
    }
  }, [
    desiredPhase,
    getAudioByPhase,
    getTargetVolume,
    safePlay,
    stopTrack,
  ]);

  const refreshGameState = useCallback(async () => {
    if (!authenticated || !roomCode) {
      setRoomStatus(null);
      setWinnerReached(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/score?roomCode=${encodeURIComponent(roomCode)}`,
        { cache: 'no-store' },
      );
      const data = await response.json();

      if (!response.ok || !data?.success) return;

      const winScore =
        typeof data.winScore === 'number' && data.winScore > 0
          ? data.winScore
          : 100;
      const highestScore = Math.max(
        getTeamTotal(data.teamA),
        getTeamTotal(data.teamB),
      );

      setRoomStatus(typeof data.status === 'string' ? data.status : null);
      setWinnerReached(highestScore >= winScore);
    } catch (error) {
      console.error('Failed to refresh music game state:', error);
    }
  }, [authenticated, roomCode]);

  useEffect(() => {
    if (!authenticated || !roomCode) return;

    const initialRefreshId = window.setTimeout(refreshGameState, 0);
    const intervalId = window.setInterval(refreshGameState, 3000);

    window.addEventListener('cyber:score-changed', refreshGameState);

    return () => {
      window.clearTimeout(initialRefreshId);
      window.clearInterval(intervalId);
      window.removeEventListener('cyber:score-changed', refreshGameState);
    };
  }, [authenticated, refreshGameState, roomCode]);

  useEffect(() => {
    if (!desiredPhase) {
      stopAllTracks();
      return;
    }

    const transitionId = window.setTimeout(() => {
      if (!initialized) {
        void init();
        return;
      }

      void crossfadeToPhase(desiredPhase);
    }, 0);

    return () => {
      window.clearTimeout(transitionId);
    };
  }, [
    crossfadeToPhase,
    desiredPhase,
    init,
    initialized,
    stopAllTracks,
  ]);

  useEffect(() => {
    if (!initialized) return;
    applyImmediateVolume();
  }, [applyImmediateVolume, initialized, muted, volume]);

  useEffect(() => {
    return () => {
      stopAllTracks();
      lobbyAudioRef.current = null;
      battleAudioRef.current = null;
    };
  }, [stopAllTracks]);

  const setVolume = useCallback((nextVolume: number) => {
    setVolumeState(clampVolume(nextVolume));
  }, []);

  return {
    active: shouldPlayMusic,
    initialized,
    phase,
    muted,
    volume,
    init,
    setMuted,
    setVolume,
  };
}
