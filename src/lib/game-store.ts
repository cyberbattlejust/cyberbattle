// ============================================
// CyberArena - Game State Store (Zustand)
// ============================================

import { create } from 'zustand';
import {
  GameScreen,
  Player,
  PlayerRole,
  Team,
  GameSession,
  Mission,
  Vulnerability,
  ChatMessage,
  ToolAction,
  NetworkNode,
  AlertEvent,
  MissionObjective,
} from './game-types';
import {
  generatePlayerId,
  generateTeamId,
  generateJoinCode,
  getRandomMission,
  simulateToolAction,
  formatTime,
  AVATARS,
  TEAM_NAMES,
} from './game-data';

interface GameState {
  // Screen
  currentScreen: GameScreen;
  setScreen: (screen: GameScreen) => void;

  // Player
  player: Player;
  setPlayerName: (name: string) => void;
  setPlayerRole: (role: PlayerRole) => void;

  // Team
  team: Team | null;
  createTeam: () => void;
  joinTeam: (team: Team) => void;
  updateTeammate: (player: Player) => void;
  isTeamReady: () => boolean;

  // Game Session
  session: GameSession | null;
  startMission: (mission: Mission) => void;
  selectRandomMission: () => Mission;
  updateTimer: () => void;
  executeTool: (toolId: string, role: PlayerRole, target?: string) => ToolAction;
  addChatMessage: (content: string) => void;
  addSystemMessage: (content: string) => void;
  addActionMessage: (content: string) => void;

  // Alerts
  alerts: AlertEvent[];
  addAlert: (alert: Omit<AlertEvent, 'id' | 'timestamp'>) => void;
  removeAlert: (id: string) => void;

  // Game state
  endGame: () => void;
  resetGame: () => void;

  // Tool usage tracking
  toolUsage: Record<string, number>;
  getToolUsesRemaining: (toolId: string, maxUses: number) => number;

  // Vulnerability state
  updateVulnerability: (vulnId: string, field: 'foundBy' | 'exploitedBy' | 'patchedBy', playerId: string) => void;
  updateObjective: (objId: string, playerId: string) => void;
  updateNetworkNodeStatus: (nodeId: string, status: NetworkNode['status']) => void;
}

const initialPlayer: Player = {
  id: generatePlayerId(),
  name: '',
  role: null,
  avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)],
  score: 0,
  isReady: false,
  connectedAt: Date.now(),
};

