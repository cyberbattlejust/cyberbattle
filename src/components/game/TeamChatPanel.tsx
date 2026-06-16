'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import type {
  ChatMessage,
  SystemMessage,
  TeamId,
  TypingUser,
} from '@/components/game/types';

type TeamChatPanelProps = {
  team: string;
  username: string;
  connected: boolean;
  chatMessages: ChatMessage[];
  systemMessages: SystemMessage[];
  typingUsers: TypingUser[];
  onSendMessage: (message: string) => void;
  onTyping: (isTyping: boolean) => void;
};

type CombinedMessage =
  | (ChatMessage & { type: 'chat' })
  | {
      id: string;
      type: 'system';
      username: 'SYSTEM';
      message: string;
      timestamp: number;
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

function clampMessage(message: string) {
  return message.trim().slice(0, 600);
}

export default function TeamChatPanel({
  team,
  username,
  connected,
  chatMessages,
  systemMessages,
  typingUsers,
  onSendMessage,
  onTyping,
}: TeamChatPanelProps) {
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const endRef = useRef<HTMLDivElement>(null);
  const wasTypingRef = useRef(false);

  const teamId = useMemo(() => normalizeTeamId(team), [team]);
  const teamName = getTeamDisplayName(teamId);

  const allMessages = useMemo<CombinedMessage[]>(() => {
    const chatItems: CombinedMessage[] = chatMessages.map((message) => ({
      ...message,
      type: 'chat',
    }));

    const systemItems: CombinedMessage[] = systemMessages.map(
      (message, index) => ({
        id: `sys-${message.timestamp}-${index}`,
        type: 'system',
        username: 'SYSTEM',
        message: message.message,
        timestamp: message.timestamp,
      }),
    );

    return [...chatItems, ...systemItems].sort(
      (a, b) => a.timestamp - b.timestamp,
    );
  }, [chatMessages, systemMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages, isOpen]);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnreadCount(0);
      return;
    }

    if (allMessages.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnreadCount((prev) => Math.min(prev + 1, 99));
    }
  }, [allMessages.length, isOpen]);

  useEffect(() => {
    return () => {
      if (wasTypingRef.current) {
        onTyping(false);
      }
    };
  }, [onTyping]);

  const handleInputChange = (value: string) => {
    setInput(value);

    const isTyping = value.trim().length > 0;

    if (wasTypingRef.current !== isTyping) {
      wasTypingRef.current = isTyping;
      onTyping(isTyping);
    }
  };

  const sendMessage = () => {
    const message = clampMessage(input);

    if (!message || !connected) {
      return;
    }

    onSendMessage(message);
    setInput('');

    if (wasTypingRef.current) {
      wasTypingRef.current = false;
      onTyping(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const activeTypingUsers = typingUsers.filter(
    (user) => user.isTyping && user.username !== username,
  );

  return (
    <>
      <motion.button
        type="button"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen((value) => !value)}
        className="fixed bottom-16 right-4 z-50 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-none bg-gradient-to-br from-cyan-500 to-teal-500 text-white shadow-[0_0_20px_rgba(0,255,234,0.3)]"
      >
        {isOpen ? (
          '✕'
        ) : (
          <span className="relative">
            💬
            {unreadCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-32 right-4 z-50 flex max-h-[420px] w-[320px] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/95 shadow-[0_0_30px_rgba(0,0,0,0.5)] backdrop-blur-xl"
          >
            <div className="flex shrink-0 items-center gap-2 border-b border-slate-700 bg-slate-800/80 px-4 py-2.5">
              <span>💬</span>

              <div className="min-w-0 flex-1">
                <h3
                  className="text-sm font-bold text-white"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  TEAM CHAT
                </h3>

                <p className="truncate text-[9px] text-slate-500">
                  {teamName}
                </p>
              </div>

              <span className="text-[10px] text-slate-500">
                {connected ? '🟢 Live' : '🔴 Off'}
              </span>
            </div>

            <div className="max-h-[260px] flex-1 space-y-1.5 overflow-y-auto p-2.5">
              {allMessages.length === 0 ? (
                <div className="py-8 text-center text-[10px] text-slate-600">
                  No team messages yet.
                </div>
              ) : (
                allMessages.map((message) => {
                  const isSupervisorMessage =
                    message.type === 'chat' && message.role === 'supervisor';

                  return (
                    <div key={message.id}>
                      {message.type === 'system' ? (
                        <p className="py-1 text-center text-[10px] text-yellow-500/70">
                          {message.message}
                        </p>
                      ) : (
                        <div
                          className={`rounded-lg px-2.5 py-1.5 text-xs ${
                            isSupervisorMessage
                              ? 'border border-yellow-500/25 bg-yellow-500/10'
                              : message.username === username
                                ? 'ml-6 border border-cyan-800/20 bg-cyan-900/30'
                                : 'mr-6 bg-slate-800/50'
                          }`}
                        >
                          <span
                            className={`text-[10px] font-semibold ${
                              isSupervisorMessage
                                ? 'text-yellow-300'
                                : message.username === username
                                  ? 'text-cyan-400'
                                  : 'text-slate-400'
                            }`}
                          >
                            {isSupervisorMessage
                              ? 'SUPERVISOR'
                              : message.username === username
                                ? 'You'
                                : message.username}
                          </span>

                          <span className="ml-1 text-[9px] text-slate-600">
                            {new Date(message.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>

                          <p className="mt-0.5 break-words text-slate-300">
                            {message.message}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              <div ref={endRef} />

              {activeTypingUsers.length > 0 && (
                <p className="animate-pulse px-1 text-[10px] text-slate-500">
                  {activeTypingUsers.map((user) => user.username).join(', ')}{' '}
                  typing...
                </p>
              )}
            </div>

            <div className="shrink-0 border-t border-slate-700 bg-slate-800/50 px-2.5 py-2">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={input}
                  onChange={(event) => handleInputChange(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={connected ? 'Message...' : 'Connecting...'}
                  disabled={!connected}
                  maxLength={600}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-white placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none disabled:opacity-50"
                />

                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={!connected || !input.trim()}
                  className="cursor-pointer rounded-lg border-none bg-cyan-600 px-2.5 py-1.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Send
                </button>
              </div>

              <div className="mt-1 text-right text-[9px] text-slate-700">
                {input.length}/600
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
