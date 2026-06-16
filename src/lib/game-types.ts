// ============================================
// CyberArena - Game Type Definitions
// ============================================

export type GameScreen =
  | 'hero'
  | 'lobby'
  | 'waiting-room'
  | 'mission-briefing'
  | 'game'
  | 'results';

export type PlayerRole = 'attacker' | 'defender';

export type MissionDifficulty = 'easy' | 'medium' | 'hard';

export type ToolCategory = 'reconnaissance' | 'exploitation' | 'monitoring' | 'defense' | 'analysis';

export interface Player {
  id: string;
  name: string;
  role: PlayerRole | null;
  avatar: string;
  score: number;
  isReady: boolean;
  connectedAt: number;
}

export interface Team {
  id: string;
  name: string;
  joinCode: string;
  players: Player[];
  totalScore: number;
  createdAt: number;
}

// Tool definitions
export interface CyberTool {
  id: string;
  name: string;
  icon: string;
  category: ToolCategory;
  role: PlayerRole;
  description: string;
  cooldown: number; // ms
  energyCost: number;
  maxUses: number;
}

// Tool execution
export interface ToolAction {
  id: string;
  toolId: string;
  playerId: string;
  playerName: string;
  role: PlayerRole;
  target?: string;
  result: ToolResult;
  timestamp: number;
}

export interface ToolResult {
  success: boolean;
  message: string;
  terminalOutput: string[];
  points: number;
  discoveries?: string[];
  vulnerabilities?: string[];
  attacksBlocked?: string[];
}

// Vulnerabilities that can be found/exploited
export interface Vulnerability {
  id: string;
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  points: number;
  foundBy: string | null; // player id
  exploitedBy: string | null;
  patchedBy: string | null;
  port?: number;
  service?: string;
}

// Mission system
export interface Mission {
  id: string;
  title: string;
  description: string;
  backstory: string;
  difficulty: MissionDifficulty;
  timeLimit: number; // seconds
  targetSystem: string;
  objectives: MissionObjective[];
  vulnerabilities: Vulnerability[];
  networkMap: NetworkNode[];
  pointsToWin: number;
}

export interface MissionObjective {
  id: string;
  description: string;
  role: PlayerRole;
  points: number;
  completed: boolean;
  completedBy: string | null;
}

export interface NetworkNode {
  id: string;
  name: string;
  type: 'server' | 'firewall' | 'router' | 'database' | 'workstation' | 'cloud';
  ip: string;
  os: string;
  services: ServiceInfo[];
  status: 'secure' | 'compromised' | 'scanning' | 'protected';
}

export interface ServiceInfo {
  port: number;
  name: string;
  version: string;
  status: 'open' | 'filtered' | 'closed';
  vulnerability?: string;
}

// Chat messages
export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  role: PlayerRole;
  content: string;
  timestamp: number;
  type: 'user' | 'system' | 'action';
}

// Game session
export interface GameSession {
  id: string;
  team: Team;
  mission: Mission | null;
  status: 'setup' | 'playing' | 'paused' | 'completed';
  startTime: number | null;
  endTime: number | null;
  timeRemaining: number;
  actionLog: ToolAction[];
  chatMessages: ChatMessage[];
  vulnerabilities: Vulnerability[];
  networkNodes: NetworkNode[];
}

// Animation states
export interface AlertEvent {
  id: string;
  type: 'attack-detected' | 'vulnerability-found' | 'system-breached' | 'defense-success' | 'flag-captured';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: number;
}