export const useGameStore = create<GameState>((set, get) => ({
  // Screen
  currentScreen: 'hero',
  setScreen: (screen) => set({ currentScreen: screen }),

  // Player
  player: { ...initialPlayer },
  setPlayerName: (name) => set((state) => ({ player: { ...state.player, name } })),
  setPlayerRole: (role) => set((state) => ({ player: { ...state.player, role } })),

  // Team
  team: null,
  createTeam: () => {
    const teamName = TEAM_NAMES[Math.floor(Math.random() * TEAM_NAMES.length)];
    const player = get().player;
    const newTeam: Team = {
      id: generateTeamId(),
      name: teamName,
      joinCode: generateJoinCode(),
      players: [{ ...player }],
      totalScore: 0,
      createdAt: Date.now(),
    };
    set({ team: newTeam });
  },
  joinTeam: (team) => {
    const player = get().player;
    set({
      team: {
        ...team,
        players: [...team.players, { ...player }],
      },
    });
  },
  updateTeammate: (teammate) => {
    const team = get().team;
    if (!team) return;
    set({
      team: {
        ...team,
        players: team.players.map((p) =>
          p.id !== get().player.id ? { ...teammate } : p
        ),
      },
    });
  },
  isTeamReady: () => {
    const team = get().team;
    if (!team) return false;
    return team.players.length === 2 && team.players.every((p) => p.role !== null && p.isReady);
  },

  // Game Session
  session: null,
  startMission: (mission) => {
    const team = get().team;
    if (!team) return;

    const vulns = mission.vulnerabilities.map((v) => ({ ...v, foundBy: null, exploitedBy: null, patchedBy: null }));
    const objectives = mission.objectives.map((o) => ({ ...o, completed: false, completedBy: null }));

    const session: GameSession = {
      id: 'session-' + Math.random().toString(36).substr(2, 9),
      team,
      mission: { ...mission, vulnerabilities: vulns, objectives },
      status: 'playing',
      startTime: Date.now(),
      endTime: null,
      timeRemaining: mission.timeLimit,
      actionLog: [],
      chatMessages: [
        {
          id: 'sys-1',
          playerId: 'system',
          playerName: 'SYSTEM',
          role: 'attacker',
          content: `Mission "${mission.title}" has started! ${formatTime(mission.timeLimit)} remaining.`,
          timestamp: Date.now(),
          type: 'system',
        },
      ],
      vulnerabilities: vulns,
      networkNodes: mission.networkMap.map((n) => ({ ...n })),
    };

    set({ session, currentScreen: 'game' });
  },
  selectRandomMission: () => getRandomMission(),
  updateTimer: () => {
    const session = get().session;
    if (!session || session.status !== 'playing') return;

    const newTime = session.timeRemaining - 1;
    if (newTime <= 0) {
      set({
        session: { ...session, timeRemaining: 0, status: 'completed', endTime: Date.now() },
      });
      get().endGame();
      return;
    }
    set({ session: { ...session, timeRemaining: newTime } });
  },

  executeTool: (toolId, role, target) => {
    const result = simulateToolAction(toolId, role, target);
    const player = get().player;
    const session = get().session;

    const action: ToolAction = {
      id: 'action-' + Math.random().toString(36).substr(2, 9),
      toolId,
      playerId: player.id,
      playerName: player.name,
      role,
      target,
      result,
      timestamp: Date.now(),
    };

    if (!session) return action;

    // Update score
    const newScore = player.score + result.points;

    // Generate alerts based on action
    if (result.success) {
      if (role === 'attacker' && result.points >= 100) {
        get().addAlert({
          type: 'system-breached',
          severity: 'critical',
          message: `${player.name} (${role}) exploited a vulnerability! +${result.points} pts`,
        });
      } else if (role === 'attacker') {
        get().addAlert({
          type: 'attack-detected',
          severity: 'warning',
          message: `${player.name}: ${result.message}`,
        });
      } else if (role === 'defender' && result.points >= 60) {
        get().addAlert({
          type: 'defense-success',
          severity: 'info',
          message: `${player.name}: ${result.message}`,
        });
      } else {
        get().addAlert({
          type: 'vulnerability-found',
          severity: 'info',
          message: `${player.name}: ${result.message}`,
        });
      }
    }

    // Update vulnerabilities found/exploited/patched
    if (result.vulnerabilities && result.vulnerabilities.length > 0) {
      result.vulnerabilities.forEach((vulnName) => {
        const vuln = session.vulnerabilities.find((v) =>
          v.name.toLowerCase().includes(vulnName.toLowerCase().split(' ')[0])
        );
        if (vuln) {
          if (role === 'attacker') {
            get().updateVulnerability(vuln.id, 'foundBy', player.id);
            if (result.points >= 120) {
              get().updateVulnerability(vuln.id, 'exploitedBy', player.id);
            }
          }
        }
      });
    }

    if (result.attacksBlocked && result.attacksBlocked.length > 0 && role === 'defender') {
      const session = get().session;
      if (session) {
        const patchedVuln = session.vulnerabilities.find((v) => !v.patchedBy);
        if (patchedVuln) {
          get().updateVulnerability(patchedVuln.id, 'patchedBy', player.id);
        }
      }
    }

    // Check objectives
    const mission = session.mission;
    if (mission) {
      mission.objectives.forEach((obj) => {
        if (!obj.completed && obj.role === role && result.points >= obj.points * 0.5) {
          get().updateObjective(obj.id, player.id);
        }
      });
    }

    // Update network node status
    if (role === 'attacker' && result.success && result.points >= 100) {
      const targetNode = session.networkNodes.find((n) => n.type === 'server' || n.type === 'database');
      if (targetNode) {
        get().updateNetworkNodeStatus(targetNode.id, 'compromised');
      }
    }

    set({
      session: {
        ...session,
        actionLog: [...session.actionLog, action],
      },
      player: { ...get().player, score: newScore },
      toolUsage: { ...get().toolUsage, [toolId]: (get().toolUsage[toolId] || 0) + 1 },
    });

    return action;
  },

  addChatMessage: (content) => {
    const session = get().session;
    const player = get().player;
    if (!session) return;

    const msg: ChatMessage = {
      id: 'msg-' + Math.random().toString(36).substr(2, 9),
      playerId: player.id,
      playerName: player.name,
      role: player.role || 'attacker',
      content,
      timestamp: Date.now(),
      type: 'user',
    };

    set({
      session: {
        ...session,
        chatMessages: [...session.chatMessages, msg],
      },
    });
  },

  addSystemMessage: (content) => {
    const session = get().session;
    if (!session) return;

    const msg: ChatMessage = {
      id: 'sys-' + Math.random().toString(36).substr(2, 9),
      playerId: 'system',
      playerName: 'SYSTEM',
      role: 'attacker',
      content,
      timestamp: Date.now(),
      type: 'system',
    };

    set({
      session: {
        ...session,
        chatMessages: [...session.chatMessages, msg],
      },
    });
  },

  addActionMessage: (content) => {
    const session = get().session;
    const player = get().player;
    if (!session) return;

    const msg: ChatMessage = {
      id: 'action-' + Math.random().toString(36).substr(2, 9),
      playerId: player.id,
      playerName: player.name,
      role: player.role || 'attacker',
      content,
      timestamp: Date.now(),
      type: 'action',
    };

    set({
      session: {
        ...session,
        chatMessages: [...session.chatMessages, msg],
      },
    });
  },

  // Alerts
  alerts: [],
  addAlert: (alert) => {
    const id = 'alert-' + Math.random().toString(36).substr(2, 9);
    const newAlert: AlertEvent = { ...alert, id, timestamp: Date.now() };
    set((state) => ({
      alerts: [...state.alerts.slice(-9), newAlert],
    }));
    setTimeout(() => {
      get().removeAlert(id);
    }, 5000);
  },
  removeAlert: (id) => {
    set((state) => ({
      alerts: state.alerts.filter((a) => a.id !== id),
    }));
  },

  // Game end
  endGame: () => {
    const session = get().session;
    if (!session) return;

    get().addSystemMessage('Mission time expired! Game Over.');
    set({
      session: { ...session, status: 'completed', endTime: Date.now() },
      currentScreen: 'results',
    });
  },

  resetGame: () => {
    set({
      currentScreen: 'hero',
      player: { ...initialPlayer, id: generatePlayerId(), avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)] },
      team: null,
      session: null,
      alerts: [],
      toolUsage: {},
    });
  },

  // Tool usage
  toolUsage: {},
  getToolUsesRemaining: (toolId, maxUses) => {
    const used = get().toolUsage[toolId] || 0;
    return Math.max(0, maxUses - used);
  },

  // Vulnerability updates
  updateVulnerability: (vulnId, field, playerId) => {
    const session = get().session;
    if (!session) return;
    set({
      session: {
        ...session,
        vulnerabilities: session.vulnerabilities.map((v) =>
          v.id === vulnId ? { ...v, [field]: playerId } : v
        ),
      },
    });
  },

  updateObjective: (objId, playerId) => {
    const session = get().session;
    if (!session || !session.mission) return;
    set({
      session: {
        ...session,
        mission: {
          ...session.mission,
          objectives: session.mission.objectives.map((o) =>
            o.id === objId ? { ...o, completed: true, completedBy: playerId } : o
          ),
        },
      },
    });
  },

  updateNetworkNodeStatus: (nodeId, status) => {
    const session = get().session;
    if (!session) return;
    set({
      session: {
        ...session,
        networkNodes: session.networkNodes.map((n) =>
          n.id === nodeId ? { ...n, status } : n
        ),
      },
    });
  },
}));
